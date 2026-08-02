// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260802130000_v3_2_initial_recommendation.sql",
    import.meta.url,
  ),
  "utf8",
);

const profileSwitchMigration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260802130100_v3_2_profile_opposition_switch.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("V3.2 initial recommendation", () => {
  it("keeps self-assessment separate and lets its influence expire", () => {
    expect(migration).toContain("least(COALESCE(evidence.evidence_count, 0), 20)");
    expect(migration).toContain("1::numeric - least");
    expect(migration).toContain("assessment_weight");
    expect(migration).not.toContain("UPDATE public.topic_self_assessments");
    expect(migration).not.toContain("UPDATE public.preparation_profiles");
  });

  it("preserves observed priorities and never unlocks a stage from perception", () => {
    expect(migration).toContain("active_failures");
    expect(migration).toContain("active_doubts");
    expect(migration).toContain("due_reviews");
    expect(migration).toContain("JOIN public.get_learning_stage_progress()");
    expect(migration).not.toMatch(/estimated_percentage[\s\S]{0,120}consolidation_unlocked/);
  });

  it("separates learner ownership from the shared catalog", () => {
    expect(migration).toContain("DROP CONSTRAINT IF EXISTS test_answers_owner_question_fk");
    expect(migration).toContain("question.opposition_id = test.opposition_id");
    expect(migration).toContain("statistics.user_id = v_user_id");
    expect(migration).toContain("question_statistics_question_id_idx");
    expect(migration).not.toContain("question.user_id = answer.user_id");
  });

  it("exposes an invoker-scoped and explainable recommendation contract", () => {
    expect(migration).toContain("get_initial_recommendation_context");
    expect(migration).toContain("recommendation_reason_code text");
    expect(migration).toContain("recommendation_reason text");
    expect(migration).toContain("recommended-v3.2");
    expect(migration).toContain("SECURITY INVOKER");
    expect(migration).not.toContain("SECURITY DEFINER");
  });

  it("activates a newly chosen catalog before RLS-scoped topic validation", () => {
    const switchPosition = profileSwitchMigration.indexOf("SET active_opposition_id");
    const topicValidationPosition = profileSwitchMigration.indexOf(
      "The current topic does not belong to the opposition",
    );

    expect(switchPosition).toBeGreaterThan(-1);
    expect(topicValidationPosition).toBeGreaterThan(switchPosition);
    expect(profileSwitchMigration).toContain("SECURITY INVOKER");
    expect(profileSwitchMigration).not.toContain("SECURITY DEFINER");
  });
});
