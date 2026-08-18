// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import { roadmapProgress, weeklyRoadmapViewState, type WeeklyRoadmapRow } from "../weekly-roadmap";

const row = (overrides: Partial<WeeklyRoadmapRow> = {}): WeeklyRoadmapRow => ({
  available_days: [1, 3],
  completed_questions: 10,
  completed_sessions: 1,
  exam_guidance: "Guía",
  questions: 10,
  reason: "Motivo",
  reason_code: "limited_evidence",
  remaining_questions: 10,
  remaining_sessions: 1,
  scheduled_date: "2026-08-05",
  slot_number: 1,
  target_questions: 20,
  target_sessions: 2,
  topic_id: "topic",
  topic_name: "Tema 1",
  week_end: "2026-08-09",
  week_start: "2026-08-03",
  ...overrides,
});

describe("weekly roadmap presentation", () => {
  test("uses the backend terminal states without deriving them", () => {
    expect(
      weeklyRoadmapViewState([
        row({ reason_code: "week_complete", scheduled_date: null, topic_name: null }),
      ]),
    ).toMatchObject({ status: "week_complete" });
    expect(
      weeklyRoadmapViewState([
        row({ reason_code: "no_days_remaining", scheduled_date: null, topic_name: null }),
      ]),
    ).toMatchObject({ status: "no_days_remaining" });
    expect(
      weeklyRoadmapViewState([
        row({ reason_code: "no_questions_available", scheduled_date: null, topic_name: null }),
      ]),
    ).toMatchObject({ status: "no_questions_available" });
  });

  test("does not display partial rows as scheduled sessions", () => {
    expect(weeklyRoadmapViewState([row({ topic_name: null })])).toEqual({ status: "empty" });
  });

  test("only turns the delivered weekly totals into a display progress", () => {
    expect(roadmapProgress(row())).toBe(50);
    expect(roadmapProgress(row({ target_sessions: 0 }))).toBe(0);
    expect(roadmapProgress(row({ completed_sessions: 4, target_sessions: 2 }))).toBe(100);
  });
});
