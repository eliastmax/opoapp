// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260902133000_eli94_allow_null_tipo_trampa_celador_hardening.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("ELI-94 nullable Celador tipo_trampa alignment", () => {
  test("is a fail-closed patch of the existing governed executor", () => {
    expect(migration).toContain(
      "pg_get_functiondef('public.execute_celador_question_hardening(jsonb)'::regprocedure)",
    );
    expect(migration).toContain("v_matches <> 1");
    expect(migration).toContain("expected exactly one legacy tipo_trampa NULL-rejection fragment");
    expect(migration).toContain("execute v_sql");
  });

  test("requires the existing database contract to permit NULL metadata", () => {
    expect(migration).toContain("c.is_nullable = 'YES'");
    expect(migration).toContain("questions_tipo_trampa_check");
    expect(migration).toContain("tipo_trampa IS NULL");
  });

  test("removes only the unique tipo_trampa NULL-rejection fragment", () => {
    expect(migration).toContain(
      "v_old constant text := 'or nullif(v_values->>''tipo_trampa'','''') is null then'",
    );
    expect(migration).toContain("v_new constant text := 'then'");
    expect(migration).toContain("v_sql := replace(v_sql, v_old, v_new)");
  });

  test("does not add a direct academic-row write surface", () => {
    expect(migration).not.toMatch(/update\s+public\.questions/i);
    expect(migration).not.toMatch(/insert\s+into\s+public\.questions/i);
    expect(migration).not.toMatch(/delete\s+from\s+public\.questions/i);
    expect(migration).not.toMatch(/^\s*commit\s*;?\s*$/im);
  });
});
