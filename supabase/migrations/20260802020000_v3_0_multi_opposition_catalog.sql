-- V3.0: introduce explicit opposition catalogs without rewriting learning history.
-- Catalog ownership remains as a compatibility field during the V3 transition;
-- opposition_id is the new stable catalog boundary.

CREATE TABLE public.oppositions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT oppositions_code_format CHECK (code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE TABLE public.opposition_admins (
  opposition_id uuid NOT NULL REFERENCES public.oppositions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (opposition_id, user_id)
);

CREATE TABLE public.user_oppositions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opposition_id uuid NOT NULL REFERENCES public.oppositions(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, opposition_id)
);

ALTER TABLE public.profiles
  ADD COLUMN active_opposition_id uuid REFERENCES public.oppositions(id) ON DELETE SET NULL;

ALTER TABLE public.subjects ADD COLUMN opposition_id uuid;
ALTER TABLE public.topics ADD COLUMN opposition_id uuid;
ALTER TABLE public.subtopics ADD COLUMN opposition_id uuid;
ALTER TABLE public.questions ADD COLUMN opposition_id uuid;
ALTER TABLE public.tests ADD COLUMN opposition_id uuid;

INSERT INTO public.oppositions (id, code, name, description, published)
VALUES
  (
    '00000000-0000-4000-8000-000000000001',
    'auxiliar-administrativo-sms',
    'Auxiliar Administrativo del Servicio Murciano de Salud',
    'Catálogo completo de Auxiliar Administrativo del SMS.',
    true
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'celador-sms',
    'Celador del Servicio Murciano de Salud',
    'Catálogo de Celador del SMS.',
    true
  )
ON CONFLICT (id) DO NOTHING;

CREATE TEMP TABLE _v3_catalog_owner_map ON COMMIT DROP AS
SELECT
  question.user_id,
  CASE
    WHEN bool_or(question.codigo LIKE 'SMS-CEL-%')
      AND NOT bool_or(question.codigo NOT LIKE 'SMS-CEL-%')
      THEN '00000000-0000-4000-8000-000000000002'::uuid
    WHEN NOT bool_or(question.codigo LIKE 'SMS-CEL-%')
      THEN '00000000-0000-4000-8000-000000000001'::uuid
    ELSE NULL::uuid
  END AS opposition_id
FROM public.questions AS question
GROUP BY question.user_id;

DO $guard$
BEGIN
  IF EXISTS (SELECT 1 FROM _v3_catalog_owner_map WHERE opposition_id IS NULL) THEN
    RAISE EXCEPTION 'V3.0 cannot infer one opposition for a mixed legacy catalog';
  END IF;
END;
$guard$;

UPDATE public.subjects AS subject
SET opposition_id = owner_map.opposition_id
FROM _v3_catalog_owner_map AS owner_map
WHERE owner_map.user_id = subject.user_id;

UPDATE public.topics AS topic
SET opposition_id = subject.opposition_id
FROM public.subjects AS subject
WHERE subject.id = topic.subject_id;

UPDATE public.subtopics AS subtopic
SET opposition_id = topic.opposition_id
FROM public.topics AS topic
WHERE topic.id = subtopic.topic_id;

UPDATE public.questions AS question
SET opposition_id = topic.opposition_id
FROM public.topics AS topic
WHERE topic.id = question.topic_id;

UPDATE public.tests AS test
SET opposition_id = owner_map.opposition_id
FROM _v3_catalog_owner_map AS owner_map
WHERE owner_map.user_id = test.user_id;

INSERT INTO public.opposition_admins (opposition_id, user_id)
SELECT opposition_id, user_id
FROM _v3_catalog_owner_map
ON CONFLICT DO NOTHING;

INSERT INTO public.user_oppositions (user_id, opposition_id)
SELECT user_id, opposition_id
FROM _v3_catalog_owner_map
ON CONFLICT DO NOTHING;

