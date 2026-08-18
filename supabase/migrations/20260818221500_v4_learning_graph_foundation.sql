-- V4 learning graph foundation.
-- Additive only: no existing V2/V3 behavior is changed by this migration.
-- Content remains opposition-scoped; learner evidence remains user-scoped.

-- A question can be referenced together with its topic so concept mappings cannot
-- accidentally cross topic boundaries inside the same opposition.
ALTER TABLE public.questions
  ADD CONSTRAINT questions_opposition_topic_id_key
  UNIQUE (opposition_id, topic_id, id);

CREATE TABLE public.study_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opposition_id uuid NOT NULL REFERENCES public.oppositions(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL,
  subtopic_id uuid REFERENCES public.subtopics(id) ON DELETE SET NULL,
  code text NOT NULL CHECK (btrim(code) <> ''),
  title text NOT NULL CHECK (btrim(title) <> ''),
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  estimated_minutes integer NOT NULL DEFAULT 5 CHECK (estimated_minutes BETWEEN 1 AND 30),
  study_summary text NOT NULL DEFAULT '',
  exam_keys jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(exam_keys) = 'array'),
  confusions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(confusions) = 'array'),
  traps jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(traps) = 'array'),
  mnemonics jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(mnemonics) = 'array'),
  source_refs jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(source_refs) = 'array'),
  active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT study_units_opposition_code_key UNIQUE (opposition_id, code),
  CONSTRAINT study_units_opposition_id_id_key UNIQUE (opposition_id, id),
  CONSTRAINT study_units_opposition_topic_id_id_key UNIQUE (opposition_id, topic_id, id),
  CONSTRAINT study_units_opposition_topic_fk
    FOREIGN KEY (opposition_id, topic_id)
    REFERENCES public.topics (opposition_id, id)
    ON DELETE CASCADE
);

CREATE TABLE public.concepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opposition_id uuid NOT NULL REFERENCES public.oppositions(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL,
  study_unit_id uuid NOT NULL,
  code text NOT NULL CHECK (btrim(code) <> ''),
  title text NOT NULL CHECK (btrim(title) <> ''),
  description text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT concepts_opposition_code_key UNIQUE (opposition_id, code),
  CONSTRAINT concepts_opposition_id_id_key UNIQUE (opposition_id, id),
  CONSTRAINT concepts_opposition_topic_id_id_key UNIQUE (opposition_id, topic_id, id),
  CONSTRAINT concepts_unit_topic_fk
    FOREIGN KEY (opposition_id, topic_id, study_unit_id)
    REFERENCES public.study_units (opposition_id, topic_id, id)
    ON DELETE CASCADE
);

CREATE TABLE public.question_concepts (
  opposition_id uuid NOT NULL REFERENCES public.oppositions(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL,
  question_id uuid NOT NULL,
  concept_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'primary' CHECK (role IN ('primary', 'secondary')),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (question_id, concept_id),
  CONSTRAINT question_concepts_question_topic_fk
    FOREIGN KEY (opposition_id, topic_id, question_id)
    REFERENCES public.questions (opposition_id, topic_id, id)
    ON DELETE CASCADE,
  CONSTRAINT question_concepts_concept_topic_fk
    FOREIGN KEY (opposition_id, topic_id, concept_id)
    REFERENCES public.concepts (opposition_id, topic_id, id)
    ON DELETE CASCADE
);

-- One canonical primary concept per question. Optional secondary concepts can
-- support diagnosis and targeted future checks without double-counting ordinary
-- historical evidence.
CREATE UNIQUE INDEX question_concepts_one_primary_idx
  ON public.question_concepts (question_id)
  WHERE role = 'primary';

CREATE TABLE public.flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opposition_id uuid NOT NULL REFERENCES public.oppositions(id) ON DELETE CASCADE,
  concept_id uuid NOT NULL,
  card_type text NOT NULL DEFAULT 'direct' CHECK (btrim(card_type) <> ''),
  prompt text NOT NULL CHECK (btrim(prompt) <> ''),
  answer text NOT NULL CHECK (btrim(answer) <> ''),
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  source_refs jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(source_refs) = 'array'),
  active boolean NOT NULL DEFAULT true,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT flashcards_opposition_id_id_key UNIQUE (opposition_id, id),
  CONSTRAINT flashcards_opposition_concept_fk
    FOREIGN KEY (opposition_id, concept_id)
    REFERENCES public.concepts (opposition_id, id)
    ON DELETE CASCADE
);

