-- Fix Sprint 16: PostgreSQL cannot reference the UPDATE target alias from a
-- LATERAL item in the same UPDATE ... FROM clause.

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

  WITH retention_updates AS MATERIALIZED (
    SELECT
      statistics.user_id,
      statistics.question_id,
      transition.retention_level,
      transition.next_review_at
    FROM public.question_statistics AS statistics
    JOIN public.test_answers AS answer
      ON answer.user_id = statistics.user_id
     AND answer.question_id = statistics.question_id
    CROSS JOIN LATERAL public.calculate_retention_state(
      statistics.retention_level,
      statistics.next_review_at,
      answer.correcta,
      answer.marked_doubt,
      v_completed_at
    ) AS transition
    WHERE answer.test_id = p_test_id
      AND answer.user_id = v_user_id
  )
  UPDATE public.question_statistics AS statistics
  SET retention_level = retention.retention_level,
      next_review_at = retention.next_review_at,
      updated_at = v_completed_at
  FROM retention_updates AS retention
  WHERE statistics.user_id = retention.user_id
    AND statistics.question_id = retention.question_id;

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
  'Completes a test exactly once and updates retention-v1.0 atomically (alias fix).';
