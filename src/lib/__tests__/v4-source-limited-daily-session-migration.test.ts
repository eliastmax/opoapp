// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260820155000_v4_source_limited_daily_session_verify_fix.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("V4 daily session source-limited verify persistence", () => {
  test("standard concepts keep verify restricted to 2..4", () => {
    expect(migration).toContain("IF v_source_capacity_status IS NULL THEN");
    expect(migration).toContain(
      "IF v_target_questions < 2 OR v_target_questions > 4 THEN",
    );
  });

  test("source-limited ceiling 1 accepts verify=1 and rejects verify=2 by exact-ceiling validation", () => {
    expect(migration).toContain(
      "ELSIF v_source_capacity_status = 'source_limited' THEN",
    );
    expect(migration).toContain(
      "OR v_target_questions <> v_source_supported_ceiling THEN",
    );
    expect(migration).toContain("v_source_supported_ceiling < 1");
    expect(migration).toContain("v_source_supported_ceiling > 3");
  });

  test("source-limited ceilings 2 and 3 are accepted only at their declared ceiling", () => {
    const exactCeilingChecks = migration.match(
      /v_target_questions <> v_source_supported_ceiling/g,
    );
    expect(exactCeilingChecks).toHaveLength(1);
    expect(migration).not.toContain("count(mapping.question_id)");
    expect(migration).not.toContain("active_primary_questions");
  });

  test("review, repair and advance keep their previous validation contract", () => {
    expect(migration).toContain(
      "IF v_kind = 'review' AND (v_target_questions < 1 OR v_target_questions > 2) THEN",
    );
    expect(migration).toContain(
      "IF v_kind = 'repair' AND (v_target_questions < 1 OR v_target_questions > 3) THEN",
    );
    expect(migration).toContain(
      "IF v_concept_id IS NOT NULL OR v_target_questions <> 0 OR v_checkpoint IS NOT NULL THEN",
    );
    expect(migration).toContain(
      "IF v_kind <> 'review' AND v_checkpoint IS NOT NULL THEN",
    );
  });

  test("reads source capacity only from concept metadata", () => {
    expect(migration).toContain(
      "SELECT concept.source_capacity_status, concept.source_supported_ceiling",
    );
    expect(migration).toContain("FROM public.concepts concept");
    expect(migration).not.toContain("source_capacity_reason");
  });
});