CREATE TABLE public.study_unit_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opposition_id uuid NOT NULL REFERENCES public.oppositions(id) ON DELETE CASCADE,
  study_unit_id uuid NOT NULL,
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  completed_at timestamptz,
  completion_count integer NOT NULL DEFAULT 0 CHECK (completion_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, study_unit_id),
  CONSTRAINT study_unit_progress_unit_fk
    FOREIGN KEY (opposition_id, study_unit_id)
    REFERENCES public.study_units (opposition_id, id)
    ON DELETE CASCADE
);

CREATE TABLE public.flashcard_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opposition_id uuid NOT NULL REFERENCES public.oppositions(id) ON DELETE CASCADE,
  flashcard_id uuid NOT NULL,
  correct boolean NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT flashcard_reviews_card_fk
    FOREIGN KEY (opposition_id, flashcard_id)
    REFERENCES public.flashcards (opposition_id, id)
    ON DELETE CASCADE
);

-- Rebuildable cache of the current concept state. The underlying evidence stays
-- in test_answers, test_question_selection, study_unit_progress and
-- flashcard_reviews. Authenticated clients can read their own state but do not
-- write this table directly in V4 foundation.
CREATE TABLE public.user_concept_mastery (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opposition_id uuid NOT NULL REFERENCES public.oppositions(id) ON DELETE CASCADE,
  concept_id uuid NOT NULL,
  state text NOT NULL DEFAULT 'unseen'
    CHECK (state IN ('unseen', 'seen', 'verifying', 'consolidating', 'retained')),
  needs_attention boolean NOT NULL DEFAULT false,
  next_review_on date,
  reason_code text NOT NULL DEFAULT 'no_evidence',
  distinct_questions integer NOT NULL DEFAULT 0 CHECK (distinct_questions >= 0),
  safe_correct_questions integer NOT NULL DEFAULT 0 CHECK (safe_correct_questions >= 0),
  safe_accuracy numeric(6,5) CHECK (safe_accuracy IS NULL OR (safe_accuracy >= 0 AND safe_accuracy <= 1)),
  distinct_sessions integer NOT NULL DEFAULT 0 CHECK (distinct_sessions >= 0),
  retention_checks_passed integer NOT NULL DEFAULT 0 CHECK (retention_checks_passed >= 0),
  last_evidence_at timestamptz,
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, concept_id),
  CONSTRAINT user_concept_mastery_safe_count_check
    CHECK (safe_correct_questions <= distinct_questions),
  CONSTRAINT user_concept_mastery_concept_fk
    FOREIGN KEY (opposition_id, concept_id)
    REFERENCES public.concepts (opposition_id, id)
    ON DELETE CASCADE
);

-- V4 can mark which concept a selected question is deliberately checking.
-- Historical V2/V3 rows remain NULL and continue to work unchanged.
ALTER TABLE public.test_question_selection
  ADD COLUMN selection_concept_id uuid,
  ADD COLUMN retention_checkpoint_days integer
    CHECK (retention_checkpoint_days IS NULL OR retention_checkpoint_days BETWEEN 1 AND 365),
  ADD CONSTRAINT test_question_selection_checkpoint_concept_check
    CHECK (retention_checkpoint_days IS NULL OR selection_concept_id IS NOT NULL),
  ADD CONSTRAINT test_question_selection_question_concept_fk
    FOREIGN KEY (question_id, selection_concept_id)
    REFERENCES public.question_concepts (question_id, concept_id);

CREATE INDEX study_units_active_topic_idx
  ON public.study_units (opposition_id, topic_id, position)
  WHERE active;
CREATE INDEX concepts_active_unit_idx
  ON public.concepts (opposition_id, study_unit_id, position)
  WHERE active;
CREATE INDEX question_concepts_concept_idx
  ON public.question_concepts (opposition_id, concept_id, role);
CREATE INDEX flashcards_active_concept_idx
  ON public.flashcards (opposition_id, concept_id, position)
  WHERE active;
CREATE INDEX study_unit_progress_user_opposition_idx
  ON public.study_unit_progress (user_id, opposition_id, updated_at DESC);
CREATE INDEX flashcard_reviews_user_card_idx
  ON public.flashcard_reviews (user_id, opposition_id, flashcard_id, reviewed_at DESC);
CREATE INDEX user_concept_mastery_review_idx
  ON public.user_concept_mastery (user_id, opposition_id, next_review_on)
  WHERE next_review_on IS NOT NULL;
CREATE INDEX user_concept_mastery_attention_idx
  ON public.user_concept_mastery (user_id, opposition_id, concept_id)
  WHERE needs_attention;
