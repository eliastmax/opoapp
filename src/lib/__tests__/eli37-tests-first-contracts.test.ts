// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260909103900_eli37_tests_first_concept_evidence_contracts.sql",
    import.meta.url,
  ),
  "utf8",
);
const testRoute = readFileSync(
  new URL("../../routes/_authenticated/test.$id.tsx", import.meta.url),
  "utf8",
);
const resultRoute = readFileSync(
  new URL("../../routes/_authenticated/resultados.$id.tsx", import.meta.url),
  "utf8",
);

describe("ELI-37 tests-first evidence contracts", () => {
  test("removes learner solution-column access and uses explicit reveal boundaries", () => {
    expect(migration).toContain("REVOKE SELECT ON public.questions FROM authenticated");
    expect(migration).not.toMatch(/GRANT SELECT \([^;]*(respuesta_correcta|explicacion)/s);
    expect(migration).toContain("public.get_my_completed_test_result");
    expect(testRoute).toContain('rpc("get_my_test_session"');
    expect(testRoute).not.toContain("questions!test_answers_question_id_fkey(*)");
    expect(resultRoute).toContain('rpc("get_my_completed_test_result"');
  });

  test("locks confirmations at the database and preserves draft/doubt column updates", () => {
    expect(migration).toContain("Confirmed answer is immutable");
    expect(migration).toContain("Completed test answers are immutable");
    expect(migration).toContain("GRANT UPDATE (respuesta_usuario, marked_doubt)");
    expect(migration).toContain("v_answer.respuesta_usuario IS DISTINCT FROM p_selected_answer");
    expect(migration).not.toMatch(/SET correcta\s*=/);
  });

  test("keeps simulations blind and normal feedback behind confirmation", () => {
    expect(migration).toContain("v_test.tipo <> 'simulacro'");
    expect(migration).toMatch(
      /CASE WHEN v_test\.tipo <> 'simulacro' THEN v_question\.respuesta_correcta ELSE NULL END/,
    );
    expect(migration).toMatch(
      /CASE WHEN v_test\.tipo <> 'simulacro' THEN v_question\.explicacion ELSE NULL END/,
    );
  });

  test("classifies only completed-test evidence with conservative thresholds", () => {
    expect(migration).toContain("test.completado");
    expect(migration).toContain("answer.correcta IS NOT NULL");
    expect(migration).not.toContain("flashcard_reviews");
    expect(migration).not.toContain("study_unit_progress");
    expect(migration).not.toContain("user_concept_mastery");
    expect(migration).toContain("distinct_questions >= 6");
    expect(migration).toContain("distinct_sessions >= 3");
    expect(migration).toContain("accuracy >= 85");
    expect(migration).toContain("active_primary_questions >= 6");
  });

  test("does not move the global mastery refresh boundary", () => {
    const confirmation = migration.slice(
      migration.indexOf("CREATE OR REPLACE FUNCTION public.confirm_test_answer"),
      migration.indexOf("CREATE OR REPLACE FUNCTION public.get_my_completed_test_result"),
    );
    expect(confirmation).not.toContain("refresh_v4");
    expect(confirmation).not.toContain("user_concept_mastery");
  });
});
