-- Read-only health report for the complete V2.5 question bank.
--
-- The current provisional model stores one catalog per owner. Until the V3
-- shared catalog migration exists, the audit selects the owner with the
-- largest question bank. It does not create, update or delete data.

WITH audited_owner AS (
  SELECT question.user_id
  FROM public.questions AS question
  GROUP BY question.user_id
  ORDER BY count(*) DESC, question.user_id
  LIMIT 1
),
topic_health AS (
  SELECT
    topic.numero,
    topic.nombre AS tema,
    count(question.id)::integer AS total,
    count(*) FILTER (
      WHERE question.nivel_pedagogico = 'aprendizaje'
    )::integer AS aprendizaje,
    count(*) FILTER (
      WHERE question.nivel_pedagogico = 'consolidacion'
    )::integer AS consolidacion,
    count(*) FILTER (
      WHERE question.nivel_pedagogico = 'tribunal'
    )::integer AS tribunal,
    count(*) FILTER (WHERE question.activa IS FALSE)::integer AS inactivas,
    count(*) FILTER (
      WHERE NULLIF(btrim(question.concepto), '') IS NULL
    )::integer AS sin_concepto,
    count(*) FILTER (
      WHERE NULLIF(btrim(question.perspectiva), '') IS NULL
    )::integer AS sin_perspectiva,
    count(*) FILTER (
      WHERE NULLIF(btrim(question.referencia_fuente), '') IS NULL
    )::integer AS sin_referencia
  FROM public.topics AS topic
  JOIN audited_owner
    ON audited_owner.user_id = topic.user_id
  LEFT JOIN public.questions AS question
    ON question.user_id = topic.user_id
   AND question.topic_id = topic.id
  GROUP BY topic.numero, topic.nombre
),
duplicate_codes AS (
  SELECT question.codigo
  FROM public.questions AS question
  JOIN audited_owner
    ON audited_owner.user_id = question.user_id
  GROUP BY question.codigo
  HAVING count(*) > 1
),
duplicate_stems AS (
  SELECT
    lower(
      regexp_replace(btrim(question.pregunta), '\s+', ' ', 'g')
    ) AS normalized_stem
  FROM public.questions AS question
  JOIN audited_owner
    ON audited_owner.user_id = question.user_id
  GROUP BY normalized_stem
  HAVING count(*) > 1
),
invalid_options AS (
  SELECT question.id
  FROM public.questions AS question
  JOIN audited_owner
    ON audited_owner.user_id = question.user_id
  WHERE lower(btrim(question.opcion_a)) IN (
      lower(btrim(question.opcion_b)),
      lower(btrim(question.opcion_c)),
      lower(btrim(question.opcion_d))
    )
     OR lower(btrim(question.opcion_b)) IN (
      lower(btrim(question.opcion_c)),
      lower(btrim(question.opcion_d))
    )
     OR lower(btrim(question.opcion_c)) = lower(btrim(question.opcion_d))
),
answer_distribution AS (
  SELECT
    question.respuesta_correcta::text AS answer,
    count(*)::integer AS total
  FROM public.questions AS question
  JOIN audited_owner
    ON audited_owner.user_id = question.user_id
  GROUP BY question.respuesta_correcta
)
SELECT jsonb_build_object(
  'owner', (SELECT user_id FROM audited_owner),
  'summary', jsonb_build_object(
    'topics', (SELECT count(*) FROM topic_health),
    'questions', (SELECT sum(total) FROM topic_health),
    'aprendizaje', (SELECT sum(aprendizaje) FROM topic_health),
    'consolidacion', (SELECT sum(consolidacion) FROM topic_health),
    'tribunal', (SELECT sum(tribunal) FROM topic_health),
    'inactive', (SELECT sum(inactivas) FROM topic_health),
    'without_concept', (SELECT sum(sin_concepto) FROM topic_health),
    'without_perspective', (SELECT sum(sin_perspectiva) FROM topic_health),
    'without_reference', (SELECT sum(sin_referencia) FROM topic_health),
    'duplicate_codes', (SELECT count(*) FROM duplicate_codes),
    'duplicate_stems', (SELECT count(*) FROM duplicate_stems),
    'equal_options', (SELECT count(*) FROM invalid_options),
    'answer_distribution', (
      SELECT jsonb_object_agg(answer, total ORDER BY answer)
      FROM answer_distribution
    )
  ),
  'topics', (
    SELECT jsonb_agg(to_jsonb(topic_health) ORDER BY numero)
    FROM topic_health
  )
) AS bank_health;