CREATE INDEX test_question_selection_concept_idx
  ON public.test_question_selection (user_id, selection_concept_id)
  WHERE selection_concept_id IS NOT NULL;

ALTER TABLE public.study_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_unit_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_concept_mastery ENABLE ROW LEVEL SECURITY;

-- Shared V4 study content: readable inside the active opposition, mutable only
-- by an authenticated admin of that opposition.
CREATE POLICY study_units_read_active_opposition
  ON public.study_units FOR SELECT TO authenticated
  USING (opposition_id = current_active_opposition_id());
CREATE POLICY study_units_insert_admin
  ON public.study_units FOR INSERT TO authenticated
  WITH CHECK (
    opposition_id = current_active_opposition_id()
    AND EXISTS (
      SELECT 1 FROM public.opposition_admins administrator
      WHERE administrator.user_id = (SELECT auth.uid())
        AND administrator.opposition_id = study_units.opposition_id
    )
  );
CREATE POLICY study_units_update_admin
  ON public.study_units FOR UPDATE TO authenticated
  USING (
    opposition_id = current_active_opposition_id()
    AND EXISTS (
      SELECT 1 FROM public.opposition_admins administrator
      WHERE administrator.user_id = (SELECT auth.uid())
        AND administrator.opposition_id = study_units.opposition_id
    )
  )
  WITH CHECK (
    opposition_id = current_active_opposition_id()
    AND EXISTS (
      SELECT 1 FROM public.opposition_admins administrator
      WHERE administrator.user_id = (SELECT auth.uid())
        AND administrator.opposition_id = study_units.opposition_id
    )
  );
CREATE POLICY study_units_delete_admin
  ON public.study_units FOR DELETE TO authenticated
  USING (
    opposition_id = current_active_opposition_id()
    AND EXISTS (
      SELECT 1 FROM public.opposition_admins administrator
      WHERE administrator.user_id = (SELECT auth.uid())
        AND administrator.opposition_id = study_units.opposition_id
    )
  );

CREATE POLICY concepts_read_active_opposition
  ON public.concepts FOR SELECT TO authenticated
  USING (opposition_id = current_active_opposition_id());
CREATE POLICY concepts_insert_admin
  ON public.concepts FOR INSERT TO authenticated
  WITH CHECK (
    opposition_id = current_active_opposition_id()
    AND EXISTS (
      SELECT 1 FROM public.opposition_admins administrator
      WHERE administrator.user_id = (SELECT auth.uid())
        AND administrator.opposition_id = concepts.opposition_id
    )
  );
CREATE POLICY concepts_update_admin
  ON public.concepts FOR UPDATE TO authenticated
  USING (
    opposition_id = current_active_opposition_id()
    AND EXISTS (
      SELECT 1 FROM public.opposition_admins administrator
      WHERE administrator.user_id = (SELECT auth.uid())
        AND administrator.opposition_id = concepts.opposition_id
    )
  )
  WITH CHECK (
    opposition_id = current_active_opposition_id()
    AND EXISTS (
      SELECT 1 FROM public.opposition_admins administrator
      WHERE administrator.user_id = (SELECT auth.uid())
        AND administrator.opposition_id = concepts.opposition_id
    )
  );
CREATE POLICY concepts_delete_admin
  ON public.concepts FOR DELETE TO authenticated
  USING (
    opposition_id = current_active_opposition_id()
    AND EXISTS (
      SELECT 1 FROM public.opposition_admins administrator
      WHERE administrator.user_id = (SELECT auth.uid())
        AND administrator.opposition_id = concepts.opposition_id
    )
  );

CREATE POLICY question_concepts_read_active_opposition
  ON public.question_concepts FOR SELECT TO authenticated
  USING (opposition_id = current_active_opposition_id());
CREATE POLICY question_concepts_insert_admin
  ON public.question_concepts FOR INSERT TO authenticated
  WITH CHECK (
    opposition_id = current_active_opposition_id()
    AND EXISTS (
      SELECT 1 FROM public.opposition_admins administrator
      WHERE administrator.user_id = (SELECT auth.uid())
        AND administrator.opposition_id = question_concepts.opposition_id
    )
  );
CREATE POLICY question_concepts_update_admin
  ON public.question_concepts FOR UPDATE TO authenticated
  USING (
    opposition_id = current_active_opposition_id()
    AND EXISTS (
      SELECT 1 FROM public.opposition_admins administrator
      WHERE administrator.user_id = (SELECT auth.uid())
        AND administrator.opposition_id = question_concepts.opposition_id
    )
  )
  WITH CHECK (
    opposition_id = current_active_opposition_id()
    AND EXISTS (
      SELECT 1 FROM public.opposition_admins administrator
      WHERE administrator.user_id = (SELECT auth.uid())
        AND administrator.opposition_id = question_concepts.opposition_id
    )
  );