UPDATE public.profiles AS profile
SET active_opposition_id = owner_map.opposition_id
FROM _v3_catalog_owner_map AS owner_map
WHERE owner_map.user_id = profile.id
  AND profile.active_opposition_id IS NULL;

DO $guard$
BEGIN
  IF EXISTS (SELECT 1 FROM public.subjects WHERE opposition_id IS NULL)
    OR EXISTS (SELECT 1 FROM public.topics WHERE opposition_id IS NULL)
    OR EXISTS (SELECT 1 FROM public.subtopics WHERE opposition_id IS NULL)
    OR EXISTS (SELECT 1 FROM public.questions WHERE opposition_id IS NULL)
    OR EXISTS (SELECT 1 FROM public.tests WHERE opposition_id IS NULL)
  THEN
    RAISE EXCEPTION 'V3.0 left catalog or test rows without an opposition';
  END IF;
END;
$guard$;

ALTER TABLE public.subjects ALTER COLUMN opposition_id SET NOT NULL;
ALTER TABLE public.topics ALTER COLUMN opposition_id SET NOT NULL;
ALTER TABLE public.subtopics ALTER COLUMN opposition_id SET NOT NULL;
ALTER TABLE public.questions ALTER COLUMN opposition_id SET NOT NULL;
ALTER TABLE public.tests ALTER COLUMN opposition_id SET NOT NULL;

ALTER TABLE public.subjects
  ADD CONSTRAINT subjects_opposition_id_fkey
    FOREIGN KEY (opposition_id) REFERENCES public.oppositions(id) ON DELETE RESTRICT,
  ADD CONSTRAINT subjects_opposition_id_id_key UNIQUE (opposition_id, id);

ALTER TABLE public.topics
  ADD CONSTRAINT topics_opposition_id_fkey
    FOREIGN KEY (opposition_id) REFERENCES public.oppositions(id) ON DELETE RESTRICT,
  ADD CONSTRAINT topics_opposition_id_id_key UNIQUE (opposition_id, id),
  ADD CONSTRAINT topics_opposition_subject_fk
    FOREIGN KEY (opposition_id, subject_id)
    REFERENCES public.subjects(opposition_id, id);

ALTER TABLE public.subtopics
  ADD CONSTRAINT subtopics_opposition_id_fkey
    FOREIGN KEY (opposition_id) REFERENCES public.oppositions(id) ON DELETE RESTRICT,
  ADD CONSTRAINT subtopics_opposition_id_id_key UNIQUE (opposition_id, id),
  ADD CONSTRAINT subtopics_opposition_topic_fk
    FOREIGN KEY (opposition_id, topic_id)
    REFERENCES public.topics(opposition_id, id);

ALTER TABLE public.questions
  ADD CONSTRAINT questions_opposition_id_fkey
    FOREIGN KEY (opposition_id) REFERENCES public.oppositions(id) ON DELETE RESTRICT,
  ADD CONSTRAINT questions_opposition_id_id_key UNIQUE (opposition_id, id),
  ADD CONSTRAINT questions_opposition_subject_fk
    FOREIGN KEY (opposition_id, subject_id)
    REFERENCES public.subjects(opposition_id, id),
  ADD CONSTRAINT questions_opposition_topic_fk
    FOREIGN KEY (opposition_id, topic_id)
    REFERENCES public.topics(opposition_id, id),
  ADD CONSTRAINT questions_opposition_subtopic_fk
    FOREIGN KEY (opposition_id, subtopic_id)
    REFERENCES public.subtopics(opposition_id, id);

