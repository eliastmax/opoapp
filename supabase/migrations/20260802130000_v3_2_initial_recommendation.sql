-- V3.2: make the initial assessment useful without treating it as observed
-- progress. This migration also removes the remaining learner/catalog-owner
-- coupling from the recommended-session path.

ALTER TABLE public.test_answers
  DROP CONSTRAINT IF EXISTS test_answers_owner_question_fk;
ALTER TABLE public.test_question_selection
  DROP CONSTRAINT IF EXISTS test_question_selection_owner_question_fk;
ALTER TABLE public.question_statistics
  DROP CONSTRAINT IF EXISTS question_statistics_owner_question_fk;
ALTER TABLE public.question_incidents
  DROP CONSTRAINT IF EXISTS question_incidents_owner_question_fk;

ALTER TABLE public.test_question_selection
  ADD CONSTRAINT test_question_selection_question_id_fkey
  FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE RESTRICT;
ALTER TABLE public.question_statistics
  ADD CONSTRAINT question_statistics_question_id_fkey
  FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE RESTRICT;
ALTER TABLE public.question_incidents
  ADD CONSTRAINT question_incidents_question_id_fkey
  FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS test_question_selection_question_id_idx
  ON public.test_question_selection(question_id);
CREATE INDEX IF NOT EXISTS question_statistics_question_id_idx
  ON public.question_statistics(question_id);
CREATE INDEX IF NOT EXISTS question_incidents_question_id_idx
  ON public.question_incidents(question_id);

CREATE OR REPLACE VIEW public.active_failed_questions
WITH (security_invoker = true)
AS
WITH ranked_answers AS (
  SELECT
    answer.user_id,
    answer.question_id,
    test.opposition_id,
    answer.correcta,
    test.fecha_finalizacion AS last_answered_at,
    row_number() OVER (
      PARTITION BY answer.user_id, answer.question_id
      ORDER BY test.fecha_finalizacion DESC, answer.created_at DESC, answer.id DESC
    ) AS attempt_rank
  FROM public.test_answers AS answer
  JOIN public.tests AS test
    ON test.id = answer.test_id
   AND test.user_id = answer.user_id
  WHERE test.completado IS TRUE
    AND test.fecha_finalizacion IS NOT NULL
    AND answer.correcta IS NOT NULL
)
SELECT
  ranked.user_id,
  ranked.question_id,
  question.topic_id,
  question.subtopic_id,
  question.dificultad,
  ranked.last_answered_at
FROM ranked_answers AS ranked
JOIN public.questions AS question
  ON question.id = ranked.question_id
 AND question.opposition_id = ranked.opposition_id
WHERE ranked.attempt_rank = 1
  AND ranked.correcta IS FALSE
  AND question.activa IS TRUE;

CREATE OR REPLACE VIEW public.active_doubt_questions
WITH (security_invoker = true)
AS
WITH ranked_attempts AS (
  SELECT
    answer.user_id,
    answer.question_id,
    test.opposition_id,
    answer.marked_doubt,
    test.fecha_finalizacion AS last_reviewed_at,
    row_number() OVER (
      PARTITION BY answer.user_id, answer.question_id
      ORDER BY test.fecha_finalizacion DESC, answer.created_at DESC, answer.id DESC
    ) AS attempt_rank
  FROM public.test_answers AS answer
  JOIN public.tests AS test
    ON test.id = answer.test_id
   AND test.user_id = answer.user_id
  WHERE test.completado IS TRUE
    AND test.fecha_finalizacion IS NOT NULL
    AND (answer.respuesta_usuario IS NOT NULL OR answer.marked_doubt IS TRUE)
)
SELECT
  ranked.user_id,
  ranked.question_id,
  question.topic_id,
  question.subtopic_id,
  question.dificultad,
  ranked.last_reviewed_at
FROM ranked_attempts AS ranked
JOIN public.questions AS question
  ON question.id = ranked.question_id
 AND question.opposition_id = ranked.opposition_id
WHERE ranked.attempt_rank = 1
  AND ranked.marked_doubt IS TRUE
  AND question.activa IS TRUE;

