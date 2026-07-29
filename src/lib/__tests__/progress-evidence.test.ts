// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import {
  evidenceDescription,
  evidenceState,
  nextProgressAction,
  sortProgressByTopicNumber,
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

  it("sorts topics numerically regardless of their subject", () => {
    const sorted = sortProgressByTopicNumber([
      row({ subject_id: "subject-2", topic_id: "topic-20", topic_number: 20 }),
      row({ subject_id: "subject-1", topic_id: "topic-3", topic_number: 3 }),
      row({ subject_id: "subject-3", topic_id: "topic-11", topic_number: 11 }),
      row({ subject_id: "subject-1", topic_id: "topic-2", topic_number: 2 }),
    ]);

    expect(sorted.map((topic) => topic.topic_number)).toEqual([2, 3, 11, 20]);
  });
});
