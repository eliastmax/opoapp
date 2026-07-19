-- Sprint V2: active doubts and reliable per-question statistics.

ALTER TABLE public.test_answers
  ADD COLUMN marked_doubt boolean NOT NULL DEFAULT false;

CREATE TABLE public.question_statistics (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid NOT NULL,
  appearances_count integer NOT NULL DEFAULT 0 CHECK (appearances_count >= 0),
  answered_count integer NOT NULL DEFAULT 0 CHECK (answered_count >= 0),
  correct_count integer NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  incorrect_count integer NOT NULL DEFAULT 0 CHECK (incorrect_count >= 0),
  doubt_count integer NOT NULL DEFAULT 0 CHECK (doubt_count >= 0),
  current_correct_streak integer NOT NULL DEFAULT 0 CHECK (current_correct_streak >= 0),
  current_incorrect_streak integer NOT NULL DEFAULT 0 CHECK (current_incorrect_streak >= 0),
  last_seen_at timestamptz,
  last_answered_at timestamptz,
  last_correct_at timestamptz,
  last_incorrect_at timestamptz,
  last_doubted_at timestamptz,
  next_review_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id),
  CONSTRAINT question_statistics_owner_question_fk
    FOREIGN KEY (user_id, question_id)
    REFERENCES public.questions (user_id, id)
    ON DELETE CASCADE
);

GRANT SELECT, INSERT, UPDATE ON public.question_statistics TO authenticated;
GRANT ALL ON public.question_statistics TO service_role;

ALTER TABLE public.question_statistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "question_statistics_select_own"
  ON public.question_statistics
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "question_statistics_insert_own"
  ON public.question_statistics
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "question_statistics_update_own"
  ON public.question_statistics
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Preserve the small amount of existing history when introducing the table.
INSERT INTO public.question_statistics (
  user_id,
  question_id,
  appearances_count,
  answered_count,
  correct_count,
  incorrect_count,
  doubt_count,
  last_seen_at,
  last_answered_at,
  last_correct_at,
  last_incorrect_at,
  last_doubted_at,
  updated_at
)
SELECT
  ta.user_id,
  ta.question_id,
  count(*)::integer,
  count(*) FILTER (WHERE ta.correcta IS NOT NULL)::integer,
  count(*) FILTER (WHERE ta.correcta IS TRUE)::integer,
  count(*) FILTER (WHERE ta.correcta IS FALSE)::integer,
  count(*) FILTER (WHERE ta.marked_doubt IS TRUE)::integer,
  max(t.fecha_finalizacion),
  max(t.fecha_finalizacion) FILTER (WHERE ta.correcta IS NOT NULL),
  max(t.fecha_finalizacion) FILTER (WHERE ta.correcta IS TRUE),
  max(t.fecha_finalizacion) FILTER (WHERE ta.correcta IS FALSE),
  max(t.fecha_finalizacion) FILTER (WHERE ta.marked_doubt IS TRUE),
  now()
FROM public.test_answers AS ta
JOIN public.tests AS t
  ON t.id = ta.test_id
 AND t.user_id = ta.user_id
WHERE t.completado IS TRUE
  AND t.fecha_finalizacion IS NOT NULL
GROUP BY ta.user_id, ta.question_id
ON CONFLICT (user_id, question_id) DO NOTHING;

-- Backfill the current consecutive correct/incorrect streak from answered tests.
WITH answered AS (
  SELECT
    ta.user_id,
    ta.question_id,
    ta.correcta,
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
),
latest AS (
  SELECT user_id, question_id, correcta
  FROM answered
  WHERE attempt_rank = 1
),
boundaries AS (
  SELECT
    a.user_id,
    a.question_id,
    l.correcta,
    min(a.attempt_rank) FILTER (WHERE a.correcta IS DISTINCT FROM l.correcta) AS first_change
  FROM answered AS a
  JOIN latest AS l
    ON l.user_id = a.user_id
   AND l.question_id = a.question_id
  GROUP BY a.user_id, a.question_id, l.correcta
),
streaks AS (
  SELECT
    a.user_id,
    a.question_id,
    b.correcta,
    count(*) FILTER (
      WHERE a.attempt_rank < COALESCE(b.first_change, 2147483647)
        AND a.correcta = b.correcta
    )::integer AS streak
  FROM answered AS a
  JOIN boundaries AS b
    ON b.user_id = a.user_id
   AND b.question_id = a.question_id
  GROUP BY a.user_id, a.question_id, b.correcta
)
UPDATE public.question_statistics AS qs
SET current_correct_streak = CASE WHEN s.correcta IS TRUE THEN s.streak ELSE 0 END,
    current_incorrect_streak = CASE WHEN s.correcta IS FALSE THEN s.streak ELSE 0 END
