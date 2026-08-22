-- Pre-production shared-catalog hardening for learner progress/retention RPCs.
-- Catalog identity is opposition_id; learner state remains auth.uid().

DO $migration$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef(p.oid)
  INTO v_def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'get_retention_review_summary'
    AND pg_get_function_identity_arguments(p.oid) = '';

  IF v_def IS NULL OR position(E'ON question.user_id = statistics.user_id\n   AND question.id = statistics.question_id' IN v_def) = 0 THEN
    RAISE EXCEPTION 'Expected legacy get_retention_review_summary catalog join was not found';
  END IF;

  v_def := replace(
    v_def,
    E'ON question.user_id = statistics.user_id\n   AND question.id = statistics.question_id',
    E'ON question.id = statistics.question_id\n   AND question.opposition_id = public.current_active_opposition_id()'
  );
  EXECUTE v_def;

  SELECT pg_get_functiondef(p.oid)
  INTO v_def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'get_topic_progress_summary'
    AND pg_get_function_identity_arguments(p.oid) = '';

  IF v_def IS NULL
     OR position(E'ON subject.id = topic.subject_id\n   AND subject.user_id = topic.user_id\n  JOIN viewer\n    ON viewer.user_id = topic.user_id' IN v_def) = 0
     OR position(E'JOIN viewer\n    ON viewer.user_id = question.user_id' IN v_def) = 0
     OR position(E'ON question.id = answer.question_id\n   AND question.user_id = answer.user_id' IN v_def) = 0 THEN
    RAISE EXCEPTION 'Expected legacy get_topic_progress_summary catalog ownership joins were not found';
  END IF;

  v_def := replace(
    v_def,
    E'ON subject.id = topic.subject_id\n   AND subject.user_id = topic.user_id\n  JOIN viewer\n    ON viewer.user_id = topic.user_id',
    E'ON subject.id = topic.subject_id\n   AND subject.opposition_id = topic.opposition_id\n  JOIN public.profiles AS profile\n    ON profile.id = (SELECT user_id FROM viewer)\n   AND profile.active_opposition_id = topic.opposition_id'
  );
  v_def := replace(
    v_def,
    E'JOIN viewer\n    ON viewer.user_id = question.user_id',
    E'JOIN public.profiles AS profile\n    ON profile.id = (SELECT user_id FROM viewer)\n   AND profile.active_opposition_id = question.opposition_id'
  );
  v_def := replace(
    v_def,
    E'ON question.id = answer.question_id\n   AND question.user_id = answer.user_id',
    E'ON question.id = answer.question_id\n   AND question.opposition_id = test.opposition_id'
  );
  EXECUTE v_def;

  SELECT pg_get_functiondef(p.oid)
  INTO v_def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'get_verified_progress_summary'
    AND pg_get_function_identity_arguments(p.oid) = '';

  IF v_def IS NULL
     OR position(E'JOIN viewer\n    ON viewer.user_id = question.user_id' IN v_def) = 0
     OR position(E'ON question.id = answer.question_id\n   AND question.user_id = answer.user_id' IN v_def) = 0 THEN
    RAISE EXCEPTION 'Expected legacy get_verified_progress_summary catalog ownership joins were not found';
  END IF;

  v_def := replace(
    v_def,
    E'JOIN viewer\n    ON viewer.user_id = question.user_id',
    E'JOIN public.profiles AS profile\n    ON profile.id = (SELECT user_id FROM viewer)\n   AND profile.active_opposition_id = question.opposition_id'
  );
  v_def := replace(
    v_def,
    E'ON question.id = answer.question_id\n   AND question.user_id = answer.user_id',
    E'ON question.id = answer.question_id\n   AND question.opposition_id = test.opposition_id'
  );
  EXECUTE v_def;

  SELECT pg_get_functiondef(p.oid)
  INTO v_def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'get_question_bank_quality_report'
    AND pg_get_function_identity_arguments(p.oid) = '';

  IF v_def IS NULL
     OR position('WHERE question.user_id = auth.uid()' IN v_def) = 0
     OR position('WHERE topic.user_id = auth.uid()' IN v_def) = 0 THEN
    RAISE EXCEPTION 'Expected legacy get_question_bank_quality_report catalog ownership filters were not found';
  END IF;

  v_def := replace(
    v_def,
    'WHERE question.user_id = auth.uid()',
    'WHERE question.opposition_id = public.current_active_opposition_id()'
  );
  v_def := replace(
    v_def,
    'WHERE topic.user_id = auth.uid()',
    'WHERE topic.opposition_id = public.current_active_opposition_id()'
  );
  EXECUTE v_def;
END;
$migration$;