CREATE OR REPLACE FUNCTION public.get_learning_stage_progress()
RETURNS TABLE (
  subject_id uuid,
  subject_name text,
  topic_id uuid,
  topic_number integer,
  topic_name text,
  learning_questions integer,
  consolidation_questions integer,
  tribunal_questions integer,
  learning_seen integer,
  learning_sessions integer,
  learning_question_coverage numeric,
  learning_perspective_coverage numeric,
  learning_mastery numeric,
  learning_critical_concepts integer,
  consolidation_unlocked boolean,
  consolidation_seen integer,
  consolidation_sessions integer,
  consolidation_question_coverage numeric,
  consolidation_perspective_coverage numeric,
  consolidation_mastery numeric,
  global_mastery numeric,
  robustness_percentage numeric,
  retention_evidence integer,
  critical_concepts integer,
  tribunal_unlocked boolean,
  recommended_stage text,
  stage_message text,
  metric_version text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH viewer AS (
  SELECT (SELECT auth.uid()) AS user_id
),
catalog AS (
  SELECT
    subject.id AS subject_id,
    subject.nombre AS subject_name,
    topic.id AS topic_id,
    topic.numero AS topic_number,
    topic.nombre AS topic_name
  FROM public.topics AS topic
  JOIN public.subjects AS subject
    ON subject.id = topic.subject_id
   AND subject.opposition_id = topic.opposition_id
  JOIN public.profiles AS profile
    ON profile.id = (SELECT user_id FROM viewer)
   AND profile.active_opposition_id = topic.opposition_id
),
pool AS (
  SELECT
    question.topic_id,
    COALESCE(question.nivel_pedagogico, 'aprendizaje') AS stage,
    count(*)::integer AS available_questions,
    count(DISTINCT question.perspectiva) FILTER (
      WHERE NULLIF(btrim(question.perspectiva), '') IS NOT NULL
    )::integer AS available_perspectives
  FROM public.questions AS question
  JOIN public.profiles AS profile
    ON profile.id = (SELECT user_id FROM viewer)
   AND profile.active_opposition_id = question.opposition_id
  WHERE question.activa IS TRUE
  GROUP BY question.topic_id, COALESCE(question.nivel_pedagogico, 'aprendizaje')
),
ranked_answers AS (
  SELECT
    answer.user_id,
    answer.question_id,
    answer.test_id,
    question.topic_id,
    COALESCE(question.nivel_pedagogico, 'aprendizaje') AS stage,
    lower(regexp_replace(btrim(question.concepto), '\s+', ' ', 'g')) AS concept_key,
    question.perspectiva,
    answer.correcta,
    answer.marked_doubt,
    test.fecha_finalizacion,
    answer.created_at,
    answer.id,
    row_number() OVER (
      PARTITION BY answer.user_id, answer.question_id
      ORDER BY test.fecha_finalizacion DESC, answer.created_at DESC, answer.id DESC
    ) AS answer_rank
  FROM public.test_answers AS answer
  JOIN public.tests AS test
    ON test.user_id = answer.user_id
   AND test.id = answer.test_id
  JOIN public.questions AS question
    ON question.id = answer.question_id
   AND question.opposition_id = test.opposition_id
  JOIN viewer
    ON viewer.user_id = answer.user_id
  JOIN public.profiles AS profile
    ON profile.id = answer.user_id
   AND profile.active_opposition_id = test.opposition_id
  WHERE test.completado IS TRUE
    AND test.fecha_finalizacion IS NOT NULL
    AND test.stage_free_mode IS FALSE
    AND answer.correcta IS NOT NULL
    AND question.activa IS TRUE
),
latest AS (
  SELECT *
  FROM ranked_answers
  WHERE answer_rank = 1
),
latest_stage AS (
  SELECT
    latest.topic_id,
    latest.stage,
    count(*)::integer AS seen_questions,
    count(*) FILTER (
      WHERE latest.correcta IS TRUE
        AND latest.marked_doubt IS FALSE
    )::integer AS secure_correct_questions,
    count(DISTINCT latest.perspectiva) FILTER (
      WHERE NULLIF(btrim(latest.perspectiva), '') IS NOT NULL
    )::integer AS seen_perspectives
  FROM latest
  GROUP BY latest.topic_id, latest.stage
),
sessions AS (
  SELECT
    ranked.topic_id,
    ranked.stage,
    count(DISTINCT ranked.test_id)::integer AS completed_sessions
  FROM ranked_answers AS ranked
  GROUP BY ranked.topic_id, ranked.stage
),
concept_scores AS (
  SELECT
    latest.topic_id,
    latest.stage,
    latest.concept_key,
    count(*)::integer AS seen_questions,
    count(*) FILTER (
      WHERE latest.correcta IS TRUE
        AND latest.marked_doubt IS FALSE
    )::integer AS secure_correct_questions
  FROM latest
  WHERE NULLIF(latest.concept_key, '') IS NOT NULL
  GROUP BY latest.topic_id, latest.stage, latest.concept_key
),
critical_by_performance AS (
  SELECT
    score.topic_id,
    count(*) FILTER (
      WHERE score.stage = 'aprendizaje'
        AND score.seen_questions >= 2
        AND score.secure_correct_questions::numeric / score.seen_questions::numeric < 0.70
    )::integer AS learning_critical_concepts,
    count(*) FILTER (
      WHERE score.stage IN ('aprendizaje', 'consolidacion')
        AND score.seen_questions >= 2
        AND score.secure_correct_questions::numeric / score.seen_questions::numeric < 0.70
    )::integer AS critical_concepts
  FROM concept_scores AS score
  GROUP BY score.topic_id
),
active_signals AS (
  SELECT
    question.topic_id,
    count(DISTINCT failure.question_id) FILTER (
      WHERE COALESCE(question.nivel_pedagogico, 'aprendizaje') = 'aprendizaje'
    )::integer AS learning_active_failures,
    count(DISTINCT failure.question_id)::integer AS active_failures
  FROM public.active_failed_questions AS failure
  JOIN public.questions AS question
    ON question.id = failure.question_id
  JOIN viewer
    ON viewer.user_id = failure.user_id
  JOIN public.profiles AS profile
    ON profile.id = failure.user_id
   AND profile.active_opposition_id = question.opposition_id
  WHERE question.activa IS TRUE
  GROUP BY question.topic_id
),
retained_concepts AS (
  SELECT DISTINCT
    current_answer.topic_id,
    current_answer.concept_key
  FROM ranked_answers AS current_answer
  WHERE current_answer.correcta IS TRUE
    AND current_answer.marked_doubt IS FALSE
    AND NULLIF(current_answer.concept_key, '') IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM ranked_answers AS previous_answer
      WHERE previous_answer.user_id = current_answer.user_id
        AND previous_answer.topic_id = current_answer.topic_id
        AND previous_answer.concept_key = current_answer.concept_key
        AND previous_answer.correcta IS TRUE
        AND previous_answer.marked_doubt IS FALSE
        AND previous_answer.fecha_finalizacion
          <= current_answer.fecha_finalizacion - interval '7 days'
    )
),
retention AS (
  SELECT
    retained.topic_id,
    count(*)::integer AS retention_evidence
  FROM retained_concepts AS retained
  GROUP BY retained.topic_id
),
global_scores AS (
  SELECT
    latest.topic_id,
    count(*) FILTER (
      WHERE latest.stage IN ('aprendizaje', 'consolidacion')
    )::integer AS global_seen,
    count(*) FILTER (
      WHERE latest.stage IN ('aprendizaje', 'consolidacion')
        AND latest.correcta IS TRUE
        AND latest.marked_doubt IS FALSE
    )::integer AS global_secure_correct,
    count(*) FILTER (WHERE latest.stage = 'consolidacion')::integer AS robust_seen,
    count(*) FILTER (
      WHERE latest.stage = 'consolidacion'
        AND latest.correcta IS TRUE
        AND latest.marked_doubt IS FALSE
    )::integer AS robust_secure_correct
  FROM latest
  GROUP BY latest.topic_id
),
raw_metrics AS (
  SELECT
    catalog.*,
    COALESCE(learning_pool.available_questions, 0)::integer AS learning_questions,
    COALESCE(consolidation_pool.available_questions, 0)::integer AS consolidation_questions,
    COALESCE(tribunal_pool.available_questions, 0)::integer AS tribunal_questions,
    COALESCE(learning.seen_questions, 0)::integer AS learning_seen,
    COALESCE(learning_sessions.completed_sessions, 0)::integer AS learning_sessions,
    CASE
      WHEN COALESCE(learning_pool.available_questions, 0) = 0 THEN 0::numeric
      ELSE round(
        COALESCE(learning.seen_questions, 0)::numeric
        / learning_pool.available_questions::numeric * 100,
        1
      )
    END AS learning_question_coverage,
    CASE
      WHEN COALESCE(learning_pool.available_perspectives, 0) = 0 THEN 0::numeric
      ELSE round(
        COALESCE(learning.seen_perspectives, 0)::numeric
        / learning_pool.available_perspectives::numeric * 100,
        1
      )
    END AS learning_perspective_coverage,
    CASE
      WHEN COALESCE(learning.seen_questions, 0) = 0 THEN NULL::numeric
      ELSE round(
        learning.secure_correct_questions::numeric
        / learning.seen_questions::numeric * 100,
        1
      )
    END AS learning_mastery,
    greatest(
      COALESCE(critical.learning_critical_concepts, 0),
      COALESCE(signals.learning_active_failures, 0)
    )::integer AS learning_critical_concepts,
    COALESCE(consolidation.seen_questions, 0)::integer AS consolidation_seen,
    COALESCE(consolidation_sessions.completed_sessions, 0)::integer AS consolidation_sessions,
    CASE
      WHEN COALESCE(consolidation_pool.available_questions, 0) = 0 THEN 0::numeric
      ELSE round(
        COALESCE(consolidation.seen_questions, 0)::numeric
        / consolidation_pool.available_questions::numeric * 100,
        1
      )
    END AS consolidation_question_coverage,
    CASE
      WHEN COALESCE(consolidation_pool.available_perspectives, 0) = 0 THEN 0::numeric
      ELSE round(
        COALESCE(consolidation.seen_perspectives, 0)::numeric
        / consolidation_pool.available_perspectives::numeric * 100,
        1
      )
    END AS consolidation_perspective_coverage,
    CASE
      WHEN COALESCE(consolidation.seen_questions, 0) = 0 THEN NULL::numeric
      ELSE round(
        consolidation.secure_correct_questions::numeric
        / consolidation.seen_questions::numeric * 100,
        1
      )
    END AS consolidation_mastery,
    CASE
      WHEN COALESCE(global_scores.global_seen, 0) = 0 THEN NULL::numeric
      ELSE round(
        global_scores.global_secure_correct::numeric
        / global_scores.global_seen::numeric * 100,
        1
      )
    END AS global_mastery,
    CASE
      WHEN COALESCE(global_scores.robust_seen, 0) = 0 THEN NULL::numeric
      ELSE round(
        global_scores.robust_secure_correct::numeric
        / global_scores.robust_seen::numeric * 100,
        1
      )
    END AS robustness_percentage,
    COALESCE(retention.retention_evidence, 0)::integer AS retention_evidence,
    greatest(
      COALESCE(critical.critical_concepts, 0),
      COALESCE(signals.active_failures, 0)
    )::integer AS critical_concepts
  FROM catalog
  LEFT JOIN pool AS learning_pool
    ON learning_pool.topic_id = catalog.topic_id
   AND learning_pool.stage = 'aprendizaje'
  LEFT JOIN pool AS consolidation_pool
    ON consolidation_pool.topic_id = catalog.topic_id
   AND consolidation_pool.stage = 'consolidacion'
  LEFT JOIN pool AS tribunal_pool
    ON tribunal_pool.topic_id = catalog.topic_id
   AND tribunal_pool.stage = 'tribunal'
  LEFT JOIN latest_stage AS learning
    ON learning.topic_id = catalog.topic_id
   AND learning.stage = 'aprendizaje'
  LEFT JOIN latest_stage AS consolidation
    ON consolidation.topic_id = catalog.topic_id
   AND consolidation.stage = 'consolidacion'
  LEFT JOIN sessions AS learning_sessions
    ON learning_sessions.topic_id = catalog.topic_id
   AND learning_sessions.stage = 'aprendizaje'
  LEFT JOIN sessions AS consolidation_sessions
    ON consolidation_sessions.topic_id = catalog.topic_id
   AND consolidation_sessions.stage = 'consolidacion'
  LEFT JOIN critical_by_performance AS critical
    ON critical.topic_id = catalog.topic_id
  LEFT JOIN active_signals AS signals
    ON signals.topic_id = catalog.topic_id
  LEFT JOIN retention
    ON retention.topic_id = catalog.topic_id
  LEFT JOIN global_scores
    ON global_scores.topic_id = catalog.topic_id
),
unlock_metrics AS (
  SELECT
    raw.*,
    (
      raw.learning_questions > 0
      AND raw.consolidation_questions > 0
      AND raw.learning_seen >= least(20, raw.learning_questions)
      AND raw.learning_mastery >= 70
      AND raw.learning_sessions >= 2
    ) AS consolidation_unlocked
  FROM raw_metrics AS raw
),
final_metrics AS (
  SELECT
    unlocked.*,
    (
      unlocked.consolidation_unlocked
      AND unlocked.tribunal_questions > 0
      AND unlocked.consolidation_seen >= least(30, unlocked.consolidation_questions)
      AND unlocked.consolidation_mastery >= 80
      AND unlocked.consolidation_sessions >= 3
      AND unlocked.critical_concepts <= 3
    ) AS tribunal_unlocked
  FROM unlock_metrics AS unlocked
)
SELECT
  final.subject_id,
  final.subject_name,
  final.topic_id,
  final.topic_number,
  final.topic_name,
  final.learning_questions,
  final.consolidation_questions,
  final.tribunal_questions,
  final.learning_seen,
  final.learning_sessions,
  final.learning_question_coverage,
  final.learning_perspective_coverage,
  final.learning_mastery,
  final.learning_critical_concepts,
  final.consolidation_unlocked,
  final.consolidation_seen,
  final.consolidation_sessions,
  final.consolidation_question_coverage,
  final.consolidation_perspective_coverage,
  final.consolidation_mastery,
  final.global_mastery,
  final.robustness_percentage,
  final.retention_evidence,
  final.critical_concepts,
  final.tribunal_unlocked,
  CASE
    WHEN final.tribunal_unlocked THEN 'tribunal'
    WHEN final.consolidation_unlocked THEN 'consolidacion'
    ELSE 'aprendizaje'
  END AS recommended_stage,
  CASE
    WHEN final.tribunal_unlocked
      THEN 'Tribunal ya está disponible. La retención espaciada seguirá confirmando tu dominio.'
    WHEN final.consolidation_unlocked
      AND final.consolidation_seen < least(30, final.consolidation_questions)
      THEN 'Amplía la práctica con preguntas distintas de Consolidación.'
    WHEN final.consolidation_unlocked
      AND final.consolidation_sessions < 3
      THEN 'Reparte Consolidación entre al menos tres sesiones.'
    WHEN final.consolidation_unlocked
      AND final.consolidation_mastery < 80
      THEN 'Refuerza Consolidación hasta alcanzar un rendimiento seguro.'
    WHEN final.consolidation_unlocked
      AND final.critical_concepts > 3
      THEN 'Reduce los fallos activos o conceptos críticos antes de recomendar Tribunal.'
    WHEN final.consolidation_unlocked
      THEN 'Tribunal puede practicarse en modo libre mientras completas la evidencia recomendada.'
    WHEN final.learning_seen = 0
      THEN 'Empieza por Aprendizaje para construir una base fiable.'
    WHEN final.learning_seen < least(20, final.learning_questions)
      THEN 'Responde más preguntas distintas de Aprendizaje.'
    WHEN final.learning_sessions < 2
      THEN 'Reparte Aprendizaje entre al menos dos sesiones.'
    WHEN final.learning_mastery < 70
      THEN 'Refuerza los fallos de Aprendizaje antes de avanzar.'
    ELSE 'Consolidación puede practicarse en modo libre mientras completas la evidencia recomendada.'
  END AS stage_message,
  'learning-stages-v3.0-shared'::text AS metric_version
