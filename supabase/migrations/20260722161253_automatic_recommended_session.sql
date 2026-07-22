-- V2 automatic recommended session: global, explainable and transactional.
-- It reuses the smart-selection trace table and derives ownership from auth.uid().

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

  -- With no usable history, start from the first numbered topic with stock.
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
    WHERE question.user_id = v_user_id
      AND question.activa IS TRUE
  ),
  classified AS (
    SELECT
      pool.*,
      CASE
        WHEN pool.is_active_failure OR pool.is_active_doubt THEN 'review'
        WHEN pool.topic_id = v_current_topic_id THEN 'current_topic'
        WHEN pool.answered_count >= 2
          AND (
            pool.incorrect_streak > 0
            OR pool.correct_count::numeric / NULLIF(pool.answered_count, 0) < 0.70
          ) THEN 'weak'
        WHEN pool.appearances_count = 0
          OR pool.next_review_at <= now()
          OR pool.last_seen_at < now() - interval '14 days' THEN 'retention_new'
        ELSE 'fallback'
      END AS target_bucket,
      CASE
        WHEN pool.is_active_failure AND pool.is_active_doubt THEN 'fallo_duda'
        WHEN pool.is_active_failure THEN 'fallo'
        WHEN pool.is_active_doubt THEN 'duda'
        WHEN pool.appearances_count = 0 THEN 'nueva'
        WHEN pool.answered_count >= 2
          AND pool.correct_count::numeric / NULLIF(pool.answered_count, 0) < 0.70
          THEN 'rendimiento_bajo'
        WHEN pool.next_review_at <= now()
          OR pool.last_seen_at < now() - interval '14 days' THEN 'retencion'
        WHEN pool.appearances_count <= 2 THEN 'poco_vista'
        ELSE 'variedad'
      END AS selection_group,
      (
        1
        + CASE WHEN pool.is_active_failure THEN 7 ELSE 0 END
        + CASE WHEN pool.is_active_doubt THEN 6 ELSE 0 END
        + CASE WHEN pool.appearances_count = 0 THEN 5 ELSE 0 END
        + CASE
            WHEN pool.answered_count >= 2
              AND pool.correct_count::numeric / NULLIF(pool.answered_count, 0) < 0.70
              THEN 4
            ELSE 0
          END
        + CASE
            WHEN pool.next_review_at <= now()
              OR pool.last_seen_at < now() - interval '14 days' THEN 3
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
  ranked AS (
    SELECT
      weighted.*,
      (-ln(greatest(random(), 0.000000001)) / weighted.final_weight) AS draw_score,
      row_number() OVER (
        PARTITION BY weighted.target_bucket
        ORDER BY
          (-ln(greatest(random(), 0.000000001)) / weighted.final_weight),
          weighted.question_id
      ) AS bucket_rank
    FROM weighted
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
    CASE selected.target_bucket
      WHEN 'review' THEN 'Repaso prioritario de un fallo o una duda activa'
      WHEN 'current_topic' THEN 'Continuidad con el tema trabajado recientemente'
      WHEN 'weak' THEN 'Refuerzo de una pregunta con rendimiento bajo'
      WHEN 'retention_new' THEN 'Retención o ampliación con una pregunta nueva'
      ELSE 'Redistribución para completar la sesión con variedad'
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
    'recommended-v1.0'
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
  'Creates an explainable automatic session: 40% review, 30% current topic, 20% weak points and 10% retention/new, redistributing shortages without duplicates.';
