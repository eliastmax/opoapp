-- Sprint 22: mixed-stage practice after completing the three-stage route.

ALTER TABLE public.tests
  DROP CONSTRAINT IF EXISTS tests_learning_stage_check;

ALTER TABLE public.tests
  ADD CONSTRAINT tests_learning_stage_check
  CHECK (
    learning_stage IS NULL
    OR learning_stage IN ('aprendizaje', 'consolidacion', 'tribunal', 'mezcladas')
  );

CREATE OR REPLACE FUNCTION public.create_mixed_stage_test(
  p_topic_ids uuid[],
  p_mode text DEFAULT 'mezcladas',
  p_question_count integer DEFAULT 10,
  p_subtopic_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  test_id uuid,
  selected_count integer,
  requested_topic_count integer,
  covered_topic_count integer,
  covered_stage_count integer
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
  v_unlocked_topic_count integer;
  v_test_id uuid;
  v_previous_test_id uuid;
  v_selected_count integer;
  v_covered_topic_count integer;
  v_covered_stage_count integer;
  v_target_non_overlap integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT array_agg(requested.id ORDER BY requested.id)
  INTO v_topic_ids
  FROM (
    SELECT DISTINCT unnest(p_topic_ids) AS id
  ) AS requested
  WHERE requested.id IS NOT NULL;

  v_topic_count := COALESCE(cardinality(v_topic_ids), 0);

  IF v_topic_count < 1 THEN
    RAISE EXCEPTION 'Select at least one topic';
  END IF;
  IF v_topic_count > 50 THEN
    RAISE EXCEPTION 'No more than 50 topics can be selected';
  END IF;
  IF p_mode NOT IN ('mezcladas', 'nuevas', 'falladas', 'dudas') THEN
    RAISE EXCEPTION 'Invalid test mode';
  END IF;
  IF p_question_count < 1 OR p_question_count > 100 THEN
    RAISE EXCEPTION 'Question count must be between 1 and 100';
  END IF;
  IF v_topic_count > 1 AND p_question_count < v_topic_count THEN
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

  SELECT count(*)::integer
  INTO v_unlocked_topic_count
  FROM public.get_learning_stage_progress() AS progress
  WHERE progress.topic_id = ANY(v_topic_ids)
    AND progress.tribunal_unlocked;

  IF v_unlocked_topic_count <> v_topic_count THEN
    RAISE EXCEPTION 'Mixed-stage practice requires Tribunal to be unlocked in every selected topic';
  END IF;

  IF p_subtopic_ids IS NOT NULL AND cardinality(p_subtopic_ids) > 0 THEN
    IF v_topic_count <> 1 THEN
      RAISE EXCEPTION 'Subtopic filters are only available for a single topic';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM unnest(p_subtopic_ids) AS requested(id)
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.subtopics AS subtopic
        WHERE subtopic.user_id = v_user_id
          AND subtopic.topic_id = v_topic_ids[1]
          AND subtopic.id = requested.id
      )
    ) THEN
      RAISE EXCEPTION 'Invalid subtopic filter';
    END IF;
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
    CASE
      WHEN v_topic_count = 1 THEN 'niveles_mezclados_' || p_mode
      ELSE 'multitema_niveles_mezclados_' || p_mode
    END,
    p_question_count,
    p_question_count,
    'mezcladas',
    false
  )
  RETURNING id INTO v_test_id;

  v_target_non_overlap := p_question_count - floor(p_question_count * 0.30)::integer;

  WITH pool AS MATERIALIZED (
    SELECT
      question.id AS question_id,
      question.topic_id,
      COALESCE(question.nivel_pedagogico, 'aprendizaje') AS question_stage,
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
      AND COALESCE(question.nivel_pedagogico, 'aprendizaje')
        IN ('aprendizaje', 'consolidacion', 'tribunal')
      AND (
        p_subtopic_ids IS NULL
        OR cardinality(p_subtopic_ids) = 0
        OR question.subtopic_id = ANY(p_subtopic_ids)
      )
      AND CASE p_mode
        WHEN 'nuevas' THEN COALESCE(statistics.answered_count, 0) = 0
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
        WHEN pool.answered_count = 0 THEN 'nueva'
        WHEN pool.next_review_at <= now() THEN 'repaso_programado'
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
        + CASE WHEN pool.answered_count = 0 THEN 5 ELSE 0 END
        + CASE
            WHEN pool.answered_count >= 2
              AND pool.correct_count::numeric / NULLIF(pool.answered_count, 0) < 0.70
              THEN 4 ELSE 0
          END
        + CASE WHEN pool.last_seen_at < now() - interval '14 days' THEN 3 ELSE 0 END
        + CASE WHEN pool.appearances_count BETWEEN 1 AND 2 THEN 2 ELSE 0 END
      )::numeric(8,3) AS base_weight
    FROM pool
  ),
  sampled AS (
    SELECT
      classified.*,
      (
        classified.base_weight
        * CASE WHEN classified.in_previous_test THEN 0.25 ELSE 1.00 END
      )::numeric(8,3) AS final_weight,
      (
        -ln(greatest(random(), 0.000000001))
        / (
          classified.base_weight
          * CASE WHEN classified.in_previous_test THEN 0.25 ELSE 1.00 END
        )
      ) AS draw_score
    FROM classified
  ),
  topic_ranked AS (
    SELECT
      sampled.*,
      row_number() OVER (
        PARTITION BY sampled.topic_id
        ORDER BY sampled.in_previous_test, sampled.draw_score, sampled.question_id
      )::integer AS topic_rank
    FROM sampled
  ),
  topic_first AS (
    SELECT topic_ranked.*
    FROM topic_ranked
    WHERE topic_ranked.topic_rank = 1
    ORDER BY topic_ranked.topic_id
    LIMIT p_question_count
  ),
  remaining_ranked AS (
    SELECT
      sampled.*,
      row_number() OVER (
        PARTITION BY sampled.topic_id, sampled.question_stage
        ORDER BY sampled.in_previous_test, sampled.draw_score, sampled.question_id
      )::integer AS cell_rank
    FROM sampled
    WHERE NOT EXISTS (
      SELECT 1 FROM topic_first
      WHERE topic_first.question_id = sampled.question_id
    )
  ),
  stage_fill AS (
    SELECT remaining_ranked.*
    FROM remaining_ranked
    ORDER BY
      remaining_ranked.cell_rank,
      remaining_ranked.in_previous_test,
      remaining_ranked.draw_score,
      remaining_ranked.question_id
    LIMIT GREATEST(p_question_count - (SELECT count(*) FROM topic_first), 0)
  ),
  selected AS (
    SELECT
      topic_first.question_id, topic_first.topic_id, topic_first.question_stage,
      topic_first.appearances_count, topic_first.answered_count, topic_first.correct_count,
      topic_first.last_seen_at, topic_first.next_review_at, topic_first.is_failure,
      topic_first.is_doubt, topic_first.in_previous_test, topic_first.selection_group,
      topic_first.base_weight, topic_first.final_weight, topic_first.draw_score
    FROM topic_first
    UNION ALL
    SELECT
      stage_fill.question_id, stage_fill.topic_id, stage_fill.question_stage,
      stage_fill.appearances_count, stage_fill.answered_count, stage_fill.correct_count,
      stage_fill.last_seen_at, stage_fill.next_review_at, stage_fill.is_failure,
      stage_fill.is_doubt, stage_fill.in_previous_test, stage_fill.selection_group,
      stage_fill.base_weight, stage_fill.final_weight, stage_fill.draw_score
    FROM stage_fill
  ),
  ordered AS (
    SELECT
      selected.*,
      row_number() OVER (ORDER BY random(), selected.question_id)::integer AS selection_order,
      count(*) FILTER (WHERE selected.in_previous_test IS FALSE) OVER ()::integer
        AS non_overlap_count
    FROM selected
  )
  INSERT INTO public.test_question_selection (
    user_id, test_id, question_id, selection_order, selection_group, selection_reason,
    base_weight, final_weight, was_in_previous_test, overlap_exception, algorithm_version
  )
  SELECT
    v_user_id,
    v_test_id,
    ordered.question_id,
    ordered.selection_order,
    ordered.selection_group,
    CASE ordered.selection_group
      WHEN 'fallo_duda' THEN 'Fallo y duda activos en la práctica de niveles mezclados'
      WHEN 'fallo' THEN 'Fallo pendiente en la práctica de niveles mezclados'
      WHEN 'duda' THEN 'Duda pendiente en la práctica de niveles mezclados'
      WHEN 'repaso_programado' THEN 'Repaso programado en la práctica de niveles mezclados'
      WHEN 'nueva' THEN 'Pregunta aún no respondida en la práctica de niveles mezclados'
      WHEN 'rendimiento_bajo' THEN 'Rendimiento bajo en la práctica de niveles mezclados'
      WHEN 'retencion' THEN 'Retención pendiente en la práctica de niveles mezclados'
      WHEN 'poco_vista' THEN 'Pregunta poco vista en la práctica de niveles mezclados'
      ELSE 'Variedad equilibrada entre temas y niveles'
    END,
    ordered.base_weight,
    ordered.final_weight,
    ordered.in_previous_test,
    ordered.in_previous_test AND ordered.non_overlap_count < v_target_non_overlap,
    'mixed-stages-v1.0'
  FROM ordered;

  GET DIAGNOSTICS v_selected_count = ROW_COUNT;

  IF v_selected_count = 0 THEN
    RAISE EXCEPTION 'No questions match the selected topics and mode';
  END IF;

  SELECT
    count(DISTINCT question.topic_id)::integer,
    count(DISTINCT COALESCE(question.nivel_pedagogico, 'aprendizaje'))::integer
  INTO v_covered_topic_count, v_covered_stage_count
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
  SELECT selection.user_id, selection.test_id, selection.question_id, selection.selection_order
  FROM public.test_question_selection AS selection
  WHERE selection.user_id = v_user_id
    AND selection.test_id = v_test_id
  ORDER BY selection.selection_order;

  RETURN QUERY
  SELECT v_test_id, v_selected_count, v_topic_count, v_covered_topic_count, v_covered_stage_count;
END;
$$;

REVOKE ALL ON FUNCTION public.create_mixed_stage_test(uuid[], text, integer, uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_mixed_stage_test(uuid[], text, integer, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_mixed_stage_test(uuid[], text, integer, uuid[])
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_mixed_stage_test(uuid[], text, integer, uuid[])
  TO service_role;

COMMENT ON FUNCTION public.create_mixed_stage_test(uuid[], text, integer, uuid[]) IS
  'Creates an atomic test balanced across owned topics and all three pedagogical stages after Tribunal is unlocked; unanswered appearances remain eligible as new.';
