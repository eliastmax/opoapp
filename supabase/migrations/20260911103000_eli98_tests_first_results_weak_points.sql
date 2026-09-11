-- ELI-98: learner integration helpers for concept-driven completed results and
-- directed tests-first practice. ELI-37 thresholds and mastery boundaries stay unchanged.

CREATE OR REPLACE FUNCTION public.get_my_completed_test_concepts(p_test_id uuid)
RETURNS TABLE (
  concept_id uuid,
  concept_title text,
  topic_id uuid,
  topic_number integer,
  topic_name text,
  learner_state text,
  evidence_reason text,
  test_question_count integer,
  test_correct_count integer,
  test_doubt_count integer,
  distinct_test_questions integer,
  distinct_completed_test_sessions integer,
  safe_accuracy numeric,
  attention_required boolean,
  next_review_on timestamptz,
  active_primary_question_count integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
WITH scope AS (
  SELECT (SELECT auth.uid()) AS user_id, public.current_active_opposition_id() AS opposition_id
), owned_test AS (
  SELECT test.id
  FROM public.tests AS test
  JOIN scope ON scope.user_id = test.user_id AND scope.opposition_id = test.opposition_id
  WHERE test.id = p_test_id AND test.completado
), attributed AS (
  SELECT
    answer.question_id,
    answer.correcta,
    answer.marked_doubt,
    COALESCE(selection.selection_concept_id, primary_mapping.concept_id) AS concept_id
  FROM owned_test
  JOIN scope ON true
  JOIN public.test_answers AS answer
    ON answer.test_id = owned_test.id AND answer.user_id = scope.user_id
  LEFT JOIN public.test_question_selection AS selection
    ON selection.user_id = scope.user_id
   AND selection.test_id = owned_test.id
   AND selection.question_id = answer.question_id
  LEFT JOIN LATERAL (
    SELECT mapping.concept_id
    FROM public.question_concepts AS mapping
    WHERE mapping.question_id = answer.question_id
      AND mapping.opposition_id = scope.opposition_id
      AND mapping.role = 'primary'
    ORDER BY mapping.concept_id
    LIMIT 1
  ) AS primary_mapping ON true
), test_evidence AS (
  SELECT
    attributed.concept_id,
    count(DISTINCT attributed.question_id)::integer AS question_count,
    count(*) FILTER (WHERE attributed.correcta)::integer AS correct_count,
    count(*) FILTER (WHERE attributed.marked_doubt)::integer AS doubt_count
  FROM attributed
  WHERE attributed.concept_id IS NOT NULL
  GROUP BY attributed.concept_id
), progress AS (
  SELECT * FROM public.get_my_tests_first_concept_progress()
)
SELECT
  progress.concept_id,
  progress.concept_title,
  progress.topic_id,
  progress.topic_number,
  progress.topic_name,
  progress.learner_state,
  progress.evidence_reason,
  test_evidence.question_count,
  test_evidence.correct_count,
  test_evidence.doubt_count,
  progress.distinct_test_questions,
  progress.distinct_completed_test_sessions,
  progress.safe_accuracy,
  progress.attention_required,
  progress.next_review_on,
  progress.active_primary_question_count
FROM test_evidence
JOIN progress ON progress.concept_id = test_evidence.concept_id
ORDER BY
  CASE progress.learner_state
    WHEN 'needs_reinforcement' THEN 0
    WHEN 'not_evaluated' THEN 1
    WHEN 'consolidating' THEN 2
    ELSE 3
  END,
  progress.attention_required DESC,
  test_evidence.doubt_count DESC,
  progress.safe_accuracy ASC NULLS FIRST,
  progress.topic_number,
  progress.concept_title;
$function$;

REVOKE ALL ON FUNCTION public.get_my_completed_test_concepts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_completed_test_concepts(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_tests_first_concept_test(
  p_concept_ids uuid[],
  p_question_count integer DEFAULT 10
)
RETURNS TABLE (
  test_id uuid,
  selected_count integer,
  requested_concept_count integer,
  covered_concept_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_opposition_id uuid := public.current_active_opposition_id();
  v_concept_ids uuid[];
  v_requested_count integer;
  v_valid_count integer;
  v_test_id uuid;
  v_selected_count integer;
  v_covered_count integer;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF v_opposition_id IS NULL THEN RAISE EXCEPTION 'An active opposition is required' USING ERRCODE = '42501'; END IF;
  IF p_question_count < 1 OR p_question_count > 10 THEN
    RAISE EXCEPTION 'Question count must be between 1 and 10' USING ERRCODE = '22023';
  END IF;

  SELECT array_agg(DISTINCT concept_id ORDER BY concept_id)
  INTO v_concept_ids
  FROM unnest(p_concept_ids) AS requested(concept_id)
  WHERE concept_id IS NOT NULL;
  v_requested_count := COALESCE(cardinality(v_concept_ids), 0);
  IF v_requested_count < 1 OR v_requested_count > 3 THEN
    RAISE EXCEPTION 'Choose between 1 and 3 concepts' USING ERRCODE = '22023';
  END IF;

  SELECT count(*)::integer INTO v_valid_count
  FROM public.concepts AS concept
  WHERE concept.id = ANY(v_concept_ids)
    AND concept.opposition_id = v_opposition_id
    AND concept.active;
  IF v_valid_count <> v_requested_count THEN
    RAISE EXCEPTION 'Every concept must be active in the current opposition' USING ERRCODE = '42501';
  END IF;

  CREATE TEMP TABLE eli98_selection ON COMMIT DROP AS
  WITH candidates AS (
    SELECT
      mapping.concept_id,
      question.id AS question_id,
      row_number() OVER (
        PARTITION BY mapping.concept_id
        ORDER BY statistics.last_answered_at ASC NULLS FIRST, random(), question.id
      ) AS concept_rank
    FROM public.question_concepts AS mapping
    JOIN public.questions AS question
      ON question.id = mapping.question_id
     AND question.opposition_id = v_opposition_id
     AND question.activa
    LEFT JOIN public.question_statistics AS statistics
      ON statistics.user_id = v_user_id AND statistics.question_id = question.id
    WHERE mapping.opposition_id = v_opposition_id
      AND mapping.role = 'primary'
      AND mapping.concept_id = ANY(v_concept_ids)
  ), deduplicated AS (
    SELECT DISTINCT ON (question_id) concept_id, question_id, concept_rank
    FROM candidates
    ORDER BY question_id, concept_rank, concept_id
  ), selected AS (
    SELECT concept_id, question_id
    FROM deduplicated
    ORDER BY concept_rank, random(), question_id
    LIMIT p_question_count
  )
  SELECT
    selected.concept_id,
    selected.question_id,
    row_number() OVER (ORDER BY random(), selected.question_id)::integer AS selection_order
  FROM selected;

  SELECT count(*)::integer, count(DISTINCT concept_id)::integer
  INTO v_selected_count, v_covered_count
  FROM eli98_selection;
  IF v_selected_count = 0 THEN
    RAISE EXCEPTION 'No active PRIMARY questions are available for these concepts' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.tests (user_id, opposition_id, tipo, numero_preguntas, sin_responder)
  VALUES (v_user_id, v_opposition_id, 'tests_first_concepts', v_selected_count, v_selected_count)
  RETURNING id INTO v_test_id;

  INSERT INTO public.test_question_selection (
    user_id, test_id, question_id, selection_order, selection_group,
    selection_reason, base_weight, final_weight, was_in_previous_test,
    overlap_exception, algorithm_version, selection_concept_id
  )
  SELECT
    v_user_id, v_test_id, selected.question_id, selected.selection_order, 'variedad',
    'Entrenamiento tests-first de concepto seleccionado', 1, 1, false,
    false, 'tests-first-concepts-v1', selected.concept_id
  FROM eli98_selection AS selected;

  INSERT INTO public.test_answers (user_id, test_id, question_id, orden)
  SELECT v_user_id, v_test_id, question_id, selection_order
  FROM eli98_selection
  ORDER BY selection_order;

  RETURN QUERY SELECT v_test_id, v_selected_count, v_requested_count, v_covered_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_tests_first_concept_test(uuid[], integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_tests_first_concept_test(uuid[], integer) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_my_completed_test_concepts(uuid) IS
  'Learner-safe concept attribution for one owned completed test, joined to the governed tests-first projection.';
COMMENT ON FUNCTION public.create_tests_first_concept_test(uuid[], integer) IS
  'Creates an owned active-opposition test across 1-3 active concepts using only active PRIMARY question capacity.';
