import {
  isStageUnlocked,
  learningStage,
  type LearningStage,
  type LearningStageProgress,
} from "@/lib/learning-stages";

export type ContentScope = "tema" | "varios" | "todo";

export function commonRecommendedStage(rows: LearningStageProgress[]): LearningStage {
  if (rows.length === 0) return "aprendizaje";
  if (rows.every((row) => isStageUnlocked(row, "tribunal"))) return "tribunal";
  if (rows.every((row) => isStageUnlocked(row, "consolidacion"))) {
    return "consolidacion";
  }
  return "aprendizaje";
}

export function isStageUnlockedForAll(
  rows: LearningStageProgress[],
  stage: LearningStage,
): boolean {
  return rows.length > 0 && rows.every((row) => isStageUnlocked(row, stage));
}

export function lockedTopicCount(rows: LearningStageProgress[], stage: LearningStage): number {
  return rows.filter((row) => !isStageUnlocked(row, stage)).length;
}

export function recommendedStageForScope(
  rows: LearningStageProgress[],
  singleTopicId?: string,
): LearningStage {
  if (singleTopicId) {
    return learningStage(rows.find((row) => row.topic_id === singleTopicId)?.recommended_stage);
  }
  return commonRecommendedStage(rows);
}

export function multiTopicSelectionValid(topicIds: string[], questionCount: number): boolean {
  return topicIds.length >= 2 && questionCount >= topicIds.length;
}
