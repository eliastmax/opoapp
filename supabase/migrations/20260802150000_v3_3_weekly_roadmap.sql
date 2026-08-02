-- V3.3: derive a calm, explainable weekly route from the learner's own
-- preparation profile and observed activity. No roadmap is persisted: every
-- completed test or profile change is reflected by the next read.

CREATE OR REPLACE FUNCTION public.get_weekly_roadmap()
RETURNS TABLE (
  week_start date,
  week_end date,
  target_sessions integer,
  target_questions integer,
  completed_sessions integer,
  completed_questions integer,
  remaining_sessions integer,
  remaining_questions integer,
  available_days smallint[],
  scheduled_date date,
  slot_number integer,
  topic_id uuid,
  topic_name text,
  questions integer,
  reason_code text,
  reason text,
  exam_guidance text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
WITH viewer AS (
  SELECT
    (SELECT auth.uid()) AS user_id,
    public.current_active_opposition_id() AS opposition_id,
    date_trunc('week', current_date)::date AS start_date,
    current_date AS today
),
profile AS (
  SELECT preparation.*
  FROM viewer
  JOIN public.preparation_profiles AS preparation
    ON preparation.user_id = viewer.user_id
   AND preparation.opposition_id = viewer.opposition_id
   AND preparation.status = 'completed'
  WHERE viewer.user_id IS NOT NULL
),
completed AS (
  SELECT
    count(*)::integer AS session_count,
    COALESCE(sum(test.numero_preguntas), 0)::integer AS question_count
  FROM viewer
  JOIN public.tests AS test
    ON test.user_id = viewer.user_id
   AND test.opposition_id = viewer.opposition_id
   AND test.completado IS TRUE
   AND test.fecha_finalizacion >= viewer.start_date
   AND test.fecha_finalizacion < viewer.start_date + 7
),
remaining_days AS (
  SELECT
    array_agg(extract(isodow FROM day)::smallint ORDER BY day)::smallint[] AS days,
    array_agg(day::date ORDER BY day)::date[] AS dates
  FROM viewer
  JOIN profile ON true
  JOIN LATERAL generate_series(viewer.today, viewer.start_date + 6, interval '1 day') AS day ON true
  WHERE extract(isodow FROM day)::smallint = ANY(profile.practice_days)
),
catalog AS (
  SELECT
    topic.id AS topic_id,
    topic.numero AS topic_number,
    topic.nombre AS topic_name,
    assessment.estimated_percentage,
    (assessment.topic_id IS NOT NULL) AS has_assessment
  FROM viewer
  JOIN profile ON true
  JOIN public.topics AS topic ON topic.opposition_id = viewer.opposition_id
  LEFT JOIN public.topic_self_assessments AS assessment
    ON assessment.user_id = viewer.user_id
   AND assessment.opposition_id = viewer.opposition_id
   AND assessment.topic_id = topic.id
  WHERE EXISTS (
    SELECT 1 FROM public.questions AS question
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
    ON question.opposition_id = viewer.opposition_id AND question.activa IS TRUE
  LEFT JOIN public.question_statistics AS statistics
    ON statistics.user_id = viewer.user_id AND statistics.question_id = question.id
  GROUP BY question.topic_id
),
signals AS (
  SELECT
    question.topic_id,
    count(DISTINCT failure.question_id)::integer AS active_failures,
    count(DISTINCT doubt.question_id)::integer AS active_doubts,
    count(DISTINCT question.id) FILTER (WHERE statistics.next_review_at <= now())::integer AS due_reviews
  FROM viewer
  JOIN public.questions AS question
    ON question.opposition_id = viewer.opposition_id AND question.activa IS TRUE
  LEFT JOIN public.active_failed_questions AS failure
    ON failure.user_id = viewer.user_id AND failure.question_id = question.id
  LEFT JOIN public.active_doubt_questions AS doubt
    ON doubt.user_id = viewer.user_id AND doubt.question_id = question.id
  LEFT JOIN public.question_statistics AS statistics
    ON statistics.user_id = viewer.user_id AND statistics.question_id = question.id
  GROUP BY question.topic_id
),
prioritized AS (
  SELECT
    catalog.topic_id,
    catalog.topic_name,
    catalog.topic_number,
    COALESCE(evidence.evidence_count, 0)::integer AS evidence_count,
    COALESCE(evidence.answered_count, 0)::integer AS answered_count,
    COALESCE(evidence.correct_count, 0)::integer AS correct_count,
    COALESCE(signals.active_failures, 0)::integer AS active_failures,
    COALESCE(signals.active_doubts, 0)::integer AS active_doubts,
    COALESCE(signals.due_reviews, 0)::integer AS due_reviews,
    CASE WHEN catalog.has_assessment THEN greatest(0::numeric,
      1::numeric - least(COALESCE(evidence.evidence_count, 0), 20)::numeric / 20::numeric
    ) ELSE 0::numeric END AS assessment_weight,
    CASE WHEN catalog.estimated_percentage IS NULL THEN 0.90::numeric
      ELSE (100 - catalog.estimated_percentage)::numeric / 100::numeric END AS assessment_risk,
    CASE WHEN COALESCE(evidence.answered_count, 0) = 0 THEN NULL::numeric
      ELSE evidence.correct_count::numeric / evidence.answered_count::numeric END AS observed_accuracy
  FROM catalog
  LEFT JOIN evidence ON evidence.topic_id = catalog.topic_id
  LEFT JOIN signals ON signals.topic_id = catalog.topic_id
),
ranked_topics AS (
  SELECT
    prioritized.*,
    row_number() OVER (
      ORDER BY (
        least(active_failures, 3) * 3 + least(active_doubts, 3) * 2 + least(due_reviews, 3) * 2
        + assessment_weight * assessment_risk * 6
        + least(evidence_count, 20)::numeric / 20::numeric * COALESCE(1 - observed_accuracy, 0) * 6
        + (1 - least(evidence_count, 20)::numeric / 20::numeric)
      ) DESC, topic_number, topic_id
    )::integer AS rank,
    CASE
      WHEN active_failures > 0 THEN 'active_failures'
      WHEN active_doubts > 0 THEN 'active_doubts'
      WHEN due_reviews > 0 THEN 'due_reviews'
      WHEN assessment_weight > 0 AND assessment_risk >= 0.75 THEN 'initial_low'
      WHEN evidence_count >= 5 AND observed_accuracy < 0.70 THEN 'observed_weakness'
      WHEN evidence_count < 20 THEN 'limited_evidence'
      ELSE 'balanced_practice'
    END AS reason_code,
    CASE
      WHEN active_failures > 0 THEN 'Mantiene fallos pendientes que conviene corregir.'
      WHEN active_doubts > 0 THEN 'Todavía conserva dudas activas.'
      WHEN due_reviews > 0 THEN 'Tiene repasos programados pendientes.'
      WHEN assessment_weight > 0 AND assessment_risk >= 0.75 THEN 'Lo valoraste bajo o sin estimar y aún hay poca evidencia real.'
      WHEN evidence_count >= 5 AND observed_accuracy < 0.70 THEN 'Los resultados recientes muestran margen de mejora.'
      WHEN evidence_count < 20 THEN 'Necesita más práctica para obtener una medida fiable.'
      ELSE 'Ayuda a mantener una práctica equilibrada.'
    END AS reason
  FROM prioritized
),
plan AS (
  SELECT
    viewer.start_date,
    profile.practice_days,
    profile.questions_per_session,
    profile.exam_precision,
    profile.exam_value,
    completed.session_count,
    completed.question_count,
    COALESCE(remaining_days.days, '{}'::smallint[]) AS remaining_day_numbers,
    COALESCE(remaining_days.dates, '{}'::date[]) AS remaining_dates,
    greatest(cardinality(profile.practice_days) - completed.session_count, 0)::integer AS outstanding_sessions
  FROM viewer
  JOIN profile ON true
  CROSS JOIN completed
  CROSS JOIN remaining_days
),
slots AS (
  SELECT
    plan.*,
    scheduled.slot_number::integer AS slot_number,
    scheduled.day::date AS scheduled_date
  FROM plan
  JOIN LATERAL unnest(plan.remaining_dates) WITH ORDINALITY
    AS scheduled(day, slot_number) ON true
),
limited_slots AS (
  SELECT slots.*
  FROM slots
  WHERE slots.slot_number <= least(slots.outstanding_sessions, cardinality(slots.remaining_dates))
),
topic_count AS (SELECT count(*)::integer AS value FROM ranked_topics)
SELECT
  limited_slots.start_date AS week_start,
  limited_slots.start_date + 6 AS week_end,
  cardinality(limited_slots.practice_days)::integer AS target_sessions,
  (cardinality(limited_slots.practice_days) * limited_slots.questions_per_session)::integer AS target_questions,
  limited_slots.session_count AS completed_sessions,
  limited_slots.question_count AS completed_questions,
  limited_slots.outstanding_sessions AS remaining_sessions,
  (limited_slots.outstanding_sessions * limited_slots.questions_per_session)::integer AS remaining_questions,
  limited_slots.remaining_day_numbers AS available_days,
  limited_slots.scheduled_date,
  limited_slots.slot_number,
  ranked.topic_id,
  ranked.topic_name,
  limited_slots.questions_per_session::integer AS questions,
  ranked.reason_code,
  ranked.reason,
  CASE
    WHEN limited_slots.exam_precision = 'exact' THEN 'La fecha de examen orienta el ritmo, pero las fases avanzadas siguen requiriendo evidencia real.'
    WHEN limited_slots.exam_precision = 'month' THEN 'La fecha aproximada orienta el ritmo; la ruta evita una cuenta atrás exacta.'
    ELSE 'Sin fecha de examen confirmada, la ruta prioriza una práctica equilibrada y sostenible.'
  END AS exam_guidance
FROM limited_slots
JOIN topic_count ON topic_count.value > 0
JOIN ranked_topics AS ranked
  ON ranked.rank = ((limited_slots.slot_number - 1) % topic_count.value) + 1
UNION ALL
SELECT
  plan.start_date AS week_start,
  plan.start_date + 6 AS week_end,
  cardinality(plan.practice_days)::integer AS target_sessions,
  (cardinality(plan.practice_days) * plan.questions_per_session)::integer AS target_questions,
  plan.session_count AS completed_sessions,
  plan.question_count AS completed_questions,
  plan.outstanding_sessions AS remaining_sessions,
  (plan.outstanding_sessions * plan.questions_per_session)::integer AS remaining_questions,
  plan.remaining_day_numbers AS available_days,
  NULL::date AS scheduled_date,
  NULL::integer AS slot_number,
  NULL::uuid AS topic_id,
  NULL::text AS topic_name,
  0::integer AS questions,
  CASE WHEN plan.outstanding_sessions = 0 THEN 'week_complete' ELSE 'no_days_remaining' END AS reason_code,
  CASE
    WHEN plan.outstanding_sessions = 0 THEN 'Esta semana ya has alcanzado el ritmo que configuraste.'
    ELSE 'No quedan días configurados esta semana; la ruta se recalculará sin acumular sesiones.'
  END AS reason,
  CASE
    WHEN plan.exam_precision = 'exact' THEN 'La fecha de examen orienta el ritmo, pero las fases avanzadas siguen requiriendo evidencia real.'
    WHEN plan.exam_precision = 'month' THEN 'La fecha aproximada orienta el ritmo; la ruta evita una cuenta atrás exacta.'
    ELSE 'Sin fecha de examen confirmada, la ruta prioriza una práctica equilibrada y sostenible.'
  END AS exam_guidance
FROM plan
WHERE NOT EXISTS (SELECT 1 FROM limited_slots)
ORDER BY scheduled_date NULLS LAST, slot_number NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.get_weekly_roadmap() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_weekly_roadmap() TO authenticated, service_role;

COMMENT ON FUNCTION public.get_weekly_roadmap() IS
  'Derives a weekly route from completed profile, weekday availability and observed priorities. It never persists missed work or changes learning stages.';
