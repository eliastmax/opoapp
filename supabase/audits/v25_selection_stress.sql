-- Transactional production smoke test for the V2.5 selection engines.
--
-- It selects the owner with the largest bank, simulates the authenticated
-- context, creates 132 temporary tests and validates their composition. The
-- final ROLLBACK guarantees that no test, answer, trace or statistic remains.
--
-- Run the whole file as one request. Do not remove BEGIN or ROLLBACK.

BEGIN;

SELECT set_config(
  'request.jwt.claim.sub',
  (
    SELECT question.user_id::text
    FROM public.questions AS question
    GROUP BY question.user_id
    ORDER BY count(*) DESC, question.user_id
    LIMIT 1
  ),
  true
);

CREATE TEMP TABLE _v25_stress_runs (
  kind text NOT NULL,
  test_id uuid NOT NULL,
  requested integer NOT NULL,
  selected integer NOT NULL,
  expected_topics integer,
  selected_topics integer
) ON COMMIT DROP;

DO $stress$
DECLARE
  current_topic record;
  current_stage text;
  level_result record;
  multi_result record;
  simulation_result record;
  recommended_result record;
  all_topic_ids uuid[];
  iteration integer;
BEGIN
  FOR current_topic IN
    SELECT topic.id, topic.numero
    FROM public.topics AS topic
    WHERE topic.user_id = auth.uid()
    ORDER BY topic.numero
  LOOP
    FOREACH current_stage IN ARRAY ARRAY[
      'aprendizaje',
      'consolidacion',
      'tribunal'
    ]
    LOOP
      SELECT *
      INTO level_result
      FROM public.create_level_test(
        current_topic.id,
        current_stage,
        20,
        true,
        NULL,
        ARRAY[
          'facil',
          'medio',
          'dificil'
        ]::public.dificultad_enum[]
      );

      INSERT INTO _v25_stress_runs (
        kind,
        test_id,
        requested,
        selected,
        expected_topics,
        selected_topics
      )
      SELECT
        'nivel_' || current_stage,
        level_result.test_id,
        20,
        level_result.selected_count,
        1,
        count(DISTINCT question.topic_id)::integer
      FROM public.test_answers AS answer
      JOIN public.questions AS question
        ON question.user_id = answer.user_id
       AND question.id = answer.question_id
      WHERE answer.user_id = auth.uid()
        AND answer.test_id = level_result.test_id;
    END LOOP;
  END LOOP;

  SELECT array_agg(topic.id ORDER BY topic.numero)
  INTO all_topic_ids
  FROM public.topics AS topic
  WHERE topic.user_id = auth.uid();

  FOREACH current_stage IN ARRAY ARRAY[
    'aprendizaje',
    'consolidacion',
    'tribunal'
  ]
  LOOP
    FOR iteration IN 1..10
    LOOP
      SELECT *
      INTO multi_result
      FROM public.create_multi_topic_test(
        all_topic_ids,
        current_stage,
        'mezcladas',
        24,
        true
      );

      INSERT INTO _v25_stress_runs (
        kind,
        test_id,
        requested,
        selected,
        expected_topics,
        selected_topics
      )
      VALUES (
        'multitema_' || current_stage,
        multi_result.test_id,
        24,
        multi_result.selected_count,
        24,
        multi_result.covered_topic_count
      );
    END LOOP;
  END LOOP;

  FOR iteration IN 1..10
  LOOP
    SELECT *
    INTO simulation_result
    FROM public.create_exam_simulation(100, 110);

    INSERT INTO _v25_stress_runs (
      kind,
      test_id,
      requested,
      selected,
      expected_topics,
      selected_topics
    )
    SELECT
      'simulacro',
      simulation_result.test_id,
      100,
      simulation_result.selected_count,
      24,
      count(DISTINCT question.topic_id)::integer
    FROM public.test_answers AS answer
    JOIN public.questions AS question
      ON question.user_id = answer.user_id
     AND question.id = answer.question_id
    WHERE answer.user_id = auth.uid()
      AND answer.test_id = simulation_result.test_id;
  END LOOP;

  FOR iteration IN 1..20
  LOOP
    SELECT *
    INTO recommended_result
    FROM public.create_recommended_test(20);

    INSERT INTO _v25_stress_runs (
      kind,
      test_id,
      requested,
      selected,
      expected_topics,
      selected_topics
    )
    SELECT
      'recomendada',
      recommended_result.test_id,
      20,
      recommended_result.selected_count,
      NULL,
      count(DISTINCT question.topic_id)::integer
    FROM public.test_answers AS answer
    JOIN public.questions AS question
      ON question.user_id = answer.user_id
     AND question.id = answer.question_id
    WHERE answer.user_id = auth.uid()
      AND answer.test_id = recommended_result.test_id;
  END LOOP;
END
$stress$;

SELECT jsonb_build_object(
  'runs', count(*),
  'by_kind', (
    SELECT jsonb_object_agg(kind, total ORDER BY kind)
    FROM (
      SELECT kind, count(*)::integer AS total
      FROM _v25_stress_runs
      GROUP BY kind
    ) AS grouped_runs
  ),
  'short_selections', count(*) FILTER (WHERE selected <> requested),
  'topic_coverage_failures', count(*) FILTER (
    WHERE expected_topics IS NOT NULL
      AND selected_topics <> expected_topics
  ),
  'duplicate_questions_in_test', (
    SELECT count(*)
    FROM (
      SELECT answer.test_id, answer.question_id
      FROM public.test_answers AS answer
      JOIN _v25_stress_runs AS run
        ON run.test_id = answer.test_id
      GROUP BY answer.test_id, answer.question_id
      HAVING count(*) > 1
    ) AS duplicates
  ),
  'answer_order_failures', (
    SELECT count(*)
    FROM (
      SELECT answer.test_id
      FROM public.test_answers AS answer
      JOIN _v25_stress_runs AS run
        ON run.test_id = answer.test_id
      GROUP BY answer.test_id
      HAVING min(answer.orden) <> 1
         OR max(answer.orden) <> count(*)
         OR count(DISTINCT answer.orden) <> count(*)
    ) AS invalid_orders
  ),
  'stage_mismatches', (
    SELECT count(*)
    FROM public.test_answers AS answer
    JOIN _v25_stress_runs AS run
      ON run.test_id = answer.test_id
    JOIN public.questions AS question
      ON question.user_id = answer.user_id
     AND question.id = answer.question_id
    WHERE run.kind LIKE 'nivel_%'
      AND question.nivel_pedagogico <> replace(run.kind, 'nivel_', '')
  )
) AS stress_result
FROM _v25_stress_runs;

ROLLBACK;
