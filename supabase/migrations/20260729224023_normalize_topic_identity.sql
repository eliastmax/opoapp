-- Merge duplicate topic records created by legacy "materia" labels and make
-- topic identity independent from those presentation labels during imports.
-- Question ids, codes, answers, statistics and test history are preserved.

DROP TABLE IF EXISTS pg_temp._subtopic_merge_map;
DROP TABLE IF EXISTS pg_temp._topic_merge_map;

CREATE TEMP TABLE _topic_merge_map (
  source_topic_id uuid PRIMARY KEY,
  target_topic_id uuid NOT NULL,
  user_id uuid NOT NULL,
  target_subject_id uuid NOT NULL
);

WITH ranked_topics AS (
  SELECT
    topic.id,
    topic.user_id,
    topic.numero,
    lower(regexp_replace(btrim(topic.nombre), '\s+', ' ', 'g')) AS topic_key,
    first_value(topic.id) OVER topic_group AS target_topic_id,
    first_value(topic.subject_id) OVER topic_group AS target_subject_id
  FROM public.topics AS topic
  JOIN public.subjects AS subject
    ON subject.user_id = topic.user_id
   AND subject.id = topic.subject_id
  WINDOW topic_group AS (
    PARTITION BY
      topic.user_id,
      topic.numero,
      lower(regexp_replace(btrim(topic.nombre), '\s+', ' ', 'g'))
    ORDER BY
      CASE
        WHEN topic.numero = 19
          AND subject.nombre = 'Ley 39/2015 — Procedimiento administrativo común'
          THEN 0
        WHEN topic.numero IN (20, 21)
          AND subject.nombre = 'Ley 40/2015 — Régimen jurídico del sector público'
          THEN 0
        ELSE 1
      END,
      topic.created_at,
      topic.id
  )
)
INSERT INTO _topic_merge_map (
  source_topic_id,
  target_topic_id,
  user_id,
  target_subject_id
)
SELECT
  ranked.id,
  ranked.target_topic_id,
  ranked.user_id,
  ranked.target_subject_id
FROM ranked_topics AS ranked
WHERE ranked.id <> ranked.target_topic_id;

CREATE TEMP TABLE _subtopic_merge_map (
  source_subtopic_id uuid PRIMARY KEY,
  target_subtopic_id uuid NOT NULL
);

INSERT INTO _subtopic_merge_map (source_subtopic_id, target_subtopic_id)
SELECT
  source_subtopic.id,
  target_subtopic.id
FROM _topic_merge_map AS topic_map
JOIN public.subtopics AS source_subtopic
  ON source_subtopic.user_id = topic_map.user_id
 AND source_subtopic.topic_id = topic_map.source_topic_id
JOIN public.subtopics AS target_subtopic
  ON target_subtopic.user_id = topic_map.user_id
 AND target_subtopic.topic_id = topic_map.target_topic_id
 AND lower(regexp_replace(btrim(target_subtopic.nombre), '\s+', ' ', 'g'))
     = lower(regexp_replace(btrim(source_subtopic.nombre), '\s+', ' ', 'g'));

UPDATE public.questions AS question
SET subtopic_id = subtopic_map.target_subtopic_id
FROM _subtopic_merge_map AS subtopic_map
WHERE question.subtopic_id = subtopic_map.source_subtopic_id;

DELETE FROM public.subtopics AS subtopic
USING _subtopic_merge_map AS subtopic_map
WHERE subtopic.id = subtopic_map.source_subtopic_id;

UPDATE public.subtopics AS subtopic
SET topic_id = topic_map.target_topic_id
FROM _topic_merge_map AS topic_map
WHERE subtopic.user_id = topic_map.user_id
  AND subtopic.topic_id = topic_map.source_topic_id;

UPDATE public.questions AS question
SET
  subject_id = topic_map.target_subject_id,
  topic_id = topic_map.target_topic_id
