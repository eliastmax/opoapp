-- V4 content importer: atomically applies a validated portable topic package.
-- The function is intentionally SECURITY INVOKER so existing RLS remains the
-- final authorization boundary. Only an authenticated admin of the active
-- opposition can import content.

CREATE TABLE public.study_content_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opposition_id uuid NOT NULL REFERENCES public.oppositions(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL,
  contract_version text NOT NULL CHECK (btrim(contract_version) <> ''),
  source_revision text,
  unit_count integer NOT NULL CHECK (unit_count >= 0),
  concept_count integer NOT NULL CHECK (concept_count >= 0),
  question_mapping_count integer NOT NULL CHECK (question_mapping_count >= 0),
  flashcard_count integer NOT NULL CHECK (flashcard_count >= 0),
  imported_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT study_content_imports_opposition_topic_fk
    FOREIGN KEY (opposition_id, topic_id)
    REFERENCES public.topics (opposition_id, id)
    ON DELETE CASCADE
);

CREATE INDEX study_content_imports_topic_time_idx
  ON public.study_content_imports (opposition_id, topic_id, imported_at DESC);
CREATE INDEX study_content_imports_imported_by_idx
  ON public.study_content_imports (imported_by)
  WHERE imported_by IS NOT NULL;

ALTER TABLE public.study_content_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY study_content_imports_select_admin
  ON public.study_content_imports FOR SELECT TO authenticated
  USING (
    opposition_id = public.current_active_opposition_id()
    AND EXISTS (
      SELECT 1
      FROM public.opposition_admins administrator
      WHERE administrator.user_id = (SELECT auth.uid())
        AND administrator.opposition_id = study_content_imports.opposition_id
    )
  );

CREATE POLICY study_content_imports_insert_admin
  ON public.study_content_imports FOR INSERT TO authenticated
  WITH CHECK (
    opposition_id = public.current_active_opposition_id()
    AND imported_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.opposition_admins administrator
      WHERE administrator.user_id = (SELECT auth.uid())
        AND administrator.opposition_id = study_content_imports.opposition_id
    )
  );

