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
  it("keeps the executor private to the trusted Postgres maintenance runtime", () => {
    expect(migration).toContain("create schema if not exists catalog_maintenance_private");
    expect(migration).toContain("security invoker");
    expect(migration).toContain("current_user <> 'postgres'");
    expect(migration).toContain(
      "revoke all on function catalog_maintenance_private.execute_auxiliar_question_hardening(jsonb)",
    );
    expect(migration).toContain("from public, anon, authenticated, service_role");
    expect(migration).toContain(
      "grant execute on function catalog_maintenance_private.execute_auxiliar_question_hardening(jsonb) to postgres",
    );
    expect(migration).not.toMatch(/signInWithPassword|password|jwt|access_token|refresh_token/i);
  });

  it("hard-locks the internal branch to Auxiliar and question updates only", () => {
    expect(migration).toContain("00000000-0000-4000-8000-000000000001");
    expect(migration).toContain(
      "current_user='postgres' and current_setting('opoapp.aux_hardening.operation',true)='question_hardening'",
    );
    expect(migration).toContain("tg_table_name <> 'questions'");
    expect(migration).toContain("tg_op <> 'UPDATE'");
    expect(migration).toContain("v_operation <> 'question_hardening'");
    expect(migration).not.toMatch(/insert\s+into\s+public\.questions/i);
    expect(migration).not.toMatch(/delete\s+from\s+public\.questions/i);
  });

  it("preserves the existing Celador Factory branch unchanged in principle", () => {
    expect(migration).toContain("if current_user='factory_catalog_executor' then");
    expect(migration).toContain("00000000-0000-4000-8000-000000000002");
    expect(migration).toContain("Factory v1 is restricted to Celador SMS");
  });

  it("limits mutations to the seven academic question surfaces", () => {
    for (const assignment of [
      "pregunta=v_change->>'pregunta'",
      "opcion_a=v_change->>'opcion_a'",
      "opcion_b=v_change->>'opcion_b'",
      "opcion_c=v_change->>'opcion_c'",
      "opcion_d=v_change->>'opcion_d'",
      "respuesta_correcta=v_answer::public.respuesta_enum",
      "explicacion=v_change->>'explicacion'",
      "nivel_pedagogico=v_level",
      "tipo_trampa=v_trap",
    ]) {
      expect(migration).toContain(assignment);
    }
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
    expect(migration).toContain("v_change_count>500");
  });

  it("supports zero-write preflight, atomic execute and audit metadata", () => {
    expect(migration).toContain("v_mode not in ('preflight','execute')");
    expect(migration).toContain("'academic_writes',0");
    expect(migration).toContain("for update");
    expect(migration).toContain("postcondition mismatch for %; transaction rolled back");
    expect(migration).toContain("auxiliar_hardening_audit");
  });

  it("does not remove the authenticated ELI-43 path or relax app security", () => {
    expect(migration).not.toContain("drop function public.execute_auxiliar_maintenance");
    expect(migration).not.toContain("disable row level security");
    expect(migration).not.toContain("disable trigger");
    expect(migration).not.toContain("request.jwt.claims");
    expect(migration).not.toMatch(/set\s+role/i);
  });
});
