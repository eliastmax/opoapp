-- V3.2 prerequisite: allow a learner to choose a published opposition whose
-- catalog is not yet active, while preserving atomic validation and RLS.

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

  -- RLS exposes catalog rows for the active opposition. Enroll and switch
  -- inside this transaction before validating topic-bound fields. Any later
  -- validation error rolls the whole function call back.
  INSERT INTO public.user_oppositions (user_id, opposition_id)
  VALUES (v_user_id, p_opposition_id)
  ON CONFLICT (user_id, opposition_id) DO NOTHING;

  UPDATE public.profiles
  SET active_opposition_id = p_opposition_id
  WHERE id = v_user_id;

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

COMMENT ON FUNCTION public.save_preparation_profile(
  uuid, text, text, smallint[], integer, text, uuid, jsonb, boolean
) IS
  'Atomically enrolls, activates, validates and saves a resumable private preparation profile.';

NOTIFY pgrst, 'reload schema';