REVOKE ALL ON TABLE public.study_content_imports FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.study_content_imports TO authenticated;
GRANT ALL ON TABLE public.study_content_imports TO service_role;

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
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_package IS NULL OR jsonb_typeof(p_package) <> 'object' THEN
    RAISE EXCEPTION 'V4 content package must be a JSON object' USING ERRCODE = '22023';
  END IF;

  IF p_package->>'version' IS DISTINCT FROM '4.0' THEN
    RAISE EXCEPTION 'Unsupported V4 content contract version: %', COALESCE(p_package->>'version', '<null>')
      USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(p_package->'units') IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_package->'concepts') IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_package->'questionMappings') IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_package->'flashcards') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'units, concepts, questionMappings and flashcards must be arrays'
      USING ERRCODE = '22023';
  END IF;

  v_opposition_code := NULLIF(btrim(p_package->>'oppositionCode'), '');
  IF v_opposition_code IS NULL THEN
    RAISE EXCEPTION 'oppositionCode is required' USING ERRCODE = '22023';
  END IF;

  BEGIN
    v_topic_number := (p_package->>'topicNumber')::integer;
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RAISE EXCEPTION 'topicNumber must be a positive integer' USING ERRCODE = '22023';
  END;

  IF v_topic_number IS NULL OR v_topic_number < 1 THEN
    RAISE EXCEPTION 'topicNumber must be a positive integer' USING ERRCODE = '22023';
  END IF;

  SELECT opposition.id
  INTO v_opposition_id
  FROM public.oppositions opposition
  WHERE opposition.code = v_opposition_code
    AND opposition.published IS TRUE;

  IF v_opposition_id IS NULL THEN
    RAISE EXCEPTION 'Published opposition not found for code %', v_opposition_code
      USING ERRCODE = '22023';
  END IF;

  v_active_opposition_id := public.current_active_opposition_id();
  IF v_active_opposition_id IS DISTINCT FROM v_opposition_id THEN
    RAISE EXCEPTION 'The package opposition must be the current active opposition'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.opposition_admins administrator
    WHERE administrator.user_id = v_user_id
      AND administrator.opposition_id = v_opposition_id
  ) THEN
    RAISE EXCEPTION 'Opposition administrator permission required'
      USING ERRCODE = '42501';
  END IF;

  SELECT topic.id
  INTO v_topic_id
  FROM public.topics topic
  WHERE topic.opposition_id = v_opposition_id
    AND topic.numero = v_topic_number;

  IF v_topic_id IS NULL THEN
    RAISE EXCEPTION 'Topic % not found in opposition %', v_topic_number, v_opposition_code
      USING ERRCODE = '22023';
  END IF;

  v_unit_count := jsonb_array_length(p_package->'units');
  v_concept_count := jsonb_array_length(p_package->'concepts');
  v_mapping_count := jsonb_array_length(p_package->'questionMappings');
  v_flashcard_count := jsonb_array_length(p_package->'flashcards');

  -- Units are upserted by stable code. sourceSubtopicName is only a hint: it is
  -- attached when it uniquely identifies one existing source subtopic.
  FOR v_row IN SELECT value FROM jsonb_array_elements(p_package->'units')
  LOOP
    IF NULLIF(btrim(v_row->>'code'), '') IS NULL
       OR NULLIF(btrim(v_row->>'title'), '') IS NULL
       OR NULLIF(btrim(v_row->>'studySummary'), '') IS NULL THEN
      RAISE EXCEPTION 'Every study unit requires code, title and studySummary'
        USING ERRCODE = '22023';
    END IF;

    v_subtopic_id := NULL;
    IF NULLIF(btrim(v_row->>'sourceSubtopicName'), '') IS NOT NULL THEN
      SELECT CASE WHEN count(*) = 1 THEN (array_agg(subtopic.id))[1] ELSE NULL END
      INTO v_subtopic_id
      FROM public.subtopics subtopic
      WHERE subtopic.opposition_id = v_opposition_id
        AND subtopic.topic_id = v_topic_id
        AND subtopic.nombre = v_row->>'sourceSubtopicName';
    END IF;

    INSERT INTO public.study_units (
      opposition_id,
      topic_id,
      subtopic_id,
      code,
      title,
      position,
      estimated_minutes,
      study_summary,
      exam_keys,
      confusions,
      traps,
      mnemonics,
      source_refs,
      active,
      created_by,
      updated_at
    ) VALUES (
      v_opposition_id,
      v_topic_id,
      v_subtopic_id,
      btrim(v_row->>'code'),
      btrim(v_row->>'title'),
      COALESCE((v_row->>'position')::integer, 0),
      COALESCE((v_row->>'estimatedMinutes')::integer, 5),
      v_row->>'studySummary',
      COALESCE(v_row->'examKeys', '[]'::jsonb),
      COALESCE(v_row->'confusions', '[]'::jsonb),
      COALESCE(v_row->'traps', '[]'::jsonb),
      COALESCE(v_row->'mnemonics', '[]'::jsonb),
      COALESCE(v_row->'sourceRefs', '[]'::jsonb),
      TRUE,
      v_user_id,
      now()
    )
    ON CONFLICT (opposition_id, code) DO UPDATE SET
      topic_id = EXCLUDED.topic_id,
      subtopic_id = EXCLUDED.subtopic_id,
      title = EXCLUDED.title,
      position = EXCLUDED.position,
      estimated_minutes = EXCLUDED.estimated_minutes,
      study_summary = EXCLUDED.study_summary,
      exam_keys = EXCLUDED.exam_keys,
      confusions = EXCLUDED.confusions,
      traps = EXCLUDED.traps,
      mnemonics = EXCLUDED.mnemonics,
      source_refs = EXCLUDED.source_refs,
      active = TRUE,
      updated_at = now();
  END LOOP;

  -- Concepts can only point to units inside the package topic.
  FOR v_row IN SELECT value FROM jsonb_array_elements(p_package->'concepts')
  LOOP
    SELECT unit.id
    INTO v_unit_id
    FROM public.study_units unit
    WHERE unit.opposition_id = v_opposition_id
      AND unit.topic_id = v_topic_id
      AND unit.code = btrim(v_row->>'unitCode');

    IF v_unit_id IS NULL THEN
      RAISE EXCEPTION 'Unknown study unit % for concept %', v_row->>'unitCode', v_row->>'code'
        USING ERRCODE = '23503';
    END IF;

    IF NULLIF(btrim(v_row->>'code'), '') IS NULL
       OR NULLIF(btrim(v_row->>'title'), '') IS NULL THEN
      RAISE EXCEPTION 'Every concept requires code and title' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.concepts (
      opposition_id,
      topic_id,
      study_unit_id,
      code,
      title,
      description,
      position,
      active,
      created_by,
      updated_at
    ) VALUES (
      v_opposition_id,
      v_topic_id,
      v_unit_id,
      btrim(v_row->>'code'),
      btrim(v_row->>'title'),
      COALESCE(v_row->>'description', ''),
      COALESCE((v_row->>'position')::integer, 0),
      TRUE,
      v_user_id,
      now()
    )
    ON CONFLICT (opposition_id, code) DO UPDATE SET
      topic_id = EXCLUDED.topic_id,
      study_unit_id = EXCLUDED.study_unit_id,
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      position = EXCLUDED.position,
      active = TRUE,
      updated_at = now();
  END LOOP;

  -- Every listed question is replaced atomically with its canonical mapping row.
  -- Questions omitted from a partial package keep their existing mapping.
  FOR v_row IN SELECT value FROM jsonb_array_elements(p_package->'questionMappings')
  LOOP
    SELECT question.id
    INTO v_question_id
    FROM public.questions question
    WHERE question.opposition_id = v_opposition_id
      AND question.topic_id = v_topic_id
      AND question.codigo = btrim(v_row->>'questionCode')
      AND question.activa IS TRUE;

    IF v_question_id IS NULL THEN
      RAISE EXCEPTION 'Active question % not found in package topic', v_row->>'questionCode'
        USING ERRCODE = '23503';
    END IF;

    DELETE FROM public.question_concepts mapping
    WHERE mapping.question_id = v_question_id;

    SELECT concept.id
    INTO v_concept_id
    FROM public.concepts concept
    WHERE concept.opposition_id = v_opposition_id
      AND concept.topic_id = v_topic_id
      AND concept.code = btrim(v_row->>'primaryConceptCode')
      AND concept.active IS TRUE;

    IF v_concept_id IS NULL THEN
      RAISE EXCEPTION 'Primary concept % not found for question %',
        v_row->>'primaryConceptCode', v_row->>'questionCode'
        USING ERRCODE = '23503';
    END IF;

    INSERT INTO public.question_concepts (
      opposition_id, topic_id, question_id, concept_id, role, created_by
    ) VALUES (
      v_opposition_id, v_topic_id, v_question_id, v_concept_id, 'primary', v_user_id
    );

    FOR v_secondary_code IN
      SELECT value
      FROM jsonb_array_elements_text(COALESCE(v_row->'secondaryConceptCodes', '[]'::jsonb))
    LOOP
      SELECT concept.id
      INTO v_concept_id
      FROM public.concepts concept
      WHERE concept.opposition_id = v_opposition_id
        AND concept.topic_id = v_topic_id
        AND concept.code = btrim(v_secondary_code)
        AND concept.active IS TRUE;

      IF v_concept_id IS NULL THEN
        RAISE EXCEPTION 'Secondary concept % not found for question %',
          v_secondary_code, v_row->>'questionCode'
          USING ERRCODE = '23503';
      END IF;

      INSERT INTO public.question_concepts (
        opposition_id, topic_id, question_id, concept_id, role, created_by
      ) VALUES (
        v_opposition_id, v_topic_id, v_question_id, v_concept_id, 'secondary', v_user_id
      );
    END LOOP;
  END LOOP;

  -- Within each concept included in the package, the package is authoritative for
  -- active flashcards. Removed cards become inactive rather than being deleted so
  -- historical review evidence remains valid.
  UPDATE public.flashcards card
  SET active = FALSE,
      updated_at = now()
  WHERE card.opposition_id = v_opposition_id
    AND card.concept_id IN (
      SELECT concept.id
      FROM public.concepts concept
      JOIN jsonb_array_elements(p_package->'concepts') AS package_concept
        ON concept.code = btrim(package_concept->>'code')
      WHERE concept.opposition_id = v_opposition_id
        AND concept.topic_id = v_topic_id
    );

  FOR v_row IN SELECT value FROM jsonb_array_elements(p_package->'flashcards')
  LOOP
    SELECT concept.id
    INTO v_concept_id
    FROM public.concepts concept
    WHERE concept.opposition_id = v_opposition_id
      AND concept.topic_id = v_topic_id
      AND concept.code = btrim(v_row->>'conceptCode')
      AND concept.active IS TRUE;

    IF v_concept_id IS NULL THEN
      RAISE EXCEPTION 'Unknown concept % for flashcard %', v_row->>'conceptCode', v_row->>'code'
        USING ERRCODE = '23503';
    END IF;

    IF NULLIF(btrim(v_row->>'code'), '') IS NULL
       OR NULLIF(btrim(v_row->>'prompt'), '') IS NULL
       OR NULLIF(btrim(v_row->>'answer'), '') IS NULL THEN
      RAISE EXCEPTION 'Every flashcard requires code, prompt and answer'
        USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.flashcards (
      opposition_id,
      concept_id,
      code,
      card_type,
      prompt,
      answer,
      position,
      source_refs,
      active,
      created_by,
      updated_at
    ) VALUES (
      v_opposition_id,
      v_concept_id,
      btrim(v_row->>'code'),
      COALESCE(NULLIF(btrim(v_row->>'type'), ''), 'direct'),
      v_row->>'prompt',
      v_row->>'answer',
      COALESCE((v_row->>'position')::integer, 0),
      COALESCE(v_row->'sourceRefs', '[]'::jsonb),
      TRUE,
      v_user_id,
      now()
    )
    ON CONFLICT (opposition_id, code) DO UPDATE SET
      concept_id = EXCLUDED.concept_id,
      card_type = EXCLUDED.card_type,
      prompt = EXCLUDED.prompt,
      answer = EXCLUDED.answer,
      position = EXCLUDED.position,
      source_refs = EXCLUDED.source_refs,
      active = TRUE,
      updated_at = now();
  END LOOP;

  INSERT INTO public.study_content_imports (
    opposition_id,
    topic_id,
    contract_version,
    source_revision,
    unit_count,
    concept_count,
    question_mapping_count,
    flashcard_count,
    imported_by
  ) VALUES (
    v_opposition_id,
    v_topic_id,
    p_package->>'version',
    NULLIF(p_package->>'sourceRevision', ''),
    v_unit_count,
    v_concept_count,
    v_mapping_count,
    v_flashcard_count,
    v_user_id
  )
  RETURNING id INTO v_import_id;

  RETURN jsonb_build_object(
    'importId', v_import_id,
    'oppositionCode', v_opposition_code,
    'topicNumber', v_topic_number,
    'units', v_unit_count,
    'concepts', v_concept_count,
    'questionMappings', v_mapping_count,
    'flashcards', v_flashcard_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.import_v4_study_content(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_v4_study_content(jsonb) TO authenticated, service_role;

COMMENT ON FUNCTION public.import_v4_study_content(jsonb) IS
  'Atomically imports an already validated V4 portable topic package for the authenticated administrator of the active opposition. Stable codes are upserted; listed question mappings are replaced; removed cards inside included concepts are deactivated.';
