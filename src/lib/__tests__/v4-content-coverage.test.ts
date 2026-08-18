// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import { auditV4ConceptCoverage } from "../v4-content-coverage";

describe("V4 concept coverage audit", () => {
  test("marks a concept ready with four distinct primary questions", () => {
    const result = auditV4ConceptCoverage({
      questions: ["q1", "q2", "q3", "q4"].map((id) => ({ id })),
      concepts: [{ id: "c1" }],
      mappings: ["q1", "q2", "q3", "q4"].map((questionId) => ({
        questionId,
        conceptId: "c1",
        role: "primary" as const,
      })),
    });

    expect(result.unmappedQuestionIds).toEqual([]);
    expect(result.underCoveredConceptIds).toEqual([]);
    expect(result.conceptCoverage[0]).toMatchObject({
      conceptId: "c1",
      primaryQuestionCount: 4,
      status: "ready",
      missingPrimaryQuestions: 0,
    });
  });

  test("flags concepts with fewer than four primary questions", () => {
    const result = auditV4ConceptCoverage({
      questions: ["q1", "q2", "q3"].map((id) => ({ id })),
      concepts: [{ id: "c1" }],
      mappings: ["q1", "q2", "q3"].map((questionId) => ({
        questionId,
        conceptId: "c1",
        role: "primary" as const,
      })),
    });

    expect(result.underCoveredConceptIds).toEqual(["c1"]);
    expect(result.conceptCoverage[0].missingPrimaryQuestions).toBe(1);
  });

  test("secondary mappings do not inflate baseline mastery coverage", () => {
    const result = auditV4ConceptCoverage({
      questions: ["q1", "q2", "q3", "q4"].map((id) => ({ id })),
      concepts: [{ id: "c1" }, { id: "c2" }],
      mappings: [
        { questionId: "q1", conceptId: "c1", role: "primary" },
        { questionId: "q2", conceptId: "c1", role: "primary" },
        { questionId: "q3", conceptId: "c1", role: "primary" },
        { questionId: "q4", conceptId: "c1", role: "primary" },
        { questionId: "q1", conceptId: "c2", role: "secondary" },
        { questionId: "q2", conceptId: "c2", role: "secondary" },
        { questionId: "q3", conceptId: "c2", role: "secondary" },
        { questionId: "q4", conceptId: "c2", role: "secondary" },
      ],
    });

    expect(result.conceptCoverage.find((row) => row.conceptId === "c2")).toMatchObject({
      primaryQuestionCount: 0,
      status: "coverage_gap",
      missingPrimaryQuestions: 4,
    });
  });

  test("ignores inactive questions and concepts", () => {
    const result = auditV4ConceptCoverage({
      questions: [
        { id: "q1" },
        { id: "q2", active: false },
      ],
      concepts: [
        { id: "c1" },
        { id: "c2", active: false },
      ],
      mappings: [
        { questionId: "q1", conceptId: "c1", role: "primary" },
        { questionId: "q2", conceptId: "c1", role: "primary" },
        { questionId: "q1", conceptId: "c2", role: "secondary" },
      ],
    });

    expect(result.activeQuestionCount).toBe(1);
    expect(result.activeConceptCount).toBe(1);
    expect(result.conceptCoverage[0].primaryQuestionCount).toBe(1);
  });

  test("reports unmapped questions and duplicate primary assignments", () => {
    const result = auditV4ConceptCoverage({
      questions: [{ id: "q1" }, { id: "q2" }],
      concepts: [{ id: "c1" }, { id: "c2" }],
      mappings: [
        { questionId: "q1", conceptId: "c1", role: "primary" },
        { questionId: "q1", conceptId: "c2", role: "primary" },
      ],
    });

    expect(result.unmappedQuestionIds).toEqual(["q2"]);
    expect(result.duplicatePrimaryQuestionIds).toEqual(["q1"]);
  });
});
