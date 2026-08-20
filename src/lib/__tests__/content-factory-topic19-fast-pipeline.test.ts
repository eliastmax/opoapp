// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import {
  topic19AllActiveQuestionCodes,
  topic19BenchmarkReadiness,
  topic19CanonicalAssignments,
  topic19CanonicalExistingQuestions,
  topic19Concepts,
  topic19FastPipelineExceptionQueue,
  topic19FastPipelineGovernancePacket,
  topic19FastPipelineRun1,
  topic19LegacySourceQuestionCodes,
  topic19StudyContent,
  topic19Units,
} from "../content-factory/consumers/topic-19-fast-pipeline";

describe("Content Factory Topic 19 FAST PIPELINE benchmark RUN 1", () => {
  test("ingests all 240 active codes while quarantining the 19 non-canonical legacy-source rows", () => {
    expect(topic19AllActiveQuestionCodes).toHaveLength(240);
    expect(new Set(topic19AllActiveQuestionCodes).size).toBe(240);
    expect(topic19CanonicalExistingQuestions).toHaveLength(221);
    expect(topic19LegacySourceQuestionCodes).toHaveLength(19);
    expect(topic19CanonicalExistingQuestions.some((row) => topic19LegacySourceQuestionCodes.includes(row.code))).toBe(false);
    expect(new Set([
      ...topic19CanonicalExistingQuestions.map((row) => row.code),
      ...topic19LegacySourceQuestionCodes,
    ]).size).toBe(240);
  });

  test("builds a high-confidence 15-unit / 40-concept structural draft from the canonical-supported bank", () => {
    expect(topic19Units).toHaveLength(15);
    expect(topic19Concepts).toHaveLength(40);
    expect(topic19CanonicalAssignments).toHaveLength(221);
    expect(topic19Concepts.every((concept) => concept.confidence === "high")).toBe(true);
    expect(topic19FastPipelineRun1.initialCoverage?.factoryConceptCoverage.filter((row) => row.status === "ready")).toHaveLength(35);
    expect(topic19FastPipelineRun1.initialCoverage?.factoryConceptCoverage.filter((row) => row.status === "coverage_gap")).toEqual([
      expect.objectContaining({ conceptId: "SMS-T19-C07", primaryQuestionCount: 3, actionableMissingPrimaryQuestions: 1 }),
      expect.objectContaining({ conceptId: "SMS-T19-C23", primaryQuestionCount: 3, actionableMissingPrimaryQuestions: 1 }),
      expect.objectContaining({ conceptId: "SMS-T19-C25", primaryQuestionCount: 3, actionableMissingPrimaryQuestions: 1 }),
      expect.objectContaining({ conceptId: "SMS-T19-C31", primaryQuestionCount: 3, actionableMissingPrimaryQuestions: 1 }),
      expect.objectContaining({ conceptId: "SMS-T19-C33", primaryQuestionCount: 3, actionableMissingPrimaryQuestions: 1 }),
    ]);
    expect(topic19FastPipelineRun1.initialCoverage?.factoryConceptCoverage.filter((row) => row.status === "source_limited")).toEqual([]);
  });

  test("generates exactly five complete canonical V2 questions and closes all legitimate coverage gaps", () => {
    expect(topic19FastPipelineRun1.generationSlots.map((slot) => slot.questionCode)).toEqual([
      "SMS-T19-0241",
      "SMS-T19-0242",
      "SMS-T19-0243",
      "SMS-T19-0244",
      "SMS-T19-0245",
    ]);
    expect(topic19FastPipelineRun1.draft.generatedQuestions).toHaveLength(5);
    expect(topic19FastPipelineRun1.draft.generatedQuestions.map((candidate) => candidate.conceptCode)).toEqual([
      "SMS-T19-C07",
      "SMS-T19-C23",
      "SMS-T19-C25",
      "SMS-T19-C31",
      "SMS-T19-C33",
    ]);
    expect(topic19FastPipelineRun1.questionQa?.parser.validRows).toBe(5);
    expect(topic19FastPipelineRun1.questionQa?.parser.errors).toEqual([]);
    expect(topic19FastPipelineRun1.questionQa?.valid).toBe(true);
    expect(topic19FastPipelineRun1.questionQa?.extremeAnswerImbalance).toBe(false);
    expect(topic19FastPipelineRun1.finalCoverage?.factoryConceptCoverage.filter((row) => row.status === "ready")).toHaveLength(40);
    expect(topic19FastPipelineRun1.finalCoverage?.totalActionableMissingQuestions).toBe(0);
    expect(topic19FastPipelineRun1.finalCoverage?.mappingQa.unmappedQuestionCodes).toEqual([]);
    expect(topic19FastPipelineRun1.finalCoverage?.mappingQa.duplicatePrimaryQuestionCodes).toEqual([]);
  });

  test("prepares complete V4 study content without crossing the production gate", () => {
    expect(topic19StudyContent.units).toHaveLength(15);
    expect(topic19StudyContent.concepts).toHaveLength(40);
    expect(topic19StudyContent.flashcards).toHaveLength(80);
    expect(topic19FastPipelineRun1.portable?.v4Package.questionMappings).toHaveLength(226);
    expect(topic19FastPipelineRun1.portable?.validation.v4.valid).toBe(true);
    expect(topic19FastPipelineRun1.portable?.validation.v4.coverage.underCoveredConceptIds).toEqual([]);
    expect(topic19FastPipelineRun1.portable?.importReady).toBe(false);
    expect(topic19BenchmarkReadiness.importReady).toBe(false);
  });

  test("keeps every new substantive artifact canonical-only", () => {
    const generated = topic19FastPipelineRun1.draft.generatedQuestions.map((candidate) => candidate.v2);
    expect(generated.every((row) => row.documento_referencia === "Temario_new.pdf")).toBe(true);
    expect(generated.every((row) => String(row.referencia_fuente).includes("Temario_new.pdf"))).toBe(true);
    expect(topic19StudyContent.units.flatMap((unit) => unit.sourceRefs).every((source) => `${source.label} ${source.reference}`.includes("Temario_new.pdf"))).toBe(true);
    expect(topic19StudyContent.flashcards.flatMap((card) => card.sourceRefs ?? []).every((source) => `${source.label} ${source.reference}`.includes("Temario_new.pdf"))).toBe(true);
  });

  test("surfaces one central source-review blocker instead of 19 artificial mapping microgates", () => {
    expect(topic19FastPipelineExceptionQueue).toHaveLength(1);
    expect(topic19FastPipelineExceptionQueue[0]).toMatchObject({
      type: "source_review_required",
      blocker: true,
      confidence: "low",
      subject: { kind: "topic", id: "SMS-T19-resource-source-boundary" },
    });
    expect(topic19FastPipelineGovernancePacket.summary).toMatchObject({
      activeExistingQuestions: 240,
      canonicalEligibleExistingQuestions: 221,
      quarantinedSourceQuestions: 19,
      units: 15,
      concepts: 40,
      standardReady: 40,
      actionableCoverageGaps: 0,
      sourceLimitedCandidates: 0,
      sourceReviewRequired: 1,
      generatedQuestions: 5,
      unmappedCanonicalEligible: 0,
      multiplePrimary: 0,
      highConfidenceConceptsWithoutSpecificReview: 40,
      totalExceptions: 1,
      blockers: 1,
      reviewRecommended: 0,
    });
  });
});
