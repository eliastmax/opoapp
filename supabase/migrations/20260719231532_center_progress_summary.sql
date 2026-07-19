-- V2 progress centre v1: factual, repetition-resistant topic summaries.

CREATE OR REPLACE FUNCTION public.get_topic_progress_summary()
RETURNS TABLE (
  subject_id uuid,
  subject_name text,
  topic_id uuid,
  topic_number integer,
  topic_name text,
  active_questions integer,
  unique_questions_seen integer,
  latest_correct_questions integer,
  completed_sessions integer,
  available_concepts integer,
  seen_concepts integer,
  available_perspectives integer,
  seen_perspectives integer,
  active_failures integer,
  active_doubts integer,
  coverage_percentage numeric,
  mastery_percentage numeric,
  first_activity_at timestamptz,
  last_activity_at timestamptz,
  evidence_state text,
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
topic_catalog AS (
  SELECT
    subject.id AS subject_id,
    subject.nombre AS subject_name,
    topic.id AS topic_id,
    topic.numero AS topic_number,
    topic.nombre AS topic_name
  FROM public.topics AS topic
  JOIN public.subjects AS subject
    ON subject.id = topic.subject_id
   AND subject.user_id = topic.user_id
  JOIN viewer
    ON viewer.user_id = topic.user_id
),
question_pool AS (
  SELECT
    question.topic_id,
    count(*)::integer AS active_questions,
    count(DISTINCT question.concepto) FILTER (
      WHERE NULLIF(btrim(question.concepto), '') IS NOT NULL
    )::integer AS available_concepts,
    count(DISTINCT question.perspectiva) FILTER (
      WHERE NULLIF(btrim(question.perspectiva), '') IS NOT NULL
    )::integer AS available_perspectives
  FROM public.questions AS question
  JOIN viewer
    ON viewer.user_id = question.user_id
  WHERE question.activa IS TRUE
  GROUP BY question.topic_id
),
ranked_answers AS (
  SELECT
    question.topic_id,
    question.id AS question_id,
    question.concepto,
    question.perspectiva,
    answer.correcta,
    test.id AS test_id,
    test.fecha_finalizacion,
    row_number() OVER (
      PARTITION BY answer.user_id, answer.question_id
      ORDER BY test.fecha_finalizacion DESC, answer.created_at DESC, answer.id DESC
    ) AS answer_rank
  FROM public.test_answers AS answer
  JOIN public.tests AS test
    ON test.id = answer.test_id
   AND test.user_id = answer.user_id
  JOIN public.questions AS question
    ON question.id = answer.question_id
   AND question.user_id = answer.user_id
  JOIN viewer
    ON viewer.user_id = answer.user_id
  WHERE test.completado IS TRUE
    AND test.fecha_finalizacion IS NOT NULL
    AND answer.correcta IS NOT NULL
    AND question.activa IS TRUE
),
latest_question_results AS (
  SELECT *
  FROM ranked_answers
  WHERE answer_rank = 1
),
learning_summary AS (
  SELECT
    latest.topic_id,
    count(*)::integer AS unique_questions_seen,
    count(*) FILTER (WHERE latest.correcta IS TRUE)::integer AS latest_correct_questions,
    count(DISTINCT latest.concepto) FILTER (
      WHERE NULLIF(btrim(latest.concepto), '') IS NOT NULL
    )::integer AS seen_concepts,
    count(DISTINCT latest.perspectiva) FILTER (
      WHERE NULLIF(btrim(latest.perspectiva), '') IS NOT NULL
    )::integer AS seen_perspectives
  FROM latest_question_results AS latest
  GROUP BY latest.topic_id
),
session_summary AS (
  SELECT
    ranked.topic_id,
    count(DISTINCT ranked.test_id)::integer AS completed_sessions,
    min(ranked.fecha_finalizacion) AS first_activity_at,
    max(ranked.fecha_finalizacion) AS last_activity_at
  FROM ranked_answers AS ranked
  GROUP BY ranked.topic_id
),
failure_summary AS (
  SELECT failure.topic_id, count(*)::integer AS active_failures
  FROM public.active_failed_questions AS failure
  JOIN viewer
    ON viewer.user_id = failure.user_id
  GROUP BY failure.topic_id
),
doubt_summary AS (
  SELECT doubt.topic_id, count(*)::integer AS active_doubts
  FROM public.active_doubt_questions AS doubt
  JOIN viewer
    ON viewer.user_id = doubt.user_id
  GROUP BY doubt.topic_id
),
metrics AS (
  SELECT
    catalog.*,
    pool.active_questions,
    COALESCE(learning.unique_questions_seen, 0)::integer AS unique_questions_seen,
    COALESCE(learning.latest_correct_questions, 0)::integer AS latest_correct_questions,
    COALESCE(sessions.completed_sessions, 0)::integer AS completed_sessions,
    pool.available_concepts,
    COALESCE(learning.seen_concepts, 0)::integer AS seen_concepts,
    pool.available_perspectives,
    COALESCE(learning.seen_perspectives, 0)::integer AS seen_perspectives,
    COALESCE(failures.active_failures, 0)::integer AS active_failures,
    COALESCE(doubts.active_doubts, 0)::integer AS active_doubts,
    CASE
      WHEN pool.active_questions = 0 THEN 0::numeric
      ELSE round(
        COALESCE(learning.unique_questions_seen, 0)::numeric
        / pool.active_questions::numeric * 100,
        1
      )
    END AS coverage_percentage,
    CASE
      WHEN COALESCE(learning.unique_questions_seen, 0) = 0 THEN NULL::numeric
      ELSE round(
        COALESCE(learning.latest_correct_questions, 0)::numeric
        / learning.unique_questions_seen::numeric * 100,
        1
      )
    END AS mastery_percentage,
    sessions.first_activity_at,
    sessions.last_activity_at,
    LEAST(
      pool.active_questions,
      GREATEST(10, ceil(pool.active_questions * 0.20)::integer)
    ) AS sufficient_unique_threshold,
    LEAST(
      pool.active_questions,
      GREATEST(20, ceil(pool.active_questions * 0.40)::integer)
    ) AS robust_unique_threshold
  FROM topic_catalog AS catalog
  JOIN question_pool AS pool
    ON pool.topic_id = catalog.topic_id
  LEFT JOIN learning_summary AS learning
    ON learning.topic_id = catalog.topic_id
  LEFT JOIN session_summary AS sessions
    ON sessions.topic_id = catalog.topic_id
  LEFT JOIN failure_summary AS failures
    ON failures.topic_id = catalog.topic_id
  LEFT JOIN doubt_summary AS doubts
    ON doubts.topic_id = catalog.topic_id
)
SELECT
  metrics.subject_id,
  metrics.subject_name,
  metrics.topic_id,
  metrics.topic_number,
  metrics.topic_name,
  metrics.active_questions,
  metrics.unique_questions_seen,
  metrics.latest_correct_questions,
  metrics.completed_sessions,
  metrics.available_concepts,
  metrics.seen_concepts,
  metrics.available_perspectives,
  metrics.seen_perspectives,
  metrics.active_failures,
  metrics.active_doubts,
  metrics.coverage_percentage,
  metrics.mastery_percentage,
  metrics.first_activity_at,
  metrics.last_activity_at,
  CASE
    WHEN metrics.unique_questions_seen = 0 THEN 'sin_base'
    WHEN metrics.completed_sessions < 3
      OR metrics.unique_questions_seen < metrics.sufficient_unique_threshold
      THEN 'inicial'
    WHEN metrics.completed_sessions < 5
      OR metrics.unique_questions_seen < metrics.robust_unique_threshold
      OR metrics.first_activity_at IS NULL
      OR metrics.last_activity_at < metrics.first_activity_at + interval '7 days'
      THEN 'suficiente'
    ELSE 'robusta'
  END AS evidence_state,
  'progress-v1.0'::text AS metric_version
FROM metrics
ORDER BY metrics.subject_name, metrics.topic_number, metrics.topic_name;
$$;

REVOKE ALL ON FUNCTION public.get_topic_progress_summary() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_topic_progress_summary() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_topic_progress_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_topic_progress_summary() TO service_role;

COMMENT ON FUNCTION public.get_topic_progress_summary() IS
  'Returns per-user topic progress using the latest completed answer per unique question; evidence thresholds are versioned as progress-v1.0.';
