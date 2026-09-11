// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  evidenceDescription,
  groupTestsFirstProgressByTopic,
  testsFirstStateTotals,
  type TestsFirstProgressRow,
} from "../tests-first-progress";

const testRoute = readFileSync(
  new URL("../../routes/_authenticated/test.$id.tsx", import.meta.url),
  "utf8",
);
const resultRoute = readFileSync(
  new URL("../../routes/_authenticated/resultados.$id.tsx", import.meta.url),
  "utf8",
);
const progressRoute = readFileSync(
  new URL("../../routes/_authenticated/progreso.tsx", import.meta.url),
  "utf8",
);
const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260911103000_eli98_tests_first_results_weak_points.sql",
    import.meta.url,
  ),
  "utf8",
);

const row = (overrides: Partial<TestsFirstProgressRow> = {}): TestsFirstProgressRow => ({
  concept_id: "concept-1",
  concept_title: "Concepto",
  topic_id: "topic-1",
  topic_number: 1,
  topic_name: "Tema uno",
  learner_state: "not_evaluated",
  evidence_reason: "insufficient_test_evidence",
  distinct_test_questions: 0,
  distinct_completed_test_sessions: 0,
  safe_accuracy: null,
  attention_required: false,
  doubt_answers: 0,
  next_review_on: null,
  active_primary_question_count: 3,
  ...overrides,
});

describe("ELI-98 tests-first learner integration", () => {
  test("normal test confirms through the governed RPC before advancing", () => {
    expect(testRoute).toContain('rpc("confirm_test_answer"');
    expect(testRoute).toContain("Confirmar respuesta");
    expect(testRoute).toContain("feedback?.feedback_revealed");
    expect(testRoute).toContain("disabled={item.confirmed");
    expect(testRoute).not.toContain("respuesta_correcta");
    expect(testRoute).not.toContain("questions!test_answers_question_id_fkey(*)");
  });

  test("simulation branch stays neutral until completion", () => {
    expect(testRoute).toContain('data.test.tipo === "simulacro"');
    expect(testRoute).toContain("La corrección se mostrará cuando finalices el simulacro");
    expect(testRoute).toContain("item.confirmed && !isSimulation && feedback?.feedback_revealed");
  });

  test("Progress has one tests-first authority and no learner legacy signals", () => {
    expect(progressRoute).toContain('rpc("get_my_tests_first_concept_progress"');
    for (const legacy of [
      "prepare_my_v4_today_context",
      "user_concept_mastery",
      "get_topic_progress_summary",
      "get_verified_progress_summary",
      "get_learning_stage_progress",
      "get_retention_review_summary",
    ]) {
      expect(progressRoute).not.toContain(legacy);
    }
    expect(progressRoute).toContain("evidencia insuficiente de tests");
  });

  test("Results attribution and weak-point selection stay in backend contracts", () => {
    expect(resultRoute).toContain('rpc("get_my_completed_test_concepts"');
    expect(resultRoute).toContain('rpc("create_tests_first_concept_test"');
    expect(resultRoute).toContain("Entrenar puntos débiles");
    expect(migration).toContain(
      "COALESCE(selection.selection_concept_id, primary_mapping.concept_id)",
    );
    expect(migration).toContain("mapping.role = 'primary'");
    expect(migration).toContain("concept.opposition_id = v_opposition_id");
    expect(migration).toContain("question.activa");
  });

  test("new privileged endpoints keep explicit auth, scope and narrow grants", () => {
    expect(migration).toContain("IF v_user_id IS NULL");
    expect(migration).toContain("public.current_active_opposition_id()");
    expect(migration).toContain("test.completado");
    expect(migration).toContain("test.user_id");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.get_my_completed_test_concepts");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.create_tests_first_concept_test");
    expect(migration).not.toContain("refresh_v4");
  });

  test("state summaries and topic groups remain deterministic", () => {
    const rows = [
      row(),
      row({
        concept_id: "concept-2",
        learner_state: "mastered",
        topic_id: "topic-2",
        topic_number: 2,
      }),
      row({ concept_id: "concept-3", learner_state: "needs_reinforcement" }),
    ];
    expect(testsFirstStateTotals(rows)).toEqual({
      not_evaluated: 1,
      needs_reinforcement: 1,
      consolidating: 0,
      mastered: 1,
    });
    expect(groupTestsFirstProgressByTopic(rows).map((topic) => topic.topic_number)).toEqual([1, 2]);
    expect(evidenceDescription(rows[0])).toContain("faltan preguntas o sesiones");
  });

  test("mobile contracts include narrow layout and safe-area handling", () => {
    expect(progressRoute).toContain("min-[390px]:inline");
    expect(progressRoute).toContain("min-[430px]:grid-cols-4");
    expect(testRoute).toContain("safe-bottom");
    expect(testRoute).toContain("break-words");
  });
});
