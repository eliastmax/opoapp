-- V4 directed concept checks.
-- Creates exact-size tests for review/repair/verification while keeping retention
-- checkpoint metadata server-controlled.

-- Authenticated callers may still create legacy selection rows through the
-- existing SECURITY INVOKER test creators, but they cannot forge V4 attribution
-- or retention checkpoint metadata directly.
DROP POLICY IF EXISTS test_question_selection_insert_own ON public.test_question_selection;
CREATE POLICY test_question_selection_insert_own
  ON public.test_question_selection
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND selection_concept_id IS NULL
    AND retention_checkpoint_days IS NULL
  );

ALTER TABLE public.test_question_selection
  DROP CONSTRAINT IF EXISTS test_question_selection_selection_group_check;
ALTER TABLE public.test_question_selection
  ADD CONSTRAINT test_question_selection_selection_group_check
  CHECK (
    selection_group IN (
      'fallo_duda',
      'fallo',
      'duda',
      'nueva',
      'rendimiento_bajo',
      'repaso_programado',
      'retencion',
      'poco_vista',
      'variedad',
      'simulacro',
      'concept_review',
      'concept_repair',
      'concept_verify'
    )
  );

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.create_v4_concept_check(
  p_concept_id uuid,
  p_question_count integer DEFAULT 2,
  p_mode text DEFAULT 'verify'
)
RETURNS TABLE (
  test_id uuid,
  selected_count integer,
  concept_id uuid,
  concept_code text,
  concept_title text,
  mode text,
  retention_checkpoint_days integer,
  novel_for_concept_count integer,
  reused_for_concept_count integer,
  previous_test_overlap_count integer,
  active_primary_questions integer
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_opposition_id uuid;
  v_test_id uuid;
  v_previous_test_id uuid;
  v_concept_code text;
  v_concept_title text;
  v_active_primary_questions integer;
  v_state text;
  v_needs_attention boolean;
  v_next_review_on date;
  v_retention_checks_passed integer;
  v_checkpoint integer := NULL;
  v_selected_count integer := 0;
  v_novel_count integer := 0;
  v_reused_count integer := 0;
  v_previous_overlap_count integer := 0;
  v_selection_group text;
  v_selection_reason text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_mode NOT IN ('review', 'repair', 'verify') THEN
    RAISE EXCEPTION 'Mode must be review, repair or verify' USING ERRCODE = '22023';
  END IF;

  IF
    (p_mode = 'review' AND (p_question_count < 1 OR p_question_count > 2))
    OR (p_mode = 'repair' AND (p_question_count < 1 OR p_question_count > 3))
    OR (p_mode = 'verify' AND (p_question_count < 2 OR p_question_count > 4))
  THEN
    RAISE EXCEPTION 'Invalid question count for V4 concept check mode' USING ERRCODE = '22023';
  END IF;

  v_opposition_id := public.current_active_opposition_id();
  IF v_opposition_id IS NULL THEN
    RAISE EXCEPTION 'An active opposition is required' USING ERRCODE = '42501';
  END IF;

  SELECT
    concept.code,
    concept.title,
    count(mapping.question_id) FILTER (WHERE question.activa IS TRUE)::integer
  INTO
    v_concept_code,
    v_concept_title,
    v_active_primary_questions
  FROM public.concepts concept
  LEFT JOIN public.question_concepts mapping
    ON mapping.concept_id = concept.id
   AND mapping.opposition_id = concept.opposition_id
   AND mapping.role = 'primary'
  LEFT JOIN public.questions question
    ON question.id = mapping.question_id
   AND question.opposition_id = concept.opposition_id
  WHERE concept.id = p_concept_id
    AND concept.opposition_id = v_opposition_id
    AND concept.active IS TRUE
  GROUP BY concept.code, concept.title;

  IF v_concept_code IS NULL THEN
    RAISE EXCEPTION 'Active concept not found in the current opposition' USING ERRCODE = '22023';
  END IF;

  -- Bootstrap/recalculate from canonical evidence before deciding whether a
  -- review, repair or verification is legitimate.
  PERFORM 1
  FROM private.refresh_my_v4_concept_mastery(p_concept_id);

  SELECT
    mastery.state,
    mastery.needs_attention,
    mastery.next_review_on,
    mastery.retention_checks_passed
  INTO
    v_state,
    v_needs_attention,
    v_next_review_on,
    v_retention_checks_passed
  FROM public.user_concept_mastery mastery
  WHERE mastery.user_id = v_user_id
    AND mastery.opposition_id = v_opposition_id
    AND mastery.concept_id = p_concept_id;

  IF v_state IS NULL THEN
    RAISE EXCEPTION 'Concept mastery context is unavailable' USING ERRCODE = '22023';
  END IF;

  IF p_mode = 'review' THEN
    IF v_needs_attention THEN
      RAISE EXCEPTION 'Concept needs repair before a retention review' USING ERRCODE = '22023';
    END IF;
    IF v_state NOT IN ('consolidating', 'retained') THEN
      RAISE EXCEPTION 'Concept is not ready for a retention review' USING ERRCODE = '22023';
    END IF;
    IF v_next_review_on IS NULL OR v_next_review_on > CURRENT_DATE THEN
      RAISE EXCEPTION 'Retention review is not due yet' USING ERRCODE = '22023';
    END IF;

    v_checkpoint := CASE
      WHEN v_state = 'consolidating' AND v_retention_checks_passed >= 1 THEN 7
      WHEN v_state = 'consolidating' THEN 3
      WHEN v_state = 'retained' AND v_retention_checks_passed >= 3 THEN 30
      ELSE 14
    END;
    v_selection_group := 'concept_review';
    v_selection_reason := 'Control V4 de retención programado del concepto';
  ELSIF p_mode = 'repair' THEN
    IF NOT v_needs_attention THEN
      RAISE EXCEPTION 'Concept has no active attention signal to repair' USING ERRCODE = '22023';
    END IF;
    v_selection_group := 'concept_repair';
    v_selection_reason := 'Comprobación V4 tras inestabilidad reciente del concepto';
  ELSE
    IF v_needs_attention THEN
      RAISE EXCEPTION 'Concept needs repair before normal verification' USING ERRCODE = '22023';
    END IF;
    IF v_state NOT IN ('seen', 'verifying') THEN
      RAISE EXCEPTION 'Concept is not in a verification state' USING ERRCODE = '22023';
    END IF;
    IF v_active_primary_questions < 4 THEN
      RAISE EXCEPTION 'Concept has insufficient primary-question coverage for verification' USING ERRCODE = '22023';
    END IF;
    v_selection_group := 'concept_verify';
    v_selection_reason := 'Comprobación V4 con preguntas distintas del concepto';
  END IF;

  IF v_active_primary_questions < p_question_count THEN
    RAISE EXCEPTION 'Not enough active primary questions for the requested concept check' USING ERRCODE = '22023';
  END IF;

  SELECT previous_test.id
  INTO v_previous_test_id
  FROM public.tests previous_test
  WHERE previous_test.user_id = v_user_id
    AND previous_test.opposition_id = v_opposition_id
    AND previous_test.completado IS TRUE
    AND previous_test.fecha_finalizacion IS NOT NULL
  ORDER BY previous_test.fecha_finalizacion DESC, previous_test.id DESC
  LIMIT 1;

  DROP TABLE IF EXISTS pg_temp.v4_concept_check_selection;
  CREATE TEMP TABLE v4_concept_check_selection (
    question_id uuid PRIMARY KEY,
    selection_order integer NOT NULL,
    targeted_count integer NOT NULL,
    answered_count integer NOT NULL,
    recent_appearances integer NOT NULL,
    was_in_previous_test boolean NOT NULL,
    last_targeted_at timestamptz,
    last_answered_at timestamptz
  ) ON COMMIT DROP;

  WITH recent_tests AS (
    SELECT recent_test.id
    FROM public.tests recent_test
    WHERE recent_test.user_id = v_user_id
      AND recent_test.opposition_id = v_opposition_id
      AND recent_test.completado IS TRUE
      AND recent_test.fecha_finalizacion IS NOT NULL
    ORDER BY recent_test.fecha_finalizacion DESC, recent_test.id DESC
    LIMIT 3
  ),
  pool AS (
    SELECT
      question.id AS question_id,
      COALESCE(targeted.targeted_count, 0) AS targeted_count,
      COALESCE(answered.answered_count, 0) AS answered_count,
      COALESCE(recent.recent_appearances, 0) AS recent_appearances,
      EXISTS (
        SELECT 1
        FROM public.test_answers previous_answer
        WHERE previous_answer.user_id = v_user_id
          AND previous_answer.test_id = v_previous_test_id
          AND previous_answer.question_id = question.id
      ) AS was_in_previous_test,
      targeted.last_targeted_at,
      answered.last_answered_at
    FROM public.question_concepts mapping
    JOIN public.questions question
      ON question.id = mapping.question_id
     AND question.opposition_id = v_opposition_id
     AND question.activa IS TRUE
    LEFT JOIN LATERAL (
      SELECT
        count(*)::integer AS targeted_count,
        max(target_test.fecha_finalizacion) AS last_targeted_at
      FROM public.test_question_selection selection
      JOIN public.tests target_test
        ON target_test.id = selection.test_id
       AND target_test.user_id = selection.user_id
       AND target_test.opposition_id = v_opposition_id
       AND target_test.completado IS TRUE
       AND target_test.fecha_finalizacion IS NOT NULL
      WHERE selection.user_id = v_user_id
        AND selection.question_id = question.id
        AND selection.selection_concept_id = p_concept_id
    ) targeted ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        count(*) FILTER (WHERE answer.correcta IS NOT NULL)::integer AS answered_count,
        max(answer_test.fecha_finalizacion) FILTER (WHERE answer.correcta IS NOT NULL) AS last_answered_at
      FROM public.test_answers answer
      JOIN public.tests answer_test
        ON answer_test.id = answer.test_id
       AND answer_test.user_id = answer.user_id
       AND answer_test.opposition_id = v_opposition_id
       AND answer_test.completado IS TRUE
       AND answer_test.fecha_finalizacion IS NOT NULL
      WHERE answer.user_id = v_user_id
        AND answer.question_id = question.id
    ) answered ON TRUE
    LEFT JOIN LATERAL (
      SELECT count(*)::integer AS recent_appearances
      FROM public.test_answers recent_answer
      JOIN recent_tests ON recent_tests.id = recent_answer.test_id
      WHERE recent_answer.user_id = v_user_id
        AND recent_answer.question_id = question.id
    ) recent ON TRUE
    WHERE mapping.opposition_id = v_opposition_id
      AND mapping.concept_id = p_concept_id
      AND mapping.role = 'primary'
  ),
  ranked AS (
    SELECT
      pool.*,
      row_number() OVER (
        ORDER BY
          CASE WHEN pool.targeted_count = 0 THEN 0 ELSE 1 END,
          pool.targeted_count,
          CASE WHEN pool.was_in_previous_test THEN 1 ELSE 0 END,
          pool.recent_appearances,
          CASE WHEN pool.answered_count = 0 THEN 0 ELSE 1 END,
          pool.last_targeted_at ASC NULLS FIRST,
          pool.last_answered_at ASC NULLS FIRST,
          pool.question_id
      )::integer AS selection_order
    FROM pool
  )
  INSERT INTO pg_temp.v4_concept_check_selection (
    question_id,
    selection_order,
    targeted_count,
    answered_count,
    recent_appearances,
    was_in_previous_test,
    last_targeted_at,
    last_answered_at
  )
  SELECT
    ranked.question_id,
    ranked.selection_order,
    ranked.targeted_count,
    ranked.answered_count,
    ranked.recent_appearances,
    ranked.was_in_previous_test,
    ranked.last_targeted_at,
    ranked.last_answered_at
  FROM ranked
  WHERE ranked.selection_order <= p_question_count;

  GET DIAGNOSTICS v_selected_count = ROW_COUNT;
  IF v_selected_count <> p_question_count THEN
    RAISE EXCEPTION 'Could not build the exact requested concept check' USING ERRCODE = '22023';
  END IF;

  SELECT
    count(*) FILTER (WHERE selection.targeted_count = 0)::integer,
    count(*) FILTER (WHERE selection.targeted_count > 0)::integer,
    count(*) FILTER (WHERE selection.was_in_previous_test)::integer
  INTO
    v_novel_count,
    v_reused_count,
    v_previous_overlap_count
  FROM pg_temp.v4_concept_check_selection selection;

  INSERT INTO public.tests (
    user_id,
    opposition_id,
    tipo,
    numero_preguntas,
    sin_responder
  )
  VALUES (
    v_user_id,
    v_opposition_id,
    'v4_concept_check',
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
    algorithm_version,
    selection_concept_id,
    retention_checkpoint_days
  )
  SELECT
    v_user_id,
    v_test_id,
    selection.question_id,
    selection.selection_order,
    v_selection_group,
    v_selection_reason,
    (1 + CASE WHEN selection.targeted_count = 0 THEN 4 ELSE 0 END
       + CASE WHEN selection.answered_count = 0 THEN 2 ELSE 0 END)::numeric,
    (1 + CASE WHEN selection.targeted_count = 0 THEN 4 ELSE 0 END
       + CASE WHEN selection.answered_count = 0 THEN 2 ELSE 0 END)::numeric,
    selection.was_in_previous_test,
    selection.was_in_previous_test,
    'v4-concept-check-v1',
    p_concept_id,
    v_checkpoint
  FROM pg_temp.v4_concept_check_selection selection
  ORDER BY selection.selection_order;

  INSERT INTO public.test_answers (
    user_id,
    test_id,
    question_id,
    orden
  )
  SELECT
    v_user_id,
    v_test_id,
    selection.question_id,
    selection.selection_order
  FROM pg_temp.v4_concept_check_selection selection
  ORDER BY selection.selection_order;

  RETURN QUERY
  SELECT
    v_test_id,
    v_selected_count,
    p_concept_id,
    v_concept_code,
    v_concept_title,
    p_mode,
    v_checkpoint,
    v_novel_count,
    v_reused_count,
    v_previous_overlap_count,
    v_active_primary_questions;
END;
$$;

REVOKE ALL ON FUNCTION private.create_v4_concept_check(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.create_v4_concept_check(uuid, integer, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_v4_concept_check(
  p_concept_id uuid,
  p_question_count integer DEFAULT 2,
  p_mode text DEFAULT 'verify'
)
RETURNS TABLE (
  test_id uuid,
  selected_count integer,
  concept_id uuid,
  concept_code text,
  concept_title text,
  mode text,
  retention_checkpoint_days integer,
  novel_for_concept_count integer,
  reused_for_concept_count integer,
  previous_test_overlap_count integer,
  active_primary_questions integer
)
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT *
  FROM private.create_v4_concept_check(p_concept_id, p_question_count, p_mode);
$$;

REVOKE ALL ON FUNCTION public.create_v4_concept_check(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_v4_concept_check(uuid, integer, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.create_v4_concept_check(uuid, integer, text) IS
  'Creates an exact-size V4 directed concept check. Retention checkpoints are derived server-side from current mastery and due date; clients cannot supply checkpoint metadata.';