FROM final_metrics AS final
ORDER BY final.subject_name, final.topic_number, final.topic_name;
$$;

REVOKE ALL ON FUNCTION public.get_learning_stage_progress() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_learning_stage_progress() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_learning_stage_progress() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_learning_stage_progress() TO service_role;

COMMENT ON FUNCTION public.get_learning_stage_progress() IS
  'Calculates learner-owned stage evidence over the active shared opposition catalog. Secure mastery excludes doubts; retention is concept-based and informative.';


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
  v_opposition_id uuid;
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

  SELECT test.completado, test.opposition_id
  INTO v_completado, v_opposition_id
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
    AND question.opposition_id = v_opposition_id;

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
  'Completes a learner-owned test over a shared catalog and updates retention atomically.';



CREATE OR REPLACE FUNCTION public.get_initial_recommendation_context()
RETURNS TABLE (
  topic_id uuid,
  topic_name text,
  reason_code text,
  reason text,
  estimated_percentage smallint,
  evidence_count integer,
  assessment_weight numeric,
  observed_accuracy numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
WITH viewer AS (
  SELECT
    (SELECT auth.uid()) AS user_id,
    public.current_active_opposition_id() AS opposition_id
),
catalog AS (
  SELECT
    topic.id AS topic_id,
    topic.numero AS topic_number,
    topic.nombre AS topic_name,
    assessment.estimated_percentage,
    (assessment.topic_id IS NOT NULL AND profile.status = 'completed') AS has_assessment
  FROM viewer
  JOIN public.topics AS topic
    ON topic.opposition_id = viewer.opposition_id
  LEFT JOIN public.preparation_profiles AS profile
    ON profile.user_id = viewer.user_id
   AND profile.opposition_id = viewer.opposition_id
   AND profile.status = 'completed'
  LEFT JOIN public.topic_self_assessments AS assessment
    ON assessment.user_id = viewer.user_id
   AND assessment.opposition_id = viewer.opposition_id
   AND assessment.topic_id = topic.id
   AND profile.user_id IS NOT NULL
  WHERE viewer.user_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.questions AS question
      WHERE question.opposition_id = viewer.opposition_id
        AND question.topic_id = topic.id
        AND question.activa IS TRUE
    )
),
evidence AS (
  SELECT
    question.topic_id,
    count(*) FILTER (WHERE statistics.answered_count > 0)::integer AS evidence_count,
    COALESCE(sum(statistics.answered_count), 0)::integer AS answered_count,
    COALESCE(sum(statistics.correct_count), 0)::integer AS correct_count
  FROM viewer
  JOIN public.questions AS question
    ON question.opposition_id = viewer.opposition_id
   AND question.activa IS TRUE
  LEFT JOIN public.question_statistics AS statistics
    ON statistics.user_id = viewer.user_id
   AND statistics.question_id = question.id
  GROUP BY question.topic_id
),
signals AS (
  SELECT
    question.topic_id,
    count(DISTINCT failure.question_id)::integer AS active_failures,
    count(DISTINCT doubt.question_id)::integer AS active_doubts,
    count(DISTINCT question.id) FILTER (
      WHERE statistics.next_review_at <= now()
    )::integer AS due_reviews
  FROM viewer
  JOIN public.questions AS question
    ON question.opposition_id = viewer.opposition_id
   AND question.activa IS TRUE
  LEFT JOIN public.active_failed_questions AS failure
    ON failure.user_id = viewer.user_id
   AND failure.question_id = question.id
  LEFT JOIN public.active_doubt_questions AS doubt
    ON doubt.user_id = viewer.user_id
   AND doubt.question_id = question.id
  LEFT JOIN public.question_statistics AS statistics
    ON statistics.user_id = viewer.user_id
   AND statistics.question_id = question.id
  GROUP BY question.topic_id
),
scored AS (
  SELECT
    catalog.*,
    COALESCE(evidence.evidence_count, 0)::integer AS evidence_count,
    COALESCE(evidence.answered_count, 0)::integer AS answered_count,
    COALESCE(evidence.correct_count, 0)::integer AS correct_count,
    COALESCE(signals.active_failures, 0)::integer AS active_failures,
    COALESCE(signals.active_doubts, 0)::integer AS active_doubts,
    COALESCE(signals.due_reviews, 0)::integer AS due_reviews,
    CASE
      WHEN catalog.has_assessment THEN
        greatest(
          0::numeric,
          1::numeric - least(COALESCE(evidence.evidence_count, 0), 20)::numeric / 20::numeric
        )
      ELSE 0::numeric
    END AS assessment_weight,
    CASE
      WHEN catalog.estimated_percentage IS NULL THEN 0.90::numeric
      ELSE (100 - catalog.estimated_percentage)::numeric / 100::numeric
    END AS assessment_risk,
    CASE
      WHEN COALESCE(evidence.answered_count, 0) = 0 THEN NULL::numeric
      ELSE evidence.correct_count::numeric / evidence.answered_count::numeric
    END AS observed_accuracy_ratio,
    least(COALESCE(evidence.evidence_count, 0), 20)::numeric / 20::numeric
      AS evidence_ratio
  FROM catalog
  LEFT JOIN evidence ON evidence.topic_id = catalog.topic_id
  LEFT JOIN signals ON signals.topic_id = catalog.topic_id
),
prioritized AS (
  SELECT
    scored.*,
    (
      least(scored.active_failures, 3) * 3
      + least(scored.active_doubts, 3) * 2
      + least(scored.due_reviews, 3) * 2
      + scored.assessment_weight * scored.assessment_risk * 6
      + scored.evidence_ratio * COALESCE(1 - scored.observed_accuracy_ratio, 0) * 6
      + (1 - scored.evidence_ratio)
    )::numeric AS priority_score
  FROM scored
)
SELECT
  prioritized.topic_id,
  prioritized.topic_name,
  CASE
    WHEN prioritized.active_failures > 0 THEN 'active_failures'
    WHEN prioritized.active_doubts > 0 THEN 'active_doubts'
    WHEN prioritized.due_reviews > 0 THEN 'due_reviews'
    WHEN prioritized.assessment_weight > 0
      AND prioritized.estimated_percentage IS NULL THEN 'initial_unknown'
    WHEN prioritized.assessment_weight > 0
      AND prioritized.estimated_percentage <= 25 THEN 'initial_low'
    WHEN prioritized.evidence_count >= 5
      AND prioritized.observed_accuracy_ratio < 0.70 THEN 'observed_weakness'
    WHEN prioritized.evidence_count < 20 THEN 'limited_evidence'
    ELSE 'balanced_practice'
  END AS reason_code,
  CASE
    WHEN prioritized.active_failures > 0
      THEN 'Te proponemos este tema porque mantiene fallos pendientes que conviene corregir.'
    WHEN prioritized.active_doubts > 0
      THEN 'Te proponemos este tema porque todavía conserva dudas activas.'
    WHEN prioritized.due_reviews > 0
      THEN 'Te proponemos este tema porque tiene repasos programados para hoy.'
    WHEN prioritized.assessment_weight > 0
      AND prioritized.estimated_percentage IS NULL
      THEN 'Te proponemos este tema porque no sabías valorarlo y aún tenemos poca evidencia real.'
    WHEN prioritized.assessment_weight > 0
      AND prioritized.estimated_percentage <= 25
      THEN 'Te proponemos este tema porque lo valoraste bajo y aún tenemos poca evidencia real.'
    WHEN prioritized.evidence_count >= 5
      AND prioritized.observed_accuracy_ratio < 0.70
      THEN 'Te proponemos este tema porque tus resultados recientes muestran margen de mejora.'
    WHEN prioritized.evidence_count < 20
      THEN 'Te proponemos este tema para ampliar la práctica y obtener una medida más fiable.'
    ELSE 'Te proponemos este tema para mantener una práctica equilibrada.'
  END AS reason,
  prioritized.estimated_percentage,
  prioritized.evidence_count,
  round(prioritized.assessment_weight, 2) AS assessment_weight,
  CASE
    WHEN prioritized.observed_accuracy_ratio IS NULL THEN NULL::numeric
    ELSE round(prioritized.observed_accuracy_ratio * 100, 1)
  END AS observed_accuracy
