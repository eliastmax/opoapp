-- Sprint V2: scheduled retention with conservative, auditable intervals.

ALTER TABLE public.question_statistics
  ADD COLUMN IF NOT EXISTS retention_level smallint NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'question_statistics_retention_level_check'
      AND conrelid = 'public.question_statistics'::regclass
  ) THEN
    ALTER TABLE public.question_statistics
      ADD CONSTRAINT question_statistics_retention_level_check
      CHECK (retention_level BETWEEN 0 AND 4);
  END IF;
END;
$$;

COMMENT ON COLUMN public.question_statistics.retention_level IS
  'retention-v1.0 stage: 0 recovery, then scheduled confirmations at 3, 7, 14 and 30 days.';

CREATE OR REPLACE FUNCTION public.calculate_retention_state(
  p_current_level smallint,
  p_current_next_review_at timestamptz,
  p_correct boolean,
  p_marked_doubt boolean,
  p_answered_at timestamptz
)
RETURNS TABLE (
  retention_level smallint,
  next_review_at timestamptz
)
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN p_correct IS NULL AND p_marked_doubt IS FALSE
        THEN p_current_level
      WHEN p_correct IS FALSE OR p_marked_doubt IS TRUE
        THEN 0::smallint
      WHEN p_current_next_review_at IS NOT NULL
        AND p_current_next_review_at > p_answered_at
        THEN p_current_level
      ELSE least(p_current_level + 1, 4)::smallint
    END,
    CASE
      WHEN p_correct IS NULL AND p_marked_doubt IS FALSE
        THEN p_current_next_review_at
      WHEN p_correct IS FALSE OR p_marked_doubt IS TRUE
        THEN p_answered_at + interval '1 day'
      WHEN p_current_next_review_at IS NOT NULL
        AND p_current_next_review_at > p_answered_at
        THEN p_current_next_review_at
      WHEN p_current_level <= 0
        THEN p_answered_at + interval '3 days'
      WHEN p_current_level = 1
        THEN p_answered_at + interval '7 days'
      WHEN p_current_level = 2
        THEN p_answered_at + interval '14 days'
      ELSE p_answered_at + interval '30 days'
    END;
$$;