FROM _topic_merge_map AS topic_map
WHERE question.user_id = topic_map.user_id
  AND question.topic_id = topic_map.source_topic_id;

DELETE FROM public.topics AS topic
USING _topic_merge_map AS topic_map
WHERE topic.id = topic_map.source_topic_id;

DROP TABLE pg_temp._subtopic_merge_map;
DROP TABLE pg_temp._topic_merge_map;

-- Remove legacy subject rows that became empty after the topic merge.
DELETE FROM public.subjects AS subject
WHERE subject.nombre IN (
    'Ley 39/2015, de 1 de octubre, del Procedimiento Administrativo Común de las Administraciones Públicas',
    'Régimen jurídico del sector público'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.topics AS topic
    WHERE topic.user_id = subject.user_id
      AND topic.subject_id = subject.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.questions AS question
    WHERE question.user_id = subject.user_id
      AND question.subject_id = subject.id
  );

-- If an account only had the legacy label, keep the same subject id and rename
-- it. The NOT EXISTS guard preserves the per-user unique subject constraint.
UPDATE public.subjects AS subject
SET nombre = 'Ley 39/2015 — Procedimiento administrativo común'
WHERE subject.nombre =
      'Ley 39/2015, de 1 de octubre, del Procedimiento Administrativo Común de las Administraciones Públicas'
  AND EXISTS (
    SELECT 1
    FROM public.topics AS topic
    WHERE topic.user_id = subject.user_id
      AND topic.subject_id = subject.id
      AND topic.numero = 19
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.subjects AS canonical
    WHERE canonical.user_id = subject.user_id
      AND canonical.nombre = 'Ley 39/2015 — Procedimiento administrativo común'
  );

UPDATE public.subjects AS subject
SET nombre = 'Ley 40/2015 — Régimen jurídico del sector público'
WHERE subject.nombre = 'Régimen jurídico del sector público'
  AND EXISTS (
    SELECT 1
    FROM public.topics AS topic
    WHERE topic.user_id = subject.user_id
      AND topic.subject_id = subject.id
      AND topic.numero IN (20, 21)
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.subjects AS canonical
    WHERE canonical.user_id = subject.user_id
      AND canonical.nombre = 'Ley 40/2015 — Régimen jurídico del sector público'
  );

