-- V2 smart selection v1: weighted sampling, repetition control and traceability.

CREATE TABLE public.test_question_selection (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id uuid NOT NULL,
  question_id uuid NOT NULL,
  selection_order integer NOT NULL CHECK (selection_order > 0),
  selection_group text NOT NULL CHECK (selection_group IN (
    'fallo_duda',
    'fallo',
    'duda',
    'nueva',
    'rendimiento_bajo',
    'retencion',
    'poco_vista',
    'variedad'
  )),
  selection_reason text NOT NULL,
  base_weight numeric(8,3) NOT NULL CHECK (base_weight > 0),
  final_weight numeric(8,3) NOT NULL CHECK (final_weight > 0),
  was_in_previous_test boolean NOT NULL DEFAULT false,
  overlap_exception boolean NOT NULL DEFAULT false,
  algorithm_version text NOT NULL DEFAULT 'smart-v1.0',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, test_id, question_id),
  UNIQUE (test_id, selection_order),
  CONSTRAINT test_question_selection_owner_test_fk
    FOREIGN KEY (user_id, test_id)
    REFERENCES public.tests (user_id, id)
    ON DELETE CASCADE,
  CONSTRAINT test_question_selection_owner_question_fk
    FOREIGN KEY (user_id, question_id)
    REFERENCES public.questions (user_id, id)
    ON DELETE CASCADE
);

CREATE INDEX idx_test_question_selection_user_question
  ON public.test_question_selection (user_id, question_id, created_at DESC);

CREATE INDEX idx_questions_smart_pool
  ON public.questions (user_id, topic_id, activa, dificultad);

REVOKE ALL ON public.test_question_selection FROM PUBLIC;
REVOKE ALL ON public.test_question_selection FROM anon;
GRANT SELECT, INSERT ON public.test_question_selection TO authenticated;
GRANT ALL ON public.test_question_selection TO service_role;

ALTER TABLE public.test_question_selection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "test_question_selection_select_own"
  ON public.test_question_selection
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "test_question_selection_insert_own"
  ON public.test_question_selection
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

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
      AND topic.user_id = v_user_id
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
        AND subtopic.user_id = v_user_id
    )
  ) THEN
    RAISE EXCEPTION 'Invalid subtopic filter';
  END IF;

  SELECT previous_test.id
  INTO v_previous_test_id
  FROM public.tests AS previous_test
  WHERE previous_test.user_id = v_user_id
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
    LEFT JOIN recent_questions
      ON recent_questions.question_id = question.id
    WHERE question.user_id = v_user_id
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
  WHERE question.user_id = v_user_id
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

REVOKE ALL ON FUNCTION public.create_smart_test(
  uuid,
  uuid[],
  public.dificultad_enum[],
  integer
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_smart_test(
  uuid,
  uuid[],
  public.dificultad_enum[],
  integer
) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_smart_test(
  uuid,
  uuid[],
  public.dificultad_enum[],
  integer
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_smart_test(
  uuid,
  uuid[],
  public.dificultad_enum[],
  integer
) TO service_role;