CREATE POLICY question_concepts_delete_admin
  ON public.question_concepts FOR DELETE TO authenticated
  USING (
    opposition_id = current_active_opposition_id()
    AND EXISTS (
      SELECT 1 FROM public.opposition_admins administrator
      WHERE administrator.user_id = (SELECT auth.uid())
        AND administrator.opposition_id = question_concepts.opposition_id
    )
  );

CREATE POLICY flashcards_read_active_opposition
  ON public.flashcards FOR SELECT TO authenticated
  USING (opposition_id = current_active_opposition_id());
CREATE POLICY flashcards_insert_admin
  ON public.flashcards FOR INSERT TO authenticated
  WITH CHECK (
    opposition_id = current_active_opposition_id()
    AND EXISTS (
      SELECT 1 FROM public.opposition_admins administrator
      WHERE administrator.user_id = (SELECT auth.uid())
        AND administrator.opposition_id = flashcards.opposition_id
    )
  );
CREATE POLICY flashcards_update_admin
  ON public.flashcards FOR UPDATE TO authenticated
  USING (
    opposition_id = current_active_opposition_id()
    AND EXISTS (
      SELECT 1 FROM public.opposition_admins administrator
      WHERE administrator.user_id = (SELECT auth.uid())
        AND administrator.opposition_id = flashcards.opposition_id
    )
  )
  WITH CHECK (
    opposition_id = current_active_opposition_id()
    AND EXISTS (
      SELECT 1 FROM public.opposition_admins administrator
      WHERE administrator.user_id = (SELECT auth.uid())
        AND administrator.opposition_id = flashcards.opposition_id
    )
  );
CREATE POLICY flashcards_delete_admin
  ON public.flashcards FOR DELETE TO authenticated
  USING (
    opposition_id = current_active_opposition_id()
    AND EXISTS (
      SELECT 1 FROM public.opposition_admins administrator
      WHERE administrator.user_id = (SELECT auth.uid())
        AND administrator.opposition_id = flashcards.opposition_id
    )
  );

-- Learner-owned evidence.
CREATE POLICY study_unit_progress_select_own
  ON public.study_unit_progress FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND opposition_id = current_active_opposition_id()
  );
CREATE POLICY study_unit_progress_insert_own
  ON public.study_unit_progress FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND opposition_id = current_active_opposition_id()
  );
CREATE POLICY study_unit_progress_update_own
  ON public.study_unit_progress FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND opposition_id = current_active_opposition_id()
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND opposition_id = current_active_opposition_id()
  );

CREATE POLICY flashcard_reviews_select_own
  ON public.flashcard_reviews FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND opposition_id = current_active_opposition_id()
  );
CREATE POLICY flashcard_reviews_insert_own
  ON public.flashcard_reviews FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND opposition_id = current_active_opposition_id()
  );

CREATE POLICY user_concept_mastery_select_own
  ON public.user_concept_mastery FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND opposition_id = current_active_opposition_id()
  );

-- Do not rely on broad default grants for newly created public tables.
REVOKE ALL ON TABLE public.study_units FROM anon, authenticated;
REVOKE ALL ON TABLE public.concepts FROM anon, authenticated;
REVOKE ALL ON TABLE public.question_concepts FROM anon, authenticated;
REVOKE ALL ON TABLE public.flashcards FROM anon, authenticated;
REVOKE ALL ON TABLE public.study_unit_progress FROM anon, authenticated;
REVOKE ALL ON TABLE public.flashcard_reviews FROM anon, authenticated;
REVOKE ALL ON TABLE public.user_concept_mastery FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.study_units TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.concepts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.question_concepts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.flashcards TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.study_unit_progress TO authenticated;
GRANT SELECT, INSERT ON TABLE public.flashcard_reviews TO authenticated;
GRANT SELECT ON TABLE public.user_concept_mastery TO authenticated;

GRANT ALL ON TABLE public.study_units TO service_role;
GRANT ALL ON TABLE public.concepts TO service_role;
GRANT ALL ON TABLE public.question_concepts TO service_role;
GRANT ALL ON TABLE public.flashcards TO service_role;
GRANT ALL ON TABLE public.study_unit_progress TO service_role;
GRANT ALL ON TABLE public.flashcard_reviews TO service_role;
GRANT ALL ON TABLE public.user_concept_mastery TO service_role;
