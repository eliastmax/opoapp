// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import {
  hasLearningHistory,
  remainingSessionMinutes,
  todayExperienceState,
  todayPlanReason,
  todayPlanTitle,
} from "../today-experience";
import type { V4DailySession } from "../v4-experience";
import type { V4TodayContextRow, V4TodayPlan } from "../v4-today-plan";

const row = (overrides: Partial<V4TodayContextRow> = {}): V4TodayContextRow => ({
  concept_id: "concept",
  concept_code: "C01",
  concept_title: "Concepto",
  topic_id: "topic",
  topic_number: 18,
  topic_name: "Procedimiento administrativo",
  study_unit_id: "unit",
  study_unit_code: "U01",
  study_unit_title: "Actos administrativos",
  unit_position: 1,
  unit_estimated_minutes: 10,
  unit_completed: false,
  state: "unseen",
  needs_attention: false,
  next_review_on: null,
  reason_code: "no_evidence",
  distinct_questions: 0,
  safe_correct_questions: 0,
  safe_accuracy: null,
  distinct_sessions: 0,
  retention_checks_passed: 0,
  active_primary_questions: 4,
  active_flashcards: 2,
  last_evidence_at: null,
  roadmap_slot: 1,
  roadmap_scheduled_date: "2026-08-20",
  ...overrides,
});

const plan = (overrides: Partial<V4TodayPlan> = {}): V4TodayPlan => ({
  status: "ready",
  availableMinutes: 25,
  plannedMinutes: 18,
  unusedMinutes: 7,
  nextDueOn: null,
  blocks: [
    {
      kind: "advance",
      label: "Avanzar",
      minutes: 10,
      topicId: "topic",
      topicNumber: 18,
      topicName: "Procedimiento administrativo",
      studyUnitId: "unit",
      studyUnitCode: "U01",
      studyUnitTitle: "Actos administrativos",
      conceptId: null,
      conceptCode: null,
      conceptTitle: null,
      targetQuestions: 0,
      retentionCheckpointDays: null,
      reasonCode: "roadmap_study_unit",
      reason: "Ruta",
    },
  ],
  ...overrides,
});

const session = (status: V4DailySession["status"] = "active"): V4DailySession => ({
  id: "session",
  localDate: "2026-08-20",
  availableMinutes: 25,
  plannedMinutes: 18,
  status,
  startedAt: "2026-08-20T10:00:00Z",
  completedAt: status === "active" ? null : "2026-08-20T10:18:00Z",
  blocks: [
    {
      id: "block-1",
      position: 1,
      kind: "advance",
      label: "Estudiar",
      plannedMinutes: 10,
      topicId: "topic",
      studyUnitId: "unit",
      conceptId: null,
      targetQuestions: 0,
      retentionCheckpointDays: null,
      reasonCode: "roadmap_study_unit",
      reason: "Ruta",
      status: "completed",
      masteryStateBefore: null,
      needsAttentionBefore: false,
      linkedTestId: null,
      startedAt: "2026-08-20T10:00:00Z",
      completedAt: "2026-08-20T10:10:00Z",
    },
    {
      id: "block-2",
      position: 2,
      kind: "verify",
      label: "Comprobar",
      plannedMinutes: 8,
      topicId: "topic",
      studyUnitId: "unit",
      conceptId: "concept",
      targetQuestions: 2,
      retentionCheckpointDays: null,
      reasonCode: "start_verification",
      reason: "Comprobar",
      status: "in_progress",
      masteryStateBefore: "seen",
      needsAttentionBefore: false,
      linkedTestId: null,
      startedAt: "2026-08-20T10:10:00Z",
      completedAt: null,
    },
  ],
});

describe("Today experience presentation", () => {
  test("separates unconfigured, first-session and habitual users", () => {
    expect(
      todayExperienceState({ preparationConfigured: false, rows: [], session: null, plan: plan() }),
    ).toBe("unconfigured");
    expect(
      todayExperienceState({
        preparationConfigured: true,
        rows: [row()],
        session: null,
        plan: plan(),
      }),
    ).toBe("first_session");
    expect(
      todayExperienceState({
        preparationConfigured: true,
        rows: [row({ unit_completed: true, state: "seen" })],
        session: null,
        plan: plan(),
      }),
    ).toBe("habitual");
  });

  test("an existing guided session always dominates Today", () => {
    expect(
      todayExperienceState({
        preparationConfigured: true,
        rows: [row()],
        session: session(),
        plan: plan(),
      }),
    ).toBe("session_active");
    expect(remainingSessionMinutes(session())).toBe(8);
  });

  test("keeps manual-test presence outside the primary-state decision", () => {
    const state = todayExperienceState({
      preparationConfigured: true,
      rows: [row()],
      session: null,
      plan: plan(),
    });
    expect(state).toBe("first_session");
  });

  test("turns reviews and doubts into calm session copy without debt counts", () => {
    const withRepair = plan({
      blocks: [
        { ...plan().blocks[0], kind: "repair", label: "Corregir", conceptId: "concept" },
        { ...plan().blocks[0], studyUnitTitle: "Plazos administrativos" },
      ],
    });
    expect(todayPlanTitle(withRepair)).toBe("Corrige lo pendiente y avanza");
    expect(todayPlanReason(withRepair)).toContain("Plazos administrativos");
    expect(todayPlanReason(withRepair)).toContain("repasos prioritarios");
    expect(todayPlanReason(withRepair)).not.toMatch(/\d/);
  });

  test("recognizes every existing evidence signal as history", () => {
    expect(hasLearningHistory([row()])).toBe(false);
    expect(hasLearningHistory([row({ last_evidence_at: "2026-08-20T10:00:00Z" })])).toBe(true);
    expect(hasLearningHistory([row({ distinct_questions: 1 })])).toBe(true);
  });
});
