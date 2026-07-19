-- Keep every relationship inside the authenticated user's own data graph.
-- The single-column foreign keys remain in place for their delete behaviour;
-- these composite keys additionally prevent cross-user references.

ALTER TABLE public.subjects
  ADD CONSTRAINT subjects_user_id_id_key UNIQUE (user_id, id);

ALTER TABLE public.topics
  ADD CONSTRAINT topics_user_id_id_key UNIQUE (user_id, id),
  ADD CONSTRAINT topics_owner_subject_fk
    FOREIGN KEY (user_id, subject_id)
    REFERENCES public.subjects (user_id, id);

ALTER TABLE public.subtopics
  ADD CONSTRAINT subtopics_user_id_id_key UNIQUE (user_id, id),
  ADD CONSTRAINT subtopics_owner_topic_fk
    FOREIGN KEY (user_id, topic_id)
    REFERENCES public.topics (user_id, id);

ALTER TABLE public.questions
  ADD CONSTRAINT questions_user_id_id_key UNIQUE (user_id, id),
  ADD CONSTRAINT questions_owner_subject_fk
    FOREIGN KEY (user_id, subject_id)
    REFERENCES public.subjects (user_id, id),
  ADD CONSTRAINT questions_owner_topic_fk
    FOREIGN KEY (user_id, topic_id)
    REFERENCES public.topics (user_id, id),
  ADD CONSTRAINT questions_owner_subtopic_fk
    FOREIGN KEY (user_id, subtopic_id)
    REFERENCES public.subtopics (user_id, id);

ALTER TABLE public.tests
  ADD CONSTRAINT tests_user_id_id_key UNIQUE (user_id, id);

ALTER TABLE public.test_answers
  ADD CONSTRAINT test_answers_owner_test_fk
    FOREIGN KEY (user_id, test_id)
    REFERENCES public.tests (user_id, id),
  ADD CONSTRAINT test_answers_owner_question_fk
    FOREIGN KEY (user_id, question_id)
    REFERENCES public.questions (user_id, id);