REVOKE ALL ON FUNCTION public.calculate_retention_state(
  smallint,
  timestamptz,
  boolean,
  boolean,
  timestamptz
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.calculate_retention_state(
  smallint,
  timestamptz,
  boolean,
  boolean,
  timestamptz
) FROM anon;
GRANT EXECUTE ON FUNCTION public.calculate_retention_state(
  smallint,
  timestamptz,
  boolean,
  boolean,
  timestamptz
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_retention_state(
  smallint,
  timestamptz,
  boolean,
  boolean,
  timestamptz
) TO service_role;

COMMENT ON FUNCTION public.calculate_retention_state(
  smallint,
  timestamptz,
  boolean,
  boolean,
  timestamptz
) IS
  'Pure retention-v1.0 transition. Early correct answers do not advance the schedule.';

-- Conservative backfill: existing safe correct answers start at level 1.
-- Active failures and doubts stay at recovery level and are due tomorrow.
WITH current_state AS (
  SELECT
    statistics.user_id,
    statistics.question_id,
    EXISTS (
      SELECT 1
      FROM public.active_failed_questions AS failure
      WHERE failure.user_id = statistics.user_id
        AND failure.question_id = statistics.question_id
    ) AS is_active_failure,
    EXISTS (
      SELECT 1
      FROM public.active_doubt_questions AS doubt
      WHERE doubt.user_id = statistics.user_id
        AND doubt.question_id = statistics.question_id
    ) AS is_active_doubt
  FROM public.question_statistics AS statistics
)
UPDATE public.question_statistics AS statistics
SET retention_level = CASE
      WHEN state.is_active_failure OR state.is_active_doubt THEN 0
      WHEN statistics.current_correct_streak > 0 THEN 1
      ELSE 0
    END,
    next_review_at = CASE
      WHEN state.is_active_failure OR state.is_active_doubt THEN now() + interval '1 day'
      WHEN statistics.current_correct_streak > 0
        AND statistics.last_answered_at IS NOT NULL
        THEN now() + interval '3 days'
      WHEN statistics.current_incorrect_streak > 0 THEN now() + interval '1 day'
      ELSE NULL
    END,
    updated_at = now()
FROM current_state AS state
WHERE state.user_id = statistics.user_id
  AND state.question_id = statistics.question_id
  AND statistics.next_review_at IS NULL;

CREATE OR REPLACE FUNCTION public.get_retention_review_summary()
RETURNS TABLE (
  topic_id uuid,
  due_count integer,
  next_review_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    question.topic_id,
    count(*)::integer AS due_count,
    min(statistics.next_review_at) AS next_review_at
  FROM public.question_statistics AS statistics
  JOIN public.questions AS question
    ON question.user_id = statistics.user_id
   AND question.id = statistics.question_id
  WHERE statistics.user_id = (SELECT auth.uid())
    AND question.activa IS TRUE
    AND statistics.next_review_at <= now()
  GROUP BY question.topic_id;
$$;

REVOKE ALL ON FUNCTION public.get_retention_review_summary() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_retention_review_summary() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_retention_review_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_retention_review_summary() TO service_role;

COMMENT ON FUNCTION public.get_retention_review_summary() IS
  'Returns retention-v1.0 reviews due now, grouped by topic, for the authenticated user.';

CREATE OR REPLACE FUNCTION public.complete_test(p_test_id uuid)
RETURNS TABLE (
  aciertos integer,
  fallos integer,
  sin_responder integer,
  porcentaje numeric
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_completado boolean;
  v_total integer;
  v_aciertos integer;
  v_fallos integer;
  v_sin_responder integer;
  v_porcentaje numeric;
  v_completed_at timestamptz := now();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT test.completado
  INTO v_completado
  FROM public.tests AS test
  WHERE test.id = p_test_id
    AND test.user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Test not found';
  END IF;

  IF v_completado THEN
    RETURN QUERY
    SELECT test.aciertos, test.fallos, test.sin_responder, test.porcentaje
    FROM public.tests AS test
    WHERE test.id = p_test_id
      AND test.user_id = v_user_id;
    RETURN;
  END IF;

  UPDATE public.test_answers AS answer
  SET correcta = CASE
    WHEN answer.respuesta_usuario IS NULL THEN NULL
    ELSE answer.respuesta_usuario = question.respuesta_correcta
  END
  FROM public.questions AS question
  WHERE answer.test_id = p_test_id
    AND answer.user_id = v_user_id
    AND question.id = answer.question_id
    AND question.user_id = v_user_id;

  SELECT
    count(*)::integer,
    count(*) FILTER (WHERE answer.correcta IS TRUE)::integer,
    count(*) FILTER (WHERE answer.correcta IS FALSE)::integer,
    count(*) FILTER (WHERE answer.respuesta_usuario IS NULL)::integer
  INTO v_total, v_aciertos, v_fallos, v_sin_responder
  FROM public.test_answers AS answer
  WHERE answer.test_id = p_test_id
    AND answer.user_id = v_user_id;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'Test has no questions';
  END IF;

  v_porcentaje := round((v_aciertos::numeric / v_total::numeric) * 100, 2);

  INSERT INTO public.question_statistics AS statistics (
    user_id,
    question_id,
    appearances_count,
    answered_count,
    correct_count,
    incorrect_count,
    doubt_count,
    current_correct_streak,
    current_incorrect_streak,
    last_seen_at,
    last_answered_at,
    last_correct_at,
    last_incorrect_at,
    last_doubted_at,
    updated_at
  )
  SELECT
    answer.user_id,
    answer.question_id,
    1,
    CASE WHEN answer.correcta IS NOT NULL THEN 1 ELSE 0 END,
    CASE WHEN answer.correcta IS TRUE THEN 1 ELSE 0 END,
    CASE WHEN answer.correcta IS FALSE THEN 1 ELSE 0 END,
    CASE WHEN answer.marked_doubt IS TRUE THEN 1 ELSE 0 END,
    CASE WHEN answer.correcta IS TRUE THEN 1 ELSE 0 END,
    CASE WHEN answer.correcta IS FALSE THEN 1 ELSE 0 END,
    v_completed_at,
    CASE WHEN answer.correcta IS NOT NULL THEN v_completed_at ELSE NULL END,
    CASE WHEN answer.correcta IS TRUE THEN v_completed_at ELSE NULL END,
    CASE WHEN answer.correcta IS FALSE THEN v_completed_at ELSE NULL END,
    CASE WHEN answer.marked_doubt IS TRUE THEN v_completed_at ELSE NULL END,
    v_completed_at
  FROM public.test_answers AS answer
  WHERE answer.test_id = p_test_id
    AND answer.user_id = v_user_id
  ON CONFLICT (user_id, question_id) DO UPDATE
  SET appearances_count = statistics.appearances_count + EXCLUDED.appearances_count,
      answered_count = statistics.answered_count + EXCLUDED.answered_count,
      correct_count = statistics.correct_count + EXCLUDED.correct_count,
      incorrect_count = statistics.incorrect_count + EXCLUDED.incorrect_count,
      doubt_count = statistics.doubt_count + EXCLUDED.doubt_count,
      current_correct_streak = CASE
        WHEN EXCLUDED.correct_count = 1 THEN statistics.current_correct_streak + 1
        WHEN EXCLUDED.incorrect_count = 1 THEN 0
        ELSE statistics.current_correct_streak
      END,
      current_incorrect_streak = CASE
        WHEN EXCLUDED.incorrect_count = 1 THEN statistics.current_incorrect_streak + 1
        WHEN EXCLUDED.correct_count = 1 THEN 0
        ELSE statistics.current_incorrect_streak
      END,
      last_seen_at = EXCLUDED.last_seen_at,
      last_answered_at = COALESCE(EXCLUDED.last_answered_at, statistics.last_answered_at),
      last_correct_at = COALESCE(EXCLUDED.last_correct_at, statistics.last_correct_at),
      last_incorrect_at = COALESCE(EXCLUDED.last_incorrect_at, statistics.last_incorrect_at),
      last_doubted_at = COALESCE(EXCLUDED.last_doubted_at, statistics.last_doubted_at),
      updated_at = v_completed_at;

  UPDATE public.question_statistics AS statistics
  SET retention_level = transition.retention_level,
      next_review_at = transition.next_review_at,
      updated_at = v_completed_at
  FROM public.test_answers AS answer
  CROSS JOIN LATERAL public.calculate_retention_state(
    statistics.retention_level,
    statistics.next_review_at,
    answer.correcta,
    answer.marked_doubt,
    v_completed_at
  ) AS transition
  WHERE answer.test_id = p_test_id
    AND answer.user_id = v_user_id
    AND statistics.user_id = answer.user_id
    AND statistics.question_id = answer.question_id;

  UPDATE public.tests AS test
  SET completado = true,
      fecha_finalizacion = v_completed_at,
      aciertos = v_aciertos,
      fallos = v_fallos,
      sin_responder = v_sin_responder,
      porcentaje = v_porcentaje
  WHERE test.id = p_test_id
    AND test.user_id = v_user_id;

  RETURN QUERY
  SELECT v_aciertos, v_fallos, v_sin_responder, v_porcentaje;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_test(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_test(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_test(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_test(uuid) TO service_role;

COMMENT ON FUNCTION public.complete_test(uuid) IS
  'Completes a test exactly once and updates retention-v1.0 atomically.';

CREATE OR REPLACE FUNCTION public.create_recommended_test(
  p_question_count integer DEFAULT 10
)
RETURNS TABLE (
  test_id uuid,
  selected_count integer,
  review_count integer,
  current_topic_count integer,
  weak_count integer,
  retention_new_count integer,
  fallback_count integer,
  current_topic_id uuid,
  current_topic_name text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_test_id uuid;
  v_previous_test_id uuid;
  v_current_topic_id uuid;
  v_current_topic_name text;
  v_selected_count integer;
  v_review_quota integer;
  v_current_quota integer;
  v_weak_quota integer;
  v_retention_quota integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_question_count NOT IN (5, 10, 20) THEN
    RAISE EXCEPTION 'Question count must be 5, 10 or 20';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.questions AS question
    WHERE question.user_id = v_user_id
      AND question.activa IS TRUE
  ) THEN
    RAISE EXCEPTION 'No active questions available';
  END IF;

  v_review_quota := ceil(p_question_count * 0.40)::integer;
  v_current_quota := floor(p_question_count * 0.30)::integer;
  v_weak_quota := floor(p_question_count * 0.20)::integer;
  v_retention_quota := p_question_count
    - v_review_quota
    - v_current_quota
    - v_weak_quota;

  SELECT previous_test.id
  INTO v_previous_test_id
  FROM public.tests AS previous_test
  WHERE previous_test.user_id = v_user_id
    AND previous_test.completado IS TRUE
    AND previous_test.fecha_finalizacion IS NOT NULL
  ORDER BY previous_test.fecha_finalizacion DESC, previous_test.id DESC
  LIMIT 1;

  IF v_previous_test_id IS NOT NULL THEN
    SELECT question.topic_id
    INTO v_current_topic_id
    FROM public.test_answers AS answer
    JOIN public.questions AS question
      ON question.user_id = answer.user_id
     AND question.id = answer.question_id
    WHERE answer.user_id = v_user_id
      AND answer.test_id = v_previous_test_id
      AND question.activa IS TRUE
    GROUP BY question.topic_id
    ORDER BY count(*) DESC, question.topic_id
    LIMIT 1;
  END IF;

  IF v_current_topic_id IS NULL THEN
    SELECT topic.id
    INTO v_current_topic_id
    FROM public.topics AS topic
    WHERE topic.user_id = v_user_id
      AND EXISTS (
        SELECT 1
        FROM public.questions AS question
        WHERE question.user_id = v_user_id
          AND question.topic_id = topic.id
          AND question.activa IS TRUE
      )
    ORDER BY topic.numero, topic.created_at, topic.id
    LIMIT 1;
  END IF;

  SELECT topic.nombre
  INTO v_current_topic_name
  FROM public.topics AS topic
  WHERE topic.user_id = v_user_id
    AND topic.id = v_current_topic_id;

  DROP TABLE IF EXISTS pg_temp.recommended_selection;
  CREATE TEMP TABLE recommended_selection (
    question_id uuid PRIMARY KEY,
    target_bucket text NOT NULL,
    selection_group text NOT NULL,
    selection_reason text NOT NULL,
    base_weight numeric(8,3) NOT NULL,
    final_weight numeric(8,3) NOT NULL,
    was_in_previous_test boolean NOT NULL,
    draw_score double precision NOT NULL
  ) ON COMMIT DROP;

  WITH pool AS (
    SELECT
      question.id AS question_id,
      question.topic_id,
      COALESCE(question.nivel_pedagogico, 'aprendizaje') AS learning_stage,
      stage_progress.recommended_stage,
      COALESCE(statistics.appearances_count, 0) AS appearances_count,
      COALESCE(statistics.answered_count, 0) AS answered_count,
      COALESCE(statistics.correct_count, 0) AS correct_count,
      COALESCE(statistics.current_incorrect_streak, 0) AS incorrect_streak,
      statistics.last_seen_at,
      statistics.next_review_at,
      (active_failure.question_id IS NOT NULL) AS is_active_failure,
      (active_doubt.question_id IS NOT NULL) AS is_active_doubt,
      (previous_answer.question_id IS NOT NULL) AS in_previous_test
    FROM public.questions AS question
    LEFT JOIN public.question_statistics AS statistics
      ON statistics.user_id = question.user_id
     AND statistics.question_id = question.id
    LEFT JOIN public.active_failed_questions AS active_failure
      ON active_failure.user_id = question.user_id
     AND active_failure.question_id = question.id
    LEFT JOIN public.active_doubt_questions AS active_doubt
      ON active_doubt.user_id = question.user_id
     AND active_doubt.question_id = question.id
    LEFT JOIN public.test_answers AS previous_answer
      ON previous_answer.user_id = question.user_id
     AND previous_answer.question_id = question.id
     AND previous_answer.test_id = v_previous_test_id
    JOIN public.get_learning_stage_progress() AS stage_progress
      ON stage_progress.topic_id = question.topic_id
    WHERE question.user_id = v_user_id
      AND question.activa IS TRUE
      AND CASE COALESCE(question.nivel_pedagogico, 'aprendizaje')
        WHEN 'aprendizaje' THEN 1
        WHEN 'consolidacion' THEN 2
        WHEN 'tribunal' THEN 3
        ELSE 1
      END <= CASE stage_progress.recommended_stage
        WHEN 'aprendizaje' THEN 1
        WHEN 'consolidacion' THEN 2
        WHEN 'tribunal' THEN 3
        ELSE 1
      END
      AND (
        COALESCE(question.nivel_pedagogico, 'aprendizaje') = stage_progress.recommended_stage
        OR active_failure.question_id IS NOT NULL
        OR active_doubt.question_id IS NOT NULL
        OR statistics.next_review_at <= now()
      )
  ),
  classified AS (
    SELECT
      pool.*,
      CASE
        WHEN pool.is_active_failure
          OR pool.is_active_doubt
          OR pool.next_review_at <= now() THEN 'review'
        WHEN pool.topic_id = v_current_topic_id THEN 'current_topic'
        WHEN pool.answered_count >= 2
          AND (
            pool.incorrect_streak > 0
            OR pool.correct_count::numeric / NULLIF(pool.answered_count, 0) < 0.70
          ) THEN 'weak'
        WHEN pool.appearances_count = 0
          OR pool.last_seen_at < now() - interval '14 days' THEN 'retention_new'
        ELSE 'fallback'
      END AS target_bucket,
      CASE
        WHEN pool.is_active_failure AND pool.is_active_doubt THEN 'fallo_duda'
        WHEN pool.is_active_failure THEN 'fallo'
        WHEN pool.is_active_doubt THEN 'duda'
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
        + CASE WHEN pool.is_active_failure THEN 7 ELSE 0 END
        + CASE WHEN pool.is_active_doubt THEN 6 ELSE 0 END
        + CASE WHEN pool.next_review_at <= now() THEN 5 ELSE 0 END
        + CASE
            WHEN pool.next_review_at <= now() THEN
              least(
                floor(extract(epoch FROM (now() - pool.next_review_at)) / 86400),
                7
              ) * 0.25
            ELSE 0
          END
        + CASE WHEN pool.appearances_count = 0 THEN 5 ELSE 0 END
        + CASE
            WHEN pool.answered_count >= 2
              AND pool.correct_count::numeric / NULLIF(pool.answered_count, 0) < 0.70
              THEN 4
            ELSE 0
          END
        + CASE
            WHEN pool.last_seen_at < now() - interval '14 days' THEN 2
            ELSE 0
          END
        + CASE WHEN pool.topic_id = v_current_topic_id THEN 2 ELSE 0 END
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
  ranked AS (
    SELECT
      sampled.*,
      row_number() OVER (
        PARTITION BY sampled.target_bucket
        ORDER BY sampled.draw_score, sampled.question_id
      ) AS bucket_rank
    FROM sampled
  ),
  quota_selection AS (
    SELECT ranked.*
    FROM ranked
    WHERE (ranked.target_bucket = 'review' AND ranked.bucket_rank <= v_review_quota)
       OR (ranked.target_bucket = 'current_topic' AND ranked.bucket_rank <= v_current_quota)
       OR (ranked.target_bucket = 'weak' AND ranked.bucket_rank <= v_weak_quota)
       OR (ranked.target_bucket = 'retention_new' AND ranked.bucket_rank <= v_retention_quota)
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
      CASE ranked.target_bucket
        WHEN 'review' THEN 1
        WHEN 'weak' THEN 2
        WHEN 'current_topic' THEN 3
        WHEN 'retention_new' THEN 4
        ELSE 5
      END,
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
  )
  INSERT INTO recommended_selection (
    question_id,
    target_bucket,
    selection_group,
    selection_reason,
    base_weight,
    final_weight,
    was_in_previous_test,
    draw_score
  )
  SELECT
    selected.question_id,
    selected.target_bucket,
    selected.selection_group,
    CASE selected.selection_group
      WHEN 'fallo_duda' THEN 'Repaso prioritario de un fallo y una duda activos'
      WHEN 'fallo' THEN 'Repaso prioritario de un fallo activo'
      WHEN 'duda' THEN 'Repaso prioritario de una duda activa'
      WHEN 'repaso_programado' THEN 'Repaso programado para comprobar la retención'
      WHEN 'rendimiento_bajo' THEN 'Refuerzo de una pregunta con rendimiento bajo'
      WHEN 'nueva' THEN 'Ampliación con una pregunta todavía no vista'
      WHEN 'retencion' THEN 'Comprobación de un contenido no visto recientemente'
      WHEN 'poco_vista' THEN 'Práctica de una pregunta todavía poco vista'
      ELSE CASE selected.target_bucket
        WHEN 'current_topic' THEN 'Continuidad con el tema trabajado recientemente'
        ELSE 'Redistribución para completar la sesión con variedad'
      END
    END,
    selected.base_weight,
    selected.final_weight,
    selected.in_previous_test,
    selected.draw_score
  FROM selected;

  SELECT count(*)::integer
  INTO v_selected_count
  FROM recommended_selection;

  IF v_selected_count = 0 THEN
    RAISE EXCEPTION 'No active questions available';
  END IF;

  INSERT INTO public.tests (
    user_id,
    tipo,
    numero_preguntas,
    sin_responder
  )
  VALUES (
    v_user_id,
    'recomendada',
    v_selected_count,
    v_selected_count
  )
  RETURNING id INTO v_test_id;

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
    selected.question_id,
    row_number() OVER (ORDER BY selected.draw_score, selected.question_id)::integer,
    selected.selection_group,
    selected.selection_reason,
    selected.base_weight,
    selected.final_weight,
    selected.was_in_previous_test,
    selected.was_in_previous_test
      AND (
        SELECT count(*)
        FROM recommended_selection AS alternative
        WHERE alternative.was_in_previous_test IS FALSE
      ) < least(ceil(v_selected_count * 0.70)::integer, v_selected_count),
    'recommended-v3.0'
  FROM recommended_selection AS selected;

  INSERT INTO public.test_answers (
    user_id,
    test_id,
    question_id,
    orden
  )
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
    count(*) FILTER (WHERE selected.target_bucket = 'review')::integer,
    count(*) FILTER (WHERE selected.target_bucket = 'current_topic')::integer,
    count(*) FILTER (WHERE selected.target_bucket = 'weak')::integer,
    count(*) FILTER (WHERE selected.target_bucket = 'retention_new')::integer,
    count(*) FILTER (WHERE selected.target_bucket = 'fallback')::integer,
    v_current_topic_id,
    v_current_topic_name
  FROM recommended_selection AS selected;
END;
$$;

REVOKE ALL ON FUNCTION public.create_recommended_test(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_recommended_test(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_recommended_test(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_recommended_test(integer) TO service_role;

COMMENT ON FUNCTION public.create_recommended_test(integer) IS
  'Creates recommended-v3.0 sessions, prioritizing failures, doubts and scheduled retention without unlocking future stages.';
