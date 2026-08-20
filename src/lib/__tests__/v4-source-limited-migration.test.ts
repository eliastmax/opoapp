// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const capacityMigration = readFileSync(
  new URL("../../../supabase/migrations/20260820004411_v4_source_capacity_contract.sql", import.meta.url),
  "utf8",
);
const masteryMigration = readFileSync(
  new URL("../../../supabase/migrations/20260820004447_v4_source_limited_mastery.sql", import.meta.url),
  "utf8",
);
const checksMigration = readFileSync(
  new URL("../../../supabase/migrations/20260820004519_v4_source_limited_checks.sql", import.meta.url),
  "utf8",
);
const standardCheckRouterFixMigration = readFileSync(
  new URL("../../../supabase/migrations/20260820131800_v4_standard_concept_check_router_fix.sql", import.meta.url),
  "utf8",
);
const standardMasteryRouterFixMigration = readFileSync(
  new URL("../../../supabase/migrations/20260820132600_v4_standard_mastery_router_fix.sql", import.meta.url),
  "utf8",
);

describe("V4 source-limited database contract", () => {
  test("stores source limitation on concepts and never on user mastery", () => {
    expect(capacityMigration).toContain("ALTER TABLE public.concepts");
    expect(capacityMigration).toContain("source_capacity_status text");
    expect(capacityMigration).toContain("source_supported_ceiling smallint");
    expect(capacityMigration).toContain("source_capacity_reason text");
    expect(capacityMigration).toContain("source_capacity_status = 'source_limited'");
    expect(capacityMigration).toContain("source_supported_ceiling BETWEEN 1 AND 3");
    expect(capacityMigration).not.toContain("ALTER TABLE public.user_concept_mastery");
  });

  test("importer accepts omitted capacity but rejects editorial-only status and ceilings outside 1..3", () => {
    expect(capacityMigration).toContain("v_capacity := v_row->'sourceCapacity'");
    expect(capacityMigration).toContain("v_capacity_status IS DISTINCT FROM 'source_limited'");
    expect(capacityMigration).toContain("v_capacity_ceiling < 1 OR v_capacity_ceiling > 3");
    expect(capacityMigration).toContain("source_capacity_status = EXCLUDED.source_capacity_status");
    expect(capacityMigration).toContain("primary questions above sourceSupportedCeiling");
    expect(capacityMigration).not.toContain("source_review_required'");
  });

  test("preserves the existing standard SQL mastery path and routes only source_limited to the new policy", () => {
    expect(masteryMigration).toContain("RENAME TO refresh_my_v4_concept_mastery_standard");
    expect(masteryMigration).toContain("refresh_my_v4_concept_mastery_standard(p_concept_id)");
    expect(masteryMigration).toContain("concept.source_capacity_status = 'source_limited'");
    expect(masteryMigration).toContain("v_distinct_questions >= v_ceiling");
    expect(masteryMigration).toContain("v_safe_correct_questions >= v_ceiling");
    expect(masteryMigration).toContain("v_safe_accuracy = 1");
    expect(masteryMigration).toContain("v_distinct_sessions < 2");
    expect(masteryMigration).toContain("LEAST(2, v_ceiling)");
    expect(masteryMigration).toContain("v_has_three_day_pass");
    expect(masteryMigration).toContain("v_has_seven_day_pass");
  });

  test("keeps flashcards out of the positive mastery threshold", () => {
    expect(masteryMigration).toContain("v_flashcard_attention");
    expect(masteryMigration).not.toContain("v_enough_for_consolidation :=\n    v_distinct_questions >= v_ceiling\n    AND v_safe_correct_questions >= v_ceiling\n    AND v_safe_accuracy = 1\n    AND v_flashcard");
  });

  test("selector preserves standard implementation and permits source-limited reuse with retention rotation", () => {
    expect(checksMigration).toContain("RENAME TO create_v4_concept_check_standard");
    expect(checksMigration).toContain("create_v4_concept_check_standard(p_concept_id, p_question_count, p_mode)");
    expect(checksMigration).toContain("p_question_count < 1 OR p_question_count > v_max_count");
    expect(checksMigration).toContain("retention_targeted_count");
    expect(checksMigration).toContain("p_mode = 'review' AND pool.retention_targeted_count = 0");
    expect(checksMigration).toContain("pool.targeted_count");
    expect(checksMigration).toContain("v_active_primary_questions < v_ceiling");
  });

  test("routes standard concepts with null capacity to the preserved standard selector", () => {
    expect(standardCheckRouterFixMigration).toContain(
      "COALESCE(concept.source_capacity_status = 'source_limited', FALSE)",
    );
    expect(standardCheckRouterFixMigration).toContain("create_v4_source_limited_concept_check");
    expect(standardCheckRouterFixMigration).toContain("create_v4_concept_check_standard");
    expect(standardCheckRouterFixMigration).not.toContain("ALTER TABLE");
  });

  test("routes standard mastery refresh with null capacity to the preserved standard engine", () => {
    expect(standardMasteryRouterFixMigration).toContain(
      "COALESCE(concept.source_capacity_status = 'source_limited', FALSE)",
    );
    expect(standardMasteryRouterFixMigration).toContain("refresh_source_limited_concept_mastery");
    expect(standardMasteryRouterFixMigration).toContain("refresh_my_v4_concept_mastery_standard");
    expect(standardMasteryRouterFixMigration).not.toContain("ALTER TABLE");
  });

  test("Today receives catalog capacity instead of guessing from question count", () => {
    expect(masteryMigration).toContain("source_capacity_status text");
    expect(masteryMigration).toContain("source_supported_ceiling smallint");
    expect(masteryMigration).toContain("concept.source_capacity_status");
    expect(masteryMigration).toContain("concept.source_supported_ceiling");
  });
});
