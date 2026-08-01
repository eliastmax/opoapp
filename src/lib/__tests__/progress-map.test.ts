// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import type { LearningStageProgress } from "../learning-stages";
import type { TopicProgressRow } from "../progress-evidence";
import {
  filterProgressMapTopics,
  needsProgressAttention,
  progressMapPhase,
  progressMapTotals,
  type ProgressMapTopic,
} from "../progress-map";

function topic(overrides: Partial<TopicProgressRow> = {}): TopicProgressRow {
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

function stages(overrides: Partial<LearningStageProgress> = {}): LearningStageProgress {
  return {
    subject_id: "subject-1",
    subject_name: "Parte general",
    topic_id: "topic-1",
    topic_number: 1,
    topic_name: "Procedimiento",
    learning_questions: 40,
    consolidation_questions: 40,
    tribunal_questions: 20,
    learning_seen: 20,
    learning_sessions: 2,
    learning_question_coverage: 50,
    learning_perspective_coverage: 50,
    learning_mastery: 75,
    learning_critical_concepts: 0,
    consolidation_unlocked: true,
    consolidation_seen: 0,
    consolidation_sessions: 0,
    consolidation_question_coverage: 0,
    consolidation_perspective_coverage: 0,
    consolidation_mastery: null,
    global_mastery: 75,
    robustness_percentage: null,
    retention_evidence: 0,
    critical_concepts: 0,
    tribunal_unlocked: false,
    recommended_stage: "consolidacion",
    stage_message: "Continúa en Consolidación.",
    metric_version: "learning-stages-v2.0",
    ...overrides,
  };
}

function entry(
  topicOverrides: Partial<TopicProgressRow> = {},
  stageOverrides: Partial<LearningStageProgress> = {},
  dueCount = 0,
): ProgressMapTopic {
  const topicRow = topic({
    unique_questions_seen: 10,
    evidence_state: "inicial",
    ...topicOverrides,
  });
  return {
    topic: topicRow,
    stages: stages({
      topic_id: topicRow.topic_id,
      topic_number: topicRow.topic_number,
      ...stageOverrides,
    }),
    dueCount,
  };
}

describe("progress map presentation", () => {
  it("uses the real learning phases and keeps an untouched topic neutral", () => {
    expect(progressMapPhase(topic(), stages())).toBe("sin_empezar");
    expect(progressMapPhase(entry().topic, entry().stages)).toBe("consolidacion");
    expect(progressMapPhase(entry().topic, stages({ recommended_stage: "tribunal" }))).toBe(
      "tribunal",
    );
  });

  it("shows route completion without inventing a fourth learning phase", () => {
    expect(progressMapPhase(entry().topic, stages({ tribunal_unlocked: true }))).toBe("completada");
  });

  it("treats failures, doubts and due reviews as attention signals", () => {
    expect(needsProgressAttention(entry({ active_failures: 1 }))).toBe(true);
    expect(needsProgressAttention(entry({ active_doubts: 1 }))).toBe(true);
    expect(needsProgressAttention(entry({}, {}, 1))).toBe(true);
    expect(needsProgressAttention(entry())).toBe(false);
  });

  it("filters the map without changing the underlying progress", () => {
    const entries = [
      { topic: topic({ topic_id: "new" }), stages: stages({ topic_id: "new" }), dueCount: 0 },
      entry({ topic_id: "course", topic_number: 2 }),
      entry({ topic_id: "attention", topic_number: 3, active_failures: 1 }),
      entry({ topic_id: "done", topic_number: 4 }, { tribunal_unlocked: true }),
    ];

    expect(filterProgressMapTopics(entries, "todos")).toHaveLength(4);
    expect(filterProgressMapTopics(entries, "en_curso").map((item) => item.topic.topic_id)).toEqual(
      ["course", "attention"],
    );
    expect(filterProgressMapTopics(entries, "atencion").map((item) => item.topic.topic_id)).toEqual(
      ["attention"],
    );
    expect(
      filterProgressMapTopics(entries, "completada").map((item) => item.topic.topic_id),
    ).toEqual(["done"]);
  });

  it("summarizes every topic exactly once", () => {
    const entries = [
      { topic: topic({ topic_id: "new" }), stages: stages({ topic_id: "new" }), dueCount: 0 },
      entry(
        { topic_id: "learning" },
        { consolidation_unlocked: false, recommended_stage: "aprendizaje" },
      ),
      entry({ topic_id: "consolidation" }),
      entry({ topic_id: "tribunal" }, { recommended_stage: "tribunal" }),
      entry({ topic_id: "done" }, { tribunal_unlocked: true }),
    ];

    expect(progressMapTotals(entries)).toEqual({
      sin_empezar: 1,
      aprendizaje: 1,
      consolidacion: 1,
      tribunal: 1,
      completada: 1,
    });
  });
});
