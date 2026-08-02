-- V3.1: persist a resumable preparation profile without mixing subjective
-- self-assessments with observed learning statistics.

CREATE TABLE public.preparation_profiles (
  user_id uuid NOT NULL,
  opposition_id uuid NOT NULL,
  exam_precision text,
  exam_value text,
  practice_days smallint[] NOT NULL DEFAULT '{}'::smallint[],
  questions_per_session smallint,
  current_step text NOT NULL DEFAULT 'opposition',
  current_topic_id uuid,
  status text NOT NULL DEFAULT 'draft',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, opposition_id),
  CONSTRAINT preparation_profiles_membership_fkey
    FOREIGN KEY (user_id, opposition_id)
    REFERENCES public.user_oppositions(user_id, opposition_id)
    ON DELETE CASCADE,
  CONSTRAINT preparation_profiles_opposition_topic_fkey
    FOREIGN KEY (opposition_id, current_topic_id)
    REFERENCES public.topics(opposition_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT preparation_profiles_exam_precision_check
    CHECK (exam_precision IS NULL OR exam_precision IN ('exact', 'month', 'unknown')),
  CONSTRAINT preparation_profiles_exam_value_check
    CHECK (
      (exam_precision IS NULL AND exam_value IS NULL)
      OR (exam_precision = 'exact' AND (exam_value IS NULL OR exam_value ~ '^\d{4}-\d{2}-\d{2}$'))
      OR (exam_precision = 'month' AND (exam_value IS NULL OR exam_value ~ '^\d{4}-\d{2}$'))
      OR (exam_precision = 'unknown' AND exam_value IS NULL)
    ),
  CONSTRAINT preparation_profiles_practice_days_check
    CHECK (practice_days <@ ARRAY[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  CONSTRAINT preparation_profiles_session_size_check
    CHECK (questions_per_session IS NULL OR questions_per_session IN (5, 10, 20)),
  CONSTRAINT preparation_profiles_current_step_check
    CHECK (current_step IN ('opposition', 'exam', 'days', 'session', 'topics')),
  CONSTRAINT preparation_profiles_status_check
    CHECK (status IN ('draft', 'completed')),
  CONSTRAINT preparation_profiles_completion_timestamp_check
    CHECK (
      (status = 'draft' AND completed_at IS NULL)
      OR (status = 'completed' AND completed_at IS NOT NULL)
    )
);

CREATE TABLE public.topic_self_assessments (
  user_id uuid NOT NULL,
  opposition_id uuid NOT NULL,
  topic_id uuid NOT NULL,
  estimated_percentage smallint,
  assessed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, opposition_id, topic_id),
  CONSTRAINT topic_self_assessments_profile_fkey
    FOREIGN KEY (user_id, opposition_id)
    REFERENCES public.preparation_profiles(user_id, opposition_id)
    ON DELETE CASCADE,
  CONSTRAINT topic_self_assessments_opposition_topic_fkey
    FOREIGN KEY (opposition_id, topic_id)
    REFERENCES public.topics(opposition_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT topic_self_assessments_percentage_check
    CHECK (estimated_percentage IS NULL OR estimated_percentage IN (0, 25, 50, 75, 100))
);

CREATE INDEX preparation_profiles_opposition_idx
  ON public.preparation_profiles(opposition_id);
CREATE INDEX preparation_profiles_current_topic_idx
  ON public.preparation_profiles(opposition_id, current_topic_id)
  WHERE current_topic_id IS NOT NULL;
CREATE INDEX topic_self_assessments_topic_idx
  ON public.topic_self_assessments(opposition_id, topic_id);

ALTER TABLE public.preparation_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_self_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY preparation_profiles_read_own
  ON public.preparation_profiles FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY preparation_profiles_insert_own
  ON public.preparation_profiles FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_oppositions membership
      WHERE membership.user_id = (select auth.uid())
        AND membership.opposition_id = preparation_profiles.opposition_id
    )
  );
CREATE POLICY preparation_profiles_update_own
  ON public.preparation_profiles FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (
    user_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_oppositions membership
      WHERE membership.user_id = (select auth.uid())
        AND membership.opposition_id = preparation_profiles.opposition_id
    )
  );

CREATE POLICY topic_self_assessments_read_own
  ON public.topic_self_assessments FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY topic_self_assessments_insert_own
  ON public.topic_self_assessments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_oppositions membership
      WHERE membership.user_id = (select auth.uid())
        AND membership.opposition_id = topic_self_assessments.opposition_id
    )
  );
