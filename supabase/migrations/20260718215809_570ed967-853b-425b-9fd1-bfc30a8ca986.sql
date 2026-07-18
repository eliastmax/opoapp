CREATE OR REPLACE FUNCTION public.import_questions_batch(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  uid uuid := auth.uid();
  row_data jsonb;
  v_subject_id uuid;
  v_topic_id uuid;
  v_subtopic_id uuid;
  v_materia text;
  v_numero_tema int;
  v_tema text;
  v_subap text;
  v_codigo text;
  v_existing questions%ROWTYPE;
  v_dif_examen public.dificultad_enum;
  v_dif_concep public.dificultad_enum;
  v_dif_legacy public.dificultad_enum;
  v_seen_codes text[] := ARRAY[]::text[];
  v_affected int;
  inserted_n int := 0;
  enriched_n int := 0;
  omitted_n int := 0;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(payload) <> 'array' THEN
    RAISE EXCEPTION 'payload must be a JSON array';
  END IF;

  FOR row_data IN SELECT * FROM jsonb_array_elements(payload)
  LOOP
    v_codigo := row_data->>'codigo';
    v_materia := row_data->>'materia';
    v_numero_tema := (row_data->>'numero_tema')::int;
    v_tema := row_data->>'tema';
    v_subap := NULLIF(row_data->>'subapartado','');

    IF v_codigo IS NULL OR v_codigo = '' OR v_materia IS NULL OR v_tema IS NULL THEN
      RAISE EXCEPTION 'Row missing required fields (codigo/materia/tema)';
    END IF;

    -- Duplicate codes within payload → abort
    IF v_codigo = ANY(v_seen_codes) THEN
      RAISE EXCEPTION 'Duplicate code in payload: %', v_codigo;
    END IF;
    v_seen_codes := array_append(v_seen_codes, v_codigo);

    -- Dificultades
    v_dif_examen := NULLIF(row_data->>'dificultad_examen','')::public.dificultad_enum;
    v_dif_concep := NULLIF(row_data->>'dificultad_conceptual','')::public.dificultad_enum;
    v_dif_legacy := COALESCE(v_dif_examen, NULLIF(row_data->>'dificultad','')::public.dificultad_enum);
    IF v_dif_legacy IS NULL THEN
      RAISE EXCEPTION 'Row % missing dificultad', v_codigo;
    END IF;

    -- Existing question with same code (per user) → check content BEFORE touching hierarchy
    SELECT * INTO v_existing FROM questions WHERE user_id = uid AND codigo = v_codigo;
    IF FOUND THEN
      IF v_existing.pregunta <> (row_data->>'pregunta')
         OR v_existing.opcion_a <> (row_data->>'opcion_a')
         OR v_existing.opcion_b <> (row_data->>'opcion_b')
         OR v_existing.opcion_c <> (row_data->>'opcion_c')
         OR v_existing.opcion_d <> (row_data->>'opcion_d')
         OR v_existing.respuesta_correcta::text <> (row_data->>'respuesta_correcta')
         OR COALESCE(v_existing.explicacion,'') <> COALESCE(row_data->>'explicacion','') THEN
        RAISE EXCEPTION 'Conflict on code %: content differs', v_codigo;
      END IF;

      -- Enrich only null/empty fields; only count if a field actually changed.
      UPDATE questions SET
        concepto = COALESCE(concepto, NULLIF(row_data->>'concepto','')),
        objetivo_aprendizaje = COALESCE(objetivo_aprendizaje, NULLIF(row_data->>'objetivo_aprendizaje','')),
        apartado = COALESCE(apartado, NULLIF(row_data->>'apartado','')),
        perspectiva = COALESCE(perspectiva, NULLIF(row_data->>'perspectiva','')),
        nivel_pedagogico = COALESCE(nivel_pedagogico, NULLIF(row_data->>'nivel_pedagogico','')),
        dificultad_conceptual = COALESCE(dificultad_conceptual, v_dif_concep),
        dificultad_examen = COALESCE(dificultad_examen, v_dif_examen),
        tipo_trampa = COALESCE(tipo_trampa, NULLIF(row_data->>'tipo_trampa','')),
        documento_referencia = COALESCE(documento_referencia, NULLIF(row_data->>'documento_referencia','')),
        pagina_inicio = COALESCE(pagina_inicio, NULLIF(row_data->>'pagina_inicio','')::int),
        pagina_fin = COALESCE(pagina_fin, NULLIF(row_data->>'pagina_fin','')::int),
        frecuencia_historica = COALESCE(frecuencia_historica, NULLIF(row_data->>'frecuencia_historica','')),
        referencia_fuente = CASE WHEN COALESCE(referencia_fuente,'') = '' THEN COALESCE(row_data->>'referencia_fuente','') ELSE referencia_fuente END
      WHERE id = v_existing.id
        AND (
             (v_existing.concepto IS NULL AND NULLIF(row_data->>'concepto','') IS NOT NULL)
          OR (v_existing.objetivo_aprendizaje IS NULL AND NULLIF(row_data->>'objetivo_aprendizaje','') IS NOT NULL)
          OR (v_existing.apartado IS NULL AND NULLIF(row_data->>'apartado','') IS NOT NULL)
          OR (v_existing.perspectiva IS NULL AND NULLIF(row_data->>'perspectiva','') IS NOT NULL)
          OR (v_existing.nivel_pedagogico IS NULL AND NULLIF(row_data->>'nivel_pedagogico','') IS NOT NULL)
          OR (v_existing.dificultad_conceptual IS NULL AND v_dif_concep IS NOT NULL)
          OR (v_existing.dificultad_examen IS NULL AND v_dif_examen IS NOT NULL)
          OR (v_existing.tipo_trampa IS NULL AND NULLIF(row_data->>'tipo_trampa','') IS NOT NULL)
          OR (v_existing.documento_referencia IS NULL AND NULLIF(row_data->>'documento_referencia','') IS NOT NULL)
          OR (v_existing.pagina_inicio IS NULL AND NULLIF(row_data->>'pagina_inicio','') IS NOT NULL)
          OR (v_existing.pagina_fin IS NULL AND NULLIF(row_data->>'pagina_fin','') IS NOT NULL)
          OR (v_existing.frecuencia_historica IS NULL AND NULLIF(row_data->>'frecuencia_historica','') IS NOT NULL)
          OR (COALESCE(v_existing.referencia_fuente,'') = '' AND COALESCE(row_data->>'referencia_fuente','') <> '')
        );
      GET DIAGNOSTICS v_affected = ROW_COUNT;
      IF v_affected > 0 THEN
        enriched_n := enriched_n + 1;
      ELSE
        omitted_n := omitted_n + 1;
      END IF;
    ELSE
      -- New row → ensure hierarchy exists
      SELECT id INTO v_subject_id FROM subjects WHERE user_id = uid AND nombre = v_materia;
      IF v_subject_id IS NULL THEN
        INSERT INTO subjects (user_id, nombre) VALUES (uid, v_materia) RETURNING id INTO v_subject_id;
      END IF;

      SELECT id INTO v_topic_id FROM topics WHERE user_id = uid AND subject_id = v_subject_id AND numero = v_numero_tema;
      IF v_topic_id IS NULL THEN
        INSERT INTO topics (user_id, subject_id, numero, nombre) VALUES (uid, v_subject_id, v_numero_tema, v_tema) RETURNING id INTO v_topic_id;
      END IF;

      v_subtopic_id := NULL;
      IF v_subap IS NOT NULL THEN
        SELECT id INTO v_subtopic_id FROM subtopics WHERE user_id = uid AND topic_id = v_topic_id AND nombre = v_subap;
        IF v_subtopic_id IS NULL THEN
          INSERT INTO subtopics (user_id, topic_id, nombre) VALUES (uid, v_topic_id, v_subap) RETURNING id INTO v_subtopic_id;
        END IF;
      END IF;

      INSERT INTO questions (
        user_id, codigo, subject_id, topic_id, subtopic_id,
        dificultad, dificultad_conceptual, dificultad_examen,
        concepto, objetivo_aprendizaje, apartado, perspectiva, nivel_pedagogico, tipo_trampa,
        pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta,
        explicacion, documento_referencia, pagina_inicio, pagina_fin,
        referencia_fuente, frecuencia_historica
      ) VALUES (
        uid, v_codigo, v_subject_id, v_topic_id, v_subtopic_id,
        v_dif_legacy, v_dif_concep, v_dif_examen,
        NULLIF(row_data->>'concepto',''), NULLIF(row_data->>'objetivo_aprendizaje',''),
        NULLIF(row_data->>'apartado',''), NULLIF(row_data->>'perspectiva',''),
        NULLIF(row_data->>'nivel_pedagogico',''), NULLIF(row_data->>'tipo_trampa',''),
        row_data->>'pregunta', row_data->>'opcion_a', row_data->>'opcion_b',
        row_data->>'opcion_c', row_data->>'opcion_d',
        (row_data->>'respuesta_correcta')::public.respuesta_enum,
        COALESCE(row_data->>'explicacion',''),
        NULLIF(row_data->>'documento_referencia',''),
        NULLIF(row_data->>'pagina_inicio','')::int,
        NULLIF(row_data->>'pagina_fin','')::int,
        COALESCE(row_data->>'referencia_fuente',''),
        NULLIF(row_data->>'frecuencia_historica','')
      );
      inserted_n := inserted_n + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('inserted', inserted_n, 'enriched', enriched_n, 'omitted', omitted_n);
END;
$fn$;

REVOKE ALL ON FUNCTION public.import_questions_batch(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.import_questions_batch(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.import_questions_batch(jsonb) TO authenticated;