ALTER TABLE public.tests
  ADD CONSTRAINT tests_opposition_id_fkey
    FOREIGN KEY (opposition_id) REFERENCES public.oppositions(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX subjects_opposition_normalized_name_key
  ON public.subjects (opposition_id, lower(regexp_replace(btrim(nombre), '\s+', ' ', 'g')));

CREATE UNIQUE INDEX topics_opposition_number_normalized_name_key
  ON public.topics (
    opposition_id,
    numero,
    lower(regexp_replace(btrim(nombre), '\s+', ' ', 'g'))
  );

CREATE UNIQUE INDEX subtopics_opposition_topic_normalized_name_key
  ON public.subtopics (
    opposition_id,
    topic_id,
    lower(regexp_replace(btrim(nombre), '\s+', ' ', 'g'))
  );

CREATE UNIQUE INDEX questions_opposition_code_key
  ON public.questions (opposition_id, codigo);

CREATE INDEX subjects_opposition_idx ON public.subjects(opposition_id);
CREATE INDEX topics_opposition_idx ON public.topics(opposition_id, numero);
CREATE INDEX subtopics_opposition_idx ON public.subtopics(opposition_id, topic_id);
CREATE INDEX questions_opposition_pool_idx
  ON public.questions(opposition_id, topic_id, activa, nivel_pedagogico);
CREATE INDEX tests_user_opposition_idx
  ON public.tests(user_id, opposition_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.current_active_opposition_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $fn$
  SELECT profile.active_opposition_id
  FROM public.profiles AS profile
  WHERE profile.id = (select auth.uid());
$fn$;

ALTER TABLE public.tests
  ALTER COLUMN opposition_id SET DEFAULT public.current_active_opposition_id();

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
  IF TG_OP = 'UPDATE' AND NEW.opposition_id IS DISTINCT FROM OLD.opposition_id THEN
    RAISE EXCEPTION 'Catalog rows cannot be moved between oppositions';
  END IF;
  NEW.opposition_id := v_opposition_id;
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER subjects_assign_catalog_opposition
  BEFORE INSERT OR UPDATE OF opposition_id ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.assign_catalog_opposition();
CREATE TRIGGER topics_assign_catalog_opposition
  BEFORE INSERT OR UPDATE OF opposition_id ON public.topics
  FOR EACH ROW EXECUTE FUNCTION public.assign_catalog_opposition();
CREATE TRIGGER subtopics_assign_catalog_opposition
  BEFORE INSERT OR UPDATE OF opposition_id ON public.subtopics
  FOR EACH ROW EXECUTE FUNCTION public.assign_catalog_opposition();
CREATE TRIGGER questions_assign_catalog_opposition
  BEFORE INSERT OR UPDATE OF opposition_id ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.assign_catalog_opposition();

CREATE OR REPLACE FUNCTION public.guard_question_stem_uniqueness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $fn$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.questions AS existing_question
    WHERE existing_question.opposition_id = NEW.opposition_id
      AND existing_question.id IS DISTINCT FROM NEW.id
      AND lower(regexp_replace(btrim(existing_question.pregunta), '\s+', ' ', 'g'))
          = lower(regexp_replace(btrim(NEW.pregunta), '\s+', ' ', 'g'))
  ) THEN
    RAISE EXCEPTION 'A question with the same statement already exists in this catalog'
      USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$fn$;

ALTER TABLE public.oppositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opposition_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_oppositions ENABLE ROW LEVEL SECURITY;

CREATE POLICY oppositions_read_published
  ON public.oppositions FOR SELECT TO authenticated
  USING (published = true);

CREATE POLICY opposition_admins_read_own
  ON public.opposition_admins FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY user_oppositions_read_own
  ON public.user_oppositions FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY user_oppositions_enroll_own
  ON public.user_oppositions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.oppositions AS opposition
      WHERE opposition.id = opposition_id AND opposition.published = true
    )
  );

CREATE POLICY subjects_read_active_opposition
  ON public.subjects FOR SELECT TO authenticated
  USING (opposition_id = public.current_active_opposition_id());
CREATE POLICY topics_read_active_opposition
  ON public.topics FOR SELECT TO authenticated
  USING (opposition_id = public.current_active_opposition_id());