FROM prioritized
ORDER BY prioritized.priority_score DESC, prioritized.topic_number, prioritized.topic_id
LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_initial_recommendation_context()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_initial_recommendation_context()
  TO authenticated, service_role;

COMMENT ON FUNCTION public.get_initial_recommendation_context() IS
  'Returns one explainable topic priority. Self-assessment weight decays linearly from 1 to 0 across the first 20 distinct answered questions; observed progress remains separate.';

DROP FUNCTION public.create_recommended_test(integer);

CREATE OR REPLACE FUNCTION public.create_recommended_test(
  p_question_count integer DEFAULT 10
)
RETURNS TABLE (
  test_id uuid,
  selected_count integer,
  review_count integer,
  current_topic_count integer,
  weak_count integer,
  retention_new_count integer,
  fallback_count integer,
  current_topic_id uuid,
  current_topic_name text,
  recommendation_reason_code text,
  recommendation_reason text,
  assessment_weight numeric,
  evidence_count integer
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_test_id uuid;
  v_previous_test_id uuid;
  v_active_opposition_id uuid;
  v_current_topic_id uuid;
  v_current_topic_name text;
  v_recommendation_reason_code text;
  v_recommendation_reason text;
  v_assessment_weight numeric;
  v_evidence_count integer;
  v_selected_count integer;
  v_review_quota integer;
  v_current_quota integer;
  v_weak_quota integer;
  v_retention_quota integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_question_count NOT IN (5, 10, 20) THEN
    RAISE EXCEPTION 'Question count must be 5, 10 or 20';
  END IF;

  v_active_opposition_id := public.current_active_opposition_id();
  IF v_active_opposition_id IS NULL THEN
    RAISE EXCEPTION 'An active opposition is required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.questions AS question
    WHERE question.opposition_id = v_active_opposition_id
      AND question.activa IS TRUE
  ) THEN
    RAISE EXCEPTION 'No active questions available';
  END IF;

  v_review_quota := ceil(p_question_count * 0.40)::integer;
  v_current_quota := floor(p_question_count * 0.30)::integer;
  v_weak_quota := floor(p_question_count * 0.20)::integer;
  v_retention_quota := p_question_count
    - v_review_quota
    - v_current_quota
    - v_weak_quota;

  SELECT previous_test.id
  INTO v_previous_test_id
  FROM public.tests AS previous_test
  WHERE previous_test.user_id = v_user_id
    AND previous_test.opposition_id = v_active_opposition_id
    AND previous_test.completado IS TRUE
    AND previous_test.fecha_finalizacion IS NOT NULL
  ORDER BY previous_test.fecha_finalizacion DESC, previous_test.id DESC
  LIMIT 1;

  SELECT
    context.topic_id,
    context.topic_name,
    context.reason_code,
    context.reason,
    context.assessment_weight,
    context.evidence_count
  INTO
    v_current_topic_id,
    v_current_topic_name,
    v_recommendation_reason_code,
    v_recommendation_reason,
    v_assessment_weight,
    v_evidence_count
  FROM public.get_initial_recommendation_context() AS context
  LIMIT 1;

  IF v_current_topic_id IS NULL THEN
    RAISE EXCEPTION 'No recommendation context is available';
  END IF;

  DROP TABLE IF EXISTS pg_temp.recommended_selection;
  CREATE TEMP TABLE recommended_selection (
    question_id uuid PRIMARY KEY,
    target_bucket text NOT NULL,
    selection_group text NOT NULL,
    selection_reason text NOT NULL,
    base_weight numeric(8,3) NOT NULL,
    final_weight numeric(8,3) NOT NULL,
    was_in_previous_test boolean NOT NULL,
    draw_score double precision NOT NULL
  ) ON COMMIT DROP;

  WITH pool AS (
    SELECT
      question.id AS question_id,
      question.topic_id,
      COALESCE(question.nivel_pedagogico, 'aprendizaje') AS learning_stage,
      stage_progress.recommended_stage,
      COALESCE(statistics.appearances_count, 0) AS appearances_count,
      COALESCE(statistics.answered_count, 0) AS answered_count,
      COALESCE(statistics.correct_count, 0) AS correct_count,
      COALESCE(statistics.current_incorrect_streak, 0) AS incorrect_streak,
      statistics.last_seen_at,
      statistics.next_review_at,
      (active_failure.question_id IS NOT NULL) AS is_active_failure,
      (active_doubt.question_id IS NOT NULL) AS is_active_doubt,
      (previous_answer.question_id IS NOT NULL) AS in_previous_test
    FROM public.questions AS question
    LEFT JOIN public.question_statistics AS statistics
      ON statistics.user_id = v_user_id
     AND statistics.question_id = question.id
    LEFT JOIN public.active_failed_questions AS active_failure
      ON active_failure.user_id = v_user_id
     AND active_failure.question_id = question.id
    LEFT JOIN public.active_doubt_questions AS active_doubt
      ON active_doubt.user_id = v_user_id
     AND active_doubt.question_id = question.id
    LEFT JOIN public.test_answers AS previous_answer
      ON previous_answer.user_id = v_user_id
     AND previous_answer.question_id = question.id
     AND previous_answer.test_id = v_previous_test_id
    JOIN public.get_learning_stage_progress() AS stage_progress
      ON stage_progress.topic_id = question.topic_id
    WHERE question.opposition_id = v_active_opposition_id
      AND question.activa IS TRUE
      AND CASE COALESCE(question.nivel_pedagogico, 'aprendizaje')
        WHEN 'aprendizaje' THEN 1
        WHEN 'consolidacion' THEN 2
        WHEN 'tribunal' THEN 3
        ELSE 1
      END <= CASE stage_progress.recommended_stage
        WHEN 'aprendizaje' THEN 1
        WHEN 'consolidacion' THEN 2
        WHEN 'tribunal' THEN 3
        ELSE 1
      END
      AND (
        COALESCE(question.nivel_pedagogico, 'aprendizaje') = stage_progress.recommended_stage
        OR active_failure.question_id IS NOT NULL
        OR active_doubt.question_id IS NOT NULL
        OR statistics.next_review_at <= now()
      )
  ),
  classified AS (
    SELECT
      pool.*,
      CASE
        WHEN pool.is_active_failure
          OR pool.is_active_doubt
          OR pool.next_review_at <= now() THEN 'review'
        WHEN pool.topic_id = v_current_topic_id THEN 'current_topic'
        WHEN pool.answered_count >= 2
          AND (
            pool.incorrect_streak > 0
            OR pool.correct_count::numeric / NULLIF(pool.answered_count, 0) < 0.70
          ) THEN 'weak'
        WHEN pool.appearances_count = 0
          OR pool.last_seen_at < now() - interval '14 days' THEN 'retention_new'
        ELSE 'fallback'
      END AS target_bucket,
      CASE
        WHEN pool.is_active_failure AND pool.is_active_doubt THEN 'fallo_duda'
        WHEN pool.is_active_failure THEN 'fallo'
        WHEN pool.is_active_doubt THEN 'duda'
        WHEN pool.next_review_at <= now() THEN 'repaso_programado'
        WHEN pool.appearances_count = 0 THEN 'nueva'
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
        + CASE WHEN pool.next_review_at <= now() THEN 5 ELSE 0 END
        + CASE
            WHEN pool.next_review_at <= now() THEN
              least(
                floor(extract(epoch FROM (now() - pool.next_review_at)) / 86400),
                7
              ) * 0.25
            ELSE 0
          END
        + CASE WHEN pool.appearances_count = 0 THEN 5 ELSE 0 END
        + CASE
            WHEN pool.answered_count >= 2
              AND pool.correct_count::numeric / NULLIF(pool.answered_count, 0) < 0.70
              THEN 4
            ELSE 0
          END
        + CASE
            WHEN pool.last_seen_at < now() - interval '14 days' THEN 2
            ELSE 0
          END
        + CASE WHEN pool.topic_id = v_current_topic_id THEN 2 ELSE 0 END
      )::numeric(8,3) AS base_weight
    FROM pool
  ),
  weighted AS (
    SELECT
      classified.*,
      (
        classified.base_weight
        * CASE WHEN classified.in_previous_test THEN 0.25 ELSE 1.00 END
      )::numeric(8,3) AS final_weight
    FROM classified
  ),
  sampled AS (
    SELECT
      weighted.*,
      (-ln(greatest(random(), 0.000000001)) / weighted.final_weight) AS draw_score
    FROM weighted
  ),
  ranked AS (
    SELECT
      sampled.*,
      row_number() OVER (
        PARTITION BY sampled.target_bucket
        ORDER BY sampled.draw_score, sampled.question_id
      ) AS bucket_rank
    FROM sampled
  ),
  quota_selection AS (
    SELECT ranked.*
    FROM ranked
    WHERE (ranked.target_bucket = 'review' AND ranked.bucket_rank <= v_review_quota)
       OR (ranked.target_bucket = 'current_topic' AND ranked.bucket_rank <= v_current_quota)
       OR (ranked.target_bucket = 'weak' AND ranked.bucket_rank <= v_weak_quota)
       OR (ranked.target_bucket = 'retention_new' AND ranked.bucket_rank <= v_retention_quota)
  ),
  redistribution AS (
    SELECT ranked.*
    FROM ranked
    WHERE NOT EXISTS (
      SELECT 1
      FROM quota_selection
      WHERE quota_selection.question_id = ranked.question_id
    )
    ORDER BY
      CASE ranked.target_bucket
        WHEN 'review' THEN 1
        WHEN 'weak' THEN 2
        WHEN 'current_topic' THEN 3
        WHEN 'retention_new' THEN 4
        ELSE 5
      END,
      ranked.draw_score,
      ranked.question_id
    LIMIT GREATEST(
      p_question_count - (SELECT count(*) FROM quota_selection),
      0
    )
  ),
  selected AS (
    SELECT * FROM quota_selection
    UNION ALL
    SELECT * FROM redistribution
  )
  INSERT INTO recommended_selection (
    question_id,
    target_bucket,
    selection_group,
    selection_reason,
    base_weight,
    final_weight,
    was_in_previous_test,
    draw_score
  )
  SELECT
    selected.question_id,
    selected.target_bucket,
    selected.selection_group,
    CASE selected.selection_group
      WHEN 'fallo_duda' THEN 'Repaso prioritario de un fallo y una duda activos'
      WHEN 'fallo' THEN 'Repaso prioritario de un fallo activo'
      WHEN 'duda' THEN 'Repaso prioritario de una duda activa'
      WHEN 'repaso_programado' THEN 'Repaso programado para comprobar la retención'
      WHEN 'rendimiento_bajo' THEN 'Refuerzo de una pregunta con rendimiento bajo'
      WHEN 'nueva' THEN 'Ampliación con una pregunta todavía no vista'
      WHEN 'retencion' THEN 'Comprobación de un contenido no visto recientemente'
      WHEN 'poco_vista' THEN 'Práctica de una pregunta todavía poco vista'
      ELSE CASE selected.target_bucket
        WHEN 'current_topic' THEN v_recommendation_reason
        ELSE 'Redistribución para completar la sesión con variedad'
      END
    END,
    selected.base_weight,
    selected.final_weight,
    selected.in_previous_test,
    selected.draw_score
  FROM selected;

  SELECT count(*)::integer
  INTO v_selected_count
  FROM recommended_selection;

  IF v_selected_count = 0 THEN
    RAISE EXCEPTION 'No active questions available';
  END IF;

  INSERT INTO public.tests (
    user_id,
    tipo,
    numero_preguntas,
    sin_responder
  )
  VALUES (
    v_user_id,
    'recomendada',
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
    algorithm_version
  )
  SELECT
    v_user_id,
    v_test_id,
    selected.question_id,
    row_number() OVER (ORDER BY selected.draw_score, selected.question_id)::integer,
    selected.selection_group,
    selected.selection_reason,
    selected.base_weight,
    selected.final_weight,
    selected.was_in_previous_test,
    selected.was_in_previous_test
      AND (
        SELECT count(*)
        FROM recommended_selection AS alternative
        WHERE alternative.was_in_previous_test IS FALSE
      ) < least(ceil(v_selected_count * 0.70)::integer, v_selected_count),
    'recommended-v3.2'
  FROM recommended_selection AS selected;

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
    count(*) FILTER (WHERE selected.target_bucket = 'review')::integer,
    count(*) FILTER (WHERE selected.target_bucket = 'current_topic')::integer,
    count(*) FILTER (WHERE selected.target_bucket = 'weak')::integer,
    count(*) FILTER (WHERE selected.target_bucket = 'retention_new')::integer,
    count(*) FILTER (WHERE selected.target_bucket = 'fallback')::integer,
    v_current_topic_id,
    v_current_topic_name,
    v_recommendation_reason_code,
    v_recommendation_reason,
    v_assessment_weight,
    v_evidence_count
  FROM recommended_selection AS selected;
END;
$$;

REVOKE ALL ON FUNCTION public.create_recommended_test(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_recommended_test(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_recommended_test(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_recommended_test(integer) TO service_role;

COMMENT ON FUNCTION public.create_recommended_test(integer) IS
  'Creates recommended-v3.2 sessions over the active shared catalog. Initial self-assessment decays to zero after 20 distinct answered questions and never unlocks stages.';


NOTIFY pgrst, 'reload schema';