CREATE POLICY topic_self_assessments_update_own
  ON public.topic_self_assessments FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (
    user_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_oppositions membership
      WHERE membership.user_id = (select auth.uid())
        AND membership.opposition_id = topic_self_assessments.opposition_id
    )
  );

CREATE OR REPLACE FUNCTION public.guard_preparation_profile_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $fn$
BEGIN
  IF NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  IF NEW.exam_precision IS NULL
    OR (NEW.exam_precision IN ('exact', 'month') AND NEW.exam_value IS NULL)
    OR cardinality(NEW.practice_days) = 0
    OR NEW.questions_per_session IS NULL
  THEN
    RAISE EXCEPTION 'The preparation profile is incomplete' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.topics topic
    WHERE topic.opposition_id = NEW.opposition_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.topic_self_assessments assessment
        WHERE assessment.user_id = NEW.user_id
          AND assessment.opposition_id = NEW.opposition_id
          AND assessment.topic_id = topic.id
      )
  ) THEN
    RAISE EXCEPTION 'Every topic requires an initial assessment, including unknown'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$fn$;

CREATE TRIGGER preparation_profiles_guard_completion
  BEFORE INSERT OR UPDATE ON public.preparation_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_preparation_profile_completion();

CREATE OR REPLACE FUNCTION public.save_preparation_profile(
  p_opposition_id uuid,
  p_exam_precision text,
  p_exam_value text,
  p_practice_days smallint[],
  p_questions_per_session integer,
  p_current_step text,
  p_current_topic_id uuid,
  p_topic_assessments jsonb,
  p_complete boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_user_id uuid := (select auth.uid());
  v_assessments jsonb := COALESCE(p_topic_assessments, '{}'::jsonb);
  v_practice_days smallint[] := COALESCE(p_practice_days, '{}'::smallint[]);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.oppositions opposition
    WHERE opposition.id = p_opposition_id AND opposition.published = true
  ) THEN
    RAISE EXCEPTION 'The opposition is not available' USING ERRCODE = '23503';
  END IF;

  IF p_current_step NOT IN ('opposition', 'exam', 'days', 'session', 'topics') THEN
    RAISE EXCEPTION 'Invalid preparation step' USING ERRCODE = '23514';
  END IF;

  IF p_exam_precision IS NOT NULL AND p_exam_precision NOT IN ('exact', 'month', 'unknown') THEN
    RAISE EXCEPTION 'Invalid exam precision' USING ERRCODE = '23514';
  END IF;
  IF p_exam_precision IS NULL AND p_exam_value IS NOT NULL THEN
    RAISE EXCEPTION 'Exam value requires a precision' USING ERRCODE = '23514';
  END IF;
  IF p_exam_precision = 'unknown' AND p_exam_value IS NOT NULL THEN
    RAISE EXCEPTION 'Unknown exam timing cannot include a value' USING ERRCODE = '23514';
  END IF;
  IF p_exam_precision = 'exact' AND p_exam_value IS NOT NULL THEN
    PERFORM p_exam_value::date;
  END IF;
  IF p_exam_precision = 'month' AND p_exam_value IS NOT NULL THEN
    IF p_exam_value !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN
      RAISE EXCEPTION 'Invalid exam month' USING ERRCODE = '22007';
    END IF;
    PERFORM (p_exam_value || '-01')::date;
  END IF;

  IF cardinality(v_practice_days) <> (
      SELECT count(DISTINCT day)::integer FROM unnest(v_practice_days) day
    )
    OR NOT (v_practice_days <@ ARRAY[1, 2, 3, 4, 5, 6, 7]::smallint[])
  THEN
    RAISE EXCEPTION 'Practice days must be unique values from 1 to 7'
      USING ERRCODE = '23514';
  END IF;

  IF p_questions_per_session IS NOT NULL
    AND p_questions_per_session NOT IN (5, 10, 20)
  THEN
    RAISE EXCEPTION 'Questions per session must be 5, 10 or 20'
      USING ERRCODE = '23514';
  END IF;

  IF p_current_topic_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.topics topic
    WHERE topic.id = p_current_topic_id AND topic.opposition_id = p_opposition_id
  ) THEN
    RAISE EXCEPTION 'The current topic does not belong to the opposition'
      USING ERRCODE = '23503';
  END IF;

  IF jsonb_typeof(v_assessments) <> 'object' THEN
    RAISE EXCEPTION 'Topic assessments must be a JSON object' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_each(v_assessments) item
    WHERE item.key !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      OR (
        item.value <> 'null'::jsonb
        AND (
          jsonb_typeof(item.value) <> 'number'
          OR (item.value #>> '{}')::integer NOT IN (0, 25, 50, 75, 100)
        )
      )
  ) THEN
    RAISE EXCEPTION 'Invalid topic assessment value' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_object_keys(v_assessments) topic_key
    WHERE NOT EXISTS (
      SELECT 1 FROM public.topics topic
      WHERE topic.id = topic_key::uuid AND topic.opposition_id = p_opposition_id
    )
  ) THEN
    RAISE EXCEPTION 'A topic assessment does not belong to the opposition'
      USING ERRCODE = '23503';
  END IF;

  INSERT INTO public.user_oppositions (user_id, opposition_id)
  VALUES (v_user_id, p_opposition_id)
  ON CONFLICT (user_id, opposition_id) DO NOTHING;

  UPDATE public.profiles
  SET active_opposition_id = p_opposition_id
  WHERE id = v_user_id;

  INSERT INTO public.preparation_profiles (
    user_id,
    opposition_id,
    exam_precision,
    exam_value,
    practice_days,
    questions_per_session,
    current_step,
    current_topic_id,
    status
  )
  VALUES (
    v_user_id,
    p_opposition_id,
    p_exam_precision,
    p_exam_value,
    v_practice_days,
    p_questions_per_session,
    p_current_step,
    p_current_topic_id,
    'draft'
  )
  ON CONFLICT (user_id, opposition_id) DO UPDATE
  SET exam_precision = EXCLUDED.exam_precision,
      exam_value = EXCLUDED.exam_value,
      practice_days = EXCLUDED.practice_days,
      questions_per_session = EXCLUDED.questions_per_session,
      current_step = EXCLUDED.current_step,
      current_topic_id = EXCLUDED.current_topic_id,
      updated_at = now();

  INSERT INTO public.topic_self_assessments (
    user_id,
    opposition_id,
    topic_id,
    estimated_percentage
  )
  SELECT
    v_user_id,
    p_opposition_id,
    item.key::uuid,
    CASE
      WHEN item.value = 'null'::jsonb THEN NULL
      ELSE (item.value #>> '{}')::smallint
    END
  FROM jsonb_each(v_assessments) item
  ON CONFLICT (user_id, opposition_id, topic_id) DO UPDATE
  SET estimated_percentage = EXCLUDED.estimated_percentage,
      assessed_at = CASE
        WHEN topic_self_assessments.estimated_percentage
          IS DISTINCT FROM EXCLUDED.estimated_percentage
          THEN now()
        ELSE topic_self_assessments.assessed_at
      END,
      updated_at = now();

  IF p_complete THEN
    IF p_exam_precision IS NULL
      OR (p_exam_precision IN ('exact', 'month') AND p_exam_value IS NULL)
      OR cardinality(v_practice_days) = 0
      OR p_questions_per_session IS NULL
    THEN
      RAISE EXCEPTION 'The preparation profile is incomplete' USING ERRCODE = '23514';
    END IF;

    UPDATE public.preparation_profiles
    SET status = 'completed',
        completed_at = COALESCE(completed_at, now()),
        updated_at = now()
    WHERE user_id = v_user_id AND opposition_id = p_opposition_id;
  END IF;
END;
$fn$;

REVOKE ALL ON TABLE public.preparation_profiles FROM anon, authenticated;
REVOKE ALL ON TABLE public.topic_self_assessments FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.preparation_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.topic_self_assessments TO authenticated;

REVOKE ALL ON FUNCTION public.guard_preparation_profile_completion()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_preparation_profile(
  uuid, text, text, smallint[], integer, text, uuid, jsonb, boolean
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_preparation_profile(
  uuid, text, text, smallint[], integer, text, uuid, jsonb, boolean
) TO authenticated;

COMMENT ON TABLE public.preparation_profiles IS
  'Private, resumable V3 preparation settings per user and opposition.';
COMMENT ON TABLE public.topic_self_assessments IS
  'Subjective initial estimates. Never use these rows as observed learning progress.';

NOTIFY pgrst, 'reload schema';
