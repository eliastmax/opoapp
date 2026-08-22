-- Celador SMS: preserve official topic numbering (General 1-6 / Specific 1-7)
-- by using the existing subject dimension as the section identity.
-- No question, topic, provenance, code, or opposition identifiers are recreated.

DO $$
DECLARE
  v_opposition_id constant uuid := '00000000-0000-4000-8000-000000000002'::uuid;
  v_owner_id uuid;
  v_general_topic_id uuid;
  v_specific_topic_id uuid;
  v_general_subject_id uuid;
  v_specific_subject_id uuid;
  v_general_question_count integer;
  v_specific_question_count integer;
BEGIN
  SELECT q.user_id, q.topic_id, count(*)::integer
    INTO v_owner_id, v_general_topic_id, v_general_question_count
  FROM public.questions q
  WHERE q.opposition_id = v_opposition_id
    AND q.codigo LIKE 'SMS-CEL-T03-%'
  GROUP BY q.user_id, q.topic_id;

  IF v_owner_id IS NULL OR v_general_topic_id IS NULL OR v_general_question_count <> 80 THEN
    RAISE EXCEPTION 'Unexpected Celador General Tema 3 cohort before section migration';
  END IF;

  SELECT q.topic_id, count(*)::integer
    INTO v_specific_topic_id, v_specific_question_count
  FROM public.questions q
  WHERE q.opposition_id = v_opposition_id
    AND q.user_id = v_owner_id
    AND q.codigo LIKE 'SMS-CEL-E-T06-%'
  GROUP BY q.topic_id;

  IF v_specific_topic_id IS NULL OR v_specific_question_count <> 105 THEN
    RAISE EXCEPTION 'Unexpected Celador Specific Tema 6 cohort before section migration';
  END IF;

  IF public.current_active_opposition_id() IS DISTINCT FROM v_opposition_id THEN
    PERFORM set_config('request.jwt.claim.sub', v_owner_id::text, true);
  ELSE
    PERFORM set_config('request.jwt.claim.sub', v_owner_id::text, true);
  END IF;

  IF public.current_active_opposition_id() IS DISTINCT FROM v_opposition_id THEN
    RAISE EXCEPTION 'Celador SMS must be the curator active opposition during migration';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.opposition_admins a
    WHERE a.user_id = v_owner_id
      AND a.opposition_id = v_opposition_id
  ) THEN
    RAISE EXCEPTION 'Celador catalog owner is not an opposition administrator';
  END IF;

  SELECT t.subject_id
    INTO v_general_subject_id
  FROM public.topics t
  WHERE t.id = v_general_topic_id
    AND t.opposition_id = v_opposition_id
    AND t.user_id = v_owner_id
    AND t.numero = 3;

  IF v_general_subject_id IS NULL THEN
    RAISE EXCEPTION 'General Tema 3 identity is inconsistent';
  END IF;

  UPDATE public.subjects
  SET nombre = 'Celador SMS · Parte General'
  WHERE id = v_general_subject_id
    AND opposition_id = v_opposition_id
    AND user_id = v_owner_id
    AND nombre IN ('Celador SMS', 'Celador SMS · Parte General');

  SELECT s.id
    INTO v_specific_subject_id
  FROM public.subjects s
  WHERE s.opposition_id = v_opposition_id
    AND s.user_id = v_owner_id
    AND s.nombre = 'Celador SMS · Parte Específica';

  IF v_specific_subject_id IS NULL THEN
    INSERT INTO public.subjects (user_id, nombre, opposition_id)
    VALUES (v_owner_id, 'Celador SMS · Parte Específica', v_opposition_id)
    RETURNING id INTO v_specific_subject_id;
  END IF;

  UPDATE public.topics
  SET subject_id = v_specific_subject_id
  WHERE id = v_specific_topic_id
    AND opposition_id = v_opposition_id
    AND user_id = v_owner_id
    AND numero = 6;

  UPDATE public.questions
  SET subject_id = v_specific_subject_id
  WHERE opposition_id = v_opposition_id
    AND user_id = v_owner_id
    AND topic_id = v_specific_topic_id
    AND codigo LIKE 'SMS-CEL-E-T06-%';

  IF (SELECT count(*) FROM public.subjects s WHERE s.opposition_id = v_opposition_id AND s.user_id = v_owner_id AND s.nombre IN ('Celador SMS · Parte General', 'Celador SMS · Parte Específica')) <> 2 THEN
    RAISE EXCEPTION 'Celador section subject split did not materialize exactly two subjects';
  END IF;

  IF (SELECT count(*) FROM public.questions q WHERE q.opposition_id = v_opposition_id AND q.topic_id = v_general_topic_id AND q.subject_id = v_general_subject_id) <> 80 THEN
    RAISE EXCEPTION 'General Tema 3 questions changed during section migration';
  END IF;

  IF (SELECT count(*) FROM public.questions q WHERE q.opposition_id = v_opposition_id AND q.topic_id = v_specific_topic_id AND q.subject_id = v_specific_subject_id) <> 105 THEN
    RAISE EXCEPTION 'Specific Tema 6 question subject migration is incomplete';
  END IF;
END
$$;
