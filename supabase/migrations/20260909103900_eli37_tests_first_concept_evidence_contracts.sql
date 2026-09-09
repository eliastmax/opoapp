-- ELI-37: tests-first learner contracts and answer secrecy.
-- The public wrappers that reveal protected question fields are deliberately
-- SECURITY DEFINER boundaries. Each authenticates, authorizes ownership and
-- active opposition before reading those fields; PUBLIC/anon cannot execute.

ALTER TABLE public.test_answers
  ADD COLUMN IF NOT EXISTS confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

DO $constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.test_answers'::regclass
      AND conname = 'test_answers_confirmation_consistent'
  ) THEN
    ALTER TABLE public.test_answers
      ADD CONSTRAINT test_answers_confirmation_consistent
      CHECK (
        (confirmed = false AND confirmed_at IS NULL)
        OR (confirmed = true AND confirmed_at IS NOT NULL AND respuesta_usuario IS NOT NULL)
      );
  END IF;
END
$constraint$;

CREATE OR REPLACE FUNCTION public.guard_test_answer_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_completed boolean;
BEGIN
  SELECT test.completado
  INTO v_completed
  FROM public.tests AS test
  WHERE test.id = OLD.test_id AND test.user_id = OLD.user_id;

  IF v_completed AND (
    NEW.respuesta_usuario IS DISTINCT FROM OLD.respuesta_usuario
    OR NEW.marked_doubt IS DISTINCT FROM OLD.marked_doubt
    OR NEW.confirmed IS DISTINCT FROM OLD.confirmed
    OR NEW.confirmed_at IS DISTINCT FROM OLD.confirmed_at
  ) THEN
    RAISE EXCEPTION 'Completed test answers are immutable';
  END IF;

  IF OLD.confirmed AND (
    NEW.respuesta_usuario IS DISTINCT FROM OLD.respuesta_usuario
    OR NEW.confirmed IS DISTINCT FROM OLD.confirmed
    OR NEW.confirmed_at IS DISTINCT FROM OLD.confirmed_at
  ) THEN
    RAISE EXCEPTION 'Confirmed answer is immutable';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_test_answer_lock ON public.test_answers;
CREATE TRIGGER guard_test_answer_lock
BEFORE UPDATE ON public.test_answers
FOR EACH ROW EXECUTE FUNCTION public.guard_test_answer_lock();

REVOKE UPDATE ON public.test_answers FROM authenticated;
GRANT UPDATE (respuesta_usuario, marked_doubt) ON public.test_answers TO authenticated;

