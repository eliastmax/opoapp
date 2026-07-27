-- Learning stages v2: practical progression without exact-question retention gates.

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
    ON subject.user_id = topic.user_id
   AND subject.id = topic.subject_id
  JOIN viewer
    ON viewer.user_id = topic.user_id
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
  JOIN viewer
    ON viewer.user_id = question.user_id
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
    ON question.user_id = answer.user_id
   AND question.id = answer.question_id
  JOIN viewer
    ON viewer.user_id = answer.user_id
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
    ON question.user_id = failure.user_id
   AND question.id = failure.question_id
  JOIN viewer
    ON viewer.user_id = failure.user_id
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
  'learning-stages-v2.0'::text AS metric_version
FROM final_metrics AS final
ORDER BY final.subject_name, final.topic_number, final.topic_name;
$$;

REVOKE ALL ON FUNCTION public.get_learning_stage_progress() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_learning_stage_progress() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_learning_stage_progress() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_learning_stage_progress() TO service_role;

COMMENT ON FUNCTION public.get_learning_stage_progress() IS
  'Calculates practical per-topic stage recommendations. Secure mastery excludes doubts; retention is concept-based and informative, not a Tribunal gate.';
