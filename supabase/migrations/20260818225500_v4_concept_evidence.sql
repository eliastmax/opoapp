-- V4 read model: project existing learner evidence onto canonical concepts without
-- duplicating test_answers or flashcard_reviews.

CREATE OR REPLACE FUNCTION public.get_my_v4_concept_evidence(p_concept_id uuid DEFAULT NULL)
RETURNS TABLE (
  concept_id uuid,
  concept_code text,
  concept_title text,
  study_unit_id uuid,
  study_unit_code text,
  study_unit_title text,
  previous_state text,
  unit_completed boolean,
  active_primary_questions integer,
  active_flashcards integer,
  question_evidence jsonb,
  flashcard_evidence jsonb
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
)
SELECT
  concept.id AS concept_id,
  concept.code AS concept_code,
  concept.title AS concept_title,
  unit.id AS study_unit_id,
  unit.code AS study_unit_code,
  unit.title AS study_unit_title,
  COALESCE(mastery.state, 'unseen') AS previous_state,
  EXISTS (
    SELECT 1
    FROM public.study_unit_progress progress
    WHERE progress.user_id = viewer.user_id
      AND progress.opposition_id = viewer.opposition_id
      AND progress.study_unit_id = unit.id
      AND progress.completed_at IS NOT NULL
  ) AS unit_completed,
  (
    SELECT count(*)::integer
    FROM public.question_concepts mapping
    JOIN public.questions question
      ON question.id = mapping.question_id
     AND question.activa IS TRUE
    WHERE mapping.concept_id = concept.id
      AND mapping.role = 'primary'
  ) AS active_primary_questions,
  (
    SELECT count(*)::integer
    FROM public.flashcards card
    WHERE card.concept_id = concept.id
      AND card.active IS TRUE
  ) AS active_flashcards,
  COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'questionId', answer.question_id,
        'questionCode', question.codigo,
        'sessionId', answer.test_id,
        'answeredAt', answer.created_at,
        'correct', answer.correcta,
        'markedDoubt', answer.marked_doubt,
        'retentionCheckpointDays',
          CASE
            WHEN selection.selection_concept_id = concept.id
              THEN selection.retention_checkpoint_days
            ELSE NULL
          END,
        'attribution',
          CASE
            WHEN selection.selection_concept_id = concept.id THEN 'targeted'
            ELSE 'primary'
          END
      )
      ORDER BY answer.created_at, answer.id
    )
    FROM public.test_answers answer
    JOIN public.questions question
      ON question.id = answer.question_id
     AND question.opposition_id = viewer.opposition_id
     AND question.activa IS TRUE
    LEFT JOIN public.test_question_selection selection
      ON selection.user_id = viewer.user_id
     AND selection.test_id = answer.test_id
     AND selection.question_id = answer.question_id
    LEFT JOIN public.question_concepts primary_mapping
      ON primary_mapping.question_id = answer.question_id
     AND primary_mapping.role = 'primary'
    WHERE answer.user_id = viewer.user_id
      AND answer.correcta IS NOT NULL
      AND COALESCE(selection.selection_concept_id, primary_mapping.concept_id) = concept.id
  ), '[]'::jsonb) AS question_evidence,
  COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'cardId', review.flashcard_id,
        'reviewedAt', review.reviewed_at,
        'correct', review.correct
      )
      ORDER BY review.reviewed_at, review.id
    )
    FROM public.flashcard_reviews review
    JOIN public.flashcards card
      ON card.id = review.flashcard_id
     AND card.concept_id = concept.id
     AND card.active IS TRUE
    WHERE review.user_id = viewer.user_id
      AND review.opposition_id = viewer.opposition_id
  ), '[]'::jsonb) AS flashcard_evidence
FROM viewer
JOIN public.concepts concept
  ON concept.opposition_id = viewer.opposition_id
 AND concept.active IS TRUE
JOIN public.study_units unit
  ON unit.id = concept.study_unit_id
 AND unit.opposition_id = viewer.opposition_id
 AND unit.active IS TRUE
LEFT JOIN public.user_concept_mastery mastery
  ON mastery.user_id = viewer.user_id
 AND mastery.opposition_id = viewer.opposition_id
 AND mastery.concept_id = concept.id
WHERE viewer.user_id IS NOT NULL
  AND (p_concept_id IS NULL OR concept.id = p_concept_id)
ORDER BY unit.position, concept.position, concept.code;
$$;

REVOKE ALL ON FUNCTION public.get_my_v4_concept_evidence(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_v4_concept_evidence(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_my_v4_concept_evidence(uuid) IS
  'Returns the authenticated learner evidence required by the V4 TypeScript mastery evaluator. Ordinary historical answers are attributed to the primary concept; deliberately targeted V4 selections override that attribution and carry retention checkpoint metadata.';
