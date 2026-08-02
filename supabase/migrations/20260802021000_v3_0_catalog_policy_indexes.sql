-- V3.0 follow-up: keep one SELECT policy per catalog table and cover the
-- foreign keys introduced by the shared catalog migration.

CREATE INDEX opposition_admins_user_idx
  ON public.opposition_admins(user_id);
CREATE INDEX user_oppositions_opposition_idx
  ON public.user_oppositions(opposition_id);
CREATE INDEX profiles_active_opposition_idx
  ON public.profiles(active_opposition_id)
  WHERE active_opposition_id IS NOT NULL;
CREATE INDEX topics_opposition_subject_idx
  ON public.topics(opposition_id, subject_id);
CREATE INDEX questions_opposition_subject_idx
  ON public.questions(opposition_id, subject_id);
CREATE INDEX questions_opposition_subtopic_idx
  ON public.questions(opposition_id, subtopic_id)
  WHERE subtopic_id IS NOT NULL;
CREATE INDEX tests_opposition_idx
  ON public.tests(opposition_id);

DROP POLICY subjects_all_own ON public.subjects;
DROP POLICY topics_all_own ON public.topics;
DROP POLICY subtopics_all_own ON public.subtopics;
DROP POLICY questions_all_own ON public.questions;

CREATE POLICY subjects_insert_admin
  ON public.subjects FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND opposition_id = public.current_active_opposition_id()
    AND EXISTS (
      SELECT 1 FROM public.opposition_admins administrator
      WHERE administrator.user_id = (select auth.uid())
        AND administrator.opposition_id = subjects.opposition_id
    )
  );
CREATE POLICY subjects_update_admin
  ON public.subjects FOR UPDATE TO authenticated
  USING (
    opposition_id = public.current_active_opposition_id()
    AND EXISTS (
      SELECT 1 FROM public.opposition_admins administrator
      WHERE administrator.user_id = (select auth.uid())
        AND administrator.opposition_id = subjects.opposition_id
    )
  )
  WITH CHECK (opposition_id = public.current_active_opposition_id());
CREATE POLICY subjects_delete_admin
  ON public.subjects FOR DELETE TO authenticated
  USING (
    opposition_id = public.current_active_opposition_id()
    AND EXISTS (
      SELECT 1 FROM public.opposition_admins administrator
      WHERE administrator.user_id = (select auth.uid())
        AND administrator.opposition_id = subjects.opposition_id
    )
  );

CREATE POLICY topics_insert_admin
  ON public.topics FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND opposition_id = public.current_active_opposition_id()
    AND EXISTS (
      SELECT 1 FROM public.opposition_admins administrator
      WHERE administrator.user_id = (select auth.uid())
        AND administrator.opposition_id = topics.opposition_id
    )
  );
CREATE POLICY topics_update_admin
  ON public.topics FOR UPDATE TO authenticated
  USING (
    opposition_id = public.current_active_opposition_id()
    AND EXISTS (
      SELECT 1 FROM public.opposition_admins administrator
      WHERE administrator.user_id = (select auth.uid())
        AND administrator.opposition_id = topics.opposition_id
    )
  )
  WITH CHECK (opposition_id = public.current_active_opposition_id());
CREATE POLICY topics_delete_admin
  ON public.topics FOR DELETE TO authenticated
  USING (
    opposition_id = public.current_active_opposition_id()
    AND EXISTS (
      SELECT 1 FROM public.opposition_admins administrator
      WHERE administrator.user_id = (select auth.uid())
        AND administrator.opposition_id = topics.opposition_id
    )
  );

CREATE POLICY subtopics_insert_admin
  ON public.subtopics FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND opposition_id = public.current_active_opposition_id()
    AND EXISTS (
      SELECT 1 FROM public.opposition_admins administrator
      WHERE administrator.user_id = (select auth.uid())
        AND administrator.opposition_id = subtopics.opposition_id
    )
  );
