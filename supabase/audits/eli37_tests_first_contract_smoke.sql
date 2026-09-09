-- Run after the ELI-37 migration. All fixture writes are rolled back.
BEGIN;
DO $smoke$
DECLARE
  v_user uuid; v_opp uuid; v_question uuid; v_correct public.respuesta_enum;
  v_other public.respuesta_enum; v_test uuid := gen_random_uuid(); v_answer uuid := gen_random_uuid();
  v_exam uuid := gen_random_uuid(); v_exam_answer uuid := gen_random_uuid();
  v_row record; v_failed boolean := false; v_before jsonb; v_after jsonb;
BEGIN
  IF has_column_privilege('authenticated', 'public.questions', 'respuesta_correcta', 'SELECT')
     OR has_column_privilege('authenticated', 'public.questions', 'explicacion', 'SELECT') THEN
    RAISE EXCEPTION 'learner solution-column privilege remains';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.questions', 'pregunta', 'SELECT') THEN
    RAISE EXCEPTION 'learner-safe question column missing';
  END IF;
  SELECT p.id,p.active_opposition_id,q.id,q.respuesta_correcta INTO v_user,v_opp,v_question,v_correct
  FROM public.profiles p JOIN public.questions q ON q.opposition_id=p.active_opposition_id AND q.activa
  WHERE p.active_opposition_id IS NOT NULL LIMIT 1;
  IF v_user IS NULL THEN RAISE EXCEPTION 'No smoke principal'; END IF;
  SELECT value INTO v_other FROM unnest(enum_range(NULL::public.respuesta_enum)) value WHERE value<>v_correct LIMIT 1;
  PERFORM set_config('request.jwt.claim.sub',v_user::text,true);
  PERFORM set_config('request.jwt.claim.role','authenticated',true);
  SELECT COALESCE(jsonb_agg(to_jsonb(m) ORDER BY m.concept_id),'[]') INTO v_before FROM public.user_concept_mastery m WHERE user_id=v_user;

  INSERT INTO public.tests(id,user_id,tipo,numero_preguntas,sin_responder,opposition_id) VALUES(v_test,v_user,'eli37_smoke',1,1,v_opp);
  INSERT INTO public.test_answers(id,user_id,test_id,question_id,orden) VALUES(v_answer,v_user,v_test,v_question,1);
  UPDATE public.test_answers SET respuesta_usuario=v_other WHERE id=v_answer;
  UPDATE public.test_answers SET respuesta_usuario=v_correct WHERE id=v_answer;
  SELECT * INTO v_row FROM public.confirm_test_answer(v_test,v_answer,v_correct);
  IF NOT v_row.feedback_revealed OR NOT v_row.is_correct OR v_row.correct_answer IS DISTINCT FROM v_correct THEN RAISE EXCEPTION 'normal feedback failed'; END IF;
  SELECT * INTO v_row FROM public.confirm_test_answer(v_test,v_answer,v_correct);
  BEGIN PERFORM * FROM public.confirm_test_answer(v_test,v_answer,v_other); EXCEPTION WHEN OTHERS THEN v_failed:=true; END;
  IF NOT v_failed THEN RAISE EXCEPTION 'changed confirmation accepted'; END IF;
  v_failed:=false;
  BEGIN UPDATE public.test_answers SET respuesta_usuario=v_other WHERE id=v_answer; EXCEPTION WHEN OTHERS THEN v_failed:=true; END;
  IF NOT v_failed THEN RAISE EXCEPTION 'direct lock bypass'; END IF;
  UPDATE public.test_answers SET marked_doubt=true WHERE id=v_answer;
  IF NOT (SELECT marked_doubt FROM public.test_answers WHERE id=v_answer) THEN RAISE EXCEPTION 'doubt not preserved'; END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(m) ORDER BY m.concept_id),'[]') INTO v_after FROM public.user_concept_mastery m WHERE user_id=v_user;
  IF v_after IS DISTINCT FROM v_before THEN RAISE EXCEPTION 'confirmation refreshed mastery'; END IF;

  INSERT INTO public.tests(id,user_id,tipo,numero_preguntas,sin_responder,opposition_id) VALUES(v_exam,v_user,'simulacro',1,1,v_opp);
  INSERT INTO public.test_answers(id,user_id,test_id,question_id,orden) VALUES(v_exam_answer,v_user,v_exam,v_question,1);
  SELECT * INTO v_row FROM public.confirm_test_answer(v_exam,v_exam_answer,v_correct);
  IF v_row.feedback_revealed OR v_row.is_correct IS NOT NULL OR v_row.correct_answer IS NOT NULL OR v_row.explanation IS NOT NULL OR v_row.concept_id IS NOT NULL THEN RAISE EXCEPTION 'simulation leaked'; END IF;

  PERFORM * FROM public.complete_test(v_test);
  IF NOT (SELECT completado AND aciertos=1 AND fallos=0 FROM public.tests WHERE id=v_test) THEN RAISE EXCEPTION 'completion regression'; END IF;
  PERFORM public.get_my_completed_test_result(v_test);
  v_failed:=false;
  BEGIN PERFORM * FROM public.confirm_test_answer(v_test,v_answer,v_correct); EXCEPTION WHEN OTHERS THEN v_failed:=true; END;
  IF NOT v_failed THEN RAISE EXCEPTION 'completed confirmation accepted'; END IF;
END
$smoke$;
SELECT 'eli37_transactional_smoke' check_name, true ok;
ROLLBACK;
