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
  v_pregunta text;
  v_oa text; v_ob text; v_oc text; v_od text;
  v_resp text;
  v_pi_txt text; v_pf_txt text;
  v_pi int; v_pf int;
  v_existing questions%ROWTYPE;
  v_dif_examen public.dificultad_enum;
  v_dif_concep public.dificultad_enum;
  v_dif_legacy public.dificultad_enum;
  v_dup text;
  v_affected int;
  v_row_idx int := 0;
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

  -- Set-based duplicate code detection within the payload
  SELECT (elem->>'codigo') INTO v_dup
  FROM jsonb_array_elements(payload) AS elem
  WHERE NULLIF(btrim(elem->>'codigo'),'') IS NOT NULL
  GROUP BY (elem->>'codigo')
  HAVING count(*) > 1
  LIMIT 1;
  IF v_dup IS NOT NULL THEN
    RAISE EXCEPTION 'Duplicate code in payload: %', v_dup;
  END IF;

  -- Set-based required-field / catalog validation
  FOR row_data IN SELECT * FROM jsonb_array_elements(payload)
  LOOP
    v_row_idx := v_row_idx + 1;
    IF jsonb_typeof(row_data) <> 'object' THEN
      RAISE EXCEPTION 'Payload item % is not an object', v_row_idx;
    END IF;

    v_codigo   := NULLIF(btrim(row_data->>'codigo'),'');
    v_materia  := NULLIF(btrim(row_data->>'materia'),'');
    v_tema     := NULLIF(btrim(row_data->>'tema'),'');
    v_pregunta := NULLIF(btrim(row_data->>'pregunta'),'');
    v_oa := NULLIF(btrim(row_data->>'opcion_a'),'');
    v_ob := NULLIF(btrim(row_data->>'opcion_b'),'');
    v_oc := NULLIF(btrim(row_data->>'opcion_c'),'');
    v_od := NULLIF(btrim(row_data->>'opcion_d'),'');
    v_resp := NULLIF(btrim(row_data->>'respuesta_correcta'),'');

    IF v_codigo IS NULL OR v_materia IS NULL OR v_tema IS NULL OR v_pregunta IS NULL
       OR v_oa IS NULL OR v_ob IS NULL OR v_oc IS NULL OR v_od IS NULL OR v_resp IS NULL THEN
      RAISE EXCEPTION 'Row % missing required fields (codigo/materia/tema/pregunta/opciones/respuesta)', COALESCE(v_codigo, v_row_idx::text);
    END IF;

    IF v_resp NOT IN ('A','B','C','D') THEN
      RAISE EXCEPTION 'Row %: respuesta_correcta must be A-D (got %)', v_codigo, v_resp;
    END IF;

    IF lower(v_oa) = lower(v_ob) OR lower(v_oa) = lower(v_oc) OR lower(v_oa) = lower(v_od)
       OR lower(v_ob) = lower(v_oc) OR lower(v_ob) = lower(v_od) OR lower(v_oc) = lower(v_od) THEN
      RAISE EXCEPTION 'Row %: four options must be distinct', v_codigo;
    END IF;

    IF (row_data->>'numero_tema') IS NULL OR (row_data->>'numero_tema') !~ '^[0-9]+$' THEN
      RAISE EXCEPTION 'Row %: numero_tema must be a non-negative integer', v_codigo;
    END IF;

    v_pi_txt := NULLIF(btrim(row_data->>'pagina_inicio'),'');
    v_pf_txt := NULLIF(btrim(row_data->>'pagina_fin'),'');
    IF v_pi_txt IS NOT NULL AND v_pi_txt !~ '^-?[0-9]+$' THEN
      RAISE EXCEPTION 'Row %: pagina_inicio must be integer or empty', v_codigo;
    END IF;
    IF v_pf_txt IS NOT NULL AND v_pf_txt !~ '^-?[0-9]+$' THEN
      RAISE EXCEPTION 'Row %: pagina_fin must be integer or empty', v_codigo;
    END IF;
    IF v_pi_txt IS NOT NULL AND v_pf_txt IS NOT NULL AND v_pf_txt::int < v_pi_txt::int THEN
      RAISE EXCEPTION 'Row %: pagina_fin cannot be less than pagina_inicio', v_codigo;
    END IF;
  END LOOP;

  -- Second pass: apply changes
  FOR row_data IN SELECT * FROM jsonb_array_elements(payload)
  LOOP
    v_codigo := row_data->>'codigo';
    v_materia := row_data->>'materia';
    v_numero_tema := (row_data->>'numero_tema')::int;
    v_tema := row_data->>'tema';
    v_subap := NULLIF(row_data->>'subapartado','');

    v_dif_examen := NULLIF(row_data->>'dificultad_examen','')::public.dificultad_enum;
    v_dif_concep := NULLIF(row_data->>'dificultad_conceptual','')::public.dificultad_enum;
    v_dif_legacy := COALESCE(v_dif_examen, NULLIF(row_data->>'dificultad','')::public.dificultad_enum);
    IF v_dif_legacy IS NULL THEN
      RAISE EXCEPTION 'Row % missing dificultad', v_codigo;
    END IF;

    v_pi := NULLIF(btrim(row_data->>'pagina_inicio'),'')::int;
    v_pf := NULLIF(btrim(row_data->>'pagina_fin'),'')::int;

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

      -- Enrich only when stored is NULL or blank-after-trim (text) / NULL (enum,int)
      -- AND the incoming value is non-empty after trim (text) or non-null (enum,int).
      UPDATE questions SET
        concepto = CASE WHEN NULLIF(btrim(concepto),'') IS NULL AND NULLIF(btrim(row_data->>'concepto'),'') IS NOT NULL
                        THEN NULLIF(btrim(row_data->>'concepto'),'') ELSE concepto END,
        objetivo_aprendizaje = CASE WHEN NULLIF(btrim(objetivo_aprendizaje),'') IS NULL AND NULLIF(btrim(row_data->>'objetivo_aprendizaje'),'') IS NOT NULL
                        THEN NULLIF(btrim(row_data->>'objetivo_aprendizaje'),'') ELSE objetivo_aprendizaje END,
        apartado = CASE WHEN NULLIF(btrim(apartado),'') IS NULL AND NULLIF(btrim(row_data->>'apartado'),'') IS NOT NULL
                        THEN NULLIF(btrim(row_data->>'apartado'),'') ELSE apartado END,
        perspectiva = CASE WHEN NULLIF(btrim(perspectiva),'') IS NULL AND NULLIF(btrim(row_data->>'perspectiva'),'') IS NOT NULL
                        THEN NULLIF(btrim(row_data->>'perspectiva'),'') ELSE perspectiva END,
        nivel_pedagogico = CASE WHEN NULLIF(btrim(nivel_pedagogico),'') IS NULL AND NULLIF(btrim(row_data->>'nivel_pedagogico'),'') IS NOT NULL
                        THEN NULLIF(btrim(row_data->>'nivel_pedagogico'),'') ELSE nivel_pedagogico END,
        tipo_trampa = CASE WHEN NULLIF(btrim(tipo_trampa),'') IS NULL AND NULLIF(btrim(row_data->>'tipo_trampa'),'') IS NOT NULL
                        THEN NULLIF(btrim(row_data->>'tipo_trampa'),'') ELSE tipo_trampa END,
        documento_referencia = CASE WHEN NULLIF(btrim(documento_referencia),'') IS NULL AND NULLIF(btrim(row_data->>'documento_referencia'),'') IS NOT NULL
                        THEN NULLIF(btrim(row_data->>'documento_referencia'),'') ELSE documento_referencia END,
        frecuencia_historica = CASE WHEN NULLIF(btrim(frecuencia_historica),'') IS NULL AND NULLIF(btrim(row_data->>'frecuencia_historica'),'') IS NOT NULL
                        THEN NULLIF(btrim(row_data->>'frecuencia_historica'),'') ELSE frecuencia_historica END,
        referencia_fuente = CASE WHEN NULLIF(btrim(referencia_fuente),'') IS NULL AND NULLIF(btrim(row_data->>'referencia_fuente'),'') IS NOT NULL
                        THEN NULLIF(btrim(row_data->>'referencia_fuente'),'') ELSE referencia_fuente END,
        dificultad_conceptual = CASE WHEN dificultad_conceptual IS NULL AND v_dif_concep IS NOT NULL
                        THEN v_dif_concep ELSE dificultad_conceptual END,
        dificultad_examen = CASE WHEN dificultad_examen IS NULL AND v_dif_examen IS NOT NULL
                        THEN v_dif_examen ELSE dificultad_examen END,
        pagina_inicio = CASE WHEN pagina_inicio IS NULL AND v_pi IS NOT NULL
                        THEN v_pi ELSE pagina_inicio END,
        pagina_fin = CASE WHEN pagina_fin IS NULL AND v_pf IS NOT NULL
                        THEN v_pf ELSE pagina_fin END
      WHERE id = v_existing.id
        AND (
             (NULLIF(btrim(v_existing.concepto),'') IS NULL AND NULLIF(btrim(row_data->>'concepto'),'') IS NOT NULL)
          OR (NULLIF(btrim(v_existing.objetivo_aprendizaje),'') IS NULL AND NULLIF(btrim(row_data->>'objetivo_aprendizaje'),'') IS NOT NULL)
          OR (NULLIF(btrim(v_existing.apartado),'') IS NULL AND NULLIF(btrim(row_data->>'apartado'),'') IS NOT NULL)
          OR (NULLIF(btrim(v_existing.perspectiva),'') IS NULL AND NULLIF(btrim(row_data->>'perspectiva'),'') IS NOT NULL)
          OR (NULLIF(btrim(v_existing.nivel_pedagogico),'') IS NULL AND NULLIF(btrim(row_data->>'nivel_pedagogico'),'') IS NOT NULL)
          OR (NULLIF(btrim(v_existing.tipo_trampa),'') IS NULL AND NULLIF(btrim(row_data->>'tipo_trampa'),'') IS NOT NULL)
          OR (NULLIF(btrim(v_existing.documento_referencia),'') IS NULL AND NULLIF(btrim(row_data->>'documento_referencia'),'') IS NOT NULL)
          OR (NULLIF(btrim(v_existing.frecuencia_historica),'') IS NULL AND NULLIF(btrim(row_data->>'frecuencia_historica'),'') IS NOT NULL)
          OR (NULLIF(btrim(v_existing.referencia_fuente),'') IS NULL AND NULLIF(btrim(row_data->>'referencia_fuente'),'') IS NOT NULL)
          OR (v_existing.dificultad_conceptual IS NULL AND v_dif_concep IS NOT NULL)
          OR (v_existing.dificultad_examen IS NULL AND v_dif_examen IS NOT NULL)
          OR (v_existing.pagina_inicio IS NULL AND v_pi IS NOT NULL)
          OR (v_existing.pagina_fin IS NULL AND v_pf IS NOT NULL)
        );
      GET DIAGNOSTICS v_affected = ROW_COUNT;
      IF v_affected > 0 THEN
        enriched_n := enriched_n + 1;
      ELSE
        omitted_n := omitted_n + 1;
      END IF;
    ELSE
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
        NULLIF(btrim(row_data->>'concepto'),''), NULLIF(btrim(row_data->>'objetivo_aprendizaje'),''),
        NULLIF(btrim(row_data->>'apartado'),''), NULLIF(btrim(row_data->>'perspectiva'),''),
        NULLIF(btrim(row_data->>'nivel_pedagogico'),''), NULLIF(btrim(row_data->>'tipo_trampa'),''),
        row_data->>'pregunta', row_data->>'opcion_a', row_data->>'opcion_b',
        row_data->>'opcion_c', row_data->>'opcion_d',
        (row_data->>'respuesta_correcta')::public.respuesta_enum,
        COALESCE(row_data->>'explicacion',''),
        NULLIF(btrim(row_data->>'documento_referencia'),''),
        v_pi, v_pf,
        COALESCE(row_data->>'referencia_fuente',''),
        NULLIF(btrim(row_data->>'frecuencia_historica'),'')
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