-- V4 packages historically identified a topic by opposition + topicNumber.
-- Some official syllabi restart numbering by section, so the same opposition can
-- legitimately contain (General, 3) and (Specific, 3). Keep old packages working
-- when the number is unique; require subjectName only when it is ambiguous.

DO $migration$
DECLARE
  v_definition text;
  v_old_declaration constant text := '  v_topic_number integer;';
  v_new_declaration constant text := E'  v_topic_number integer;\n  v_subject_name text;\n  v_topic_matches integer;';
  v_old_resolver constant text := $old$
  SELECT topic.id INTO v_topic_id
  FROM public.topics topic
  WHERE topic.opposition_id = v_opposition_id AND topic.numero = v_topic_number;
  IF v_topic_id IS NULL THEN
    RAISE EXCEPTION 'Topic % not found in opposition %', v_topic_number, v_opposition_code USING ERRCODE = '22023';
  END IF;
$old$;
  v_new_resolver constant text := $new$
  v_subject_name := NULLIF(btrim(p_package->>'subjectName'), '');

  IF v_subject_name IS NOT NULL THEN
    SELECT count(*)::integer,
           CASE WHEN count(*) = 1 THEN (array_agg(topic.id ORDER BY topic.id))[1] ELSE NULL END
      INTO v_topic_matches, v_topic_id
    FROM public.topics topic
    JOIN public.subjects subject
      ON subject.id = topic.subject_id
     AND subject.opposition_id = topic.opposition_id
    WHERE topic.opposition_id = v_opposition_id
      AND topic.numero = v_topic_number
      AND subject.nombre = v_subject_name;

    IF v_topic_matches = 0 THEN
      RAISE EXCEPTION 'Topic % under subject % not found in opposition %',
        v_topic_number, v_subject_name, v_opposition_code USING ERRCODE = '22023';
    ELSIF v_topic_matches > 1 THEN
      RAISE EXCEPTION 'Topic % under subject % is not unique in opposition %',
        v_topic_number, v_subject_name, v_opposition_code USING ERRCODE = '22023';
    END IF;
  ELSE
    SELECT count(*)::integer,
           CASE WHEN count(*) = 1 THEN (array_agg(topic.id ORDER BY topic.id))[1] ELSE NULL END
      INTO v_topic_matches, v_topic_id
    FROM public.topics topic
    WHERE topic.opposition_id = v_opposition_id
      AND topic.numero = v_topic_number;

    IF v_topic_matches = 0 THEN
      RAISE EXCEPTION 'Topic % not found in opposition %',
        v_topic_number, v_opposition_code USING ERRCODE = '22023';
    ELSIF v_topic_matches > 1 THEN
      RAISE EXCEPTION 'Topic % is ambiguous in opposition %; subjectName is required',
        v_topic_number, v_opposition_code USING ERRCODE = '22023';
    END IF;
  END IF;
$new$;
BEGIN
  SELECT pg_get_functiondef(procedure.oid)
    INTO v_definition
  FROM pg_proc procedure
  JOIN pg_namespace namespace ON namespace.oid = procedure.pronamespace
  WHERE namespace.nspname = 'public'
    AND procedure.proname = 'import_v4_study_content'
    AND pg_get_function_identity_arguments(procedure.oid) = 'p_package jsonb';

  IF v_definition IS NULL THEN
    RAISE EXCEPTION 'import_v4_study_content(jsonb) is missing';
  END IF;

  IF strpos(v_definition, v_old_declaration) = 0 THEN
    RAISE EXCEPTION 'V4 importer declaration shape changed; refusing unsafe patch';
  END IF;
  v_definition := replace(v_definition, v_old_declaration, v_new_declaration);

  IF strpos(v_definition, v_old_resolver) = 0 THEN
    RAISE EXCEPTION 'V4 importer topic resolver shape changed; refusing unsafe patch';
  END IF;
  v_definition := replace(v_definition, v_old_resolver, v_new_resolver);

  EXECUTE v_definition;
END
$migration$;

COMMENT ON FUNCTION public.import_v4_study_content(jsonb) IS
  'Imports a V4 study-content package. subjectName is optional when topicNumber is unique and required when official numbering repeats within an opposition.';
