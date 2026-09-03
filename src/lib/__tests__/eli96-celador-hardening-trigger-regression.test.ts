// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260903215000_eli96_restore_celador_hardening_trigger.sql",
    import.meta.url,
  ),
  "utf8",
);

const eli95Migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260903201500_eli95_t23_oos_cleanup.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("ELI-96 Celador hardening trigger regression", () => {
  it("restores the original ELI-46 Celador trusted maintenance context", () => {
    expect(migration).toContain("opoapp.cel_hardening.operation");
    expect(migration).toContain("opoapp.cel_hardening.opposition_id");
    expect(migration).toContain("opoapp.cel_hardening.topic_id");
    expect(migration).toContain("00000000-0000-4000-8000-000000000002");
    expect(migration).toContain("Celador hardening executor is restricted to Celador SMS");
    expect(migration).toContain("Celador hardening row is outside the locked topic");
    expect(migration).toContain("Celador hardening cannot change question identity/scope");
  });

  it("allows only governed question UPDATEs and preserves identity/scope", () => {
    expect(migration).toContain("tg_table_name <> 'questions'");
    expect(migration).toContain("tg_op <> 'UPDATE'");
    expect(migration).toContain("v_operation <> 'question_hardening'");
    for (const field of [
      "new.id is distinct from old.id",
      "new.codigo is distinct from old.codigo",
      "new.opposition_id is distinct from old.opposition_id",
      "new.subject_id is distinct from old.subject_id",
      "new.topic_id is distinct from old.topic_id",
      "new.subtopic_id is distinct from old.subtopic_id",
      "new.user_id is distinct from old.user_id",
      "new.activa is distinct from old.activa",
    ]) {
      expect(migration).toContain(field);
    }
  });

  it("patches in front of the exact current ELI-95 Auxiliar branch", () => {
    const auxMarker =
      "in ('question_hardening','eli42_scope_cleanup','eli95_t23_oos_cleanup')";
    expect(migration).toContain(auxMarker);
    expect(eli95Migration).toContain(auxMarker);
    expect(migration).toContain("opoapp.aux_hardening.operation");
    expect(migration).toContain("ELI-96 could not locate the exact ELI-95 Auxiliar trigger entry point");
  });

  it("is fail-closed and performs no academic DML", () => {
    expect(migration).toContain("unexpected existing Celador hardening trigger branch");
    expect(migration).not.toMatch(/update\s+public\.questions/i);
    expect(migration).not.toMatch(/insert\s+into\s+public\.questions/i);
    expect(migration).not.toMatch(/delete\s+from\s+public\.questions/i);
    expect(migration).not.toMatch(/disable\s+trigger|alter\s+table.*disable/i);
  });
});
