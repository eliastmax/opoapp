// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import { composeV4TodayPlan, type V4TodayContextRow } from "../v4-today-plan";

function row(overrides: Partial<V4TodayContextRow> = {}): V4TodayContextRow {
  return {
    concept_id: "c1",
    concept_code: "C1",
    concept_title: "Atomic concept",
    topic_id: "t1",
    topic_number: 1,
    topic_name: "Topic 1",
    study_unit_id: "u1",
    study_unit_code: "U1",
    study_unit_title: "Unit 1",
    unit_position: 1,
    unit_estimated_minutes: 5,
    unit_completed: true,
    state: "seen",
    needs_attention: false,
    next_review_on: null,
    reason_code: "exposed",
    distinct_questions: 1,
    safe_correct_questions: 1,
    safe_accuracy: 1,
    distinct_sessions: 1,
    retention_checks_passed: 0,
    active_primary_questions: 1,
    active_flashcards: 2,
    last_evidence_at: "2026-08-19T10:00:00Z",
    roadmap_slot: null,
    roadmap_scheduled_date: null,
    ...overrides,
  };
}

describe("V4 Today source-limited scheduling", () => {
  test("standard concept with one primary remains blocked from verification", () => {
    const plan = composeV4TodayPlan({ availableMinutes: 10, today: "2026-08-20", rows: [row()] });
    expect(plan.blocks.some((block) => block.kind === "verify")).toBe(false);
  });

  test("ceiling 1 schedules a one-question verification in the second session", () => {
    const plan = composeV4TodayPlan({
      availableMinutes: 10,
      today: "2026-08-20",
      rows: [row({
        source_capacity_status: "source_limited",
        source_supported_ceiling: 1,
        source_capacity_reason: "One independent rule.",
      })],
    });
    const verify = plan.blocks.find((block) => block.kind === "verify");
    expect(verify?.targetQuestions).toBe(1);
  });

  test("ceiling 2 retention requests both questions when available", () => {
    const plan = composeV4TodayPlan({
      availableMinutes: 10,
      today: "2026-08-20",
      rows: [row({
        source_capacity_status: "source_limited",
        source_supported_ceiling: 2,
        source_capacity_reason: "Two independent rules.",
        active_primary_questions: 2,
        distinct_questions: 2,
        distinct_sessions: 2,
        state: "consolidating",
        next_review_on: "2026-08-20",
      })],
    });
    const review = plan.blocks.find((block) => block.kind === "review");
    expect(review?.targetQuestions).toBe(2);
    expect(review?.retentionCheckpointDays).toBe(3);
  });
});
