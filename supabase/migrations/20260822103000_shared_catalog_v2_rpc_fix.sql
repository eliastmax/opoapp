-- Shared catalog remediation for legacy V2 practice RPCs.
-- Catalog rows are scoped by opposition_id; learner state remains scoped by auth.uid().

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
  v_opposition_id uuid;
  v_test_id uuid;
  v_selected_count integer;
  v_covered_topic_count integer;
  v_available_topic_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_opposition_id := public.current_active_opposition_id();
  IF v_opposition_id IS NULL THEN
    RAISE EXCEPTION 'An active opposition is required' USING ERRCODE = '42501';
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
  WHERE question.opposition_id = v_opposition_id
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
    WHERE question.opposition_id = v_opposition_id
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
    ON question.id = selection.question_id
   AND question.opposition_id = v_opposition_id
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
  v_opposition_id uuid;
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

  v_opposition_id := public.current_active_opposition_id();
  IF v_opposition_id IS NULL THEN
    RAISE EXCEPTION 'An active opposition is required' USING ERRCODE = '42501';
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
  WHERE topic.opposition_id = v_opposition_id
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
        WHERE subtopic.opposition_id = v_opposition_id
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
    AND previous.opposition_id = v_opposition_id
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
      ON statistics.user_id = v_user_id
     AND statistics.question_id = question.id
    LEFT JOIN public.active_failed_questions AS failure
      ON failure.user_id = v_user_id
     AND failure.question_id = question.id
    LEFT JOIN public.active_doubt_questions AS doubt
      ON doubt.user_id = v_user_id
     AND doubt.question_id = question.id
    LEFT JOIN public.test_answers AS previous_answer
      ON previous_answer.user_id = v_user_id
     AND previous_answer.question_id = question.id
     AND previous_answer.test_id = v_previous_test_id
    WHERE question.opposition_id = v_opposition_id
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
    ON question.id = selection.question_id
   AND question.opposition_id = v_opposition_id
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
  v_opposition_id uuid;
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

  v_opposition_id := public.current_active_opposition_id();
  IF v_opposition_id IS NULL THEN
    RAISE EXCEPTION 'An active opposition is required' USING ERRCODE = '42501';
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
  WHERE topic.opposition_id = v_opposition_id
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
    AND previous.opposition_id = v_opposition_id
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
      ON statistics.user_id = v_user_id
     AND statistics.question_id = question.id
    LEFT JOIN public.active_failed_questions AS failure
      ON failure.user_id = v_user_id
     AND failure.question_id = question.id
    LEFT JOIN public.active_doubt_questions AS doubt
      ON doubt.user_id = v_user_id
     AND doubt.question_id = question.id
    LEFT JOIN public.test_answers AS previous_answer
      ON previous_answer.user_id = v_user_id
     AND previous_answer.question_id = question.id
     AND previous_answer.test_id = v_previous_test_id
    WHERE question.opposition_id = v_opposition_id
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
    ON question.id = selection.question_id
   AND question.opposition_id = v_opposition_id
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
CREATE OR REPLACE FUNCTION public.create_smart_test(
  p_topic_id uuid,
  p_subtopic_ids uuid[] DEFAULT NULL,
  p_difficulties public.dificultad_enum[] DEFAULT ARRAY[
    'facil'::public.dificultad_enum,
    'medio'::public.dificultad_enum,
    'dificil'::public.dificultad_enum
  ],
  p_question_count integer DEFAULT 10
)
RETURNS TABLE (
  test_id uuid,
  selected_count integer,
  overlap_count integer,
  overlap_limit integer,
  used_overlap_exception boolean
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_opposition_id uuid;
  v_test_id uuid;
  v_previous_test_id uuid;
  v_selected_count integer;
  v_overlap_count integer;
  v_overlap_limit integer := floor(p_question_count * 0.30)::integer;
  v_target_non_overlap integer := p_question_count - floor(p_question_count * 0.30)::integer;
  v_non_overlap_available integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_opposition_id := public.current_active_opposition_id();
  IF v_opposition_id IS NULL THEN
    RAISE EXCEPTION 'An active opposition is required' USING ERRCODE = '42501';
  END IF;

  IF p_question_count < 1 OR p_question_count > 100 THEN
    RAISE EXCEPTION 'Question count must be between 1 and 100';
  END IF;

  IF p_difficulties IS NULL OR cardinality(p_difficulties) = 0 THEN
    RAISE EXCEPTION 'At least one difficulty is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.topics AS topic
    WHERE topic.id = p_topic_id
      AND topic.opposition_id = v_opposition_id
  ) THEN
    RAISE EXCEPTION 'Topic not found';
  END IF;

  IF p_subtopic_ids IS NOT NULL AND EXISTS (
    SELECT 1
    FROM unnest(p_subtopic_ids) AS requested_subtopic(id)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.subtopics AS subtopic
      WHERE subtopic.id = requested_subtopic.id
        AND subtopic.topic_id = p_topic_id
        AND subtopic.opposition_id = v_opposition_id
    )
  ) THEN
    RAISE EXCEPTION 'Invalid subtopic filter';
  END IF;

  SELECT previous_test.id
  INTO v_previous_test_id
  FROM public.tests AS previous_test
  WHERE previous_test.user_id = v_user_id
    AND previous_test.opposition_id = v_opposition_id
    AND previous_test.completado IS TRUE
    AND previous_test.fecha_finalizacion IS NOT NULL
  ORDER BY previous_test.fecha_finalizacion DESC, previous_test.id DESC
  LIMIT 1;

  INSERT INTO public.tests (
    user_id,
    tipo,
    numero_preguntas,
    sin_responder
  )
  VALUES (
    v_user_id,
    'mezcladas',
    p_question_count,
    p_question_count
  )
  RETURNING id INTO v_test_id;

  WITH recent_tests AS (
    SELECT recent_test.id
    FROM public.tests AS recent_test
    WHERE recent_test.user_id = v_user_id
      AND recent_test.opposition_id = v_opposition_id
      AND recent_test.completado IS TRUE
      AND recent_test.fecha_finalizacion IS NOT NULL
    ORDER BY recent_test.fecha_finalizacion DESC, recent_test.id DESC
    LIMIT 3
  ),
  recent_questions AS (
    SELECT answer.question_id, count(*)::integer AS recent_appearances
    FROM public.test_answers AS answer
    JOIN recent_tests ON recent_tests.id = answer.test_id
    WHERE answer.user_id = v_user_id
    GROUP BY answer.question_id
  ),
  pool AS (
    SELECT
      question.id AS question_id,
      statistics.appearances_count,
      statistics.answered_count,
      statistics.correct_count,
      statistics.last_seen_at,
      (active_failure.question_id IS NOT NULL) AS is_active_failure,
      (active_doubt.question_id IS NOT NULL) AS is_active_doubt,
      (previous_answer.question_id IS NOT NULL) AS in_previous_test,
      COALESCE(recent_questions.recent_appearances, 0) AS recent_appearances
    FROM public.questions AS question
    LEFT JOIN public.question_statistics AS statistics
      ON statistics.user_id = v_user_id
     AND statistics.question_id = question.id
    LEFT JOIN public.active_failed_questions AS active_failure
      ON active_failure.user_id = v_user_id
     AND active_failure.question_id = question.id
    LEFT JOIN public.active_doubt_questions AS active_doubt
      ON active_doubt.user_id = v_user_id
     AND active_doubt.question_id = question.id
    LEFT JOIN public.test_answers AS previous_answer
      ON previous_answer.user_id = v_user_id
     AND previous_answer.question_id = question.id
     AND previous_answer.test_id = v_previous_test_id
    LEFT JOIN recent_questions
      ON recent_questions.question_id = question.id
    WHERE question.opposition_id = v_opposition_id
      AND question.activa IS TRUE
      AND question.topic_id = p_topic_id
      AND question.dificultad = ANY(p_difficulties)
      AND (
        p_subtopic_ids IS NULL
        OR cardinality(p_subtopic_ids) = 0
        OR question.subtopic_id = ANY(p_subtopic_ids)
      )
  ),
  classified AS (
    SELECT
      pool.*,
      CASE
        WHEN pool.is_active_failure AND pool.is_active_doubt THEN 'fallo_duda'
        WHEN pool.is_active_failure THEN 'fallo'
        WHEN pool.is_active_doubt THEN 'duda'
        WHEN pool.appearances_count IS NULL OR pool.appearances_count = 0 THEN 'nueva'
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
        + CASE WHEN pool.appearances_count IS NULL OR pool.appearances_count = 0 THEN 5 ELSE 0 END
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
        * CASE
            WHEN classified.in_previous_test THEN 0.25
            WHEN classified.recent_appearances > 0 THEN 0.60
            ELSE 1.00
          END
      )::numeric(8,3) AS final_weight
    FROM classified
  ),
  sampled AS (
    SELECT
      weighted.*,
      (-ln(greatest(random(), 0.000000001)) / weighted.final_weight) AS draw_score
    FROM weighted
  ),
  preferred_non_overlap AS (
    SELECT sampled.*
    FROM sampled
    WHERE sampled.in_previous_test IS FALSE
    ORDER BY sampled.draw_score, sampled.question_id
    LIMIT v_target_non_overlap
  ),
  remaining AS (
    SELECT sampled.*
    FROM sampled
    WHERE NOT EXISTS (
      SELECT 1
      FROM preferred_non_overlap
      WHERE preferred_non_overlap.question_id = sampled.question_id
    )
    ORDER BY sampled.draw_score, sampled.question_id
    LIMIT GREATEST(
      p_question_count - (SELECT count(*) FROM preferred_non_overlap),
      0
    )
  ),
  selected AS (
    SELECT * FROM preferred_non_overlap
    UNION ALL
    SELECT * FROM remaining
  ),
  ordered_selection AS (
    SELECT
      selected.*,
      row_number() OVER (ORDER BY selected.draw_score, selected.question_id)::integer AS selection_order,
      count(*) FILTER (WHERE selected.in_previous_test IS FALSE) OVER ()::integer AS non_overlap_available
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
    ordered_selection.question_id,
    ordered_selection.selection_order,
    ordered_selection.selection_group,
    CASE ordered_selection.selection_group
      WHEN 'fallo_duda' THEN 'Fallo y duda activos'
      WHEN 'fallo' THEN 'Fallo pendiente de corregir'
      WHEN 'duda' THEN 'Duda pendiente de repasar'
      WHEN 'nueva' THEN 'Pregunta todavía no vista'
      WHEN 'rendimiento_bajo' THEN 'Rendimiento bajo en intentos anteriores'
      WHEN 'retencion' THEN 'Repaso por tiempo transcurrido'
      WHEN 'poco_vista' THEN 'Pregunta vista pocas veces'
      ELSE 'Variedad y cobertura del tema'
    END,
    ordered_selection.base_weight,
    ordered_selection.final_weight,
    ordered_selection.in_previous_test,
    ordered_selection.in_previous_test
      AND ordered_selection.non_overlap_available < v_target_non_overlap,
    'smart-v1.0'
  FROM ordered_selection;

  GET DIAGNOSTICS v_selected_count = ROW_COUNT;

  IF v_selected_count = 0 THEN
    RAISE EXCEPTION 'No questions match the selected filters';
  END IF;

  SELECT count(*) FILTER (WHERE selection.was_in_previous_test IS TRUE)::integer
  INTO v_overlap_count
  FROM public.test_question_selection AS selection
  WHERE selection.user_id = v_user_id
    AND selection.test_id = v_test_id;

  SELECT count(*)::integer
  INTO v_non_overlap_available
  FROM public.questions AS question
  WHERE question.opposition_id = v_opposition_id
    AND question.activa IS TRUE
    AND question.topic_id = p_topic_id
    AND question.dificultad = ANY(p_difficulties)
    AND (
      p_subtopic_ids IS NULL
      OR cardinality(p_subtopic_ids) = 0
      OR question.subtopic_id = ANY(p_subtopic_ids)
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.test_answers AS previous_answer
      WHERE previous_answer.user_id = v_user_id
        AND previous_answer.test_id = v_previous_test_id
        AND previous_answer.question_id = question.id
    );

  UPDATE public.tests AS test
  SET numero_preguntas = v_selected_count,
      sin_responder = v_selected_count
  WHERE test.id = v_test_id
    AND test.user_id = v_user_id;

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
    v_overlap_count,
    LEAST(v_overlap_limit, v_selected_count),
    v_non_overlap_available < LEAST(v_target_non_overlap, v_selected_count);
END;
$$;
CREATE OR REPLACE FUNCTION public.create_level_test(
  p_topic_id uuid,
  p_learning_stage text,
  p_question_count integer DEFAULT 10,
  p_free_mode boolean DEFAULT false,
  p_subtopic_ids uuid[] DEFAULT NULL,
  p_difficulties public.dificultad_enum[] DEFAULT ARRAY[
    'facil'::public.dificultad_enum,
    'medio'::public.dificultad_enum,
    'dificil'::public.dificultad_enum
  ]
)
RETURNS TABLE (
  test_id uuid,
  selected_count integer,
  requested_stage text,
  free_mode boolean,
  was_locked_override boolean
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_opposition_id uuid;
  v_test_id uuid;
  v_previous_test_id uuid;
  v_selected_count integer;
  v_consolidation_unlocked boolean;
  v_tribunal_unlocked boolean;
  v_locked boolean := false;
  v_target_non_overlap integer := p_question_count - floor(p_question_count * 0.30)::integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_opposition_id := public.current_active_opposition_id();
  IF v_opposition_id IS NULL THEN
    RAISE EXCEPTION 'An active opposition is required' USING ERRCODE = '42501';
  END IF;

  IF p_learning_stage NOT IN ('aprendizaje', 'consolidacion', 'tribunal') THEN
    RAISE EXCEPTION 'Invalid learning stage';
  END IF;

  IF p_question_count < 1 OR p_question_count > 100 THEN
    RAISE EXCEPTION 'Question count must be between 1 and 100';
  END IF;

  IF p_difficulties IS NULL OR cardinality(p_difficulties) = 0 THEN
    RAISE EXCEPTION 'At least one difficulty is required';
  END IF;

  SELECT progress.consolidation_unlocked, progress.tribunal_unlocked
  INTO v_consolidation_unlocked, v_tribunal_unlocked
  FROM public.get_learning_stage_progress() AS progress
  WHERE progress.topic_id = p_topic_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Topic not found';
  END IF;

  v_locked :=
    (p_learning_stage = 'consolidacion' AND NOT v_consolidation_unlocked)
    OR (p_learning_stage = 'tribunal' AND NOT v_tribunal_unlocked);

  IF v_locked AND NOT p_free_mode THEN
    RAISE EXCEPTION 'Learning stage is locked; use free mode explicitly';
  END IF;

  IF p_subtopic_ids IS NOT NULL AND EXISTS (
    SELECT 1
    FROM unnest(p_subtopic_ids) AS requested(id)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.subtopics AS subtopic
      WHERE subtopic.opposition_id = v_opposition_id
        AND subtopic.topic_id = p_topic_id
        AND subtopic.id = requested.id
    )
  ) THEN
    RAISE EXCEPTION 'Invalid subtopic filter';
  END IF;

  SELECT previous.id
  INTO v_previous_test_id
  FROM public.tests AS previous
  WHERE previous.user_id = v_user_id
    AND previous.opposition_id = v_opposition_id
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
    'nivel_' || p_learning_stage,
    p_question_count,
    p_question_count,
    p_learning_stage,
    v_locked AND p_free_mode
  )
  RETURNING id INTO v_test_id;

  WITH pool AS (
    SELECT
      question.id AS question_id,
      COALESCE(statistics.appearances_count, 0) AS appearances_count,
      COALESCE(statistics.answered_count, 0) AS answered_count,
      COALESCE(statistics.correct_count, 0) AS correct_count,
      statistics.last_seen_at,
      (failure.question_id IS NOT NULL) AS is_failure,
      (doubt.question_id IS NOT NULL) AS is_doubt,
      (previous_answer.question_id IS NOT NULL) AS in_previous_test
    FROM public.questions AS question
    LEFT JOIN public.question_statistics AS statistics
      ON statistics.user_id = v_user_id
     AND statistics.question_id = question.id
    LEFT JOIN public.active_failed_questions AS failure
      ON failure.user_id = v_user_id
     AND failure.question_id = question.id
    LEFT JOIN public.active_doubt_questions AS doubt
      ON doubt.user_id = v_user_id
     AND doubt.question_id = question.id
    LEFT JOIN public.test_answers AS previous_answer
      ON previous_answer.user_id = v_user_id
     AND previous_answer.question_id = question.id
     AND previous_answer.test_id = v_previous_test_id
    WHERE question.opposition_id = v_opposition_id
      AND question.activa IS TRUE
      AND question.topic_id = p_topic_id
      AND (
        question.nivel_pedagogico = p_learning_stage
        OR (p_learning_stage = 'aprendizaje' AND question.nivel_pedagogico IS NULL)
      )
      AND question.dificultad = ANY(p_difficulties)
      AND (
        p_subtopic_ids IS NULL
        OR cardinality(p_subtopic_ids) = 0
        OR question.subtopic_id = ANY(p_subtopic_ids)
      )
  ),
  classified AS (
    SELECT
      pool.*,
      CASE
        WHEN pool.is_failure AND pool.is_doubt THEN 'fallo_duda'
        WHEN pool.is_failure THEN 'fallo'
        WHEN pool.is_doubt THEN 'duda'
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
  preferred AS (
    SELECT sampled.*
    FROM sampled
    WHERE sampled.in_previous_test IS FALSE
    ORDER BY sampled.draw_score, sampled.question_id
    LIMIT v_target_non_overlap
  ),
  remaining AS (
    SELECT sampled.*
    FROM sampled
    WHERE NOT EXISTS (
      SELECT 1 FROM preferred WHERE preferred.question_id = sampled.question_id
    )
    ORDER BY sampled.draw_score, sampled.question_id
    LIMIT GREATEST(p_question_count - (SELECT count(*) FROM preferred), 0)
  ),
  selected AS (
    SELECT * FROM preferred
    UNION ALL
    SELECT * FROM remaining
  ),
  ordered AS (
    SELECT
      selected.*,
      row_number() OVER (ORDER BY selected.draw_score, selected.question_id)::integer AS selection_order,
      count(*) FILTER (WHERE selected.in_previous_test IS FALSE) OVER ()::integer AS non_overlap_count
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
      WHEN 'fallo_duda' THEN 'Fallo y duda activos dentro del nivel'
      WHEN 'fallo' THEN 'Fallo pendiente dentro del nivel'
      WHEN 'duda' THEN 'Duda pendiente dentro del nivel'
      WHEN 'nueva' THEN 'Pregunta nueva del nivel'
      WHEN 'rendimiento_bajo' THEN 'Rendimiento bajo dentro del nivel'
      WHEN 'retencion' THEN 'Retención pendiente dentro del nivel'
      WHEN 'poco_vista' THEN 'Pregunta poco vista dentro del nivel'
      ELSE 'Variedad y cobertura dentro del nivel'
    END,
    ordered.base_weight,
    ordered.final_weight,
    ordered.in_previous_test,
    ordered.in_previous_test AND ordered.non_overlap_count < v_target_non_overlap,
    'learning-stage-v1.0'
  FROM ordered;

  GET DIAGNOSTICS v_selected_count = ROW_COUNT;

  IF v_selected_count = 0 THEN
    RAISE EXCEPTION 'No questions match the selected learning stage and filters';
  END IF;

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
    p_learning_stage,
    v_locked AND p_free_mode,
    v_locked AND p_free_mode;
END;
$$;
