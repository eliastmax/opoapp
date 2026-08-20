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
  topic18ApprovedConcepts,
  topic18ApprovedGate1Report,
} from "../content-factory/consumers/topic-18-approved-gate1";
import {
  topic18Gate21HardenedQuestionCodes,
  topic18Gate21QuestionCandidates,
} from "../content-factory/consumers/topic-18-gap-questions-gate21";
import { topic18Gate1Job } from "../content-factory/consumers/topic-18-gate1";
import { topic18SourceLimitedSlots } from "../content-factory/consumers/topic-18-source-limited";

function codeOf(candidate: (typeof topic18Gate21QuestionCandidates)[number]) {
  return String(candidate.v2.codigo);
}

function optionTexts(candidate: (typeof topic18Gate21QuestionCandidates)[number]) {
  return ["opcion_a", "opcion_b", "opcion_c", "opcion_d"].map((key) =>
    String(candidate.v2[key] ?? "").trim(),
  );
}

describe("Content Factory Topic 18 Gate 2.1", () => {
  test("keeps the nominal deficit visible while converting C29 into source_limited", () => {
    expect(topic18ApprovedGate1Report.summary.nominalQuestionsMissing).toBe(23);
    expect(topic18ApprovedGate1Report.summary.questionsNeeded).toBe(20);
    expect(topic18ApprovedGate1Report.summary.coverageGaps).toBe(12);
    expect(topic18ApprovedGate1Report.summary.sourceLimited).toBe(1);
    expect(topic18ApprovedGate1Report.summary.sourceReviewRequired).toBe(0);
    expect(topic18ApprovedGate1Report.summary.blockedAdditionalQuestions).toBe(3);

    const c29 = topic18ApprovedGate1Report.concepts.find((entry) => entry.code === "SMS-T18-C29");
    expect(c29).toMatchObject({
      status: "source_limited",
      primaryCount: 1,
      nominalThreshold: 4,
      missing: 3,
      actionableMissing: 0,
      sourceSupportedCeiling: 1,
      blockedAdditionalQuestions: 3,
    });
    expect(topic18Gate21QuestionCandidates).toHaveLength(20);
    expect(topic18SourceLimitedSlots).toHaveLength(3);
    expect(topic18SourceLimitedSlots.every((slot) => slot.status === "source_limited")).toBe(true);
    expect(topic18SourceLimitedSlots.every((slot) => slot.conceptCode === "SMS-T18-C29")).toBe(true);
  });

  test("generates only for actionable approved gaps and every candidate is born concept-bound", () => {
    const gapCodes = new Set(
      topic18ApprovedGate1Report.concepts.filter((entry) => entry.status === "coverage_gap").map((entry) => entry.code),
    );
    expect(topic18Gate21QuestionCandidates.every((candidate) => gapCodes.has(candidate.conceptCode))).toBe(true);
    expect(topic18Gate21QuestionCandidates.some((candidate) => candidate.conceptCode === "SMS-T18-C29")).toBe(false);
    expect(topic18Gate21QuestionCandidates.every((candidate) => candidate.dimensions.length === 1)).toBe(true);
  });

  test("uses distinct evidence dimensions within every multi-question generated concept", () => {
    const byConcept = new Map<string, string[]>();
    for (const candidate of topic18Gate21QuestionCandidates) {
      const dimensions = byConcept.get(candidate.conceptCode) ?? [];
      dimensions.push(...candidate.dimensions);
      byConcept.set(candidate.conceptCode, dimensions);
    }
    for (const dimensions of byConcept.values()) {
      expect(new Set(dimensions).size).toBe(dimensions.length);
    }
  });

  test("hardens exactly the nine Governance-selected candidates without changing cardinality", () => {
    expect(topic18Gate21HardenedQuestionCodes).toEqual([
      "SMS-T18-0241",
      "SMS-T18-0242",
      "SMS-T18-0243",
      "SMS-T18-0249",
      "SMS-T18-0253",
      "SMS-T18-0255",
      "SMS-T18-0256",
      "SMS-T18-0261",
      "SMS-T18-0263",
    ]);
    expect(new Set(topic18Gate21QuestionCandidates.map(codeOf)).size).toBe(20);
  });

  test("all final generated rows use Temario_new.pdf and the real V2 parser", () => {
    const qa = auditGeneratedQuestionCandidates({
      candidates: topic18Gate21QuestionCandidates,
      concepts: topic18ApprovedConcepts,
    });
    expect(qa.valid).toBe(true);
    expect(qa.issues).toEqual([]);
    expect(qa.parser.validRows).toBe(20);
    expect(qa.parser.errors).toEqual([]);
    expect(qa.extremeAnswerImbalance).toBe(false);
    expect(qa.answerDistribution).toEqual({ A: 5, B: 5, C: 5, D: 5 });
    expect(
      topic18Gate21QuestionCandidates.every(
        (candidate) =>
          candidate.v2.documento_referencia === "Temario_new.pdf" &&
          String(candidate.v2.referencia_fuente).startsWith("Temario_new.pdf"),
      ),
    ).toBe(true);

    const parsed = parseCsv(serializeV2Rows(topic18Gate21QuestionCandidates.map((candidate) => candidate.v2)));
    if ("fatal" in parsed) throw new Error(parsed.fatal);
    expect(parsed.mode).toBe("v2");
    expect(parsed.valid).toHaveLength(20);
    expect(parsed.errors).toEqual([]);
  });

  test("adversarially avoids giveaway option patterns and gross length clues across the full lot", () => {
    for (const candidate of topic18Gate21QuestionCandidates) {
      const options = optionTexts(candidate);
      const normalized = options.map((option) => option.toLocaleLowerCase("es"));
      expect(normalized.some((option) => /todas las anteriores|ninguna de las anteriores/.test(option))).toBe(false);
      expect(normalized.some((option) => option.length < 20)).toBe(false);
      const lengths = options.map((option) => option.length);
      const ratio = Math.max(...lengths) / Math.min(...lengths);
      expect(ratio).toBeLessThanOrEqual(2.3);
    }
  });

  test("ends with 43 ready, zero actionable gaps and one source_limited concept", () => {
    const generatedQuestions = topic18Gate21QuestionCandidates.map((candidate) => ({
      code: codeOf(candidate),
      active: true,
      stem: String(candidate.v2.pregunta),
    }));
    const generatedAssignments = topic18Gate21QuestionCandidates.map((candidate) => ({
      questionCode: codeOf(candidate),
      primaryConceptCode: candidate.conceptCode,
    }));
    const coverage = calculateFactoryCoverage({
      questions: [...(topic18Gate1Job.existingQuestions ?? []), ...generatedQuestions],
      concepts: topic18ApprovedConcepts,
      assignments: [...topic18ApprovedAssignments, ...generatedAssignments],
      threshold: 4,
    });

    expect(coverage.factoryConceptCoverage.filter((entry) => entry.status === "ready")).toHaveLength(43);
    expect(coverage.factoryConceptCoverage.filter((entry) => entry.status === "coverage_gap")).toHaveLength(0);
    expect(coverage.factoryConceptCoverage.filter((entry) => entry.status === "source_review_required")).toHaveLength(0);
    expect(coverage.factoryConceptCoverage.filter((entry) => entry.status === "source_limited")).toEqual([
      expect.objectContaining({
        conceptId: "SMS-T18-C29",
        primaryQuestionCount: 1,
        nominalThreshold: 4,
        sourceSupportedCeiling: 1,
        blockedAdditionalQuestions: 3,
      }),
    ]);
    expect(coverage.totalMissingQuestions).toBe(3);
    expect(coverage.totalActionableMissingQuestions).toBe(0);
    expect(coverage.totalBlockedBySourceCeiling).toBe(3);
  });
});
