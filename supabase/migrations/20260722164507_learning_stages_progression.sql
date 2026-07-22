-- V2 learning stages: evidence-based progression and explicit free mode.

ALTER TABLE public.tests
  ADD COLUMN learning_stage text,
  ADD COLUMN stage_free_mode boolean NOT NULL DEFAULT false;

ALTER TABLE public.tests
  ADD CONSTRAINT tests_learning_stage_check
  CHECK (
    learning_stage IS NULL
    OR learning_stage IN ('aprendizaje', 'consolidacion', 'tribunal')
  );

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
    question.concepto,
    question.perspectiva,
    answer.correcta,
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
    count(*) FILTER (WHERE latest.correcta IS TRUE)::integer AS correct_questions,
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
    lower(btrim(latest.concepto)) AS concept_key,
    count(*)::integer AS seen_questions,
    count(*) FILTER (WHERE latest.correcta IS TRUE)::integer AS correct_questions
  FROM latest
  WHERE NULLIF(btrim(latest.concepto), '') IS NOT NULL
  GROUP BY latest.topic_id, latest.stage, lower(btrim(latest.concepto))
),
critical AS (
  SELECT
    score.topic_id,
    count(*) FILTER (
      WHERE score.stage = 'aprendizaje'
        AND score.seen_questions >= 2
        AND score.correct_questions::numeric / score.seen_questions::numeric < 0.70
    )::integer AS learning_critical_concepts,
    count(*) FILTER (
      WHERE score.stage IN ('aprendizaje', 'consolidacion')
        AND score.seen_questions >= 2
        AND score.correct_questions::numeric / score.seen_questions::numeric < 0.70
    )::integer AS critical_concepts
  FROM concept_scores AS score
  GROUP BY score.topic_id
),
consecutive AS (
  SELECT
    latest.topic_id,
    latest.question_id,
    latest.correcta AS current_correct,
    latest.fecha_finalizacion AS current_at,
    previous.correcta AS previous_correct,
    previous.fecha_finalizacion AS previous_at
  FROM latest
  LEFT JOIN LATERAL (
    SELECT
      prior.correcta,
      prior.fecha_finalizacion
    FROM ranked_answers AS prior
    WHERE prior.user_id = latest.user_id
      AND prior.question_id = latest.question_id
      AND (
        prior.fecha_finalizacion < latest.fecha_finalizacion
        OR (
          prior.fecha_finalizacion = latest.fecha_finalizacion
          AND (prior.created_at, prior.id) < (latest.created_at, latest.id)
        )
      )
    ORDER BY prior.fecha_finalizacion DESC, prior.created_at DESC, prior.id DESC
    LIMIT 1
  ) AS previous ON TRUE
),
retention AS (
  SELECT
    consecutive.topic_id,
    count(DISTINCT consecutive.question_id) FILTER (
      WHERE consecutive.current_correct IS TRUE
        AND consecutive.previous_correct IS TRUE
        AND consecutive.previous_at <= consecutive.current_at - interval '7 days'
    )::integer AS retention_evidence
  FROM consecutive
  GROUP BY consecutive.topic_id
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
    )::integer AS global_correct,
    count(*) FILTER (WHERE latest.stage = 'consolidacion')::integer AS robust_seen,
    count(*) FILTER (
      WHERE latest.stage = 'consolidacion'
        AND latest.correcta IS TRUE
    )::integer AS robust_correct
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
        learning.correct_questions::numeric / learning.seen_questions::numeric * 100,
        1
      )
    END AS learning_mastery,
    COALESCE(critical.learning_critical_concepts, 0)::integer AS learning_critical_concepts,
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
        consolidation.correct_questions::numeric
        / consolidation.seen_questions::numeric * 100,
        1
      )
    END AS consolidation_mastery,
    CASE
      WHEN COALESCE(global_scores.global_seen, 0) = 0 THEN NULL::numeric
      ELSE round(
        global_scores.global_correct::numeric / global_scores.global_seen::numeric * 100,
        1
      )
    END AS global_mastery,
    CASE
      WHEN COALESCE(global_scores.robust_seen, 0) = 0 THEN NULL::numeric
      ELSE round(
        global_scores.robust_correct::numeric / global_scores.robust_seen::numeric * 100,
        1
      )
    END AS robustness_percentage,
    COALESCE(retention.retention_evidence, 0)::integer AS retention_evidence,
    COALESCE(critical.critical_concepts, 0)::integer AS critical_concepts
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
  LEFT JOIN critical
    ON critical.topic_id = catalog.topic_id
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
      AND raw.learning_mastery >= 90
      AND raw.learning_question_coverage >= 80
      AND raw.learning_perspective_coverage >= 85
      AND raw.learning_sessions >= 3
      AND raw.learning_critical_concepts = 0
    ) AS consolidation_unlocked
  FROM raw_metrics AS raw
),
final_metrics AS (
  SELECT
    unlocked.*,
    (
      unlocked.consolidation_unlocked
      AND unlocked.tribunal_questions > 0
      AND unlocked.global_mastery >= 92
      AND unlocked.robustness_percentage >= 80
      AND unlocked.consolidation_question_coverage >= 90
      AND unlocked.retention_evidence >= 2
      AND unlocked.critical_concepts = 0
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
    WHEN final.tribunal_unlocked THEN 'La fase Tribunal ya está disponible.'
    WHEN final.consolidation_unlocked THEN 'La Consolidación ya está disponible.'
    WHEN final.learning_seen = 0 THEN 'Empieza por Aprendizaje para construir una base fiable.'
    WHEN final.learning_sessions < 3 THEN 'Reparte Aprendizaje entre al menos tres sesiones.'
    WHEN final.learning_question_coverage < 80 THEN 'Amplía las preguntas distintas de Aprendizaje.'
    WHEN final.learning_perspective_coverage < 85 THEN 'Cubre más perspectivas antes de Consolidación.'
    WHEN final.learning_mastery < 90 THEN 'Refuerza los fallos de Aprendizaje antes de avanzar.'
    ELSE 'Antes de avanzar, refuerza los conceptos críticos de Aprendizaje.'
  END AS stage_message,
  'learning-stages-v1.0'::text AS metric_version
FROM final_metrics AS final
ORDER BY final.subject_name, final.topic_number, final.topic_name;
$$;

REVOKE ALL ON FUNCTION public.get_learning_stage_progress() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_learning_stage_progress() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_learning_stage_progress() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_learning_stage_progress() TO service_role;

COMMENT ON FUNCTION public.get_learning_stage_progress() IS
  'Calculates per-topic stage unlocks from distinct current answers, coverage, sessions, retention and critical concepts; free-mode tests are excluded.';

CREATE OR REPLACE FUNCTION public.create_level_test(
  p_topic_id uuid,
  p_learning_stage text,
  p_question_count integer DEFAULT 10,
  p_free_mode boolean DEFAULT false,
  p_subtopic_ids uuid[] DEFAULT NULL,
  p_difficulties public.dificultad_enum[] DEFAULT ARRAY[
    'facil'::public.dificultad_enum,
    'medio'::public.dificultad_enum,
    'dificil'::public.dificultad_enum
  ]
)
RETURNS TABLE (
  test_id uuid,
  selected_count integer,
  requested_stage text,
  free_mode boolean,
  was_locked_override boolean
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_test_id uuid;
  v_previous_test_id uuid;
  v_selected_count integer;
  v_consolidation_unlocked boolean;
  v_tribunal_unlocked boolean;
  v_locked boolean := false;
  v_target_non_overlap integer := p_question_count - floor(p_question_count * 0.30)::integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_learning_stage NOT IN ('aprendizaje', 'consolidacion', 'tribunal') THEN
    RAISE EXCEPTION 'Invalid learning stage';
  END IF;

  IF p_question_count < 1 OR p_question_count > 100 THEN
    RAISE EXCEPTION 'Question count must be between 1 and 100';
  END IF;

  IF p_difficulties IS NULL OR cardinality(p_difficulties) = 0 THEN
    RAISE EXCEPTION 'At least one difficulty is required';
  END IF;

  SELECT progress.consolidation_unlocked, progress.tribunal_unlocked
  INTO v_consolidation_unlocked, v_tribunal_unlocked
  FROM public.get_learning_stage_progress() AS progress
  WHERE progress.topic_id = p_topic_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Topic not found';
  END IF;

  v_locked :=
    (p_learning_stage = 'consolidacion' AND NOT v_consolidation_unlocked)
    OR (p_learning_stage = 'tribunal' AND NOT v_tribunal_unlocked);

  IF v_locked AND NOT p_free_mode THEN
    RAISE EXCEPTION 'Learning stage is locked; use free mode explicitly';
  END IF;

  IF p_subtopic_ids IS NOT NULL AND EXISTS (
    SELECT 1
    FROM unnest(p_subtopic_ids) AS requested(id)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.subtopics AS subtopic
      WHERE subtopic.user_id = v_user_id
        AND subtopic.topic_id = p_topic_id
        AND subtopic.id = requested.id
    )
  ) THEN
    RAISE EXCEPTION 'Invalid subtopic filter';
  END IF;

  SELECT previous.id
  INTO v_previous_test_id
  FROM public.tests AS previous
  WHERE previous.user_id = v_user_id
    AND previous.completado IS TRUE
    AND previous.fecha_finalizacion IS NOT NULL
  ORDER BY previous.fecha_finalizacion DESC, previous.id DESC
  LIMIT 1;

  INSERT INTO public.tests (
    user_id,
    tipo,
    numero_preguntas,
    sin_responder,
    learning_stage,
    stage_free_mode
  )
  VALUES (
    v_user_id,
    'nivel_' || p_learning_stage,
    p_question_count,
    p_question_count,
    p_learning_stage,
    v_locked AND p_free_mode
  )
  RETURNING id INTO v_test_id;

  WITH pool AS (
    SELECT
      question.id AS question_id,
      COALESCE(statistics.appearances_count, 0) AS appearances_count,
      COALESCE(statistics.answered_count, 0) AS answered_count,
      COALESCE(statistics.correct_count, 0) AS correct_count,
      statistics.last_seen_at,
      (failure.question_id IS NOT NULL) AS is_failure,
      (doubt.question_id IS NOT NULL) AS is_doubt,
      (previous_answer.question_id IS NOT NULL) AS in_previous_test
    FROM public.questions AS question
    LEFT JOIN public.question_statistics AS statistics
      ON statistics.user_id = question.user_id
     AND statistics.question_id = question.id
    LEFT JOIN public.active_failed_questions AS failure
      ON failure.user_id = question.user_id
     AND failure.question_id = question.id
    LEFT JOIN public.active_doubt_questions AS doubt
      ON doubt.user_id = question.user_id
     AND doubt.question_id = question.id
    LEFT JOIN public.test_answers AS previous_answer
      ON previous_answer.user_id = question.user_id
     AND previous_answer.question_id = question.id
     AND previous_answer.test_id = v_previous_test_id
    WHERE question.user_id = v_user_id
      AND question.activa IS TRUE
      AND question.topic_id = p_topic_id
      AND (
        question.nivel_pedagogico = p_learning_stage
        OR (p_learning_stage = 'aprendizaje' AND question.nivel_pedagogico IS NULL)
      )
      AND question.dificultad = ANY(p_difficulties)
      AND (
        p_subtopic_ids IS NULL
        OR cardinality(p_subtopic_ids) = 0
        OR question.subtopic_id = ANY(p_subtopic_ids)
      )
  ),
  classified AS (
    SELECT
      pool.*,
      CASE
        WHEN pool.is_failure AND pool.is_doubt THEN 'fallo_duda'
        WHEN pool.is_failure THEN 'fallo'
        WHEN pool.is_doubt THEN 'duda'
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
        + CASE WHEN pool.is_failure THEN 7 ELSE 0 END
        + CASE WHEN pool.is_doubt THEN 6 ELSE 0 END
        + CASE WHEN pool.appearances_count = 0 THEN 5 ELSE 0 END
        + CASE
            WHEN pool.answered_count >= 2
              AND pool.correct_count::numeric / NULLIF(pool.answered_count, 0) < 0.70
              THEN 4
            ELSE 0
          END
        + CASE WHEN pool.last_seen_at < now() - interval '14 days' THEN 3 ELSE 0 END
        + CASE WHEN pool.appearances_count BETWEEN 1 AND 2 THEN 2 ELSE 0 END
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
  preferred AS (
    SELECT sampled.*
    FROM sampled
    WHERE sampled.in_previous_test IS FALSE
    ORDER BY sampled.draw_score, sampled.question_id
    LIMIT v_target_non_overlap
  ),
  remaining AS (
    SELECT sampled.*
    FROM sampled
    WHERE NOT EXISTS (
      SELECT 1 FROM preferred WHERE preferred.question_id = sampled.question_id
    )
    ORDER BY sampled.draw_score, sampled.question_id
    LIMIT GREATEST(p_question_count - (SELECT count(*) FROM preferred), 0)
  ),
  selected AS (
    SELECT * FROM preferred
    UNION ALL
    SELECT * FROM remaining
  ),
  ordered AS (
    SELECT
      selected.*,
      row_number() OVER (ORDER BY selected.draw_score, selected.question_id)::integer AS selection_order,
      count(*) FILTER (WHERE selected.in_previous_test IS FALSE) OVER ()::integer AS non_overlap_count
    FROM selected
  )
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
    ordered.question_id,
    ordered.selection_order,
    ordered.selection_group,
    CASE ordered.selection_group
      WHEN 'fallo_duda' THEN 'Fallo y duda activos dentro del nivel'
      WHEN 'fallo' THEN 'Fallo pendiente dentro del nivel'
      WHEN 'duda' THEN 'Duda pendiente dentro del nivel'
      WHEN 'nueva' THEN 'Pregunta nueva del nivel'
      WHEN 'rendimiento_bajo' THEN 'Rendimiento bajo dentro del nivel'
      WHEN 'retencion' THEN 'Retención pendiente dentro del nivel'
      WHEN 'poco_vista' THEN 'Pregunta poco vista dentro del nivel'
      ELSE 'Variedad y cobertura dentro del nivel'
    END,
    ordered.base_weight,
    ordered.final_weight,
    ordered.in_previous_test,
    ordered.in_previous_test AND ordered.non_overlap_count < v_target_non_overlap,
    'learning-stage-v1.0'
  FROM ordered;

  GET DIAGNOSTICS v_selected_count = ROW_COUNT;

  IF v_selected_count = 0 THEN
    RAISE EXCEPTION 'No questions match the selected learning stage and filters';
  END IF;

  UPDATE public.tests AS test
  SET numero_preguntas = v_selected_count,
      sin_responder = v_selected_count
  WHERE test.user_id = v_user_id
    AND test.id = v_test_id;

  INSERT INTO public.test_answers (user_id, test_id, question_id, orden)
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
    p_learning_stage,
    v_locked AND p_free_mode,
    v_locked AND p_free_mode;
END;
$$;

REVOKE ALL ON FUNCTION public.create_level_test(
  uuid,
  text,
  integer,
  boolean,
  uuid[],
  public.dificultad_enum[]
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_level_test(
  uuid,
  text,
  integer,
  boolean,
  uuid[],
  public.dificultad_enum[]
) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_level_test(
  uuid,
  text,
  integer,
  boolean,
  uuid[],
  public.dificultad_enum[]
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_level_test(
  uuid,
  text,
  integer,
  boolean,
  uuid[],
  public.dificultad_enum[]
) TO service_role;

COMMENT ON FUNCTION public.create_level_test(
  uuid,
  text,
  integer,
  boolean,
  uuid[],
  public.dificultad_enum[]
) IS
  'Creates an atomic smart test restricted to one pedagogical stage; locked stages require explicit free mode.';

-- The automatic session now respects the recommended unlocked stage of each topic.
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
  current_topic_name text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_test_id uuid;
  v_previous_test_id uuid;
  v_current_topic_id uuid;
  v_current_topic_name text;
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

  IF NOT EXISTS (
    SELECT 1
    FROM public.questions AS question
    WHERE question.user_id = v_user_id
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
    AND previous_test.completado IS TRUE
    AND previous_test.fecha_finalizacion IS NOT NULL
  ORDER BY previous_test.fecha_finalizacion DESC, previous_test.id DESC
  LIMIT 1;

  IF v_previous_test_id IS NOT NULL THEN
    SELECT question.topic_id
    INTO v_current_topic_id
    FROM public.test_answers AS answer
    JOIN public.questions AS question
      ON question.user_id = answer.user_id
     AND question.id = answer.question_id
    WHERE answer.user_id = v_user_id
      AND answer.test_id = v_previous_test_id
      AND question.activa IS TRUE
    GROUP BY question.topic_id
    ORDER BY count(*) DESC, question.topic_id
    LIMIT 1;
  END IF;

  -- With no usable history, start from the first numbered topic with stock.
  IF v_current_topic_id IS NULL THEN
    SELECT topic.id
    INTO v_current_topic_id
    FROM public.topics AS topic
    WHERE topic.user_id = v_user_id
      AND EXISTS (
        SELECT 1
        FROM public.questions AS question
        WHERE question.user_id = v_user_id
          AND question.topic_id = topic.id
          AND question.activa IS TRUE
      )
    ORDER BY topic.numero, topic.created_at, topic.id
    LIMIT 1;
  END IF;

  SELECT topic.nombre
  INTO v_current_topic_name
  FROM public.topics AS topic
  WHERE topic.user_id = v_user_id
    AND topic.id = v_current_topic_id;

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
      ON statistics.user_id = question.user_id
     AND statistics.question_id = question.id
    LEFT JOIN public.active_failed_questions AS active_failure
      ON active_failure.user_id = question.user_id
     AND active_failure.question_id = question.id
    LEFT JOIN public.active_doubt_questions AS active_doubt
      ON active_doubt.user_id = question.user_id
     AND active_doubt.question_id = question.id
    LEFT JOIN public.test_answers AS previous_answer
      ON previous_answer.user_id = question.user_id
     AND previous_answer.question_id = question.id
     AND previous_answer.test_id = v_previous_test_id
    JOIN public.get_learning_stage_progress() AS stage_progress
      ON stage_progress.topic_id = question.topic_id
    WHERE question.user_id = v_user_id
      AND question.activa IS TRUE
      AND COALESCE(question.nivel_pedagogico, 'aprendizaje') = stage_progress.recommended_stage
  ),
  classified AS (
    SELECT
      pool.*,
      CASE
        WHEN pool.is_active_failure OR pool.is_active_doubt THEN 'review'
        WHEN pool.topic_id = v_current_topic_id THEN 'current_topic'
        WHEN pool.answered_count >= 2
          AND (
            pool.incorrect_streak > 0
            OR pool.correct_count::numeric / NULLIF(pool.answered_count, 0) < 0.70
          ) THEN 'weak'
        WHEN pool.appearances_count = 0
          OR pool.next_review_at <= now()
          OR pool.last_seen_at < now() - interval '14 days' THEN 'retention_new'
        ELSE 'fallback'
      END AS target_bucket,
      CASE
        WHEN pool.is_active_failure AND pool.is_active_doubt THEN 'fallo_duda'
        WHEN pool.is_active_failure THEN 'fallo'
        WHEN pool.is_active_doubt THEN 'duda'
        WHEN pool.appearances_count = 0 THEN 'nueva'
        WHEN pool.answered_count >= 2
          AND pool.correct_count::numeric / NULLIF(pool.answered_count, 0) < 0.70
          THEN 'rendimiento_bajo'
        WHEN pool.next_review_at <= now()
          OR pool.last_seen_at < now() - interval '14 days' THEN 'retencion'
        WHEN pool.appearances_count <= 2 THEN 'poco_vista'
        ELSE 'variedad'
      END AS selection_group,
      (
        1
        + CASE WHEN pool.is_active_failure THEN 7 ELSE 0 END
        + CASE WHEN pool.is_active_doubt THEN 6 ELSE 0 END
        + CASE WHEN pool.appearances_count = 0 THEN 5 ELSE 0 END
        + CASE
            WHEN pool.answered_count >= 2
              AND pool.correct_count::numeric / NULLIF(pool.answered_count, 0) < 0.70
              THEN 4
            ELSE 0
          END
        + CASE
            WHEN pool.next_review_at <= now()
              OR pool.last_seen_at < now() - interval '14 days' THEN 3
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
  ranked AS (
    SELECT
      weighted.*,
      (-ln(greatest(random(), 0.000000001)) / weighted.final_weight) AS draw_score,
      row_number() OVER (
        PARTITION BY weighted.target_bucket
        ORDER BY
          (-ln(greatest(random(), 0.000000001)) / weighted.final_weight),
          weighted.question_id
      ) AS bucket_rank
    FROM weighted
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
    CASE selected.target_bucket
      WHEN 'review' THEN 'Repaso prioritario de un fallo o una duda activa'
      WHEN 'current_topic' THEN 'Continuidad con el tema trabajado recientemente'
      WHEN 'weak' THEN 'Refuerzo de una pregunta con rendimiento bajo'
      WHEN 'retention_new' THEN 'Retención o ampliación con una pregunta nueva'
      ELSE 'Redistribución para completar la sesión con variedad'
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
    'recommended-v2.0'
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
    v_current_topic_name
  FROM recommended_selection AS selected;
END;
$$;

COMMENT ON FUNCTION public.create_recommended_test(integer) IS
  'Creates an explainable automatic session restricted to each topic recommended unlocked stage, redistributing shortages without duplicates.';
