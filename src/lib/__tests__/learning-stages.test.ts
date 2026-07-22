// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import {
  isStageUnlocked,
  learningStage,
  stageRequirements,
  type LearningStageProgress,
} from "../learning-stages";

const progress: LearningStageProgress = {
  subject_id: "subject",
  subject_name: "Materia",
  topic_id: "topic",
  topic_number: 1,
  topic_name: "Tema",
  learning_questions: 20,
  consolidation_questions: 20,
  tribunal_questions: 10,
  learning_seen: 16,
  learning_sessions: 2,
  learning_question_coverage: 80,
  learning_perspective_coverage: 90,
  learning_mastery: 92,
  learning_critical_concepts: 0,
  consolidation_unlocked: false,
  consolidation_seen: 0,
  consolidation_sessions: 0,
  consolidation_question_coverage: 0,
  consolidation_perspective_coverage: 0,
  consolidation_mastery: null,
  global_mastery: 92,
  robustness_percentage: null,
  retention_evidence: 0,
  critical_concepts: 0,
  tribunal_unlocked: false,
  recommended_stage: "aprendizaje",
  stage_message: "Reparte Aprendizaje entre al menos tres sesiones.",
  metric_version: "learning-stages-v1.0",
};

describe("learning stages", () => {
  it("never blocks Aprendizaje and preserves the explicit unlocks", () => {
    expect(isStageUnlocked(progress, "aprendizaje")).toBe(true);
    expect(isStageUnlocked(progress, "consolidacion")).toBe(false);
    expect(isStageUnlocked({ ...progress, consolidation_unlocked: true }, "consolidacion")).toBe(
      true,
    );
  });

  it("does not treat an unknown value as an advanced stage", () => {
    expect(learningStage("otro")).toBe("aprendizaje");
    expect(learningStage("tribunal")).toBe("tribunal");
  });

  it("explains the exact missing evidence", () => {
    expect(stageRequirements(progress, "consolidacion")).toEqual(["Sesiones: 2 de 3"]);
    expect(stageRequirements(progress, "tribunal")).toContain("Completar primero Aprendizaje");
    expect(stageRequirements(progress, "tribunal")).toContain("Retenciones separadas: 0 de 2");
  });
});
