-- V3.1 follow-up: enforce server-owned metadata even when an authenticated
-- client writes through the Data API instead of the supported RPC.

CREATE OR REPLACE FUNCTION public.protect_preparation_profile_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $fn$
BEGIN
  IF (select auth.uid()) IS NULL OR NEW.user_id <> (select auth.uid()) THEN
    RAISE EXCEPTION 'Preparation profiles can only be written by their owner'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.opposition_id IS DISTINCT FROM OLD.opposition_id
    THEN
      RAISE EXCEPTION 'Preparation profile identity cannot be changed'
        USING ERRCODE = '23514';
    END IF;
    NEW.created_at := OLD.created_at;
    IF OLD.status = 'completed' THEN
      NEW.status := 'completed';
      NEW.completed_at := OLD.completed_at;
    ELSIF NEW.status = 'completed' THEN
      NEW.completed_at := now();
    ELSE
      NEW.completed_at := NULL;
    END IF;
  ELSE
    NEW.created_at := now();
    NEW.status := 'draft';
    NEW.completed_at := NULL;
  END IF;

  IF NEW.exam_precision = 'exact' AND NEW.exam_value IS NOT NULL THEN
    PERFORM NEW.exam_value::date;
  ELSIF NEW.exam_precision = 'month' AND NEW.exam_value IS NOT NULL THEN
    IF NEW.exam_value !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN
      RAISE EXCEPTION 'Invalid exam month' USING ERRCODE = '22007';
    END IF;
    PERFORM (NEW.exam_value || '-01')::date;
  END IF;

  IF cardinality(NEW.practice_days) <> (
      SELECT count(DISTINCT day)::integer FROM unnest(NEW.practice_days) day
    )
  THEN
    RAISE EXCEPTION 'Practice days cannot contain duplicates'
      USING ERRCODE = '23514';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.protect_topic_self_assessment_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $fn$
BEGIN
  IF (select auth.uid()) IS NULL OR NEW.user_id <> (select auth.uid()) THEN
    RAISE EXCEPTION 'Topic self-assessments can only be written by their owner'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.opposition_id IS DISTINCT FROM OLD.opposition_id
      OR NEW.topic_id IS DISTINCT FROM OLD.topic_id
    THEN
      RAISE EXCEPTION 'Topic self-assessment identity cannot be changed'
        USING ERRCODE = '23514';
    END IF;
    IF NEW.estimated_percentage IS DISTINCT FROM OLD.estimated_percentage THEN
      NEW.assessed_at := now();
    ELSE
      NEW.assessed_at := OLD.assessed_at;
    END IF;
  ELSE
    NEW.assessed_at := now();
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER preparation_profiles_00_protect_metadata
  BEFORE INSERT OR UPDATE ON public.preparation_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_preparation_profile_metadata();

CREATE TRIGGER topic_self_assessments_00_protect_metadata
  BEFORE INSERT OR UPDATE ON public.topic_self_assessments
  FOR EACH ROW EXECUTE FUNCTION public.protect_topic_self_assessment_metadata();

REVOKE ALL ON FUNCTION public.protect_preparation_profile_metadata()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_topic_self_assessment_metadata()
  FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
