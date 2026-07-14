
-- Enums
CREATE TYPE public.dificultad_enum AS ENUM ('facil', 'medio', 'dificil');
CREATE TYPE public.respuesta_enum AS ENUM ('A', 'B', 'C', 'D');

-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (id = (select auth.uid()));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = (select auth.uid()));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = (select auth.uid())) WITH CHECK (id = (select auth.uid()));

-- Trigger crear perfil al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre', ''));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- subjects
CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  descripcion text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, nombre)
);
CREATE INDEX idx_subjects_user ON public.subjects(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subjects_all_own" ON public.subjects FOR ALL TO authenticated
  USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

-- topics
CREATE TABLE public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  numero int NOT NULL,
  nombre text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, subject_id, numero),
  UNIQUE (user_id, subject_id, nombre)
);
CREATE INDEX idx_topics_user ON public.topics(user_id);
CREATE INDEX idx_topics_subject ON public.topics(subject_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.topics TO authenticated;
GRANT ALL ON public.topics TO service_role;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "topics_all_own" ON public.topics FOR ALL TO authenticated
  USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

-- subtopics
CREATE TABLE public.subtopics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic_id, nombre)
);
CREATE INDEX idx_subtopics_user ON public.subtopics(user_id);
CREATE INDEX idx_subtopics_topic ON public.subtopics(topic_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subtopics TO authenticated;
GRANT ALL ON public.subtopics TO service_role;
ALTER TABLE public.subtopics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subtopics_all_own" ON public.subtopics FOR ALL TO authenticated
  USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

-- questions
CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE RESTRICT,
  subtopic_id uuid REFERENCES public.subtopics(id) ON DELETE SET NULL,
  dificultad public.dificultad_enum NOT NULL,
  concepto text,
  objetivo_aprendizaje text,
  pregunta text NOT NULL,
  opcion_a text NOT NULL,
  opcion_b text NOT NULL,
  opcion_c text NOT NULL,
  opcion_d text NOT NULL,
  respuesta_correcta public.respuesta_enum NOT NULL,
  explicacion text NOT NULL DEFAULT '',
  referencia_fuente text NOT NULL DEFAULT '',
  activa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, codigo)
);
CREATE INDEX idx_questions_user ON public.questions(user_id);
CREATE INDEX idx_questions_subject ON public.questions(subject_id);
CREATE INDEX idx_questions_topic ON public.questions(topic_id);
CREATE INDEX idx_questions_subtopic ON public.questions(subtopic_id);
CREATE INDEX idx_questions_dif ON public.questions(dificultad);
CREATE INDEX idx_questions_activa ON public.questions(activa);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions_all_own" ON public.questions FOR ALL TO authenticated
  USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

-- tests
CREATE TABLE public.tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  fecha_inicio timestamptz NOT NULL DEFAULT now(),
  fecha_finalizacion timestamptz,
  numero_preguntas int NOT NULL,
  aciertos int NOT NULL DEFAULT 0,
  fallos int NOT NULL DEFAULT 0,
  sin_responder int NOT NULL DEFAULT 0,
  porcentaje numeric(5,2) NOT NULL DEFAULT 0,
  completado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tests_user ON public.tests(user_id);
CREATE INDEX idx_tests_completado ON public.tests(completado);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tests TO authenticated;
GRANT ALL ON public.tests TO service_role;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tests_all_own" ON public.tests FOR ALL TO authenticated
  USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

-- test_answers
CREATE TABLE public.test_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE RESTRICT,
  orden int NOT NULL,
  respuesta_usuario public.respuesta_enum,
  correcta boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (test_id, question_id),
  UNIQUE (test_id, orden)
);
CREATE INDEX idx_test_answers_user ON public.test_answers(user_id);
CREATE INDEX idx_test_answers_test ON public.test_answers(test_id);
CREATE INDEX idx_test_answers_question ON public.test_answers(question_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_answers TO authenticated;
GRANT ALL ON public.test_answers TO service_role;
ALTER TABLE public.test_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "test_answers_all_own" ON public.test_answers FOR ALL TO authenticated
  USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
