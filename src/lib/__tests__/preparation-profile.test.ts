// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import {
  ASSESSMENT_OPTIONS,
  assessedTopicCount,
  canContinuePreparationStep,
  emptyPreparationProfileDraft,
  practiceDaysFromDatabase,
  practiceDaysToDatabase,
  preparationStepProgress,
  type PreparationProfileDraft,
} from "../preparation-profile";

const draft: PreparationProfileDraft = {
  oppositionId: "opposition-1",
  examTiming: { precision: "unknown", value: null },
  practiceDays: ["monday"],
  questionsPerSession: 10,
  topicAssessments: { "topic-1": 0, "topic-2": null },
};

describe("V3.1 preparation profile presentation", () => {
  it("keeps every declared assessment distinct, including unknown", () => {
    expect(ASSESSMENT_OPTIONS.map((option) => option.value)).toEqual([0, 25, 50, 75, 100, null]);
  });

  it("counts an explicit unknown assessment as answered", () => {
    expect(assessedTopicCount(["topic-1", "topic-2", "topic-3"], draft.topicAssessments)).toBe(2);
  });

  it("requires one meaningful answer in each setup step", () => {
    expect(canContinuePreparationStep("opposition", draft)).toBe(true);
    expect(canContinuePreparationStep("exam", draft)).toBe(true);
    expect(canContinuePreparationStep("days", draft)).toBe(true);
    expect(canContinuePreparationStep("session", draft)).toBe(true);
    expect(canContinuePreparationStep("days", { ...draft, practiceDays: [] })).toBe(false);
    expect(
      canContinuePreparationStep("exam", {
        ...draft,
        examTiming: { precision: "exact", value: "" },
      }),
    ).toBe(false);
  });

  it("uses a simple five-step progress indicator", () => {
    expect(preparationStepProgress("opposition")).toBe(20);
    expect(preparationStepProgress("topics")).toBe(100);
  });

  it("maps stable weekday identifiers without depending on labels", () => {
    expect(practiceDaysToDatabase(["monday", "wednesday", "sunday"])).toEqual([1, 3, 7]);
    expect(practiceDaysFromDatabase([2, 6])).toEqual(["tuesday", "saturday"]);
  });

  it("creates an empty draft without claiming any preparation", () => {
    expect(emptyPreparationProfileDraft("opposition-1")).toEqual({
      oppositionId: "opposition-1",
      examTiming: null,
      practiceDays: [],
      questionsPerSession: null,
      topicAssessments: {},
    });
  });
});
