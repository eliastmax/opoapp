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
    expect(migration).toContain("expected exactly one legacy tipo_trampa required-content guard");
    expect(migration).toContain("execute v_sql");
  });

  test("requires the existing database contract to permit NULL metadata", () => {
    expect(migration).toContain("c.is_nullable = 'YES'");
    expect(migration).toContain("questions_tipo_trampa_check");
    expect(migration).toContain("tipo_trampa IS NULL");
  });

  test("removes only tipo_trampa from the required-content guard", () => {
    const oldGuard = migration.slice(migration.indexOf("v_old text := $old$"), migration.indexOf("$old$;"));
    const newGuard = migration.slice(migration.indexOf("v_new text := $new$"), migration.indexOf("$new$;"));

    expect(oldGuard).toContain("nullif(v_values->>'tipo_trampa','') is null");
    expect(newGuard).not.toContain("nullif(v_values->>'tipo_trampa','') is null");

    for (const field of ["pregunta", "opcion_a", "opcion_b", "opcion_c", "opcion_d"]) {
      expect(oldGuard).toContain(`nullif(v_values->>'${field}','') is null`);
      expect(newGuard).toContain(`nullif(v_values->>'${field}','') is null`);
    }

    expect(newGuard).toContain("ELI-44 mutation % contains empty required content");
  });

  test("does not add a direct academic-row write surface", () => {
    expect(migration).not.toMatch(/update\s+public\.questions/i);
    expect(migration).not.toMatch(/insert\s+into\s+public\.questions/i);
    expect(migration).not.toMatch(/delete\s+from\s+public\.questions/i);
    expect(migration).not.toMatch(/^\s*commit\s*;?\s*$/im);
  });
});