CREATE POLICY subtopics_read_active_opposition
  ON public.subtopics FOR SELECT TO authenticated
  USING (opposition_id = public.current_active_opposition_id());
CREATE POLICY questions_read_active_opposition
  ON public.questions FOR SELECT TO authenticated
  USING (opposition_id = public.current_active_opposition_id());

CREATE OR REPLACE FUNCTION public.set_active_opposition(p_opposition_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_user_id uuid := (select auth.uid());
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.user_oppositions AS membership
    JOIN public.oppositions AS opposition ON opposition.id = membership.opposition_id
    WHERE membership.user_id = v_user_id
      AND membership.opposition_id = p_opposition_id
      AND opposition.published = true
  ) THEN
    RAISE EXCEPTION 'The user is not enrolled in this opposition' USING ERRCODE = '42501';
  END IF;
  UPDATE public.profiles
  SET active_opposition_id = p_opposition_id
  WHERE id = v_user_id;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.guard_profile_active_opposition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $fn$
BEGIN
  IF NEW.active_opposition_id IS NULL
    OR NEW.active_opposition_id IS NOT DISTINCT FROM OLD.active_opposition_id
  THEN
    RETURN NEW;
  END IF;
  IF NEW.id <> (select auth.uid()) OR NOT EXISTS (
    SELECT 1
    FROM public.user_oppositions AS membership
    JOIN public.oppositions AS opposition ON opposition.id = membership.opposition_id
    WHERE membership.user_id = NEW.id
      AND membership.opposition_id = NEW.active_opposition_id
      AND opposition.published = true
  ) THEN
    RAISE EXCEPTION 'The active opposition must be a published enrolled opposition'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER profiles_guard_active_opposition
  BEFORE UPDATE OF active_opposition_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_active_opposition();

CREATE OR REPLACE FUNCTION public.assign_test_opposition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_active_opposition_id uuid := public.current_active_opposition_id();
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.opposition_id IS DISTINCT FROM OLD.opposition_id THEN
      RAISE EXCEPTION 'Historical tests cannot be moved between oppositions';
    END IF;
    RETURN NEW;
  END IF;
  IF v_active_opposition_id IS NULL THEN
    RAISE EXCEPTION 'An active opposition is required' USING ERRCODE = '42501';
  END IF;
  NEW.opposition_id := v_active_opposition_id;
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER tests_assign_opposition
  BEFORE INSERT OR UPDATE OF opposition_id ON public.tests
  FOR EACH ROW EXECUTE FUNCTION public.assign_test_opposition();

REVOKE ALL ON TABLE public.oppositions FROM anon, authenticated;
REVOKE ALL ON TABLE public.opposition_admins FROM anon, authenticated;
REVOKE ALL ON TABLE public.user_oppositions FROM anon, authenticated;
GRANT SELECT ON TABLE public.oppositions TO authenticated;
GRANT SELECT ON TABLE public.opposition_admins TO authenticated;
GRANT SELECT, INSERT ON TABLE public.user_oppositions TO authenticated;

REVOKE ALL ON FUNCTION public.current_active_opposition_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_active_opposition_id() TO authenticated;
REVOKE ALL ON FUNCTION public.set_active_opposition(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_active_opposition(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.assign_catalog_opposition() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_profile_active_opposition() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_test_opposition() FROM PUBLIC, anon, authenticated;

COMMENT ON COLUMN public.subjects.user_id IS
  'Legacy catalog curator. V3 access is scoped by opposition_id; do not use as learner ownership.';
COMMENT ON COLUMN public.questions.user_id IS
  'Legacy catalog curator. Learning ownership lives in tests, answers and statistics.';
COMMENT ON TABLE public.oppositions IS
  'Shared V3 catalog roots. Learning progress is never stored here.';
COMMENT ON TABLE public.user_oppositions IS
  'Private user enrollment in shared opposition catalogs.';

NOTIFY pgrst, 'reload schema';
