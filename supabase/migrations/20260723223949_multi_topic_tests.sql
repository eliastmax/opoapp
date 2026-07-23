-- V2.5: atomic, balanced tests across several topics.

CREATE OR REPLACE FUNCTION public.create_multi_topic_test(
  p_topic_ids uuid[],
  p_learning_stage text,
  p_mode text DEFAULT 'mezcladas',
  p_question_count integer DEFAULT 10,
  p_free_mode boolean DEFAULT false
)
RETURNS TABLE (
  test_id uuid,
  selected_count integer,
  requested_topic_count integer,
  covered_topic_count integer,
  requested_stage text,
  free_mode boolean,
  locked_topic_count integer
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_topic_ids uuid[];
  v_topic_count integer;
  v_owned_topic_count integer;
  v_locked_topic_count integer;
  v_test_id uuid;
  v_previous_test_id uuid;
  v_selected_count integer;
  v_covered_topic_count integer;
  v_target_non_overlap integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT array_agg(requested.id ORDER BY requested.id)
  INTO v_topic_ids
  FROM (
    SELECT DISTINCT unnest(p_topic_ids) AS id
  ) AS requested;

  v_topic_count := COALESCE(cardinality(v_topic_ids), 0);

  IF v_topic_count < 2 THEN
    RAISE EXCEPTION 'Select at least two topics';
  END IF;

  IF v_topic_count > 50 THEN
    RAISE EXCEPTION 'No more than 50 topics can be selected';
  END IF;

  IF p_learning_stage NOT IN ('aprendizaje', 'consolidacion', 'tribunal') THEN
    RAISE EXCEPTION 'Invalid learning stage';
  END IF;

  IF p_mode NOT IN ('mezcladas', 'nuevas', 'falladas', 'dudas') THEN
    RAISE EXCEPTION 'Invalid test mode';
  END IF;

  IF p_question_count < 2 OR p_question_count > 100 THEN
    RAISE EXCEPTION 'Question count must be between 2 and 100';
  END IF;

  IF p_question_count < v_topic_count THEN
    RAISE EXCEPTION 'Question count must be at least the number of selected topics';
  END IF;

  SELECT count(*)::integer
  INTO v_owned_topic_count
  FROM public.topics AS topic
  WHERE topic.user_id = v_user_id
    AND topic.id = ANY(v_topic_ids);

  IF v_owned_topic_count <> v_topic_count THEN
    RAISE EXCEPTION 'One or more selected topics are invalid';
  END IF;

  SELECT count(*) FILTER (
    WHERE (p_learning_stage = 'consolidacion' AND NOT progress.consolidation_unlocked)
       OR (p_learning_stage = 'tribunal' AND NOT progress.tribunal_unlocked)
  )::integer
  INTO v_locked_topic_count
  FROM public.get_learning_stage_progress() AS progress
  WHERE progress.topic_id = ANY(v_topic_ids);

  IF v_locked_topic_count > 0 AND NOT p_free_mode THEN
    RAISE EXCEPTION 'Learning stage is locked in one or more selected topics; use free mode explicitly';
  END IF;

  SELECT previous.id
  INTO v_previous_test_id
  FROM public.tests AS previous
  WHERE previous.user_id = v_user_id
    AND previous.completado IS TRUE
    AND previous.fecha_finalizacion IS NOT NULL
  ORDER BY previous.fecha_finalizacion DESC, previous.id DESC
  LIMIT 1;

  INSERT INTO public.tests (
    user_id,
    tipo,
    numero_preguntas,
    sin_responder,
    learning_stage,
    stage_free_mode
  )
  VALUES (
    v_user_id,
    'multitema_' || p_mode,
    p_question_count,
    p_question_count,
    p_learning_stage,
    v_locked_topic_count > 0 AND p_free_mode
  )
  RETURNING id INTO v_test_id;

  v_target_non_overlap := p_question_count - floor(p_question_count * 0.30)::integer;

  WITH pool AS MATERIALIZED (
    SELECT
      question.id AS question_id,
      question.topic_id,
      COALESCE(statistics.appearances_count, 0) AS appearances_count,
      COALESCE(statistics.answered_count, 0) AS answered_count,
      COALESCE(statistics.correct_count, 0) AS correct_count,
      statistics.last_seen_at,
      statistics.next_review_at,
      (failure.question_id IS NOT NULL) AS is_failure,
      (doubt.question_id IS NOT NULL) AS is_doubt,
      (previous_answer.question_id IS NOT NULL) AS in_previous_test
    FROM public.questions AS question
    LEFT JOIN public.question_statistics AS statistics
      ON statistics.user_id = question.user_id
     AND statistics.question_id = question.id
    LEFT JOIN public.active_failed_questions AS failure
      ON failure.user_id = question.user_id
     AND failure.question_id = question.id
    LEFT JOIN public.active_doubt_questions AS doubt
      ON doubt.user_id = question.user_id
     AND doubt.question_id = question.id
    LEFT JOIN public.test_answers AS previous_answer
      ON previous_answer.user_id = question.user_id
     AND previous_answer.question_id = question.id
     AND previous_answer.test_id = v_previous_test_id
    WHERE question.user_id = v_user_id
      AND question.activa IS TRUE
      AND question.topic_id = ANY(v_topic_ids)
      AND (
        question.nivel_pedagogico = p_learning_stage
        OR (p_learning_stage = 'aprendizaje' AND question.nivel_pedagogico IS NULL)
      )
      AND CASE p_mode
        WHEN 'nuevas' THEN COALESCE(statistics.appearances_count, 0) = 0
        WHEN 'falladas' THEN failure.question_id IS NOT NULL
        WHEN 'dudas' THEN doubt.question_id IS NOT NULL
        ELSE TRUE
      END
  ),
  classified AS (
    SELECT
      pool.*,
      CASE
        WHEN pool.is_failure AND pool.is_doubt THEN 'fallo_duda'
        WHEN pool.is_failure THEN 'fallo'
        WHEN pool.is_doubt THEN 'duda'
        WHEN pool.next_review_at <= now() THEN 'repaso_programado'
        WHEN pool.appearances_count = 0 THEN 'nueva'
        WHEN pool.answered_count >= 2
          AND pool.correct_count::numeric / NULLIF(pool.answered_count, 0) < 0.70
          THEN 'rendimiento_bajo'
        WHEN pool.last_seen_at < now() - interval '14 days' THEN 'retencion'
        WHEN pool.appearances_count <= 2 THEN 'poco_vista'
        ELSE 'variedad'
      END AS selection_group,
      (
        1
        + CASE WHEN pool.is_failure THEN 7 ELSE 0 END
        + CASE WHEN pool.is_doubt THEN 6 ELSE 0 END
        + CASE WHEN pool.next_review_at <= now() THEN 5 ELSE 0 END
        + CASE WHEN pool.appearances_count = 0 THEN 5 ELSE 0 END
        + CASE
            WHEN pool.answered_count >= 2
              AND pool.correct_count::numeric / NULLIF(pool.answered_count, 0) < 0.70
              THEN 4
            ELSE 0
          END
        + CASE WHEN pool.last_seen_at < now() - interval '14 days' THEN 3 ELSE 0 END
        + CASE WHEN pool.appearances_count BETWEEN 1 AND 2 THEN 2 ELSE 0 END
      )::numeric(8,3) AS base_weight
    FROM pool
  ),
  weighted AS (
    SELECT
      classified.*,
      (
        classified.base_weight
        * CASE WHEN classified.in_previous_test THEN 0.25 ELSE 1.00 END
      )::numeric(8,3) AS final_weight
    FROM classified
  ),
  sampled AS (
    SELECT
      weighted.*,
      (-ln(greatest(random(), 0.000000001)) / weighted.final_weight) AS draw_score
    FROM weighted
  ),
  topic_priority AS (
    SELECT
      sampled.topic_id,
      row_number() OVER (
        ORDER BY
          max(sampled.base_weight) DESC,
          count(*) FILTER (WHERE sampled.in_previous_test IS FALSE) DESC,
          sampled.topic_id
      )::integer AS priority_rank
    FROM sampled
    GROUP BY sampled.topic_id
  ),
  quotas AS (
    SELECT
      priority.topic_id,
      floor(p_question_count::numeric / v_topic_count)::integer
        + CASE
            WHEN priority.priority_rank <= (p_question_count % v_topic_count) THEN 1
            ELSE 0
          END AS topic_quota
    FROM topic_priority AS priority
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
    ORDER BY
      ranked.in_previous_test,
      ranked.draw_score,
      ranked.question_id
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
      row_number() OVER (ORDER BY random(), selected.question_id)::integer AS selection_order,
      (
        SELECT count(*)
        FROM pool AS available
        WHERE available.in_previous_test IS FALSE
      )::integer AS non_overlap_available
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
    ordered.selection_group,
    CASE ordered.selection_group
      WHEN 'fallo_duda' THEN 'Fallo y duda activos en el bloque seleccionado'
      WHEN 'fallo' THEN 'Fallo pendiente en el bloque seleccionado'
      WHEN 'duda' THEN 'Duda pendiente en el bloque seleccionado'
      WHEN 'repaso_programado' THEN 'Repaso programado en el bloque seleccionado'
      WHEN 'nueva' THEN 'Pregunta nueva del bloque seleccionado'
      WHEN 'rendimiento_bajo' THEN 'Rendimiento bajo en el bloque seleccionado'
      WHEN 'retencion' THEN 'Retención pendiente en el bloque seleccionado'
      WHEN 'poco_vista' THEN 'Pregunta poco vista del bloque seleccionado'
      ELSE 'Variedad equilibrada entre los temas seleccionados'
    END,
    ordered.base_weight,
    ordered.final_weight,
    ordered.in_previous_test,
    ordered.in_previous_test AND ordered.non_overlap_available < v_target_non_overlap,
    'multi-topic-v1.0'
  FROM ordered;

  GET DIAGNOSTICS v_selected_count = ROW_COUNT;

  IF v_selected_count = 0 THEN
    RAISE EXCEPTION 'No questions match the selected topics, stage and mode';
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
    v_topic_count,
    v_covered_topic_count,
    p_learning_stage,
    v_locked_topic_count > 0 AND p_free_mode,
    v_locked_topic_count;
END;
$$;

REVOKE ALL ON FUNCTION public.create_multi_topic_test(
  uuid[],
  text,
  text,
  integer,
  boolean
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_multi_topic_test(
  uuid[],
  text,
  text,
  integer,
  boolean
) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_multi_topic_test(
  uuid[],
  text,
  text,
  integer,
  boolean
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_multi_topic_test(
  uuid[],
  text,
  text,
  integer,
  boolean
) TO service_role;

COMMENT ON FUNCTION public.create_multi_topic_test(
  uuid[],
  text,
  text,
  integer,
  boolean
) IS
  'Creates an atomic, balanced V2.5 test across multiple owned topics while preserving stage locks and per-user selection signals.';
