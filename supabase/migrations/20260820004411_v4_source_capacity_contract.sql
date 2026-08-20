-- V4 source-capacity metadata belongs to the catalog concept, never to the learner.
ALTER TABLE public.concepts
  ADD COLUMN source_capacity_status text,
  ADD COLUMN source_supported_ceiling smallint,
  ADD COLUMN source_capacity_reason text;

ALTER TABLE public.concepts
  ADD CONSTRAINT concepts_source_capacity_check CHECK (
    (
      source_capacity_status IS NULL
      AND source_supported_ceiling IS NULL
      AND source_capacity_reason IS NULL
    )
    OR (
      source_capacity_status = 'source_limited'
      AND source_supported_ceiling BETWEEN 1 AND 3
      AND NULLIF(btrim(source_capacity_reason), '') IS NOT NULL
    )
  );

COMMENT ON COLUMN public.concepts.source_capacity_status IS
  'Production source-capacity classification. NULL = standard; only source_limited may be persisted.';
COMMENT ON COLUMN public.concepts.source_supported_ceiling IS
  'Maximum number (1..3) of genuinely independent primary questions supported by the canonical source.';
COMMENT ON COLUMN public.concepts.source_capacity_reason IS
  'Editorial rationale for a persisted source_limited ceiling.';

-- Replace the importer without changing its standard behavior. source_review_required
-- is intentionally not a production value and is rejected by the status validation.
CREATE OR REPLACE FUNCTION public.import_v4_study_content(p_package jsonb)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_opposition_code text;
  v_opposition_id uuid;
  v_topic_number integer;
  v_topic_id uuid;
  v_active_opposition_id uuid;
  v_row jsonb;
  v_secondary_code text;
  v_unit_id uuid;
  v_concept_id uuid;
  v_question_id uuid;
  v_subtopic_id uuid;
  v_import_id uuid;
  v_unit_count integer;
  v_concept_count integer;
  v_mapping_count integer;
  v_flashcard_count integer;
  v_capacity jsonb;
  v_capacity_status text;
  v_capacity_ceiling smallint;
  v_capacity_reason text;
  v_primary_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_package IS NULL OR jsonb_typeof(p_package) <> 'object' THEN
    RAISE EXCEPTION 'V4 content package must be a JSON object' USING ERRCODE = '22023';
  END IF;
  IF p_package->>'version' IS DISTINCT FROM '4.0' THEN
    RAISE EXCEPTION 'Unsupported V4 content contract version: %', COALESCE(p_package->>'version', '<null>') USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_package->'units') IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_package->'concepts') IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_package->'questionMappings') IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_package->'flashcards') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'units, concepts, questionMappings and flashcards must be arrays' USING ERRCODE = '22023';
  END IF;

  v_opposition_code := NULLIF(btrim(p_package->>'oppositionCode'), '');
  IF v_opposition_code IS NULL THEN RAISE EXCEPTION 'oppositionCode is required' USING ERRCODE = '22023'; END IF;
  BEGIN
    v_topic_number := (p_package->>'topicNumber')::integer;
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RAISE EXCEPTION 'topicNumber must be a positive integer' USING ERRCODE = '22023';
  END;
  IF v_topic_number IS NULL OR v_topic_number < 1 THEN
    RAISE EXCEPTION 'topicNumber must be a positive integer' USING ERRCODE = '22023';
  END IF;

  SELECT opposition.id INTO v_opposition_id
  FROM public.oppositions opposition
  WHERE opposition.code = v_opposition_code AND opposition.published IS TRUE;
  IF v_opposition_id IS NULL THEN
    RAISE EXCEPTION 'Published opposition not found for code %', v_opposition_code USING ERRCODE = '22023';
  END IF;
  v_active_opposition_id := public.current_active_opposition_id();
  IF v_active_opposition_id IS DISTINCT FROM v_opposition_id THEN
    RAISE EXCEPTION 'The package opposition must be the current active opposition' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.opposition_admins administrator
    WHERE administrator.user_id = v_user_id AND administrator.opposition_id = v_opposition_id
  ) THEN
    RAISE EXCEPTION 'Opposition administrator permission required' USING ERRCODE = '42501';
  END IF;

  SELECT topic.id INTO v_topic_id
  FROM public.topics topic
  WHERE topic.opposition_id = v_opposition_id AND topic.numero = v_topic_number;
  IF v_topic_id IS NULL THEN
    RAISE EXCEPTION 'Topic % not found in opposition %', v_topic_number, v_opposition_code USING ERRCODE = '22023';
  END IF;

  v_unit_count := jsonb_array_length(p_package->'units');
  v_concept_count := jsonb_array_length(p_package->'concepts');
  v_mapping_count := jsonb_array_length(p_package->'questionMappings');
  v_flashcard_count := jsonb_array_length(p_package->'flashcards');

  FOR v_row IN SELECT value FROM jsonb_array_elements(p_package->'units') LOOP
    IF NULLIF(btrim(v_row->>'code'), '') IS NULL
       OR NULLIF(btrim(v_row->>'title'), '') IS NULL
       OR NULLIF(btrim(v_row->>'studySummary'), '') IS NULL THEN
      RAISE EXCEPTION 'Every study unit requires code, title and studySummary' USING ERRCODE = '22023';
    END IF;
    v_subtopic_id := NULL;
    IF NULLIF(btrim(v_row->>'sourceSubtopicName'), '') IS NOT NULL THEN
      SELECT CASE WHEN count(*) = 1 THEN (array_agg(subtopic.id))[1] ELSE NULL END INTO v_subtopic_id
      FROM public.subtopics subtopic
      WHERE subtopic.opposition_id = v_opposition_id
        AND subtopic.topic_id = v_topic_id
        AND subtopic.nombre = v_row->>'sourceSubtopicName';
    END IF;
    INSERT INTO public.study_units (
      opposition_id, topic_id, subtopic_id, code, title, position, estimated_minutes,
      study_summary, exam_keys, confusions, traps, mnemonics, source_refs, active, created_by, updated_at
    ) VALUES (
      v_opposition_id, v_topic_id, v_subtopic_id, btrim(v_row->>'code'), btrim(v_row->>'title'),
      COALESCE((v_row->>'position')::integer, 0), COALESCE((v_row->>'estimatedMinutes')::integer, 5),
      v_row->>'studySummary', COALESCE(v_row->'examKeys', '[]'::jsonb),
      COALESCE(v_row->'confusions', '[]'::jsonb), COALESCE(v_row->'traps', '[]'::jsonb),
      COALESCE(v_row->'mnemonics', '[]'::jsonb), COALESCE(v_row->'sourceRefs', '[]'::jsonb),
      TRUE, v_user_id, now()
    )
    ON CONFLICT (opposition_id, code) DO UPDATE SET
      topic_id = EXCLUDED.topic_id, subtopic_id = EXCLUDED.subtopic_id, title = EXCLUDED.title,
      position = EXCLUDED.position, estimated_minutes = EXCLUDED.estimated_minutes,
      study_summary = EXCLUDED.study_summary, exam_keys = EXCLUDED.exam_keys,
      confusions = EXCLUDED.confusions, traps = EXCLUDED.traps, mnemonics = EXCLUDED.mnemonics,
      source_refs = EXCLUDED.source_refs, active = TRUE, updated_at = now();
  END LOOP;

  FOR v_row IN SELECT value FROM jsonb_array_elements(p_package->'concepts') LOOP
    SELECT unit.id INTO v_unit_id
    FROM public.study_units unit
    WHERE unit.opposition_id = v_opposition_id AND unit.topic_id = v_topic_id AND unit.code = btrim(v_row->>'unitCode');
    IF v_unit_id IS NULL THEN
      RAISE EXCEPTION 'Unknown study unit % for concept %', v_row->>'unitCode', v_row->>'code' USING ERRCODE = '23503';
    END IF;
    IF NULLIF(btrim(v_row->>'code'), '') IS NULL OR NULLIF(btrim(v_row->>'title'), '') IS NULL THEN
      RAISE EXCEPTION 'Every concept requires code and title' USING ERRCODE = '22023';
    END IF;

    v_capacity := v_row->'sourceCapacity';
    v_capacity_status := NULL;
    v_capacity_ceiling := NULL;
    v_capacity_reason := NULL;
    IF v_capacity IS NOT NULL THEN
      IF jsonb_typeof(v_capacity) IS DISTINCT FROM 'object' THEN
        RAISE EXCEPTION 'sourceCapacity for concept % must be an object', v_row->>'code' USING ERRCODE = '22023';
      END IF;
      v_capacity_status := NULLIF(btrim(v_capacity->>'status'), '');
      IF v_capacity_status IS DISTINCT FROM 'source_limited' THEN
        RAISE EXCEPTION 'Only source_limited may be persisted for concept %', v_row->>'code' USING ERRCODE = '22023';
      END IF;
      BEGIN
        v_capacity_ceiling := (v_capacity->>'sourceSupportedCeiling')::smallint;
      EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
        RAISE EXCEPTION 'sourceSupportedCeiling for concept % must be an integer from 1 to 3', v_row->>'code' USING ERRCODE = '22023';
      END;
      v_capacity_reason := NULLIF(btrim(v_capacity->>'reason'), '');
      IF v_capacity_ceiling IS NULL OR v_capacity_ceiling < 1 OR v_capacity_ceiling > 3 OR v_capacity_reason IS NULL THEN
        RAISE EXCEPTION 'Invalid source_limited capacity for concept %', v_row->>'code' USING ERRCODE = '22023';
      END IF;
    END IF;

    INSERT INTO public.concepts (
      opposition_id, topic_id, study_unit_id, code, title, description, position,
      source_capacity_status, source_supported_ceiling, source_capacity_reason,
      active, created_by, updated_at
    ) VALUES (
      v_opposition_id, v_topic_id, v_unit_id, btrim(v_row->>'code'), btrim(v_row->>'title'),
      COALESCE(v_row->>'description', ''), COALESCE((v_row->>'position')::integer, 0),
      v_capacity_status, v_capacity_ceiling, v_capacity_reason, TRUE, v_user_id, now()
    )
    ON CONFLICT (opposition_id, code) DO UPDATE SET
      topic_id = EXCLUDED.topic_id, study_unit_id = EXCLUDED.study_unit_id,
      title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position,
      source_capacity_status = EXCLUDED.source_capacity_status,
      source_supported_ceiling = EXCLUDED.source_supported_ceiling,
      source_capacity_reason = EXCLUDED.source_capacity_reason,
      active = TRUE, updated_at = now();
  END LOOP;

  FOR v_row IN SELECT value FROM jsonb_array_elements(p_package->'questionMappings') LOOP
    SELECT question.id INTO v_question_id
    FROM public.questions question
    WHERE question.opposition_id = v_opposition_id AND question.topic_id = v_topic_id
      AND question.codigo = btrim(v_row->>'questionCode') AND question.activa IS TRUE;
    IF v_question_id IS NULL THEN
      RAISE EXCEPTION 'Active question % not found in package topic', v_row->>'questionCode' USING ERRCODE = '23503';
    END IF;
    DELETE FROM public.question_concepts mapping WHERE mapping.question_id = v_question_id;
    SELECT concept.id INTO v_concept_id
    FROM public.concepts concept
    WHERE concept.opposition_id = v_opposition_id AND concept.topic_id = v_topic_id
      AND concept.code = btrim(v_row->>'primaryConceptCode') AND concept.active IS TRUE;
    IF v_concept_id IS NULL THEN
      RAISE EXCEPTION 'Primary concept % not found for question %', v_row->>'primaryConceptCode', v_row->>'questionCode' USING ERRCODE = '23503';
    END IF;
    INSERT INTO public.question_concepts (opposition_id, topic_id, question_id, concept_id, role, created_by)
    VALUES (v_opposition_id, v_topic_id, v_question_id, v_concept_id, 'primary', v_user_id);

    FOR v_secondary_code IN SELECT value FROM jsonb_array_elements_text(COALESCE(v_row->'secondaryConceptCodes', '[]'::jsonb)) LOOP
      SELECT concept.id INTO v_concept_id
      FROM public.concepts concept
      WHERE concept.opposition_id = v_opposition_id AND concept.topic_id = v_topic_id
        AND concept.code = btrim(v_secondary_code) AND concept.active IS TRUE;
      IF v_concept_id IS NULL THEN
        RAISE EXCEPTION 'Secondary concept % not found for question %', v_secondary_code, v_row->>'questionCode' USING ERRCODE = '23503';
      END IF;
      INSERT INTO public.question_concepts (opposition_id, topic_id, question_id, concept_id, role, created_by)
      VALUES (v_opposition_id, v_topic_id, v_question_id, v_concept_id, 'secondary', v_user_id);
    END LOOP;
  END LOOP;

  -- Fail closed if package/application mapping leaves a source_limited concept
  -- above its canonical evidence ceiling. Below-ceiling remains an actionable
  -- coverage gap for validators rather than being fabricated here.
  FOR v_row IN SELECT value FROM jsonb_array_elements(p_package->'concepts')
    WHERE value ? 'sourceCapacity'
  LOOP
    SELECT concept.id, concept.source_supported_ceiling INTO v_concept_id, v_capacity_ceiling
    FROM public.concepts concept
    WHERE concept.opposition_id = v_opposition_id AND concept.topic_id = v_topic_id
      AND concept.code = btrim(v_row->>'code') AND concept.active IS TRUE;
    SELECT count(DISTINCT mapping.question_id)::integer INTO v_primary_count
    FROM public.question_concepts mapping
    JOIN public.questions question ON question.id = mapping.question_id AND question.activa IS TRUE
    WHERE mapping.concept_id = v_concept_id AND mapping.role = 'primary';
    IF v_primary_count > v_capacity_ceiling THEN
      RAISE EXCEPTION 'Concept % has % active primary questions above sourceSupportedCeiling %',
        v_row->>'code', v_primary_count, v_capacity_ceiling USING ERRCODE = '22023';
    END IF;
  END LOOP;

  UPDATE public.flashcards card SET active = FALSE, updated_at = now()
  WHERE card.opposition_id = v_opposition_id
    AND card.concept_id IN (
      SELECT concept.id FROM public.concepts concept
      JOIN jsonb_array_elements(p_package->'concepts') AS package_concept
        ON concept.code = btrim(package_concept->>'code')
      WHERE concept.opposition_id = v_opposition_id AND concept.topic_id = v_topic_id
    );

  FOR v_row IN SELECT value FROM jsonb_array_elements(p_package->'flashcards') LOOP
    SELECT concept.id INTO v_concept_id
    FROM public.concepts concept
    WHERE concept.opposition_id = v_opposition_id AND concept.topic_id = v_topic_id
      AND concept.code = btrim(v_row->>'conceptCode') AND concept.active IS TRUE;
    IF v_concept_id IS NULL THEN
      RAISE EXCEPTION 'Unknown concept % for flashcard %', v_row->>'conceptCode', v_row->>'code' USING ERRCODE = '23503';
    END IF;
    IF NULLIF(btrim(v_row->>'code'), '') IS NULL OR NULLIF(btrim(v_row->>'prompt'), '') IS NULL OR NULLIF(btrim(v_row->>'answer'), '') IS NULL THEN
      RAISE EXCEPTION 'Every flashcard requires code, prompt and answer' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.flashcards (
      opposition_id, concept_id, code, card_type, prompt, answer, position, source_refs, active, created_by, updated_at
    ) VALUES (
      v_opposition_id, v_concept_id, btrim(v_row->>'code'), COALESCE(NULLIF(btrim(v_row->>'type'), ''), 'direct'),
      v_row->>'prompt', v_row->>'answer', COALESCE((v_row->>'position')::integer, 0),
      COALESCE(v_row->'sourceRefs', '[]'::jsonb), TRUE, v_user_id, now()
    )
    ON CONFLICT (opposition_id, code) DO UPDATE SET
      concept_id = EXCLUDED.concept_id, card_type = EXCLUDED.card_type, prompt = EXCLUDED.prompt,
      answer = EXCLUDED.answer, position = EXCLUDED.position, source_refs = EXCLUDED.source_refs,
      active = TRUE, updated_at = now();
  END LOOP;

  INSERT INTO public.study_content_imports (
    opposition_id, topic_id, contract_version, source_revision, unit_count, concept_count,
    question_mapping_count, flashcard_count, imported_by
  ) VALUES (
    v_opposition_id, v_topic_id, p_package->>'version', NULLIF(p_package->>'sourceRevision', ''),
    v_unit_count, v_concept_count, v_mapping_count, v_flashcard_count, v_user_id
  ) RETURNING id INTO v_import_id;

  RETURN jsonb_build_object(
    'importId', v_import_id, 'oppositionCode', v_opposition_code, 'topicNumber', v_topic_number,
    'units', v_unit_count, 'concepts', v_concept_count,
    'questionMappings', v_mapping_count, 'flashcards', v_flashcard_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.import_v4_study_content(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_v4_study_content(jsonb) TO authenticated, service_role;
