
-- 1. Columnas aditivas (todas NULL)
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS apartado text,
  ADD COLUMN IF NOT EXISTS perspectiva text,
  ADD COLUMN IF NOT EXISTS nivel_pedagogico text,
  ADD COLUMN IF NOT EXISTS dificultad_conceptual public.dificultad_enum,
  ADD COLUMN IF NOT EXISTS dificultad_examen public.dificultad_enum,
  ADD COLUMN IF NOT EXISTS tipo_trampa text,
  ADD COLUMN IF NOT EXISTS documento_referencia text,
  ADD COLUMN IF NOT EXISTS pagina_inicio integer,
  ADD COLUMN IF NOT EXISTS pagina_fin integer,
  ADD COLUMN IF NOT EXISTS frecuencia_historica text;

-- 2. Catálogos anulables
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='questions_nivel_pedagogico_check') THEN
    ALTER TABLE public.questions ADD CONSTRAINT questions_nivel_pedagogico_check
      CHECK (nivel_pedagogico IS NULL OR nivel_pedagogico IN ('aprendizaje','consolidacion','tribunal'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='questions_perspectiva_check') THEN
    ALTER TABLE public.questions ADD CONSTRAINT questions_perspectiva_check
      CHECK (perspectiva IS NULL OR perspectiva IN (
        'reconocimiento_directo','definicion','clasificacion','requisitos','excepcion',
        'diferenciacion','comparacion','relacion_normativa','cronologia','orden_temporal',
        'plazo','competencia','efectos','consecuencia_juridica','caso_practico',
        'afirmacion_correcta','afirmacion_incorrecta','aplicacion','error_frecuente',
        'combinacion_requisitos','cambio_condicion'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='questions_tipo_trampa_check') THEN
    ALTER TABLE public.questions ADD CONSTRAINT questions_tipo_trampa_check
      CHECK (tipo_trampa IS NULL OR tipo_trampa IN (
        'ninguna','concepto_proximo','excepcion','plazo','competencia','requisito',
        'omision','inversion','negacion','absolutismo','efecto','orden_temporal',
        'cambio_condicion','combinada'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='questions_frecuencia_historica_check') THEN
    ALTER TABLE public.questions ADD CONSTRAINT questions_frecuencia_historica_check
      CHECK (frecuencia_historica IS NULL OR frecuencia_historica IN ('alta','media','baja','no_determinada'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='questions_paginas_orden_check') THEN
    ALTER TABLE public.questions ADD CONSTRAINT questions_paginas_orden_check
      CHECK (pagina_inicio IS NULL OR pagina_fin IS NULL OR pagina_fin >= pagina_inicio);
  END IF;
END $$;

-- 3. Función de importación por lote (SECURITY INVOKER, respeta RLS)
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

    -- Subject
    SELECT id INTO v_subject_id FROM subjects WHERE user_id = uid AND nombre = v_materia;
    IF v_subject_id IS NULL THEN
      INSERT INTO subjects (user_id, nombre) VALUES (uid, v_materia) RETURNING id INTO v_subject_id;
    END IF;

    -- Topic
    SELECT id INTO v_topic_id FROM topics WHERE user_id = uid AND subject_id = v_subject_id AND numero = v_numero_tema;
    IF v_topic_id IS NULL THEN
      INSERT INTO topics (user_id, subject_id, numero, nombre) VALUES (uid, v_subject_id, v_numero_tema, v_tema) RETURNING id INTO v_topic_id;
    END IF;

    -- Subtopic
    v_subtopic_id := NULL;
    IF v_subap IS NOT NULL THEN
      SELECT id INTO v_subtopic_id FROM subtopics WHERE user_id = uid AND topic_id = v_topic_id AND nombre = v_subap;
      IF v_subtopic_id IS NULL THEN
        INSERT INTO subtopics (user_id, topic_id, nombre) VALUES (uid, v_topic_id, v_subap) RETURNING id INTO v_subtopic_id;
      END IF;
    END IF;

    -- Dificultades
    v_dif_examen := NULLIF(row_data->>'dificultad_examen','')::public.dificultad_enum;
    v_dif_concep := NULLIF(row_data->>'dificultad_conceptual','')::public.dificultad_enum;
    v_dif_legacy := COALESCE(v_dif_examen, NULLIF(row_data->>'dificultad','')::public.dificultad_enum);
    IF v_dif_legacy IS NULL THEN
      RAISE EXCEPTION 'Row % missing dificultad', v_codigo;
    END IF;

    -- Existing question with same code (per user)
    SELECT * INTO v_existing FROM questions WHERE user_id = uid AND codigo = v_codigo;
    IF FOUND THEN
      -- Must match exactly on core content, otherwise unexpected -> abort
      IF v_existing.pregunta <> (row_data->>'pregunta')
         OR v_existing.opcion_a <> (row_data->>'opcion_a')
         OR v_existing.opcion_b <> (row_data->>'opcion_b')
         OR v_existing.opcion_c <> (row_data->>'opcion_c')
         OR v_existing.opcion_d <> (row_data->>'opcion_d')
         OR v_existing.respuesta_correcta::text <> (row_data->>'respuesta_correcta')
         OR COALESCE(v_existing.explicacion,'') <> COALESCE(row_data->>'explicacion','') THEN
        RAISE EXCEPTION 'Conflict on code %: content differs', v_codigo;
      END IF;

      -- Enrich only null/empty fields
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
      WHERE id = v_existing.id;
      enriched_n := enriched_n + 1;
    ELSE
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
