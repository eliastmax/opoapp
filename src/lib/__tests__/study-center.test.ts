// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, it } from "bun:test";
import { buildStudyCenterModel, studyUnitActionLabel, studyUnitStatusLabel } from "../study-center";
import type { V4TodayContextRow } from "../v4-today-plan";

function row(
  overrides: Partial<V4TodayContextRow> & Pick<V4TodayContextRow, "concept_id" | "study_unit_id">,
): V4TodayContextRow {
  return {
    concept_id: overrides.concept_id,
    concept_code: overrides.concept_id,
    concept_title: overrides.concept_id,
    topic_id: "topic-1",
    topic_number: 1,
    topic_name: "La Constitución Española. Derechos y deberes fundamentales.",
    study_unit_id: overrides.study_unit_id,
    study_unit_code: overrides.study_unit_id,
    study_unit_title: overrides.study_unit_id,
    unit_position: 1,
    unit_estimated_minutes: 10,
    unit_completed: false,
    state: "unseen",
    needs_attention: false,
    next_review_on: null,
    reason_code: "advance_unseen",
    distinct_questions: 0,
    safe_correct_questions: 0,
    safe_accuracy: null,
    distinct_sessions: 0,
    retention_checks_passed: 0,
    active_primary_questions: 4,
    active_flashcards: 1,
    last_evidence_at: null,
    roadmap_slot: null,
    roadmap_scheduled_date: null,
    ...overrides,
  };
}

describe("study center view model", () => {
  it("groups concepts into ordered units and topics", () => {
    const model = buildStudyCenterModel([
      row({ concept_id: "c2", study_unit_id: "u2", unit_position: 2 }),
      row({ concept_id: "c1", study_unit_id: "u1", unit_position: 1 }),
      row({ concept_id: "c1b", study_unit_id: "u1", unit_position: 1 }),
    ]);

    expect(model.topics).toHaveLength(1);
    expect(model.topics[0].units.map((unit) => unit.id)).toEqual(["u1", "u2"]);
    expect(model.topics[0].units[0].totalConcepts).toBe(2);
  });

  it("continues the most recently worked incomplete unit before untouched units", () => {
    const model = buildStudyCenterModel([
      row({
        concept_id: "old",
        study_unit_id: "u1",
        state: "seen",
        last_evidence_at: "2026-08-20T10:00:00Z",
      }),
      row({
        concept_id: "recent",
        study_unit_id: "u2",
        unit_position: 2,
        state: "seen",
        last_evidence_at: "2026-08-22T10:00:00Z",
      }),
      row({ concept_id: "new", study_unit_id: "u3", unit_position: 3 }),
    ]);

    expect(model.continuation?.id).toBe("u2");
    expect(model.continuation?.status).toBe("in_progress");
  });

  it("surfaces attention when there is no partially worked incomplete unit", () => {
    const model = buildStudyCenterModel([
      row({
        concept_id: "retained",
        study_unit_id: "u1",
        state: "retained",
        unit_completed: true,
        needs_attention: true,
      }),
      row({ concept_id: "new", study_unit_id: "u2", unit_position: 2 }),
    ]);

    expect(model.continuation?.id).toBe("u1");
    expect(model.continuation?.status).toBe("needs_attention");
  });

  it("uses simple user-facing unit states and actions", () => {
    expect(studyUnitStatusLabel("not_started")).toBe("Por empezar");
    expect(studyUnitStatusLabel("in_progress")).toBe("En curso");
    expect(studyUnitStatusLabel("needs_attention")).toBe("Para reforzar");
    expect(studyUnitStatusLabel("completed")).toBe("Completada");
    expect(studyUnitActionLabel("not_started")).toBe("Estudiar");
    expect(studyUnitActionLabel("in_progress")).toBe("Continuar");
    expect(studyUnitActionLabel("needs_attention")).toBe("Repasar");
  });
});
