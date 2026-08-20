// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import {
  buildGate1Report,
  calculateFactoryCoverage,
  planDirectedQuestionGeneration,
  type ContentFactoryJob,
  type FactoryQuestionAssignment,
  type FactoryQuestionMetadata,
  type ProposedConcept,
  type ProposedStudyUnit,
} from "../content-factory";

const source = [{ label: "Temario.pdf", reference: "Temario.pdf, art. 1", pageStart: 1, pageEnd: 1 }];

function question(code: string): FactoryQuestionMetadata {
  return { code, active: true, stem: code };
}

function unit(): ProposedStudyUnit {
  return { code: "SMS-T01-U01", title: "Unidad", position: 1, sourceRefs: source };
}

function concept(input: Partial<ProposedConcept> & Pick<ProposedConcept, "code">): ProposedConcept {
  return {
    code: input.code,
    unitCode: "SMS-T01-U01",
    title: input.title ?? input.code,
    description: input.description ?? "Descripción",
    position: input.position ?? 1,
    ...input,
  };
}

function job(questions: FactoryQuestionMetadata[]): ContentFactoryJob {
  return {
    version: "1.0",
    oppositionCode: "auxiliar-administrativo-sms",
    topicNumber: 1,
    mode: "existing_bank",
    codePrefix: "SMS-T01",
    coverageThreshold: 4,
    source,
    existingQuestions: questions,
  };
}

describe("Content Factory source-limited coverage", () => {
  test("distinguishes a reached source ceiling from an actionable coverage gap", () => {
    const questions = [question("SMS-T01-0001")];
    const concepts = [concept({
      code: "SMS-T01-C01",
      sourceCapacity: {
        status: "source_limited",
        sourceSupportedCeiling: 1,
        reason: "The canonical source contains one independent rule.",
      },
    })];
    const assignments: FactoryQuestionAssignment[] = [
      { questionCode: "SMS-T01-0001", primaryConceptCode: "SMS-T01-C01" },
    ];

    const coverage = calculateFactoryCoverage({ questions, concepts, assignments, threshold: 4 });
    expect(coverage.totalMissingQuestions).toBe(3);
    expect(coverage.totalActionableMissingQuestions).toBe(0);
    expect(coverage.totalBlockedBySourceCeiling).toBe(3);
    expect(coverage.factoryConceptCoverage).toEqual([
      {
        conceptId: "SMS-T01-C01",
        status: "source_limited",
        primaryQuestionCount: 1,
        nominalThreshold: 4,
        nominalMissingPrimaryQuestions: 3,
        actionableMissingPrimaryQuestions: 0,
        sourceSupportedCeiling: 1,
        blockedAdditionalQuestions: 3,
      },
    ]);

    const plan = planDirectedQuestionGeneration({
      coverage,
      codePrefix: "SMS-T01",
      usedQuestionCodes: questions.map((entry) => entry.code),
    });
    expect(plan).toEqual([]);
  });

  test("generates only up to a source ceiling that has not been reached yet", () => {
    const questions = [question("SMS-T01-0001")];
    const concepts = [concept({
      code: "SMS-T01-C01",
      sourceCapacity: {
        status: "source_limited",
        sourceSupportedCeiling: 3,
        reason: "Three independent dimensions are supported by the canonical source.",
      },
    })];
    const coverage = calculateFactoryCoverage({
      questions,
      concepts,
      assignments: [{ questionCode: "SMS-T01-0001", primaryConceptCode: "SMS-T01-C01" }],
      threshold: 4,
    });

    expect(coverage.factoryConceptCoverage[0]).toMatchObject({
      status: "coverage_gap",
      nominalMissingPrimaryQuestions: 3,
      actionableMissingPrimaryQuestions: 2,
      sourceSupportedCeiling: 3,
      blockedAdditionalQuestions: 1,
    });
    expect(planDirectedQuestionGeneration({
      coverage,
      codePrefix: "SMS-T01",
      usedQuestionCodes: questions.map((entry) => entry.code),
    })).toHaveLength(2);
  });

  test("keeps source_review_required separate and blocks generation until human review", () => {
    const questions = [question("SMS-T01-0001")];
    const concepts = [concept({
      code: "SMS-T01-C01",
      sourceCapacity: {
        status: "source_review_required",
        reason: "The canonical source is ambiguous for the proposed proposition.",
      },
    })];
    const coverage = calculateFactoryCoverage({
      questions,
      concepts,
      assignments: [{ questionCode: "SMS-T01-0001", primaryConceptCode: "SMS-T01-C01" }],
      threshold: 4,
    });

    expect(coverage.factoryConceptCoverage[0]).toMatchObject({
      status: "source_review_required",
      nominalMissingPrimaryQuestions: 3,
      actionableMissingPrimaryQuestions: 0,
      blockedAdditionalQuestions: 0,
    });
    expect(planDirectedQuestionGeneration({
      coverage,
      codePrefix: "SMS-T01",
      usedQuestionCodes: questions.map((entry) => entry.code),
    })).toEqual([]);
  });

  test("reports actionable gaps, source_limited and source_review_required independently", () => {
    const questions = [question("SMS-T01-0001"), question("SMS-T01-0002"), question("SMS-T01-0003")];
    const concepts = [
      concept({ code: "SMS-T01-C01", position: 1 }),
      concept({
        code: "SMS-T01-C02",
        position: 2,
        sourceCapacity: {
          status: "source_limited",
          sourceSupportedCeiling: 1,
          reason: "Atomic source.",
        },
      }),
      concept({
        code: "SMS-T01-C03",
        position: 3,
        sourceCapacity: { status: "source_review_required", reason: "Ambiguous source." },
      }),
    ];
    const assignments: FactoryQuestionAssignment[] = [
      { questionCode: "SMS-T01-0001", primaryConceptCode: "SMS-T01-C01" },
      { questionCode: "SMS-T01-0002", primaryConceptCode: "SMS-T01-C02" },
      { questionCode: "SMS-T01-0003", primaryConceptCode: "SMS-T01-C03" },
    ];
    const report = buildGate1Report({ job: job(questions), units: [unit()], concepts, assignments });

    expect(report.summary.coverageGaps).toBe(1);
    expect(report.summary.sourceLimited).toBe(1);
    expect(report.summary.sourceReviewRequired).toBe(1);
    expect(report.summary.nominalQuestionsMissing).toBe(9);
    expect(report.summary.questionsNeeded).toBe(3);
    expect(report.summary.blockedAdditionalQuestions).toBe(3);
  });

  test("rejects contradictory source ceilings", () => {
    const questions = [question("SMS-T01-0001"), question("SMS-T01-0002")];
    const concepts = [concept({
      code: "SMS-T01-C01",
      sourceCapacity: {
        status: "source_limited",
        sourceSupportedCeiling: 1,
        reason: "Contradictory test fixture.",
      },
    })];
    expect(() => calculateFactoryCoverage({
      questions,
      concepts,
      assignments: questions.map((entry) => ({ questionCode: entry.code, primaryConceptCode: "SMS-T01-C01" })),
      threshold: 4,
    })).toThrow("primary question count exceeds sourceSupportedCeiling");
  });
});
