// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260828134500_eli47_persist_auxiliar_hardening_packages.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("ELI-47 durable Auxiliar hardening packages", () => {
  it("keeps the durable store and functions private to postgres", () => {
    expect(migration).toContain("catalog_maintenance_private.auxiliar_hardening_packages");
    expect(migration).toContain("current_user <> 'postgres'");
    expect(migration).toContain("from public, anon, authenticated, service_role");
    expect(migration).toContain(
      "grant execute on function catalog_maintenance_private.seal_auxiliar_question_hardening(jsonb) to postgres",
    );
    expect(migration).toContain(
      "grant execute on function catalog_maintenance_private.execute_stored_auxiliar_question_hardening(text) to postgres",
    );
  });

  it("preserves the existing read-only ELI-45 preflight and revalidates before sealing", () => {
    expect(migration).toContain("p_package->>'mode' is distinct from 'preflight'");
    expect(migration).toContain(
      "catalog_maintenance_private.execute_auxiliar_question_hardening(p_package)",
    );
    expect(migration).toContain("'academic_writes', 0");
    expect(migration).toContain("sealed_package jsonb not null");
  });

  it("refuses fingerprint collisions with different payloads", () => {
    expect(migration).toContain("v_existing is distinct from p_package");
    expect(migration).toContain("fingerprint already sealed with a different payload");
  });

  it("executes only the sealed candidate and derives the execute fingerprint deterministically", () => {
    expect(migration).toContain("v_row.sealed_package || jsonb_build_object('mode','execute')");
    expect(migration).toContain(
      "md5((v_execute_package - 'package_fingerprint')::text)",
    );
    expect(migration).toContain(
      "catalog_maintenance_private.execute_auxiliar_question_hardening(v_execute_package)",
    );
  });

  it("is one-shot and rolls back on failed postconditions", () => {
    expect(migration).toContain("v_row.executed_at is not null");
    expect(migration).toContain("sealed package already executed");
    expect(migration).toContain("stored execution postcondition failed; transaction rolled back");
    expect(migration).toContain("executed_at = now()");
    expect(migration).toContain("'one_shot', true");
  });

  it("does not introduce a generic SQL execution surface", () => {
    expect(migration).not.toMatch(/p_sql|sql_text|query_text|execute\s+immediate/i);
  });
});
