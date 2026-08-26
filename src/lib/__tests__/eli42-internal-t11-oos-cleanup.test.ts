// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260826161000_eli42_internal_t11_oos_cleanup.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("ELI-42 internal T11 OOS cleanup", () => {
  it("is private to postgres and does not create a generic maintenance surface", () => {
    expect(migration).toContain("current_user <> 'postgres'");
    expect(migration).toContain(
      "revoke all on function catalog_maintenance_private.execute_eli42_t11_oos_cleanup(text,text)",
    );
    expect(migration).toContain(
      "grant execute on function catalog_maintenance_private.execute_eli42_t11_oos_cleanup(text,text) to postgres",
    );
    expect(migration).toContain("from public, anon, authenticated, service_role");
    expect(migration).not.toMatch(/p_sql|sql_text|query_text|execute\s+immediate/i);
  });

  it("hard-locks the one-time operation to Auxiliar T11 and the exact OOS range", () => {
    expect(migration).toContain("00000000-0000-4000-8000-000000000001");
    expect(migration).toContain("2200545d-5c23-480b-a994-440c08c843b2");
    expect(migration).toContain("SMS-T11-0181");
    expect(migration).toContain("SMS-T11-0200");
    expect(migration).toContain("ELI42_T11_OOS_CLEANUP_V1");
    expect(migration).toContain("exact OOS UUID/code ledger mismatch");
  });

  it("preserves academic fields while allowing only active true to false in cleanup mode", () => {
    for (const field of [
      "new.pregunta is distinct from old.pregunta",
      "new.opcion_a is distinct from old.opcion_a",
      "new.opcion_b is distinct from old.opcion_b",
      "new.opcion_c is distinct from old.opcion_c",
      "new.opcion_d is distinct from old.opcion_d",
      "new.respuesta_correcta is distinct from old.respuesta_correcta",
      "new.explicacion is distinct from old.explicacion",
      "new.nivel_pedagogico is distinct from old.nivel_pedagogico",
      "new.tipo_trampa is distinct from old.tipo_trampa",
      "old.activa is distinct from true",
      "new.activa is distinct from false",
    ]) {
      expect(migration).toContain(field);
    }
  });

  it("retains the reusable ELI-45 question-hardening trigger operation", () => {
    expect(migration).toContain("('question_hardening','eli42_scope_cleanup')");
    expect(migration).toContain("if v_operation='question_hardening' then");
    expect(migration).toContain("Auxiliar hardening cannot change question identity/scope");
  });

  it("preflights exact state and performs the approved structural changes only", () => {
    expect(migration).toContain("v_t11_active<>200");
    expect(migration).toContain("v_oos_active<>20");
    expect(migration).toContain("v_inscope_active<>180");
    expect(migration).toContain("v_oos_primary<>20");
    expect(migration).toContain("v_inscope_primary<>180");
    expect(migration).toContain("planned_question_retirements',20");
    expect(migration).toContain("planned_primary_deletions',20");
    expect(migration).toContain("planned_concept_updates',4");
    expect(migration).toContain("planned_unit_updates',3");
    expect(migration).toContain("planned_flashcard_deactivations',8");
  });

  it("requires exact final T11 counts and rolls back on mismatch", () => {
    expect(migration).toContain("v_t11_active<>180");
    expect(migration).toContain("v_oos_active<>0");
    expect(migration).toContain("v_inscope_primary<>180");
    expect(migration).toContain("v_level_a<>60");
    expect(migration).toContain("v_level_c<>60");
    expect(migration).toContain("v_level_t<>60");
    expect(migration).toContain("v_answer_a<>45");
    expect(migration).toContain("v_answer_d<>45");
    expect(migration).toContain("postcondition mismatch; transaction rolled back");
  });
});
