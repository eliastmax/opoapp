-- V2.5: timed exam simulation with neutral, syllabus-wide selection.

ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS exam_duration_minutes integer;

ALTER TABLE public.tests
  DROP CONSTRAINT IF EXISTS tests_exam_duration_minutes_check;

ALTER TABLE public.tests
  ADD CONSTRAINT tests_exam_duration_minutes_check
  CHECK (
    exam_duration_minutes IS NULL
    OR exam_duration_minutes BETWEEN 5 AND 300
  );

CREATE OR REPLACE FUNCTION public.create_exam_simulation(
  p_question_count integer DEFAULT 50,
  p_duration_minutes integer DEFAULT 60
)
RETURNS TABLE (
  test_id uuid,
  selected_count integer,
  covered_topic_count integer,
  available_topic_count integer,
  duration_minutes integer
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_test_id uuid;
  v_selected_count integer;
  v_covered_topic_count integer;
  v_available_topic_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_question_count < 5 OR p_question_count > 200 THEN
    RAISE EXCEPTION 'Question count must be between 5 and 200';
  END IF;

  IF p_duration_minutes < 5 OR p_duration_minutes > 300 THEN
    RAISE EXCEPTION 'Duration must be between 5 and 300 minutes';
  END IF;

  SELECT count(DISTINCT question.topic_id)::integer
  INTO v_available_topic_count
  FROM public.questions AS question
  WHERE question.user_id = v_user_id
    AND question.activa IS TRUE;

  IF v_available_topic_count = 0 THEN
    RAISE EXCEPTION 'No active questions are available';
  END IF;

  INSERT INTO public.tests (
    user_id,
    tipo,
    numero_preguntas,
    sin_responder,
    exam_duration_minutes
  )
  VALUES (
    v_user_id,
    'simulacro',
    p_question_count,
    p_question_count,
    p_duration_minutes
  )
  RETURNING id INTO v_test_id;

  WITH pool AS MATERIALIZED (
    SELECT
      question.id AS question_id,
      question.topic_id,
      question.frecuencia_historica,
      question.nivel_pedagogico,
      (
        CASE question.frecuencia_historica
          WHEN 'alta' THEN 4.00
          WHEN 'media' THEN 2.50
          WHEN 'baja' THEN 1.20
          ELSE 1.00
        END
        * CASE question.nivel_pedagogico
            WHEN 'tribunal' THEN 1.35
            WHEN 'consolidacion' THEN 1.15
            ELSE 1.00
          END
      )::numeric(8,3) AS selection_weight
    FROM public.questions AS question
    WHERE question.user_id = v_user_id
      AND question.activa IS TRUE
  ),
  sampled AS (
    SELECT
      pool.*,
      (-ln(greatest(random(), 0.000000001)) / pool.selection_weight) AS draw_score
    FROM pool
  ),
  topic_stats AS (
    SELECT
      sampled.topic_id,
      count(*)::integer AS available_count
    FROM sampled
    GROUP BY sampled.topic_id
  ),
  allocation_context AS (
    SELECT
      count(*)::integer AS topic_count,
      sum(topic_stats.available_count)::integer AS total_available,
      CASE
        WHEN p_question_count >= count(*) THEN 1
        ELSE 0
      END::integer AS minimum_per_topic
    FROM topic_stats
  ),
  quota_raw AS (
    SELECT
      topic_stats.topic_id,
      topic_stats.available_count,
      context.minimum_per_topic,
      GREATEST(
        p_question_count - context.minimum_per_topic * context.topic_count,
        0
      ) AS remaining_slots,
      GREATEST(
        context.total_available - context.minimum_per_topic * context.topic_count,
        0
      ) AS remaining_capacity,
      GREATEST(topic_stats.available_count - context.minimum_per_topic, 0) AS topic_capacity
    FROM topic_stats
    CROSS JOIN allocation_context AS context
  ),
  quota_base AS (
    SELECT
      quota_raw.*,
      CASE
        WHEN quota_raw.remaining_capacity = 0 THEN 0::numeric
        ELSE
          quota_raw.remaining_slots::numeric
          * quota_raw.topic_capacity::numeric
          / quota_raw.remaining_capacity::numeric
      END AS raw_extra
    FROM quota_raw
  ),
  quota_floor AS (
    SELECT
      quota_base.*,
      LEAST(
        quota_base.available_count,
        quota_base.minimum_per_topic + floor(quota_base.raw_extra)::integer
      ) AS base_quota,
      quota_base.raw_extra - floor(quota_base.raw_extra) AS fractional_part
    FROM quota_base
  ),
  quota_remainder AS (
    SELECT GREATEST(
      LEAST(p_question_count, (SELECT count(*) FROM pool))
      - sum(quota_floor.base_quota),
      0
    )::integer AS slots
    FROM quota_floor
  ),
  quotas AS (
    SELECT
      quota_floor.topic_id,
      LEAST(
        quota_floor.available_count,
        quota_floor.base_quota
        + CASE
            WHEN row_number() OVER (
              ORDER BY
                quota_floor.fractional_part DESC,
                quota_floor.available_count DESC,
                quota_floor.topic_id
            ) <= quota_remainder.slots
              THEN 1
            ELSE 0
          END
      )::integer AS topic_quota
    FROM quota_floor
    CROSS JOIN quota_remainder
  ),
  ranked AS (
    SELECT
      sampled.*,
      row_number() OVER (
        PARTITION BY sampled.topic_id
        ORDER BY sampled.draw_score, sampled.question_id
      )::integer AS topic_rank
    FROM sampled
  ),
  quota_selection AS (
    SELECT ranked.*
    FROM ranked
    JOIN quotas
      ON quotas.topic_id = ranked.topic_id
    WHERE ranked.topic_rank <= quotas.topic_quota
  ),
  redistribution AS (
    SELECT ranked.*
    FROM ranked
    WHERE NOT EXISTS (
      SELECT 1
      FROM quota_selection
      WHERE quota_selection.question_id = ranked.question_id
    )
    ORDER BY ranked.draw_score, ranked.question_id
    LIMIT GREATEST(
      p_question_count - (SELECT count(*) FROM quota_selection),
      0
    )
  ),
  selected AS (
    SELECT * FROM quota_selection
    UNION ALL
    SELECT * FROM redistribution
  ),
  ordered AS (
    SELECT
      selected.*,
      row_number() OVER (ORDER BY random(), selected.question_id)::integer AS selection_order
    FROM selected
  )
  INSERT INTO public.test_question_selection (
    user_id,
    test_id,
    question_id,
    selection_order,
    selection_group,
    selection_reason,
    base_weight,
    final_weight,
    was_in_previous_test,
    overlap_exception,
    algorithm_version
  )
  SELECT
    v_user_id,
    v_test_id,
    ordered.question_id,
    ordered.selection_order,
    'simulacro',
    CASE ordered.frecuencia_historica
      WHEN 'alta' THEN 'Contenido de frecuencia histórica alta'
      WHEN 'media' THEN 'Contenido de frecuencia histórica media'
      WHEN 'baja' THEN 'Contenido de frecuencia histórica baja'
      ELSE 'Cobertura general del temario disponible'
    END,
    ordered.selection_weight,
    ordered.selection_weight,
    false,
    false,
    'simulation-v1.0'
  FROM ordered;

  GET DIAGNOSTICS v_selected_count = ROW_COUNT;

  IF v_selected_count = 0 THEN
    RAISE EXCEPTION 'No questions are available for the simulation';
  END IF;

  SELECT count(DISTINCT question.topic_id)::integer
  INTO v_covered_topic_count
  FROM public.test_question_selection AS selection
  JOIN public.questions AS question
    ON question.user_id = selection.user_id
   AND question.id = selection.question_id
  WHERE selection.user_id = v_user_id
    AND selection.test_id = v_test_id;

  UPDATE public.tests AS test
  SET numero_preguntas = v_selected_count,
      sin_responder = v_selected_count
  WHERE test.user_id = v_user_id
    AND test.id = v_test_id;

  INSERT INTO public.test_answers (user_id, test_id, question_id, orden)
  SELECT
    selection.user_id,
    selection.test_id,
    selection.question_id,
    selection.selection_order
  FROM public.test_question_selection AS selection
  WHERE selection.user_id = v_user_id
    AND selection.test_id = v_test_id
  ORDER BY selection.selection_order;

  RETURN QUERY
  SELECT
    v_test_id,
    v_selected_count,
    v_covered_topic_count,
    v_available_topic_count,
    p_duration_minutes;
END;
$$;

REVOKE ALL ON FUNCTION public.create_exam_simulation(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_exam_simulation(integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_exam_simulation(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_exam_simulation(integer, integer) TO service_role;

COMMENT ON FUNCTION public.create_exam_simulation(integer, integer) IS
  'Creates a timed, neutral simulation across the active per-user bank, weighted by historical frequency and distributed proportionally by topic.';