FROM streaks AS s
WHERE qs.user_id = s.user_id
  AND qs.question_id = s.question_id;

-- A doubt is active when the latest meaningful attempt was marked as doubtful.
-- An unanswered and unmarked appearance does not clear a previous doubt.
CREATE OR REPLACE VIEW public.active_doubt_questions
WITH (security_invoker = true)
AS
WITH ranked_attempts AS (
  SELECT
    ta.user_id,
    ta.question_id,
    ta.marked_doubt,
    t.fecha_finalizacion AS last_reviewed_at,
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
    AND (ta.respuesta_usuario IS NOT NULL OR ta.marked_doubt IS TRUE)
)
SELECT
  ranked.user_id,
  ranked.question_id,
  q.topic_id,
  q.subtopic_id,
  q.dificultad,
  ranked.last_reviewed_at
FROM ranked_attempts AS ranked
JOIN public.questions AS q
  ON q.id = ranked.question_id
 AND q.user_id = ranked.user_id
WHERE ranked.attempt_rank = 1
  AND ranked.marked_doubt IS TRUE
  AND q.activa IS TRUE;

REVOKE ALL ON public.active_doubt_questions FROM PUBLIC;
REVOKE ALL ON public.active_doubt_questions FROM anon;
GRANT SELECT ON public.active_doubt_questions TO authenticated;
GRANT SELECT ON public.active_doubt_questions TO service_role;

CREATE INDEX idx_test_answers_user_question_doubt
  ON public.test_answers (user_id, question_id, created_at DESC)
  WHERE marked_doubt IS TRUE;

CREATE INDEX idx_question_statistics_next_review
  ON public.question_statistics (user_id, next_review_at)
  WHERE next_review_at IS NOT NULL;

-- Extend atomic test completion so statistics are counted exactly once.
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

  INSERT INTO public.question_statistics AS qs (
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
    ta.user_id,
    ta.question_id,
    1,
    CASE WHEN ta.correcta IS NOT NULL THEN 1 ELSE 0 END,
    CASE WHEN ta.correcta IS TRUE THEN 1 ELSE 0 END,
    CASE WHEN ta.correcta IS FALSE THEN 1 ELSE 0 END,
    CASE WHEN ta.marked_doubt IS TRUE THEN 1 ELSE 0 END,
    CASE WHEN ta.correcta IS TRUE THEN 1 ELSE 0 END,
    CASE WHEN ta.correcta IS FALSE THEN 1 ELSE 0 END,
    now(),
    CASE WHEN ta.correcta IS NOT NULL THEN now() ELSE NULL END,
    CASE WHEN ta.correcta IS TRUE THEN now() ELSE NULL END,
    CASE WHEN ta.correcta IS FALSE THEN now() ELSE NULL END,
    CASE WHEN ta.marked_doubt IS TRUE THEN now() ELSE NULL END,
    now()
  FROM public.test_answers AS ta
  WHERE ta.test_id = p_test_id
    AND ta.user_id = v_user_id
  ON CONFLICT (user_id, question_id) DO UPDATE
  SET appearances_count = qs.appearances_count + EXCLUDED.appearances_count,
      answered_count = qs.answered_count + EXCLUDED.answered_count,
      correct_count = qs.correct_count + EXCLUDED.correct_count,
      incorrect_count = qs.incorrect_count + EXCLUDED.incorrect_count,
      doubt_count = qs.doubt_count + EXCLUDED.doubt_count,
      current_correct_streak = CASE
        WHEN EXCLUDED.correct_count = 1 THEN qs.current_correct_streak + 1
        WHEN EXCLUDED.incorrect_count = 1 THEN 0
        ELSE qs.current_correct_streak
      END,
      current_incorrect_streak = CASE
        WHEN EXCLUDED.incorrect_count = 1 THEN qs.current_incorrect_streak + 1
        WHEN EXCLUDED.correct_count = 1 THEN 0
        ELSE qs.current_incorrect_streak
      END,
      last_seen_at = EXCLUDED.last_seen_at,
      last_answered_at = COALESCE(EXCLUDED.last_answered_at, qs.last_answered_at),
      last_correct_at = COALESCE(EXCLUDED.last_correct_at, qs.last_correct_at),
      last_incorrect_at = COALESCE(EXCLUDED.last_incorrect_at, qs.last_incorrect_at),
      last_doubted_at = COALESCE(EXCLUDED.last_doubted_at, qs.last_doubted_at),
      updated_at = now();

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
