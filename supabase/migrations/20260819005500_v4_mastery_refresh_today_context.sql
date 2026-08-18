-- V4 mastery cache and Today context.
-- The cache is derived exclusively from existing learner evidence. Authenticated
-- clients keep SELECT-only access to user_concept_mastery and cannot write a
-- state such as `retained` themselves.

CREATE OR REPLACE FUNCTION public.refresh_my_v4_concept_mastery(p_concept_id uuid DEFAULT NULL)
RETURNS TABLE (
  concept_id uuid,
  state text,
  needs_attention boolean,
  next_review_on date,
  reason_code text,
  distinct_questions integer,
  safe_correct_questions integer,
  safe_accuracy numeric,
  distinct_sessions integer,
  retention_checks_passed integer,
  last_evidence_at timestamptz,
  evaluated_at timestamptz
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_opposition_id uuid;
  v_evidence record;
  v_distinct_questions integer;
  v_safe_correct_questions integer;
  v_safe_accuracy numeric;
  v_distinct_sessions integer;
  v_retention_checks_passed integer;
  v_has_three_day_pass boolean;
  v_has_seven_day_pass boolean;
  v_retention_distinct_questions integer;
  v_retention_distinct_sessions integer;
  v_recent_unsafe integer;
  v_recent_two_unsafe integer;
  v_question_attention boolean;
  v_flashcard_attention boolean;
  v_last_question_at timestamptz;
  v_last_card_at timestamptz;
  v_unit_completed_at timestamptz;
  v_has_exposure boolean;
  v_enough_for_consolidation boolean;
  v_enough_for_retention boolean;
  v_recent_instability boolean;
  v_candidate text;
  v_final_state text;
  v_reason_code text;
  v_previous_rank integer;
  v_candidate_rank integer;
  v_final_rank integer;
  v_needs_attention boolean;
  v_review_delay integer;
  v_last_evidence_at timestamptz;
  v_review_base date;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  v_opposition_id := public.current_active_opposition_id();
  IF v_opposition_id IS NULL THEN
    RAISE EXCEPTION 'An active opposition is required' USING ERRCODE = '22023';
  END IF;

  IF p_concept_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.concepts concept
    WHERE concept.id = p_concept_id
      AND concept.opposition_id = v_opposition_id
      AND concept.active IS TRUE
  ) THEN
    RAISE EXCEPTION 'Active concept not found in the current opposition' USING ERRCODE = '22023';
  END IF;

  -- Full refreshes also prune obsolete cache rows. The evidence itself remains
  -- untouched in test_answers, study_unit_progress and flashcard_reviews.
  IF p_concept_id IS NULL THEN
    DELETE FROM public.user_concept_mastery mastery
    WHERE mastery.user_id = v_user_id
      AND mastery.opposition_id = v_opposition_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.concepts concept
        WHERE concept.id = mastery.concept_id
          AND concept.opposition_id = v_opposition_id
          AND concept.active IS TRUE
      );
  END IF;

  FOR v_evidence IN
    SELECT evidence.*
    FROM public.get_my_v4_concept_evidence(p_concept_id) evidence
  LOOP
    WITH question_all AS (
      SELECT
        item->>'questionId' AS question_id,
        item->>'sessionId' AS session_id,
        (item->>'answeredAt')::timestamptz AS answered_at,
        (item->>'correct')::boolean AS correct,
        COALESCE((item->>'markedDoubt')::boolean, false) AS marked_doubt,
        NULLIF(item->>'retentionCheckpointDays', '')::integer AS retention_checkpoint_days,
        ordinality
      FROM pg_catalog.jsonb_array_elements(v_evidence.question_evidence)
        WITH ORDINALITY AS evidence_item(item, ordinality)
    ),
    question_latest AS (
      SELECT DISTINCT ON (question_id)
        question_id,
        session_id,
        answered_at,
        correct,
        marked_doubt,
        retention_checkpoint_days,
        ordinality
      FROM question_all
      ORDER BY question_id, answered_at DESC, ordinality DESC
    ),
    question_recent AS (
      SELECT *
      FROM question_latest
      ORDER BY answered_at DESC, ordinality DESC
      LIMIT 3
    ),
    question_recent_two AS (
      SELECT *
      FROM question_latest
      ORDER BY answered_at DESC, ordinality DESC
      LIMIT 2
    ),
    retention_passes AS (
      SELECT *
      FROM question_all
      WHERE correct IS TRUE
        AND marked_doubt IS FALSE
        AND retention_checkpoint_days >= 3
    ),
    card_all AS (
      SELECT
        item->>'cardId' AS card_id,
        (item->>'reviewedAt')::timestamptz AS reviewed_at,
        (item->>'correct')::boolean AS correct,
        ordinality
      FROM pg_catalog.jsonb_array_elements(v_evidence.flashcard_evidence)
        WITH ORDINALITY AS evidence_item(item, ordinality)
    ),
    card_latest AS (
      SELECT DISTINCT ON (card_id)
        card_id,
        reviewed_at,
        correct,
        ordinality
      FROM card_all
      ORDER BY card_id, reviewed_at DESC, ordinality DESC
    ),
    card_recent AS (
      SELECT *
      FROM card_latest
      ORDER BY reviewed_at DESC, ordinality DESC
      LIMIT 3
    )
    SELECT
      (SELECT count(*)::integer FROM question_latest),
      (SELECT count(*) FILTER (WHERE correct IS TRUE AND marked_doubt IS FALSE)::integer FROM question_latest),
      (SELECT count(DISTINCT session_id)::integer FROM question_all),
      (SELECT count(DISTINCT (retention_checkpoint_days, question_id))::integer FROM retention_passes),
      COALESCE((SELECT bool_or(retention_checkpoint_days >= 3) FROM retention_passes), false),
      COALESCE((SELECT bool_or(retention_checkpoint_days >= 7) FROM retention_passes), false),
      (SELECT count(DISTINCT question_id)::integer FROM retention_passes),
      (SELECT count(DISTINCT session_id)::integer FROM retention_passes),
      (SELECT count(*) FILTER (WHERE NOT (correct IS TRUE AND marked_doubt IS FALSE))::integer FROM question_recent),
      (SELECT count(*) FILTER (WHERE NOT (correct IS TRUE AND marked_doubt IS FALSE))::integer FROM question_recent_two),
      COALESCE((SELECT bool_or(NOT (correct IS TRUE AND marked_doubt IS FALSE)) FROM question_recent), false),
      COALESCE((SELECT bool_or(correct IS FALSE) FROM card_recent), false),
      (SELECT max(answered_at) FROM question_all),
      (SELECT max(reviewed_at) FROM card_all)
    INTO
      v_distinct_questions,
      v_safe_correct_questions,
      v_distinct_sessions,
      v_retention_checks_passed,
      v_has_three_day_pass,
      v_has_seven_day_pass,
      v_retention_distinct_questions,
      v_retention_distinct_sessions,
      v_recent_unsafe,
      v_recent_two_unsafe,
      v_question_attention,
      v_flashcard_attention,
      v_last_question_at,
      v_last_card_at;

    v_safe_accuracy := CASE
      WHEN v_distinct_questions > 0
        THEN v_safe_correct_questions::numeric / v_distinct_questions::numeric
      ELSE NULL
    END;

    SELECT progress.completed_at
    INTO v_unit_completed_at
    FROM public.study_unit_progress progress
    WHERE progress.user_id = v_user_id
      AND progress.opposition_id = v_opposition_id
      AND progress.study_unit_id = v_evidence.study_unit_id;

    v_has_exposure :=
      v_evidence.unit_completed
      OR pg_catalog.jsonb_array_length(v_evidence.question_evidence) > 0
      OR pg_catalog.jsonb_array_length(v_evidence.flashcard_evidence) > 0;

    v_candidate := 'unseen';
    v_reason_code := 'no_evidence';

    IF v_has_exposure THEN
      v_candidate := 'seen';
      v_reason_code := 'exposed';
    END IF;

    IF v_distinct_questions >= 2 THEN
      v_candidate := 'verifying';
      v_reason_code := 'limited_question_evidence';
    END IF;

    v_enough_for_consolidation :=
      v_distinct_questions >= 4
      AND v_safe_correct_questions >= 3
      AND v_safe_accuracy IS NOT NULL
      AND v_safe_accuracy >= 0.70;

    IF v_enough_for_consolidation AND v_distinct_sessions < 2 THEN
      v_reason_code := 'needs_more_sessions';
    ELSIF v_distinct_questions >= 4 AND COALESCE(v_safe_accuracy, 0) < 0.70 THEN
      v_reason_code := 'accuracy_not_safe';
    ELSIF v_enough_for_consolidation AND v_distinct_sessions >= 2 THEN
      v_candidate := 'consolidating';
      v_reason_code := 'consolidating';
    END IF;

    v_enough_for_retention :=
      v_candidate = 'consolidating'
      AND v_has_three_day_pass
      AND v_has_seven_day_pass
      AND v_retention_distinct_questions >= 2
      AND v_retention_distinct_sessions >= 2;

    IF v_enough_for_retention THEN
      v_candidate := 'retained';
      v_reason_code := 'retained';
    END IF;

    v_recent_instability := v_recent_unsafe >= 2 OR v_recent_two_unsafe >= 2;
    v_needs_attention := v_question_attention OR v_flashcard_attention;

    v_previous_rank := CASE v_evidence.previous_state
      WHEN 'unseen' THEN 0
      WHEN 'seen' THEN 1
      WHEN 'verifying' THEN 2
      WHEN 'consolidating' THEN 3
      WHEN 'retained' THEN 4
      ELSE 0
    END;
    v_candidate_rank := CASE v_candidate
      WHEN 'unseen' THEN 0
      WHEN 'seen' THEN 1
      WHEN 'verifying' THEN 2
      WHEN 'consolidating' THEN 3
      WHEN 'retained' THEN 4
      ELSE 0
    END;

    v_final_rank := v_candidate_rank;
    IF v_recent_instability AND v_candidate_rank < v_previous_rank THEN
      v_final_rank := pg_catalog.greatest(v_previous_rank - 1, v_candidate_rank);
    END IF;

    v_final_state := CASE v_final_rank
      WHEN 0 THEN 'unseen'
      WHEN 1 THEN 'seen'
      WHEN 2 THEN 'verifying'
      WHEN 3 THEN 'consolidating'
      WHEN 4 THEN 'retained'
      ELSE 'unseen'
    END;

    IF v_final_state <> v_candidate AND v_recent_instability THEN
      v_reason_code := 'recent_instability';
    END IF;

    v_review_delay := CASE
      WHEN v_final_state = 'unseen' THEN NULL
      WHEN v_needs_attention THEN 1
      WHEN v_final_state IN ('seen', 'verifying') THEN 1
      WHEN v_final_state = 'consolidating' AND v_retention_checks_passed >= 1 THEN 7
      WHEN v_final_state = 'consolidating' THEN 3
      WHEN v_final_state = 'retained' AND v_retention_checks_passed >= 3 THEN 30
      ELSE 14
    END;

    v_last_evidence_at := pg_catalog.greatest(v_last_question_at, v_last_card_at, v_unit_completed_at);
    v_review_base := COALESCE(v_last_evidence_at::date, CURRENT_DATE);

    INSERT INTO public.user_concept_mastery AS mastery (
      user_id,
      opposition_id,
      concept_id,
      state,
      needs_attention,
      next_review_on,
      reason_code,
      distinct_questions,
      safe_correct_questions,
      safe_accuracy,
      distinct_sessions,
      retention_checks_passed,
      last_evidence_at,
      evaluated_at
    ) VALUES (
      v_user_id,
      v_opposition_id,
      v_evidence.concept_id,
      v_final_state,
      v_needs_attention,
      CASE WHEN v_review_delay IS NULL THEN NULL ELSE v_review_base + v_review_delay END,
      v_reason_code,
      v_distinct_questions,
      v_safe_correct_questions,
      v_safe_accuracy,
      v_distinct_sessions,
      v_retention_checks_passed,
      v_last_evidence_at,
      pg_catalog.now()
    )
    ON CONFLICT (user_id, concept_id) DO UPDATE SET
      opposition_id = EXCLUDED.opposition_id,
      state = EXCLUDED.state,
      needs_attention = EXCLUDED.needs_attention,
      next_review_on = EXCLUDED.next_review_on,
      reason_code = EXCLUDED.reason_code,
      distinct_questions = EXCLUDED.distinct_questions,
      safe_correct_questions = EXCLUDED.safe_correct_questions,
      safe_accuracy = EXCLUDED.safe_accuracy,
      distinct_sessions = EXCLUDED.distinct_sessions,
      retention_checks_passed = EXCLUDED.retention_checks_passed,
      last_evidence_at = EXCLUDED.last_evidence_at,
      evaluated_at = EXCLUDED.evaluated_at;
  END LOOP;

  RETURN QUERY
  SELECT
    mastery.concept_id,
    mastery.state,
    mastery.needs_attention,
    mastery.next_review_on,
    mastery.reason_code,
    mastery.distinct_questions,
    mastery.safe_correct_questions,
    mastery.safe_accuracy,
    mastery.distinct_sessions,
    mastery.retention_checks_passed,
    mastery.last_evidence_at,
    mastery.evaluated_at
  FROM public.user_concept_mastery mastery
  JOIN public.concepts concept
    ON concept.id = mastery.concept_id
   AND concept.opposition_id = mastery.opposition_id
   AND concept.active IS TRUE
  WHERE mastery.user_id = v_user_id
    AND mastery.opposition_id = v_opposition_id
    AND (p_concept_id IS NULL OR mastery.concept_id = p_concept_id)
  ORDER BY concept.topic_id, concept.position, concept.code;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_my_v4_concept_mastery(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_my_v4_concept_mastery(uuid) TO authenticated;

COMMENT ON FUNCTION public.refresh_my_v4_concept_mastery(uuid) IS
  'Rebuilds the authenticated learner V4 mastery cache from test answers, targeted retention metadata, unit completion and flashcard reviews. Clients cannot supply or mutate mastery state directly.';

-- Automatic targeted refresh after a completed test. This fires after complete_test
-- has calculated correctness and marked the test complete, so the evidence is final.
CREATE OR REPLACE FUNCTION public.refresh_v4_mastery_after_test_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_concept_id uuid;
BEGIN
  IF NEW.completado IS TRUE
     AND OLD.completado IS DISTINCT FROM TRUE
     AND auth.uid() = NEW.user_id THEN
    FOR v_concept_id IN
      SELECT DISTINCT COALESCE(selection.selection_concept_id, mapping.concept_id)
      FROM public.test_answers answer
      LEFT JOIN public.test_question_selection selection
        ON selection.user_id = NEW.user_id
       AND selection.test_id = NEW.id
       AND selection.question_id = answer.question_id
      LEFT JOIN public.question_concepts mapping
        ON mapping.question_id = answer.question_id
       AND mapping.role = 'primary'
      WHERE answer.user_id = NEW.user_id
        AND answer.test_id = NEW.id
        AND answer.correcta IS NOT NULL
        AND COALESCE(selection.selection_concept_id, mapping.concept_id) IS NOT NULL
    LOOP
      PERFORM public.refresh_my_v4_concept_mastery(v_concept_id);
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tests_refresh_v4_mastery_after_completion ON public.tests;
CREATE TRIGGER tests_refresh_v4_mastery_after_completion
AFTER UPDATE OF completado ON public.tests
FOR EACH ROW
EXECUTE FUNCTION public.refresh_v4_mastery_after_test_completion();

-- Unit completion is exposure evidence. Opening a unit without completing it does
-- not move every concept to Seen.
CREATE OR REPLACE FUNCTION public.refresh_v4_mastery_after_unit_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_concept_id uuid;
  v_should_refresh boolean := false;
BEGIN
  IF auth.uid() = NEW.user_id THEN
    IF TG_OP = 'INSERT' THEN
      v_should_refresh := NEW.completed_at IS NOT NULL;
    ELSE
      v_should_refresh := NEW.completed_at IS DISTINCT FROM OLD.completed_at;
    END IF;
  END IF;

  IF v_should_refresh THEN
    FOR v_concept_id IN
      SELECT concept.id
      FROM public.concepts concept
      WHERE concept.opposition_id = NEW.opposition_id
        AND concept.study_unit_id = NEW.study_unit_id
        AND concept.active IS TRUE
    LOOP
      PERFORM public.refresh_my_v4_concept_mastery(v_concept_id);
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS study_unit_progress_refresh_v4_mastery_insert ON public.study_unit_progress;
CREATE TRIGGER study_unit_progress_refresh_v4_mastery_insert
AFTER INSERT ON public.study_unit_progress
FOR EACH ROW
EXECUTE FUNCTION public.refresh_v4_mastery_after_unit_progress();

DROP TRIGGER IF EXISTS study_unit_progress_refresh_v4_mastery_update ON public.study_unit_progress;
CREATE TRIGGER study_unit_progress_refresh_v4_mastery_update
AFTER UPDATE OF completed_at ON public.study_unit_progress
FOR EACH ROW
EXECUTE FUNCTION public.refresh_v4_mastery_after_unit_progress();

-- Card evidence is lightweight but can raise needs_attention immediately.
CREATE OR REPLACE FUNCTION public.refresh_v4_mastery_after_flashcard_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_concept_id uuid;
BEGIN
  IF auth.uid() = NEW.user_id THEN
    SELECT card.concept_id
    INTO v_concept_id
    FROM public.flashcards card
    WHERE card.id = NEW.flashcard_id
      AND card.opposition_id = NEW.opposition_id;

    IF v_concept_id IS NOT NULL THEN
      PERFORM public.refresh_my_v4_concept_mastery(v_concept_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS flashcard_reviews_refresh_v4_mastery ON public.flashcard_reviews;
CREATE TRIGGER flashcard_reviews_refresh_v4_mastery
AFTER INSERT ON public.flashcard_reviews
FOR EACH ROW
EXECUTE FUNCTION public.refresh_v4_mastery_after_flashcard_review();

-- The Today context refreshes the small rebuildable cache first, which also
-- bootstraps historical V2/V3 answers the first time a learner enters V4.
CREATE OR REPLACE FUNCTION public.prepare_my_v4_today_context()
RETURNS TABLE (
  concept_id uuid,
  concept_code text,
  concept_title text,
  topic_id uuid,
  topic_number integer,
  topic_name text,
  study_unit_id uuid,
  study_unit_code text,
  study_unit_title text,
  unit_position integer,
  unit_estimated_minutes integer,
  unit_completed boolean,
  state text,
  needs_attention boolean,
  next_review_on date,
  reason_code text,
  distinct_questions integer,
  safe_correct_questions integer,
  safe_accuracy numeric,
  distinct_sessions integer,
  retention_checks_passed integer,
  active_primary_questions integer,
  active_flashcards integer,
  last_evidence_at timestamptz,
  roadmap_slot integer,
  roadmap_scheduled_date date
)
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_opposition_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  v_opposition_id := public.current_active_opposition_id();
  IF v_opposition_id IS NULL THEN
    RAISE EXCEPTION 'An active opposition is required' USING ERRCODE = '22023';
  END IF;

  PERFORM public.refresh_my_v4_concept_mastery(NULL);

  RETURN QUERY
  WITH roadmap AS (
    SELECT
      weekly.topic_id,
      min(weekly.slot_number)::integer AS roadmap_slot,
      min(weekly.scheduled_date) AS roadmap_scheduled_date
    FROM public.get_weekly_roadmap() weekly
    WHERE weekly.topic_id IS NOT NULL
      AND weekly.scheduled_date >= CURRENT_DATE
    GROUP BY weekly.topic_id
  )
  SELECT
    concept.id,
    concept.code,
    concept.title,
    topic.id,
    topic.numero,
    topic.nombre,
    unit.id,
    unit.code,
    unit.title,
    unit.position,
    unit.estimated_minutes,
    EXISTS (
      SELECT 1
      FROM public.study_unit_progress progress
      WHERE progress.user_id = v_user_id
        AND progress.opposition_id = v_opposition_id
        AND progress.study_unit_id = unit.id
        AND progress.completed_at IS NOT NULL
    ),
    mastery.state,
    mastery.needs_attention,
    mastery.next_review_on,
    mastery.reason_code,
    mastery.distinct_questions,
    mastery.safe_correct_questions,
    mastery.safe_accuracy,
    mastery.distinct_sessions,
    mastery.retention_checks_passed,
    (
      SELECT count(*)::integer
      FROM public.question_concepts mapping
      JOIN public.questions question
        ON question.id = mapping.question_id
       AND question.activa IS TRUE
      WHERE mapping.concept_id = concept.id
        AND mapping.role = 'primary'
    ),
    (
      SELECT count(*)::integer
      FROM public.flashcards card
      WHERE card.concept_id = concept.id
        AND card.active IS TRUE
    ),
    mastery.last_evidence_at,
    roadmap.roadmap_slot,
    roadmap.roadmap_scheduled_date
  FROM public.concepts concept
  JOIN public.study_units unit
    ON unit.id = concept.study_unit_id
   AND unit.opposition_id = v_opposition_id
   AND unit.active IS TRUE
  JOIN public.topics topic
    ON topic.id = concept.topic_id
   AND topic.opposition_id = v_opposition_id
  JOIN public.user_concept_mastery mastery
    ON mastery.user_id = v_user_id
   AND mastery.opposition_id = v_opposition_id
   AND mastery.concept_id = concept.id
  LEFT JOIN roadmap
    ON roadmap.topic_id = concept.topic_id
  WHERE concept.opposition_id = v_opposition_id
    AND concept.active IS TRUE
  ORDER BY
    COALESCE(roadmap.roadmap_slot, 2147483647),
    topic.numero,
    unit.position,
    concept.position,
    concept.code;
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_my_v4_today_context() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.prepare_my_v4_today_context() TO authenticated;

COMMENT ON FUNCTION public.prepare_my_v4_today_context() IS
  'Refreshes the authenticated learner V4 mastery cache and returns the canonical input for the deterministic TypeScript Today composer, including V3 weekly-roadmap alignment when available.';