CREATE POLICY subtopics_update_admin
  ON public.subtopics FOR UPDATE TO authenticated
  USING (
    opposition_id = public.current_active_opposition_id()
    AND EXISTS (
      SELECT 1 FROM public.opposition_admins administrator
      WHERE administrator.user_id = (select auth.uid())
        AND administrator.opposition_id = subtopics.opposition_id
    )
  )
  WITH CHECK (opposition_id = public.current_active_opposition_id());
CREATE POLICY subtopics_delete_admin
  ON public.subtopics FOR DELETE TO authenticated
  USING (
    opposition_id = public.current_active_opposition_id()
    AND EXISTS (
      SELECT 1 FROM public.opposition_admins administrator
      WHERE administrator.user_id = (select auth.uid())
        AND administrator.opposition_id = subtopics.opposition_id
    )
  );

CREATE POLICY questions_insert_admin
  ON public.questions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND opposition_id = public.current_active_opposition_id()
    AND EXISTS (
      SELECT 1 FROM public.opposition_admins administrator
      WHERE administrator.user_id = (select auth.uid())
        AND administrator.opposition_id = questions.opposition_id
    )
  );
CREATE POLICY questions_update_admin
  ON public.questions FOR UPDATE TO authenticated
  USING (
    opposition_id = public.current_active_opposition_id()
    AND EXISTS (
      SELECT 1 FROM public.opposition_admins administrator
      WHERE administrator.user_id = (select auth.uid())
        AND administrator.opposition_id = questions.opposition_id
    )
  )
  WITH CHECK (opposition_id = public.current_active_opposition_id());
CREATE POLICY questions_delete_admin
  ON public.questions FOR DELETE TO authenticated
  USING (
    opposition_id = public.current_active_opposition_id()
    AND EXISTS (
      SELECT 1 FROM public.opposition_admins administrator
      WHERE administrator.user_id = (select auth.uid())
        AND administrator.opposition_id = questions.opposition_id
    )
  );

-- Run the catalog guard on every update so an administrator cannot change the
-- legacy curator or move a row while editing another field.
CREATE OR REPLACE FUNCTION public.assign_catalog_opposition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_user_id uuid := (select auth.uid());
  v_opposition_id uuid := public.current_active_opposition_id();
BEGIN
  IF v_user_id IS NULL OR v_opposition_id IS NULL THEN
    RAISE EXCEPTION 'An active opposition is required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.opposition_admins AS administrator
    WHERE administrator.user_id = v_user_id
      AND administrator.opposition_id = v_opposition_id
  ) THEN
    RAISE EXCEPTION 'Only catalog administrators can change catalog content'
      USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.opposition_id IS DISTINCT FROM OLD.opposition_id THEN
      RAISE EXCEPTION 'Catalog rows cannot be moved between oppositions';
    END IF;
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'The legacy catalog curator cannot be changed';
    END IF;
  END IF;
  NEW.opposition_id := v_opposition_id;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER subjects_assign_catalog_opposition ON public.subjects;
DROP TRIGGER topics_assign_catalog_opposition ON public.topics;
DROP TRIGGER subtopics_assign_catalog_opposition ON public.subtopics;
DROP TRIGGER questions_assign_catalog_opposition ON public.questions;

CREATE TRIGGER subjects_assign_catalog_opposition
  BEFORE INSERT OR UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.assign_catalog_opposition();
CREATE TRIGGER topics_assign_catalog_opposition
  BEFORE INSERT OR UPDATE ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.assign_catalog_opposition();
CREATE TRIGGER subtopics_assign_catalog_opposition
  BEFORE INSERT OR UPDATE ON public.subtopics
  FOR EACH ROW EXECUTE FUNCTION public.assign_catalog_opposition();
CREATE TRIGGER questions_assign_catalog_opposition
  BEFORE INSERT OR UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.assign_catalog_opposition();

NOTIFY pgrst, 'reload schema';
