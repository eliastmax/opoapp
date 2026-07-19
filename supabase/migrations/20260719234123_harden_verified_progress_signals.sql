-- Only consecutive attempts may prove correction, retention or a comparable change.

CREATE OR REPLACE FUNCTION public.get_verified_progress_summary()
RETURNS TABLE (
  topic_id uuid,
  corrected_failures_30d integer,
  retained_questions_30d integer,
  comparable_question_count integer,
  baseline_correct_count integer,
  current_correct_count integer,
  baseline_session_count integer,
  current_session_count integer,
  baseline_accuracy numeric,
  current_accuracy numeric,
  accuracy_change numeric,
  comparison_state text,
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
  SELECT DISTINCT question.topic_id
  FROM public.questions AS question
  JOIN viewer
    ON viewer.user_id = question.user_id
  WHERE question.activa IS TRUE
),
ranked_answers AS (
  SELECT
    answer.user_id,
    question.topic_id,
    question.id AS question_id,
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
latest_answers AS (
  SELECT *
  FROM ranked_answers
  WHERE answer_rank = 1
),
consecutive_attempts AS (
  SELECT
    latest.user_id,
    latest.topic_id,
    latest.question_id,
    latest.correcta AS current_correct,
    latest.test_id AS current_test_id,
    latest.fecha_finalizacion AS current_at,
    previous.correcta AS previous_correct,
    previous.test_id AS previous_test_id,
    previous.fecha_finalizacion AS previous_at
  FROM latest_answers AS latest
  LEFT JOIN LATERAL (
    SELECT
      prior_answer.correcta,
      prior_test.id AS test_id,
      prior_test.fecha_finalizacion
    FROM public.test_answers AS prior_answer
    JOIN public.tests AS prior_test
      ON prior_test.id = prior_answer.test_id
     AND prior_test.user_id = prior_answer.user_id
    WHERE prior_answer.user_id = latest.user_id
      AND prior_answer.question_id = latest.question_id
      AND prior_test.completado IS TRUE
      AND prior_test.fecha_finalizacion IS NOT NULL
      AND prior_answer.correcta IS NOT NULL
      AND prior_test.fecha_finalizacion < latest.fecha_finalizacion
    ORDER BY prior_test.fecha_finalizacion DESC, prior_answer.created_at DESC, prior_answer.id DESC
    LIMIT 1
  ) AS previous ON TRUE
),
recent_signals AS (
  SELECT
    attempt.topic_id,
    count(*) FILTER (
      WHERE attempt.current_correct IS TRUE
        AND attempt.previous_correct IS FALSE
        AND attempt.previous_at <= attempt.current_at - interval '1 day'
    )::integer AS corrected_failures_30d
  FROM consecutive_attempts AS attempt
  WHERE attempt.current_at >= now() - interval '30 days'
  GROUP BY attempt.topic_id
),
comparable_pairs AS (
  SELECT
    attempt.topic_id,
    attempt.question_id,
    attempt.previous_correct AS baseline_correct,
    attempt.current_correct,
    attempt.previous_test_id AS baseline_test_id,
    attempt.current_test_id
  FROM consecutive_attempts AS attempt
  WHERE attempt.current_at >= now() - interval '30 days'
    AND attempt.previous_at <= attempt.current_at - interval '7 days'
),
comparison_summary AS (
  SELECT
    pair.topic_id,
    count(*)::integer AS comparable_question_count,
    count(*) FILTER (WHERE pair.baseline_correct IS TRUE)::integer AS baseline_correct_count,
    count(*) FILTER (WHERE pair.current_correct IS TRUE)::integer AS current_correct_count,
    count(DISTINCT pair.baseline_test_id)::integer AS baseline_session_count,
    count(DISTINCT pair.current_test_id)::integer AS current_session_count,
    count(*) FILTER (
      WHERE pair.baseline_correct IS TRUE
        AND pair.current_correct IS TRUE
    )::integer AS retained_questions_30d
  FROM comparable_pairs AS pair
  GROUP BY pair.topic_id
),
metrics AS (
  SELECT
    catalog.topic_id,
    COALESCE(signals.corrected_failures_30d, 0)::integer AS corrected_failures_30d,
    COALESCE(comparison.retained_questions_30d, 0)::integer AS retained_questions_30d,
    COALESCE(comparison.comparable_question_count, 0)::integer AS comparable_question_count,
    COALESCE(comparison.baseline_correct_count, 0)::integer AS baseline_correct_count,
    COALESCE(comparison.current_correct_count, 0)::integer AS current_correct_count,
    COALESCE(comparison.baseline_session_count, 0)::integer AS baseline_session_count,
    COALESCE(comparison.current_session_count, 0)::integer AS current_session_count,
    CASE
      WHEN COALESCE(comparison.comparable_question_count, 0) = 0 THEN NULL::numeric
      ELSE round(
        comparison.baseline_correct_count::numeric
        / comparison.comparable_question_count::numeric * 100,
        1
      )
    END AS baseline_accuracy,
    CASE
      WHEN COALESCE(comparison.comparable_question_count, 0) = 0 THEN NULL::numeric
      ELSE round(
        comparison.current_correct_count::numeric
        / comparison.comparable_question_count::numeric * 100,
        1
      )
    END AS current_accuracy
  FROM topic_catalog AS catalog
  LEFT JOIN recent_signals AS signals
    ON signals.topic_id = catalog.topic_id
  LEFT JOIN comparison_summary AS comparison
    ON comparison.topic_id = catalog.topic_id
)
SELECT
  metrics.topic_id,
  metrics.corrected_failures_30d,
  metrics.retained_questions_30d,
  metrics.comparable_question_count,
  metrics.baseline_correct_count,
  metrics.current_correct_count,
  metrics.baseline_session_count,
  metrics.current_session_count,
  metrics.baseline_accuracy,
  metrics.current_accuracy,
  CASE
    WHEN metrics.comparable_question_count < 10
      OR metrics.baseline_session_count < 2
      OR metrics.current_session_count < 2
      THEN NULL::numeric
    ELSE round(metrics.current_accuracy - metrics.baseline_accuracy, 1)
  END AS accuracy_change,
  CASE
    WHEN metrics.comparable_question_count < 10
      OR metrics.baseline_session_count < 2
      OR metrics.current_session_count < 2
      THEN 'insuficiente'
    WHEN metrics.current_accuracy - metrics.baseline_accuracy >= 5
      THEN 'mejora_verificada'
    WHEN metrics.current_accuracy - metrics.baseline_accuracy <= -5
      THEN 'descenso_observado'
    ELSE 'estable'
  END AS comparison_state,
  'verified-progress-v1.0'::text AS metric_version
FROM metrics
ORDER BY metrics.topic_id;
$$;

REVOKE ALL ON FUNCTION public.get_verified_progress_summary() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_verified_progress_summary() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_verified_progress_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_verified_progress_summary() TO service_role;

COMMENT ON FUNCTION public.get_verified_progress_summary() IS
  'Returns factual progress from consecutive attempts: one-day corrections, seven-day retention and like-for-like changes requiring 10 questions and two sessions per side.';
