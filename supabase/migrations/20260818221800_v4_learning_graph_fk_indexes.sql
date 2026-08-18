-- Cover V4 foreign keys that will be used for joins and parent integrity checks.
-- Keep the existing partial UI indexes; these full indexes serve referential paths.
CREATE INDEX study_units_opposition_topic_fk_idx
  ON public.study_units (opposition_id, topic_id);
CREATE INDEX study_units_opposition_subtopic_fk_idx
  ON public.study_units (opposition_id, subtopic_id)
  WHERE subtopic_id IS NOT NULL;
CREATE INDEX concepts_unit_topic_fk_idx
  ON public.concepts (opposition_id, topic_id, study_unit_id);
CREATE INDEX question_concepts_question_topic_fk_idx
  ON public.question_concepts (opposition_id, topic_id, question_id);
CREATE INDEX question_concepts_concept_topic_fk_idx
  ON public.question_concepts (opposition_id, topic_id, concept_id);
CREATE INDEX flashcards_opposition_concept_fk_idx
  ON public.flashcards (opposition_id, concept_id);
CREATE INDEX study_unit_progress_unit_fk_idx
  ON public.study_unit_progress (opposition_id, study_unit_id);
CREATE INDEX flashcard_reviews_card_fk_idx
  ON public.flashcard_reviews (opposition_id, flashcard_id);
CREATE INDEX user_concept_mastery_concept_fk_idx
  ON public.user_concept_mastery (opposition_id, concept_id);
CREATE INDEX test_question_selection_question_concept_fk_idx
  ON public.test_question_selection (question_id, selection_concept_id)
  WHERE selection_concept_id IS NOT NULL;