-- The current V2 model is one opposition catalog per account. Within that
-- catalog, a topic is identified by number plus normalized title, not by a
-- mutable "materia" label.
CREATE UNIQUE INDEX topics_user_number_normalized_name_key
  ON public.topics (
    user_id,
    numero,
    lower(regexp_replace(btrim(nombre), '\s+', ' ', 'g'))
  );

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

  SELECT (elem->>'codigo') INTO v_dup
  FROM jsonb_array_elements(payload) AS elem
  WHERE NULLIF(btrim(elem->>'codigo'),'') IS NOT NULL
  GROUP BY (elem->>'codigo')
  HAVING count(*) > 1
  LIMIT 1;
  IF v_dup IS NOT NULL THEN
    RAISE EXCEPTION 'Duplicate code in payload: %', v_dup;
  END IF;

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

  FOR row_data IN SELECT * FROM jsonb_array_elements(payload)
  LOOP
    v_codigo := NULLIF(btrim(row_data->>'codigo'),'');
    v_materia := NULLIF(btrim(row_data->>'materia'),'');
    v_numero_tema := (row_data->>'numero_tema')::int;
    v_tema := NULLIF(btrim(row_data->>'tema'),'');
    v_subap := NULLIF(btrim(row_data->>'subapartado'),'');

    v_materia := CASE
      WHEN v_numero_tema = 19
        AND v_materia IN (
          'Ley 39/2015 — Procedimiento administrativo común',
          'Ley 39/2015, de 1 de octubre, del Procedimiento Administrativo Común de las Administraciones Públicas'
        )
        THEN 'Ley 39/2015 — Procedimiento administrativo común'
      WHEN v_numero_tema IN (20, 21)
        AND v_materia IN (
          'Ley 40/2015 — Régimen jurídico del sector público',
          'Régimen jurídico del sector público'
        )
        THEN 'Ley 40/2015 — Régimen jurídico del sector público'
      ELSE v_materia
    END;

    v_dif_examen := NULLIF(row_data->>'dificultad_examen','')::public.dificultad_enum;
    v_dif_concep := NULLIF(row_data->>'dificultad_conceptual','')::public.dificultad_enum;
    v_dif_legacy := COALESCE(v_dif_examen, NULLIF(row_data->>'dificultad','')::public.dificultad_enum);
    IF v_dif_legacy IS NULL THEN
      RAISE EXCEPTION 'Row % missing dificultad', v_codigo;
    END IF;

    v_pi := NULLIF(btrim(row_data->>'pagina_inicio'),'')::int;
    v_pf := NULLIF(btrim(row_data->>'pagina_fin'),'')::int;

    SELECT * INTO v_existing
    FROM public.questions
    WHERE user_id = uid
      AND codigo = v_codigo;

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

      UPDATE public.questions SET
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
      v_topic_id := NULL;
      v_subject_id := NULL;

      SELECT topic.id, topic.subject_id
      INTO v_topic_id, v_subject_id
      FROM public.topics AS topic
      WHERE topic.user_id = uid
        AND topic.numero = v_numero_tema
        AND lower(regexp_replace(btrim(topic.nombre), '\s+', ' ', 'g'))
            = lower(regexp_replace(btrim(v_tema), '\s+', ' ', 'g'))
      ORDER BY topic.created_at, topic.id
      LIMIT 1;

      IF v_topic_id IS NULL THEN
        SELECT subject.id INTO v_subject_id
        FROM public.subjects AS subject
        WHERE subject.user_id = uid
          AND subject.nombre = v_materia;

        IF v_subject_id IS NULL THEN
          INSERT INTO public.subjects (user_id, nombre)
          VALUES (uid, v_materia)
          RETURNING id INTO v_subject_id;
        END IF;

        INSERT INTO public.topics (user_id, subject_id, numero, nombre)
        VALUES (uid, v_subject_id, v_numero_tema, v_tema)
        RETURNING id INTO v_topic_id;
      END IF;

      v_subtopic_id := NULL;
      IF v_subap IS NOT NULL THEN
        SELECT subtopic.id INTO v_subtopic_id
        FROM public.subtopics AS subtopic
        WHERE subtopic.user_id = uid
          AND subtopic.topic_id = v_topic_id
          AND subtopic.nombre = v_subap;

        IF v_subtopic_id IS NULL THEN
          INSERT INTO public.subtopics (user_id, topic_id, nombre)
          VALUES (uid, v_topic_id, v_subap)
          RETURNING id INTO v_subtopic_id;
        END IF;
      END IF;

      INSERT INTO public.questions (
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

DO $validation$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.topics AS topic
    GROUP BY
      topic.user_id,
      topic.numero,
      lower(regexp_replace(btrim(topic.nombre), '\s+', ' ', 'g'))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Topic normalization left duplicate topic identities';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.questions AS question
    JOIN public.topics AS topic
      ON topic.user_id = question.user_id
     AND topic.id = question.topic_id
    WHERE question.subject_id <> topic.subject_id
  ) THEN
    RAISE EXCEPTION 'Topic normalization left question/subject mismatches';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.questions AS question
    JOIN public.subtopics AS subtopic
      ON subtopic.user_id = question.user_id
     AND subtopic.id = question.subtopic_id
    WHERE question.subtopic_id IS NOT NULL
      AND question.topic_id <> subtopic.topic_id
  ) THEN
    RAISE EXCEPTION 'Topic normalization left question/subtopic mismatches';
  END IF;
END;
$validation$;
