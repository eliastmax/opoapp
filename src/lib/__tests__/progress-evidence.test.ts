// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import {
  evidenceDescription,
  evidenceState,
  groupProgressBySubject,
  nextProgressAction,
  type TopicProgressRow,
} from "../progress-evidence";

function row(overrides: Partial<TopicProgressRow> = {}): TopicProgressRow {
  return {
    active_doubts: 0,
    active_failures: 0,
    active_questions: 100,
    available_concepts: 10,
    available_perspectives: 8,
    completed_sessions: 0,
    coverage_percentage: 0,
    evidence_state: "sin_base",
    first_activity_at: null,
    last_activity_at: null,
    latest_correct_questions: 0,
    mastery_percentage: null,
    metric_version: "progress-v1.0",
    seen_concepts: 0,
    seen_perspectives: 0,
    subject_id: "subject-1",
    subject_name: "Parte general",
    topic_id: "topic-1",
    topic_name: "Procedimiento",
    topic_number: 1,
    unique_questions_seen: 0,
    ...overrides,
  };
}

describe("progress evidence presentation", () => {
  it("does not turn an unknown state into a strong conclusion", () => {
    expect(evidenceState("future_state")).toBe("sin_base");
    expect(evidenceDescription(evidenceState("future_state"))).toContain("Aún no");
  });

  it("prioritizes active failures and doubts", () => {
    expect(nextProgressAction(row({ evidence_state: "suficiente", active_failures: 2 }))).toContain(
      "fallos y dudas",
    );
  });

  it("recommends more distinct questions while evidence is initial", () => {
    expect(
      nextProgressAction(row({ evidence_state: "inicial", unique_questions_seen: 8 })),
    ).toContain("preguntas distintas");
  });

  it("groups topics by subject without mixing their identities", () => {
    const grouped = groupProgressBySubject([
      row(),
      row({ topic_id: "topic-2", topic_number: 2 }),
      row({ subject_id: "subject-2", subject_name: "Parte específica", topic_id: "topic-3" }),
    ]);

    expect(grouped).toHaveLength(2);
    expect(grouped[0].topics).toHaveLength(2);
    expect(grouped[1].name).toBe("Parte específica");
  });
});
