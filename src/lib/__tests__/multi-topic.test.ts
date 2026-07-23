// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, it } from "bun:test";
import {
  commonRecommendedStage,
  isStageUnlockedForAll,
  lockedTopicCount,
  multiTopicSelectionValid,
} from "@/lib/multi-topic";
import type { LearningStageProgress } from "@/lib/learning-stages";

function progress(
  topicId: string,
  consolidationUnlocked: boolean,
  tribunalUnlocked: boolean,
): LearningStageProgress {
  return {
    topic_id: topicId,
    consolidation_unlocked: consolidationUnlocked,
    tribunal_unlocked: tribunalUnlocked,
    recommended_stage: tribunalUnlocked
      ? "tribunal"
      : consolidationUnlocked
        ? "consolidacion"
        : "aprendizaje",
  } as LearningStageProgress;
}

describe("multi-topic learning stages", () => {
  it("recommends the highest stage shared by every selected topic", () => {
    expect(commonRecommendedStage([progress("1", true, true), progress("2", true, false)])).toBe(
      "consolidacion",
    );
    expect(commonRecommendedStage([progress("1", true, true), progress("2", false, false)])).toBe(
      "aprendizaje",
    );
  });

  it("only unlocks a stage when every selected topic has unlocked it", () => {
    const rows = [progress("1", true, true), progress("2", true, false)];
    expect(isStageUnlockedForAll(rows, "consolidacion")).toBe(true);
    expect(isStageUnlockedForAll(rows, "tribunal")).toBe(false);
    expect(lockedTopicCount(rows, "tribunal")).toBe(1);
  });

  it("requires at least one question per topic and at least two topics", () => {
    expect(multiTopicSelectionValid(["1", "2"], 2)).toBe(true);
    expect(multiTopicSelectionValid(["1", "2", "3"], 2)).toBe(false);
    expect(multiTopicSelectionValid(["1"], 10)).toBe(false);
  });
});
