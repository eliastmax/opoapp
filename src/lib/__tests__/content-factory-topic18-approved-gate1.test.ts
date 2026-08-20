// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import {
  topic18ApprovedAssignments,
  topic18ApprovedGate1,
  topic18ApprovedGate1Report,
} from "../content-factory/consumers/topic-18-approved-gate1";

describe("Content Factory Topic 18 approved Gate 1", () => {
  test("moves SMS-T18-0239 from executivity to efficacy", () => {
    const mapping = topic18ApprovedAssignments.find((entry) => entry.questionCode === "SMS-T18-0239");
    expect(mapping?.primaryConceptCode).toBe("SMS-T18-C30");
    expect(topic18ApprovedAssignments.filter((entry) => entry.questionCode === "SMS-T18-0239")).toHaveLength(1);
    expect(topic18ApprovedGate1.correction).toEqual({
      questionCode: "SMS-T18-0239",
      from: "SMS-T18-C29",
      to: "SMS-T18-C30",
    });
  });

  test("preserves the nominal deficit while separating the source-limited ceiling", () => {
    const c29 = topic18ApprovedGate1Report.concepts.find((entry) => entry.code === "SMS-T18-C29");
    const c30 = topic18ApprovedGate1Report.concepts.find((entry) => entry.code === "SMS-T18-C30");
    expect(c29).toMatchObject({
      primaryCount: 1,
      missing: 3,
      actionableMissing: 0,
      status: "source_limited",
      sourceSupportedCeiling: 1,
      blockedAdditionalQuestions: 3,
    });
    expect(c30?.primaryCount).toBe(6);
    expect(c30?.missing).toBe(0);
    expect(topic18ApprovedGate1Report.summary.coverageGaps).toBe(12);
    expect(topic18ApprovedGate1Report.summary.sourceLimited).toBe(1);
    expect(topic18ApprovedGate1Report.summary.sourceReviewRequired).toBe(0);
    expect(topic18ApprovedGate1Report.summary.nominalQuestionsMissing).toBe(23);
    expect(topic18ApprovedGate1Report.summary.questionsNeeded).toBe(20);
    expect(topic18ApprovedGate1Report.summary.blockedAdditionalQuestions).toBe(3);
    expect(topic18ApprovedGate1Report.summary.unmappedQuestions).toBe(0);
    expect(topic18ApprovedGate1Report.summary.duplicatePrimaryQuestions).toBe(0);
  });
});