-- Learners retain direct access only to non-solution question columns. Admin
-- reads use the separately authorized get_my_admin_questions() contract.
REVOKE SELECT ON public.questions FROM authenticated;
GRANT SELECT (
  id, user_id, codigo, subject_id, topic_id, subtopic_id, dificultad,
  concepto, objetivo_aprendizaje, pregunta, opcion_a, opcion_b, opcion_c,
  opcion_d, referencia_fuente, activa, created_at, apartado, perspectiva,
  nivel_pedagogico, dificultad_conceptual, dificultad_examen, tipo_trampa,
  documento_referencia, pagina_inicio, pagina_fin, frecuencia_historica,
  opposition_id
) ON public.questions TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_test_session(p_test_id uuid)
RETURNS TABLE (
  test_id uuid, test_type text, completed boolean, started_at timestamptz,
  exam_duration_minutes integer, answer_id uuid, question_id uuid,
  answer_order integer, selected_answer public.respuesta_enum,
  marked_doubt boolean, confirmed boolean, confirmed_at timestamptz,
  question_code text, question_text text, option_a text, option_b text,
  option_c text, option_d text, difficulty public.dificultad_enum,
  exam_difficulty public.dificultad_enum, pedagogical_level text,
  topic_id uuid, subtopic_id uuid
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
  SELECT test.id, test.tipo, test.completado, test.fecha_inicio,
         test.exam_duration_minutes, answer.id, question.id, answer.orden,
         answer.respuesta_usuario, answer.marked_doubt, answer.confirmed,
         answer.confirmed_at, question.codigo, question.pregunta,
         question.opcion_a, question.opcion_b, question.opcion_c,
         question.opcion_d, question.dificultad, question.dificultad_examen,
         question.nivel_pedagogico, question.topic_id, question.subtopic_id
  FROM public.tests AS test
  JOIN public.test_answers AS answer
    ON answer.test_id = test.id AND answer.user_id = test.user_id
  JOIN public.questions AS question
    ON question.id = answer.question_id
   AND question.opposition_id = test.opposition_id
  WHERE test.id = p_test_id
    AND test.user_id = (SELECT auth.uid())
    AND test.opposition_id = public.current_active_opposition_id()
  ORDER BY answer.orden;
$function$;

REVOKE ALL ON FUNCTION public.get_my_test_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_test_session(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.confirm_test_answer(
  p_test_id uuid,
  p_answer_id uuid,
  p_selected_answer public.respuesta_enum
)
RETURNS TABLE (
  test_id uuid, answer_id uuid, question_id uuid,
  selected_answer public.respuesta_enum, confirmed_at timestamptz,
  feedback_revealed boolean, is_correct boolean,
  correct_answer public.respuesta_enum, explanation text,
  concept_id uuid, concept_title text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_test public.tests%ROWTYPE;
  v_answer public.test_answers%ROWTYPE;
  v_question public.questions%ROWTYPE;
  v_concept_id uuid;
  v_concept_title text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT * INTO v_test FROM public.tests
  WHERE id = p_test_id AND user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Test not found'; END IF;
  IF v_test.opposition_id IS DISTINCT FROM public.current_active_opposition_id() THEN
    RAISE EXCEPTION 'Test does not belong to the active opposition';
  END IF;
  IF v_test.completado THEN RAISE EXCEPTION 'Test already completed'; END IF;

  SELECT answer.* INTO v_answer FROM public.test_answers AS answer
  WHERE answer.id = p_answer_id AND answer.test_id = p_test_id AND answer.user_id = v_user_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Answer does not belong to the test'; END IF;

  SELECT question.* INTO v_question FROM public.questions AS question
  WHERE question.id = v_answer.question_id AND question.opposition_id = v_test.opposition_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Question does not belong to the test opposition'; END IF;

  IF v_answer.confirmed AND v_answer.respuesta_usuario IS DISTINCT FROM p_selected_answer THEN
    RAISE EXCEPTION 'Confirmed answer is immutable';
  END IF;

  IF NOT v_answer.confirmed THEN
    UPDATE public.test_answers
    SET respuesta_usuario = p_selected_answer, confirmed = true, confirmed_at = now()
    WHERE id = v_answer.id
    RETURNING * INTO v_answer;
  END IF;

  SELECT COALESCE(selection.selection_concept_id, primary_mapping.concept_id)
  INTO v_concept_id
  FROM (SELECT 1) AS singleton
  LEFT JOIN public.test_question_selection AS selection
    ON selection.user_id = v_user_id
   AND selection.test_id = p_test_id
   AND selection.question_id = v_question.id
  LEFT JOIN LATERAL (
    SELECT mapping.concept_id
    FROM public.question_concepts AS mapping
    WHERE mapping.question_id = v_question.id
      AND mapping.opposition_id = v_test.opposition_id
      AND mapping.role = 'primary'
    ORDER BY mapping.concept_id
    LIMIT 1
  ) AS primary_mapping ON true;

  SELECT concept.title INTO v_concept_title
  FROM public.concepts AS concept
  WHERE concept.id = v_concept_id AND concept.opposition_id = v_test.opposition_id;

  RETURN QUERY SELECT v_test.id, v_answer.id, v_question.id,
    v_answer.respuesta_usuario, v_answer.confirmed_at,
    v_test.tipo <> 'simulacro',
    CASE WHEN v_test.tipo <> 'simulacro' THEN p_selected_answer = v_question.respuesta_correcta ELSE NULL END,
    CASE WHEN v_test.tipo <> 'simulacro' THEN v_question.respuesta_correcta ELSE NULL END,
    CASE WHEN v_test.tipo <> 'simulacro' THEN v_question.explicacion ELSE NULL END,
    CASE WHEN v_test.tipo <> 'simulacro' THEN v_concept_id ELSE NULL END,
    CASE WHEN v_test.tipo <> 'simulacro' THEN v_concept_title ELSE NULL END;
END;
$function$;

REVOKE ALL ON FUNCTION public.confirm_test_answer(uuid, uuid, public.respuesta_enum) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_test_answer(uuid, uuid, public.respuesta_enum) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_completed_test_result(p_test_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT jsonb_build_object(
    'test', to_jsonb(test),
    'answers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', answer.id, 'respuesta_usuario', answer.respuesta_usuario,
        'correcta', answer.correcta, 'orden', answer.orden,
        'question_id', answer.question_id, 'marked_doubt', answer.marked_doubt,
        'confirmed', answer.confirmed, 'confirmed_at', answer.confirmed_at,
        'questions', jsonb_build_object(
          'codigo', question.codigo, 'dificultad', question.dificultad,
          'dificultad_examen', question.dificultad_examen,
          'nivel_pedagogico', question.nivel_pedagogico, 'pregunta', question.pregunta,
          'opcion_a', question.opcion_a, 'opcion_b', question.opcion_b,
          'opcion_c', question.opcion_c, 'opcion_d', question.opcion_d,
          'respuesta_correcta', question.respuesta_correcta,
          'explicacion', question.explicacion,
          'referencia_fuente', question.referencia_fuente,
          'concepto', question.concepto, 'perspectiva', question.perspectiva,
          'apartado', question.apartado,
          'documento_referencia', question.documento_referencia,
          'pagina_inicio', question.pagina_inicio, 'pagina_fin', question.pagina_fin,
          'objetivo_aprendizaje', question.objetivo_aprendizaje,
          'topics', jsonb_build_object('nombre', topic.nombre, 'numero', topic.numero),
          'subtopics', CASE WHEN subtopic.id IS NULL THEN NULL ELSE jsonb_build_object('nombre', subtopic.nombre) END
        )
      ) ORDER BY answer.orden)
      FROM public.test_answers answer
      JOIN public.questions question ON question.id = answer.question_id
      JOIN public.topics topic ON topic.id = question.topic_id AND topic.opposition_id = test.opposition_id
      LEFT JOIN public.subtopics subtopic ON subtopic.id = question.subtopic_id AND subtopic.opposition_id = test.opposition_id
      WHERE answer.test_id = test.id AND answer.user_id = v_user_id
    ), '[]'::jsonb),
    'selection', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'question_id', selection.question_id,
        'selection_group', selection.selection_group,
        'selection_reason', selection.selection_reason,
        'was_in_previous_test', selection.was_in_previous_test,
        'overlap_exception', selection.overlap_exception
      ) ORDER BY selection.selection_order)
      FROM public.test_question_selection selection
      WHERE selection.test_id = test.id AND selection.user_id = v_user_id
    ), '[]'::jsonb)
  ) INTO v_result
  FROM public.tests test
  WHERE test.id = p_test_id
    AND test.user_id = v_user_id
    AND test.opposition_id = public.current_active_opposition_id()
    AND test.completado;
  IF v_result IS NULL THEN RAISE EXCEPTION 'Completed test not found'; END IF;
  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_my_completed_test_result(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_completed_test_result(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_admin_questions()
RETURNS SETOF public.questions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_opposition_id uuid := public.current_active_opposition_id();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.opposition_admins administrator
    WHERE administrator.user_id = v_user_id AND administrator.opposition_id = v_opposition_id
  ) THEN RAISE EXCEPTION 'Opposition admin required'; END IF;
  RETURN QUERY SELECT question.* FROM public.questions question
  WHERE question.opposition_id = v_opposition_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_my_admin_questions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_admin_questions() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_tests_first_concept_progress()
RETURNS TABLE (
  concept_id uuid, concept_title text, topic_id uuid, topic_number integer,
  topic_name text, learner_state text, evidence_reason text,
  distinct_test_questions integer, distinct_completed_test_sessions integer,
  safe_accuracy numeric, attention_required boolean, doubt_answers integer,
  next_review_on timestamptz, active_primary_question_count integer
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
WITH scope AS (
  SELECT (SELECT auth.uid()) user_id, public.current_active_opposition_id() opposition_id
), capacity AS (
  SELECT concept.id concept_id, count(DISTINCT question.id)::integer active_primary_questions
  FROM public.concepts concept
  LEFT JOIN public.question_concepts mapping
    ON mapping.concept_id = concept.id AND mapping.opposition_id = concept.opposition_id AND mapping.role = 'primary'
  LEFT JOIN public.questions question
    ON question.id = mapping.question_id AND question.opposition_id = concept.opposition_id AND question.activa
  JOIN scope ON scope.opposition_id = concept.opposition_id
  WHERE concept.active
  GROUP BY concept.id
), attributed AS (
  SELECT answer.question_id, answer.test_id, answer.correcta, answer.marked_doubt,
         COALESCE(selection.selection_concept_id, primary_mapping.concept_id) concept_id,
         statistics.next_review_at
  FROM scope
  JOIN public.tests test ON test.user_id = scope.user_id AND test.opposition_id = scope.opposition_id AND test.completado
  JOIN public.test_answers answer ON answer.test_id = test.id AND answer.user_id = scope.user_id AND answer.correcta IS NOT NULL
  LEFT JOIN public.test_question_selection selection
    ON selection.user_id = scope.user_id AND selection.test_id = test.id AND selection.question_id = answer.question_id
  LEFT JOIN LATERAL (
    SELECT mapping.concept_id FROM public.question_concepts mapping
    WHERE mapping.question_id = answer.question_id AND mapping.opposition_id = scope.opposition_id AND mapping.role = 'primary'
    ORDER BY mapping.concept_id LIMIT 1
  ) primary_mapping ON true
  LEFT JOIN public.question_statistics statistics
    ON statistics.user_id = scope.user_id AND statistics.question_id = answer.question_id
), evidence AS (
  SELECT attributed.concept_id,
    count(DISTINCT attributed.question_id)::integer distinct_questions,
    count(DISTINCT attributed.test_id)::integer distinct_sessions,
    count(*) FILTER (WHERE attributed.correcta)::integer correct_answers,
    count(*)::integer answered,
    count(*) FILTER (WHERE attributed.marked_doubt)::integer doubts,
    min(attributed.next_review_at) next_review_at
  FROM attributed WHERE attributed.concept_id IS NOT NULL GROUP BY attributed.concept_id
), scored AS (
  SELECT concept.id, concept.title, concept.topic_id, topic.numero, topic.nombre,
    COALESCE(evidence.distinct_questions, 0) distinct_questions,
    COALESCE(evidence.distinct_sessions, 0) distinct_sessions,
    COALESCE(evidence.doubts, 0) doubts,
    CASE WHEN COALESCE(evidence.distinct_questions, 0) >= 2 AND COALESCE(evidence.distinct_sessions, 0) >= 2
      THEN round(evidence.correct_answers::numeric / NULLIF(evidence.answered, 0) * 100, 2) END accuracy,
    evidence.next_review_at, capacity.active_primary_questions
  FROM public.concepts concept
  JOIN scope ON scope.opposition_id = concept.opposition_id
  JOIN public.topics topic ON topic.id = concept.topic_id AND topic.opposition_id = concept.opposition_id
  JOIN capacity ON capacity.concept_id = concept.id
  LEFT JOIN evidence ON evidence.concept_id = concept.id
  WHERE concept.active
)
SELECT id, title, topic_id, numero, nombre,
  CASE
    WHEN distinct_questions < 2 OR distinct_sessions < 2 THEN 'not_evaluated'
    WHEN accuracy < 70 THEN 'needs_reinforcement'
    WHEN distinct_questions >= 6 AND distinct_sessions >= 3 AND accuracy >= 85 AND doubts = 0 AND active_primary_questions >= 6 THEN 'mastered'
    ELSE 'consolidating'
  END,
  CASE
    WHEN distinct_questions < 2 OR distinct_sessions < 2 THEN 'insufficient_test_evidence'
    WHEN accuracy < 70 THEN 'safe_accuracy_below_70'
    WHEN distinct_questions >= 6 AND distinct_sessions >= 3 AND accuracy >= 85 AND doubts = 0 AND active_primary_questions >= 6 THEN 'diverse_high_accuracy_test_evidence'
    WHEN active_primary_questions < 6 THEN 'limited_active_primary_capacity'
    WHEN doubts > 0 THEN 'confirmed_doubt_requires_attention'
    ELSE 'growing_test_evidence'
  END,
  distinct_questions, distinct_sessions, accuracy,
  (doubts > 0 OR (accuracy IS NOT NULL AND accuracy < 70) OR active_primary_questions < 2),
  doubts,
  CASE WHEN distinct_questions >= 2 AND distinct_sessions >= 2 THEN next_review_at END,
  active_primary_questions
FROM scored ORDER BY numero, title;
$function$;

REVOKE ALL ON FUNCTION public.get_my_tests_first_concept_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_tests_first_concept_progress() TO authenticated, service_role;

-- complete_test needs protected solution columns and correctness writes after
-- the learner privileges above are narrowed. Its existing auth/ownership lock
-- and idempotent implementation remain unchanged; only its execution boundary
-- and deterministic search_path change.
ALTER FUNCTION public.complete_test(uuid) SECURITY DEFINER;
ALTER FUNCTION public.complete_test(uuid) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.complete_test(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_test(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_my_tests_first_concept_progress() IS
  'Tests-first projection. Classification uses completed tests only. Safe accuracy requires >=2 distinct questions across >=2 sessions; mastery requires >=6 questions, >=3 sessions, >=85%, zero doubts and >=6 active PRIMARY questions.';
