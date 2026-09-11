-- ELI-98 production smoke. All fixture writes are rolled back.
BEGIN;

DO $smoke$
DECLARE
  v_user_id uuid;
  v_other_user_id uuid;
  v_opposition_id uuid;
  v_concept_id uuid;
  v_capacity integer;
  v_test_id uuid;
  v_answer_id uuid;
  v_selected public.respuesta_enum;
  v_created record;
  v_confirmation record;
  v_before jsonb;
  v_after jsonb;
  v_count integer;
  v_failed boolean := false;
BEGIN
  IF has_column_privilege('authenticated', 'public.questions', 'respuesta_correcta', 'SELECT')
     OR has_column_privilege('authenticated', 'public.questions', 'explicacion', 'SELECT') THEN
    RAISE EXCEPTION 'ELI-37 learner answer leak has regressed';
  END IF;

  SELECT profile.id, profile.active_opposition_id, progress.concept_id,
         progress.active_primary_question_count
  INTO v_user_id, v_opposition_id, v_concept_id, v_capacity
  FROM public.profiles AS profile
  CROSS JOIN LATERAL (
    SELECT concept.id AS concept_id, count(DISTINCT question.id)::integer AS active_primary_question_count
    FROM public.concepts AS concept
    JOIN public.question_concepts AS mapping
      ON mapping.concept_id = concept.id
     AND mapping.opposition_id = concept.opposition_id
     AND mapping.role = 'primary'
    JOIN public.questions AS question
      ON question.id = mapping.question_id
     AND question.opposition_id = concept.opposition_id
     AND question.activa
    WHERE concept.opposition_id = profile.active_opposition_id AND concept.active
    GROUP BY concept.id
    ORDER BY count(DISTINCT question.id) DESC, concept.id
    LIMIT 1
  ) AS progress
  WHERE profile.active_opposition_id IS NOT NULL
  ORDER BY profile.id
  LIMIT 1;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'No eligible smoke principal'; END IF;

  PERFORM set_config('request.jwt.claim.sub', v_user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  SELECT COALESCE(jsonb_agg(to_jsonb(mastery) ORDER BY mastery.concept_id), '[]'::jsonb)
  INTO v_before
  FROM public.user_concept_mastery AS mastery
  WHERE mastery.user_id = v_user_id;

  SELECT * INTO v_created
  FROM public.create_tests_first_concept_test(
    ARRAY[v_concept_id], LEAST(3, v_capacity)
  );
  v_test_id := v_created.test_id;
  IF v_created.selected_count <> LEAST(3, v_capacity)
     OR v_created.requested_concept_count <> 1
     OR v_created.covered_concept_count <> 1 THEN
    RAISE EXCEPTION 'Directed creator returned an invalid summary';
  END IF;

  SELECT count(*)::integer INTO v_count
  FROM public.test_question_selection AS selection
  WHERE selection.test_id = v_test_id
    AND selection.user_id = v_user_id
    AND selection.selection_concept_id = v_concept_id;
  IF v_count <> v_created.selected_count THEN
    RAISE EXCEPTION 'Directed selection lost server-side concept attribution';
  END IF;

  SELECT session.answer_id, question.respuesta_correcta
  INTO v_answer_id, v_selected
  FROM public.get_my_test_session(v_test_id) AS session
  JOIN public.questions AS question ON question.id = session.question_id
  ORDER BY session.answer_order
  LIMIT 1;
  UPDATE public.test_answers SET respuesta_usuario = v_selected WHERE id = v_answer_id;
  SELECT * INTO v_confirmation
  FROM public.confirm_test_answer(v_test_id, v_answer_id, v_selected);
  IF NOT v_confirmation.feedback_revealed OR NOT v_confirmation.is_correct THEN
    RAISE EXCEPTION 'Normal inline feedback was not revealed after confirmation';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(mastery) ORDER BY mastery.concept_id), '[]'::jsonb)
  INTO v_after
  FROM public.user_concept_mastery AS mastery
  WHERE mastery.user_id = v_user_id;
  IF v_before IS DISTINCT FROM v_after THEN
    RAISE EXCEPTION 'Confirmation moved the global mastery boundary';
  END IF;

  PERFORM public.complete_test(v_test_id);
  SELECT count(*)::integer INTO v_count
  FROM public.get_my_completed_test_concepts(v_test_id) AS result_concept
  WHERE result_concept.concept_id = v_concept_id;
  IF v_count <> 1 THEN RAISE EXCEPTION 'Completed result concept attribution failed'; END IF;

  SELECT profile.id INTO v_other_user_id
  FROM public.profiles AS profile
  WHERE profile.id <> v_user_id AND profile.active_opposition_id IS NOT NULL
  ORDER BY profile.id LIMIT 1;
  IF v_other_user_id IS NOT NULL THEN
    PERFORM set_config('request.jwt.claim.sub', v_other_user_id::text, true);
    SELECT count(*)::integer INTO v_count
    FROM public.get_my_completed_test_concepts(v_test_id);
    IF v_count <> 0 THEN RAISE EXCEPTION 'Cross-user completed result leak'; END IF;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_user_id::text, true);
  SELECT concept.id INTO v_concept_id
  FROM public.concepts AS concept
  WHERE concept.opposition_id <> v_opposition_id AND concept.active
  LIMIT 1;
  IF v_concept_id IS NOT NULL THEN
    BEGIN
      PERFORM * FROM public.create_tests_first_concept_test(ARRAY[v_concept_id], 1);
    EXCEPTION WHEN OTHERS THEN
      v_failed := true;
    END;
    IF NOT v_failed THEN RAISE EXCEPTION 'Cross-opposition concept was accepted'; END IF;
  END IF;
END;
$smoke$;

DO $privileges$
BEGIN
  IF has_function_privilege('anon', 'public.get_my_completed_test_concepts(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.create_tests_first_concept_test(uuid[],integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can execute an ELI-98 function';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.get_my_completed_test_concepts(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.create_tests_first_concept_test(uuid[],integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated ELI-98 execute grant missing';
  END IF;
END;
$privileges$;

ROLLBACK;
