-- Sprint 26: user-reported question incidents and a durable bank-quality guard.
-- This migration never changes, disables or deletes a question automatically.

CREATE TABLE public.question_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid NOT NULL,
  reason text NOT NULL CHECK (
    reason IN (
      'error_juridico',
      'enunciado_ambiguo',
      'referencia_incorrecta',
      'duplicada_similar',
      'redaccion_formato'
    )
  ),
  detail text NULL CHECK (detail IS NULL OR char_length(detail) <= 600),
  status text NOT NULL DEFAULT 'pendiente' CHECK (
    status IN ('pendiente', 'revisada', 'resuelta', 'descartada')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT question_incidents_owner_question_fk
    FOREIGN KEY (user_id, question_id)
    REFERENCES public.questions(user_id, id)
    ON DELETE CASCADE
);

CREATE UNIQUE INDEX question_incidents_one_open_reason_per_question
  ON public.question_incidents(user_id, question_id, reason)
  WHERE status = 'pendiente';

CREATE INDEX question_incidents_open_queue_idx
  ON public.question_incidents(user_id, status, created_at DESC);

ALTER TABLE public.question_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own question incidents"
  ON public.question_incidents
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can report incidents for their own questions"
  ON public.question_incidents
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

REVOKE ALL ON TABLE public.question_incidents FROM PUBLIC;
GRANT SELECT, INSERT ON TABLE public.question_incidents TO authenticated;

-- Prevent future literal duplicates at the database boundary. Historical
-- duplicates remain visible to the audit; this trigger does not rewrite them.
CREATE OR REPLACE FUNCTION public.guard_question_stem_uniqueness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $fn$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.questions AS existing_question
    WHERE existing_question.user_id = NEW.user_id
      AND existing_question.id IS DISTINCT FROM NEW.id
      AND lower(regexp_replace(btrim(existing_question.pregunta), '\\s+', ' ', 'g'))
          = lower(regexp_replace(btrim(NEW.pregunta), '\\s+', ' ', 'g'))
  ) THEN
    RAISE EXCEPTION 'A question with the same statement already exists in this catalog'
      USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS questions_guard_statement_uniqueness ON public.questions;
CREATE TRIGGER questions_guard_statement_uniqueness
  BEFORE INSERT OR UPDATE OF pregunta ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_question_stem_uniqueness();

CREATE OR REPLACE FUNCTION public.get_question_bank_quality_report()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $fn$
  WITH owner_questions AS (
    SELECT question.*
    FROM public.questions AS question
    WHERE question.user_id = auth.uid()
  ),
  exact_duplicate_stems AS (
    SELECT lower(regexp_replace(btrim(pregunta), '\\s+', ' ', 'g')) AS statement_key
    FROM owner_questions
    GROUP BY statement_key
    HAVING count(*) > 1
  ),
  invalid_options AS (
    SELECT id
    FROM owner_questions
    WHERE lower(btrim(opcion_a)) IN (lower(btrim(opcion_b)), lower(btrim(opcion_c)), lower(btrim(opcion_d)))
       OR lower(btrim(opcion_b)) IN (lower(btrim(opcion_c)), lower(btrim(opcion_d)))
       OR lower(btrim(opcion_c)) = lower(btrim(opcion_d))
  ),
  topic_stage_capacity AS (
    SELECT
      topic.id,
      count(question.id) FILTER (WHERE question.nivel_pedagogico = 'aprendizaje')::integer AS aprendizaje,
      count(question.id) FILTER (WHERE question.nivel_pedagogico = 'consolidacion')::integer AS consolidacion,
      count(question.id) FILTER (WHERE question.nivel_pedagogico = 'tribunal')::integer AS tribunal
    FROM public.topics AS topic
    LEFT JOIN owner_questions AS question ON question.topic_id = topic.id
    WHERE topic.user_id = auth.uid()
    GROUP BY topic.id
  )
  SELECT jsonb_build_object(
    'questions', (SELECT count(*) FROM owner_questions),
    'duplicate_stems', (SELECT count(*) FROM exact_duplicate_stems),
    'equal_options', (SELECT count(*) FROM invalid_options),
    'missing_concept', (SELECT count(*) FROM owner_questions WHERE NULLIF(btrim(concepto), '') IS NULL),
    'missing_perspective', (SELECT count(*) FROM owner_questions WHERE NULLIF(btrim(perspectiva), '') IS NULL),
    'missing_reference', (SELECT count(*) FROM owner_questions WHERE NULLIF(btrim(referencia_fuente), '') IS NULL),
    'insufficient_stage_capacity', (
      SELECT count(*)
      FROM topic_stage_capacity
      WHERE aprendizaje < 10 OR consolidacion < 10 OR tribunal < 10
    )
  );
$fn$;

REVOKE ALL ON FUNCTION public.get_question_bank_quality_report() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_question_bank_quality_report() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_question_bank_quality_report() TO authenticated;
