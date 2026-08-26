// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260826134500_eli45_autonomous_auxiliar_question_hardening.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("ELI-45 autonomous governed Auxiliar hardening executor", () => {
  it("creates a non-login internal executor and keeps app roles closed", () => {
    expect(migration).toContain("create role auxiliar_question_hardening_executor nologin noinherit bypassrls");
    expect(migration).toContain("security definer");
    expect(migration).toContain("session_user <> 'postgres'");
    expect(migration).toContain(
      "revoke all on function catalog_maintenance_private.execute_auxiliar_question_hardening(jsonb)",
    );
    expect(migration).toContain(
      "from public, anon, authenticated, service_role",
    );
    expect(migration).toContain(
      "grant execute on function catalog_maintenance_private.execute_auxiliar_question_hardening(jsonb) to postgres",
    );
  });

  it("hard-locks the executor to Auxiliar and question updates only", () => {
    expect(migration).toContain("00000000-0000-4000-8000-000000000001");
    expect(migration).not.toContain("00000000-0000-4000-8000-000000000002");
    expect(migration).toContain("tg_table_name <> 'questions'");
    expect(migration).toContain("tg_op <> 'UPDATE'");
    expect(migration).toContain("v_operation <> 'question_hardening'");
    expect(migration).not.toMatch(/insert\s+into\s+public\.questions/i);
    expect(migration).not.toMatch(/delete\s+from\s+public\.questions/i);
  });

  it("limits mutable fields and preserves identity/scope", () => {
    expect(migration).toContain(
      "grant update (pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, explicacion, nivel_pedagogico, tipo_trampa)",
    );
    for (const field of [
      "new.id is distinct from old.id",
      "new.codigo is distinct from old.codigo",
      "new.opposition_id is distinct from old.opposition_id",
      "new.topic_id is distinct from old.topic_id",
      "new.subtopic_id is distinct from old.subtopic_id",
      "new.user_id is distinct from old.user_id",
      "new.activa is distinct from old.activa",
    ]) {
      expect(migration).toContain(field);
    }
  });

  it("requires package integrity and row-level stale guards", () => {
    expect(migration).toContain("package_fingerprint");
    expect(migration).toContain("md5((p_package-'package_fingerprint')::text)");
    expect(migration).toContain("expected_fingerprint");
    expect(migration).toContain("auxiliar_question_fingerprint");
    expect(migration).toContain("stale package detected");
    expect(migration).toContain("package contains duplicate question ids");
    expect(migration).toContain("package contains duplicate question codes");
    expect(migration).toContain("v_change_count > 500");
  });

  it("supports zero-write preflight and atomic execute postconditions", () => {
    expect(migration).toContain("v_mode not in ('preflight','execute')");
    expect(migration).toContain("'academic_writes',0");
    expect(migration).toContain("for update");
    expect(migration).toContain("postcondition mismatch for %; transaction rolled back");
    expect(migration).toContain("auxiliar_hardening_audit");
  });

  it("does not weaken or replace the existing authenticated ELI-43 path", () => {
    expect(migration).not.toContain("drop function public.execute_auxiliar_maintenance");
    expect(migration).not.toContain("disable row level security");
    expect(migration).not.toContain("disable trigger");
    expect(migration).not.toContain("request.jwt.claims");
    expect(migration).not.toMatch(/set\s+role/i);
  });
});
