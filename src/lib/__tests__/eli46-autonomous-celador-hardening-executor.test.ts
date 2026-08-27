// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260827124500_eli46_autonomous_celador_question_hardening.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("ELI-46 autonomous governed Celador hardening executor", () => {
  it("keeps the new entry point private to trusted Postgres maintenance", () => {
    expect(migration).toContain(
      "create or replace function catalog_maintenance_private.execute_celador_question_hardening(p_package jsonb)",
    );
    expect(migration).toContain("security invoker");
    expect(migration).toContain("current_user <> 'postgres'");
    expect(migration).toContain(
      "revoke all on function catalog_maintenance_private.execute_celador_question_hardening(jsonb)",
    );
    expect(migration).toContain("from public, anon, authenticated, service_role");
    expect(migration).toContain(
      "grant execute on function catalog_maintenance_private.execute_celador_question_hardening(jsonb) to postgres",
    );
  });

  it("reuses the ELI-44 package and stale/atomic engine instead of duplicating it", () => {
    expect(migration).toContain("eli44_celador_question_hardening_v1");
    expect(migration).toContain(
      "v_result := public.execute_celador_question_hardening(p_package)",
    );
    expect(migration).toContain("^[0-9a-f]{64}$");
    expect(migration).toContain("v_mutation_count > 500");
    expect(migration).toContain("v_mutation_count + v_keep_count > 500");
    expect(migration).not.toMatch(/insert\s+into\s+public\.questions/i);
    expect(migration).not.toMatch(/delete\s+from\s+public\.questions/i);
  });

  it("hard-locks the internal trigger branch to Celador question UPDATE", () => {
    expect(migration).toContain("00000000-0000-4000-8000-000000000002");
    expect(migration).toContain(
      "current_setting('opoapp.cel_hardening.operation',true)='question_hardening'",
    );
    expect(migration).toContain("tg_table_name <> 'questions'");
    expect(migration).toContain("tg_op <> 'UPDATE'");
    expect(migration).toContain("new.id is distinct from old.id");
    expect(migration).toContain("new.codigo is distinct from old.codigo");
    expect(migration).toContain("new.opposition_id is distinct from old.opposition_id");
    expect(migration).toContain("new.topic_id is distinct from old.topic_id");
    expect(migration).toContain("new.subtopic_id is distinct from old.subtopic_id");
    expect(migration).toContain("new.user_id is distinct from old.user_id");
    expect(migration).toContain("new.activa is distinct from old.activa");
  });

  it("preserves the authenticated ELI-44 route as fallback", () => {
    expect(migration).toContain("current_user <> 'authenticated'");
    expect(migration).toContain("ELI-44 requires a real authenticated user session");
    expect(migration).toContain("ELI-44 requires opposition_admin for Celador");
    expect(migration).toContain("opoapp.cel_hardening.internal");
  });

  it("does not spoof auth or weaken RLS/trigger security", () => {
    expect(migration).not.toMatch(/signInWithPassword|password|jwt|access_token|refresh_token/i);
    expect(migration).not.toContain("request.jwt.claims");
    expect(migration).not.toMatch(/set\s+role/i);
    expect(migration).not.toContain("disable row level security");
    expect(migration).not.toContain("disable trigger");
  });

  it("keeps audit metadata private and free of academic bodies", () => {
    expect(migration).toContain("celador_hardening_audit");
    expect(migration).toContain("package_fingerprint text not null");
    expect(migration).toContain("row_count integer not null");
    expect(migration).not.toContain("pregunta text not null");
    expect(migration).not.toContain("opcion_a text not null");
  });
});
