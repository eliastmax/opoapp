// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import { composeV4TodayPlan, type V4TodayContextRow } from "../v4-today-plan";

function row(overrides: Partial<V4TodayContextRow> = {}): V4TodayContextRow {
  return {
    concept_id: "c1",
    concept_code: "SMS-T18-C01",
    concept_title: "Concepto 1",
    topic_id: "t18",
    topic_number: 18,
    topic_name: "Tema 18",
    study_unit_id: "u1",
    study_unit_code: "SMS-T18-U01",
    study_unit_title: "Unidad 1",
    unit_position: 1,
    unit_estimated_minutes: 8,
    unit_completed: true,
    state: "verifying",
    needs_attention: false,
    next_review_on: "2026-08-20",
    reason_code: "limited_question_evidence",
    distinct_questions: 2,
    safe_correct_questions: 2,
    safe_accuracy: 1,
    distinct_sessions: 1,
    retention_checks_passed: 0,
    active_primary_questions: 8,
    active_flashcards: 4,
    last_evidence_at: "2026-08-18T10:00:00Z",
    roadmap_slot: null,
    roadmap_scheduled_date: null,
    ...overrides,
  };
}

describe("V4 Today composer", () => {
  test("builds a balanced 35 minute session in a legible order", () => {
    const plan = composeV4TodayPlan({
      availableMinutes: 35,
      today: "2026-08-19",
      rows: [
        row({
          concept_id: "review",
          concept_code: "SMS-T18-C14",
          state: "retained",
          retention_checks_passed: 2,
          next_review_on: "2026-08-18",
          study_unit_id: "ur",
          study_unit_code: "UR",
          study_unit_title: "Silencio",
        }),
        row({
          concept_id: "repair",
          concept_code: "SMS-T18-C16",
          needs_attention: true,
          next_review_on: "2026-08-20",
          safe_accuracy: 0.5,
          study_unit_id: "ux",
          study_unit_code: "UX",
          study_unit_title: "Procedimientos de oficio",
        }),
        row({
          concept_id: "advance",
          concept_code: "SMS-T18-C20",
          state: "unseen",
          distinct_questions: 0,
          safe_correct_questions: 0,
          safe_accuracy: null,
          unit_completed: false,
          study_unit_id: "ua",
          study_unit_code: "UA",
          study_unit_title: "Términos y plazos",
          unit_estimated_minutes: 8,
          roadmap_slot: 1,
          roadmap_scheduled_date: "2026-08-19",
        }),
        row({
          concept_id: "verify",
          concept_code: "SMS-T18-C30",
          next_review_on: "2026-08-20",
          study_unit_id: "uv",
          study_unit_code: "UV",
          study_unit_title: "Notificaciones",
          roadmap_slot: 2,
        }),
      ],
    });

    expect(plan.status).toBe("ready");
    expect(plan.blocks.map((block) => block.label)).toEqual([
      "Repasar",
      "Corregir",
      "Avanzar",
      "Comprobar",
    ]);
    expect(plan.blocks[0]?.retentionCheckpointDays).toBe(14);
    expect(plan.plannedMinutes).toBeLessThanOrEqual(35);
    expect(plan.unusedMinutes).toBe(35 - plan.plannedMinutes);
  });

  test("uses compact minimum blocks when only nine minutes are available", () => {
    const plan = composeV4TodayPlan({
      availableMinutes: 9,
      today: "2026-08-19",
      rows: [
        row({
          concept_id: "review",
          state: "consolidating",
          next_review_on: "2026-08-19",
          study_unit_id: "u-review",
        }),
        row({
          concept_id: "repair",
          needs_attention: true,
          next_review_on: "2026-08-20",
          study_unit_id: "u-repair",
        }),
      ],
    });

    expect(plan.blocks.map((block) => [block.kind, block.minutes])).toEqual([
      ["review", 4],
      ["repair", 5],
    ]);
    expect(plan.plannedMinutes).toBe(9);
    expect(plan.unusedMinutes).toBe(0);
  });

  test("maps retention stages to the next deliberate checkpoint", () => {
    const first = composeV4TodayPlan({
      availableMinutes: 10,
      today: "2026-08-19",
      rows: [
        row({
          state: "consolidating",
          retention_checks_passed: 0,
          next_review_on: "2026-08-19",
        }),
      ],
    });
    expect(first.blocks[0]?.retentionCheckpointDays).toBe(3);

    const second = composeV4TodayPlan({
      availableMinutes: 10,
      today: "2026-08-19",
      rows: [
        row({
          state: "consolidating",
          retention_checks_passed: 1,
          next_review_on: "2026-08-19",
        }),
      ],
    });
    expect(second.blocks[0]?.retentionCheckpointDays).toBe(7);
  });

  test("returns nothing_due instead of inventing work when retained content is not due", () => {
    const plan = composeV4TodayPlan({
      availableMinutes: 30,
      today: "2026-08-19",
      rows: [
        row({
          state: "retained",
          retention_checks_passed: 2,
          next_review_on: "2026-09-02",
          unit_completed: true,
        }),
      ],
    });

    expect(plan.status).toBe("nothing_due");
    expect(plan.blocks).toEqual([]);
    expect(plan.nextDueOn).toBe("2026-09-02");
  });

  test("prefers the unit aligned with the earliest weekly-roadmap slot", () => {
    const plan = composeV4TodayPlan({
      availableMinutes: 8,
      today: "2026-08-19",
      rows: [
        row({
          concept_id: "late",
          state: "unseen",
          unit_completed: false,
          study_unit_id: "u-late",
          study_unit_code: "U-LATE",
          study_unit_title: "Unidad posterior",
          roadmap_slot: 4,
        }),
        row({
          concept_id: "first",
          state: "unseen",
          unit_completed: false,
          study_unit_id: "u-first",
          study_unit_code: "U-FIRST",
          study_unit_title: "Unidad preferente",
          roadmap_slot: 1,
        }),
      ],
    });

    expect(plan.blocks[0]?.kind).toBe("advance");
    expect(plan.blocks[0]?.studyUnitId).toBe("u-first");
  });

  test("does not pretend a concept with fewer than four primary questions can be fully verified", () => {
    const plan = composeV4TodayPlan({
      availableMinutes: 20,
      today: "2026-08-19",
      rows: [
        row({
          state: "verifying",
          active_primary_questions: 3,
          unit_completed: true,
        }),
      ],
    });

    expect(plan.status).toBe("nothing_due");
    expect(plan.blocks).toEqual([]);
  });

  test("handles empty content and zero time explicitly", () => {
    expect(
      composeV4TodayPlan({ availableMinutes: 20, today: "2026-08-19", rows: [] }).status,
    ).toBe("no_content");
    expect(
      composeV4TodayPlan({ availableMinutes: 0, today: "2026-08-19", rows: [row()] }).status,
    ).toBe("no_time");
  });
});
