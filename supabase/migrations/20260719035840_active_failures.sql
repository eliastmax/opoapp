-- Complete a test atomically and calculate correctness on the database.
-- SECURITY INVOKER keeps the existing RLS ownership checks in force.
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
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT t.completado
  INTO v_completado
  FROM public.tests AS t
  WHERE t.id = p_test_id
    AND t.user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Test not found';
  END IF;

  -- Idempotent: re-submitting an already completed test does not count it twice.
  IF v_completado THEN
    RETURN QUERY
    SELECT t.aciertos, t.fallos, t.sin_responder, t.porcentaje
    FROM public.tests AS t
    WHERE t.id = p_test_id
      AND t.user_id = v_user_id;
    RETURN;
  END IF;

  UPDATE public.test_answers AS ta
  SET correcta = CASE
    WHEN ta.respuesta_usuario IS NULL THEN NULL
    ELSE ta.respuesta_usuario = q.respuesta_correcta
  END
  FROM public.questions AS q
  WHERE ta.test_id = p_test_id
    AND ta.user_id = v_user_id
    AND q.id = ta.question_id
    AND q.user_id = v_user_id;

  SELECT
    count(*)::integer,
    count(*) FILTER (WHERE ta.correcta IS TRUE)::integer,
    count(*) FILTER (WHERE ta.correcta IS FALSE)::integer,
    count(*) FILTER (WHERE ta.respuesta_usuario IS NULL)::integer
  INTO v_total, v_aciertos, v_fallos, v_sin_responder
  FROM public.test_answers AS ta
  WHERE ta.test_id = p_test_id
    AND ta.user_id = v_user_id;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'Test has no questions';
  END IF;

  v_porcentaje := round((v_aciertos::numeric / v_total::numeric) * 100, 2);

  UPDATE public.tests AS t
  SET completado = true,
      fecha_finalizacion = now(),
      aciertos = v_aciertos,
      fallos = v_fallos,
      sin_responder = v_sin_responder,
      porcentaje = v_porcentaje
  WHERE t.id = p_test_id
    AND t.user_id = v_user_id;

  RETURN QUERY
  SELECT v_aciertos, v_fallos, v_sin_responder, v_porcentaje;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_test(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_test(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.complete_test(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_test(uuid) TO service_role;

-- A failure is active only when the latest answered attempt in a completed
-- test is incorrect. Unanswered attempts do not alter the previous state.
CREATE OR REPLACE VIEW public.active_failed_questions
WITH (security_invoker = true)
AS
WITH ranked_answers AS (
  SELECT
    ta.user_id,
    ta.question_id,
    ta.correcta,
    t.fecha_finalizacion AS last_answered_at,
    row_number() OVER (
      PARTITION BY ta.user_id, ta.question_id
      ORDER BY t.fecha_finalizacion DESC, ta.created_at DESC, ta.id DESC
    ) AS attempt_rank
  FROM public.test_answers AS ta
  JOIN public.tests AS t
    ON t.id = ta.test_id
   AND t.user_id = ta.user_id
  WHERE t.completado IS TRUE
    AND t.fecha_finalizacion IS NOT NULL
    AND ta.correcta IS NOT NULL
)
SELECT
  ranked.user_id,
  ranked.question_id,
  q.topic_id,
  q.subtopic_id,
  q.dificultad,
  ranked.last_answered_at
FROM ranked_answers AS ranked
JOIN public.questions AS q
  ON q.id = ranked.question_id
 AND q.user_id = ranked.user_id
WHERE ranked.attempt_rank = 1
  AND ranked.correcta IS FALSE
  AND q.activa IS TRUE;

REVOKE ALL ON public.active_failed_questions FROM PUBLIC;
REVOKE ALL ON public.active_failed_questions FROM anon;
GRANT SELECT ON public.active_failed_questions TO authenticated;
GRANT SELECT ON public.active_failed_questions TO service_role;

CREATE INDEX IF NOT EXISTS idx_test_answers_user_question_answered
  ON public.test_answers (user_id, question_id, created_at DESC)
  WHERE correcta IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tests_user_completed_finalized
  ON public.tests (user_id, fecha_finalizacion DESC)
  WHERE completado IS TRUE;
