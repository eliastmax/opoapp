// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import { parseCsv } from "../csv-parser";
import {
  auditGeneratedQuestionCandidates,
  calculateFactoryCoverage,
  serializeV2Rows,
} from "../content-factory";
import {
  topic18ApprovedAssignments,
  topic18ApprovedGate1Report,
} from "../content-factory/consumers/topic-18-approved-gate1";
import {
  topic18GapQuestionCandidates,
  topic18SourceReviewRequiredSlots,
} from "../content-factory/consumers/topic-18-gap-questions";
import {
  topic18Gate1Concepts,
  topic18Gate1Job,
} from "../content-factory/consumers/topic-18-gate1";

function codeOf(candidate: (typeof topic18GapQuestionCandidates)[number]) {
  return String(candidate.v2.codigo);
}

describe("Content Factory Topic 18 directed gap generation", () => {
  test("preserves the exact mathematical deficit while refusing unsupported C29 paraphrases", () => {
    expect(topic18ApprovedGate1Report.summary.questionsNeeded).toBe(23);
    expect(topic18GapQuestionCandidates).toHaveLength(20);
    expect(topic18SourceReviewRequiredSlots).toHaveLength(3);
    expect(topic18GapQuestionCandidates.length + topic18SourceReviewRequiredSlots.length).toBe(23);
    expect(topic18SourceReviewRequiredSlots.every((slot) => slot.conceptCode === "SMS-T18-C29")).toBe(true);
    expect(topic18SourceReviewRequiredSlots.every((slot) => slot.status === "source_review_required")).toBe(true);
  });

  test("generates only for approved coverage gaps and every candidate is born concept-bound", () => {
    const gapCodes = new Set(
      topic18ApprovedGate1Report.concepts.filter((entry) => entry.coverageGap).map((entry) => entry.code),
    );
    expect(topic18GapQuestionCandidates.every((candidate) => gapCodes.has(candidate.conceptCode))).toBe(true);
    expect(topic18GapQuestionCandidates.some((candidate) => candidate.conceptCode === "SMS-T18-C29")).toBe(false);
    expect(topic18GapQuestionCandidates.every((candidate) => candidate.dimensions.length === 1)).toBe(true);
  });

  test("uses distinct evidence dimensions within every multi-question generated concept", () => {
    const byConcept = new Map<string, string[]>();
    for (const candidate of topic18GapQuestionCandidates) {
      const dimensions = byConcept.get(candidate.conceptCode) ?? [];
      dimensions.push(...candidate.dimensions);
      byConcept.set(candidate.conceptCode, dimensions);
    }
    for (const dimensions of byConcept.values()) {
      expect(new Set(dimensions).size).toBe(dimensions.length);
    }
  });

  test("all generated rows use Temario_new.pdf and the real V2 parser", () => {
    const qa = auditGeneratedQuestionCandidates({
      candidates: topic18GapQuestionCandidates,
      concepts: topic18Gate1Concepts,
    });
    expect(qa.valid).toBe(true);
    expect(qa.parser.validRows).toBe(20);
    expect(qa.parser.errors).toEqual([]);
    expect(qa.extremeAnswerImbalance).toBe(false);
    expect(qa.answerDistribution).toEqual({ A: 5, B: 5, C: 5, D: 5 });
    expect(
      topic18GapQuestionCandidates.every(
        (candidate) =>
          candidate.v2.documento_referencia === "Temario_new.pdf" &&
          String(candidate.v2.referencia_fuente).startsWith("Temario_new.pdf"),
      ),
    ).toBe(true);

    const parsed = parseCsv(serializeV2Rows(topic18GapQuestionCandidates.map((candidate) => candidate.v2)));
    if ("fatal" in parsed) throw new Error(parsed.fatal);
    expect(parsed.mode).toBe("v2");
    expect(parsed.valid).toHaveLength(20);
    expect(parsed.errors).toEqual([]);
  });

  test("closes every generable gap and leaves only C29 visibly under-covered", () => {
    const generatedQuestions = topic18GapQuestionCandidates.map((candidate) => ({
      code: codeOf(candidate),
      active: true,
      stem: String(candidate.v2.pregunta),
    }));
    const generatedAssignments = topic18GapQuestionCandidates.map((candidate) => ({
      questionCode: codeOf(candidate),
      primaryConceptCode: candidate.conceptCode,
    }));
    const coverage = calculateFactoryCoverage({
      questions: [...(topic18Gate1Job.existingQuestions ?? []), ...generatedQuestions],
      concepts: topic18Gate1Concepts,
      assignments: [...topic18ApprovedAssignments, ...generatedAssignments],
      threshold: 4,
    });
    const gaps = coverage.conceptCoverage.filter((entry) => entry.status === "coverage_gap");
    expect(gaps).toEqual([
      expect.objectContaining({ conceptId: "SMS-T18-C29", primaryQuestionCount: 1, missingPrimaryQuestions: 3 }),
    ]);
    expect(coverage.totalMissingQuestions).toBe(3);
  });
});
