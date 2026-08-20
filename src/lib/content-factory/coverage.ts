import { V4_MASTERY_THRESHOLDS } from "../v4-mastery-config";
import {
  auditV4ConceptCoverage,
  type V4CoverageAudit,
  type V4CoverageMapping,
} from "../v4-content-coverage";
import type {
  FactoryQuestionAssignment,
  FactoryQuestionMetadata,
  ProposedConcept,
} from "./types";

export type FactoryMappingQa = {
  unmappedQuestionCodes: string[];
  duplicatePrimaryQuestionCodes: string[];
  invalidConceptMappings: Array<{ questionCode: string; conceptCode: string }>;
  invalidQuestionMappings: string[];
};

export type FactoryConceptCoverageStatus =
  | "ready"
  | "coverage_gap"
  | "source_review_required"
  | "source_limited";

export type FactoryConceptCoverage = {
  conceptId: string;
  status: FactoryConceptCoverageStatus;
  primaryQuestionCount: number;
  nominalThreshold: number;
  nominalMissingPrimaryQuestions: number;
  actionableMissingPrimaryQuestions: number;
  sourceSupportedCeiling: number | null;
  blockedAdditionalQuestions: number;
};

export type FactoryCoverageResult = V4CoverageAudit & {
  threshold: number;
  /** Nominal deficit against the global threshold, retained for diagnostic transparency. */
  totalMissingQuestions: number;
  /** Questions that Content Factory may legitimately generate from the approved source. */
  totalActionableMissingQuestions: number;
  /** Nominal deficit that must not be generated because the canonical source has reached its evidence ceiling. */
  totalBlockedBySourceCeiling: number;
  factoryConceptCoverage: FactoryConceptCoverage[];
  mappingQa: FactoryMappingQa;
};

function classifyConceptCoverage(input: {
  concept: ProposedConcept;
  primaryQuestionCount: number;
  threshold: number;
}): FactoryConceptCoverage {
  const nominalMissingPrimaryQuestions = Math.max(0, input.threshold - input.primaryQuestionCount);
  const capacity = input.concept.sourceCapacity;

  if (nominalMissingPrimaryQuestions === 0) {
    return {
      conceptId: input.concept.code,
      status: "ready",
      primaryQuestionCount: input.primaryQuestionCount,
      nominalThreshold: input.threshold,
      nominalMissingPrimaryQuestions: 0,
      actionableMissingPrimaryQuestions: 0,
      sourceSupportedCeiling: capacity?.status === "source_limited" ? capacity.sourceSupportedCeiling : null,
      blockedAdditionalQuestions: 0,
    };
  }

  if (capacity?.status === "source_review_required" || input.concept.sourceReviewRequired === true) {
    return {
      conceptId: input.concept.code,
      status: "source_review_required",
      primaryQuestionCount: input.primaryQuestionCount,
      nominalThreshold: input.threshold,
      nominalMissingPrimaryQuestions,
      actionableMissingPrimaryQuestions: 0,
      sourceSupportedCeiling: null,
      blockedAdditionalQuestions: 0,
    };
  }

  if (capacity?.status === "source_limited") {
    const ceiling = capacity.sourceSupportedCeiling;
    if (!Number.isInteger(ceiling) || ceiling < 1 || ceiling >= input.threshold) {
      throw new Error(
        `${input.concept.code}: sourceSupportedCeiling must be a positive integer below the nominal threshold.`,
      );
    }
    if (input.primaryQuestionCount > ceiling) {
      throw new Error(
        `${input.concept.code}: primary question count exceeds sourceSupportedCeiling.`,
      );
    }

    const actionableMissingPrimaryQuestions = Math.max(0, ceiling - input.primaryQuestionCount);
    const blockedAdditionalQuestions = input.threshold - ceiling;
    return {
      conceptId: input.concept.code,
      status: actionableMissingPrimaryQuestions > 0 ? "coverage_gap" : "source_limited",
      primaryQuestionCount: input.primaryQuestionCount,
      nominalThreshold: input.threshold,
      nominalMissingPrimaryQuestions,
      actionableMissingPrimaryQuestions,
      sourceSupportedCeiling: ceiling,
      blockedAdditionalQuestions,
    };
  }

  return {
    conceptId: input.concept.code,
    status: "coverage_gap",
    primaryQuestionCount: input.primaryQuestionCount,
    nominalThreshold: input.threshold,
    nominalMissingPrimaryQuestions,
    actionableMissingPrimaryQuestions: nominalMissingPrimaryQuestions,
    sourceSupportedCeiling: null,
    blockedAdditionalQuestions: 0,
  };
}

export function calculateFactoryCoverage(input: {
  questions: FactoryQuestionMetadata[];
  concepts: ProposedConcept[];
  assignments: FactoryQuestionAssignment[];
  threshold?: number;
}): FactoryCoverageResult {
  const threshold = input.threshold ?? V4_MASTERY_THRESHOLDS.minDistinctQuestions;
  if (!Number.isInteger(threshold) || threshold < 1) {
    throw new Error("coverage threshold must be a positive integer.");
  }

  const questionCodes = new Set(
    input.questions.filter((question) => question.active !== false).map((question) => question.code),
  );
  const conceptCodes = new Set(input.concepts.map((concept) => concept.code));
  const invalidConceptMappings: FactoryMappingQa["invalidConceptMappings"] = [];
  const invalidQuestionMappings = new Set<string>();
  const mappings: V4CoverageMapping[] = [];

  for (const assignment of input.assignments) {
    if (!questionCodes.has(assignment.questionCode)) {
      invalidQuestionMappings.add(assignment.questionCode);
    }
    if (!conceptCodes.has(assignment.primaryConceptCode)) {
      invalidConceptMappings.push({
        questionCode: assignment.questionCode,
        conceptCode: assignment.primaryConceptCode,
      });
    }
    mappings.push({
      questionId: assignment.questionCode,
      conceptId: assignment.primaryConceptCode,
      role: "primary",
    });
    for (const secondary of assignment.secondaryConceptCodes ?? []) {
      if (!conceptCodes.has(secondary)) {
        invalidConceptMappings.push({ questionCode: assignment.questionCode, conceptCode: secondary });
      }
      mappings.push({ questionId: assignment.questionCode, conceptId: secondary, role: "secondary" });
    }
  }

  const audit = auditV4ConceptCoverage({
    questions: input.questions.map((question) => ({ id: question.code, active: question.active })),
    concepts: input.concepts.map((concept) => ({ id: concept.code })),
    mappings,
    minimumPrimaryQuestions: threshold,
  });
  const auditByConcept = new Map(audit.conceptCoverage.map((row) => [row.conceptId, row]));
  const factoryConceptCoverage = input.concepts.map((concept) =>
    classifyConceptCoverage({
      concept,
      primaryQuestionCount: auditByConcept.get(concept.code)?.primaryQuestionCount ?? 0,
      threshold,
    }),
  );

  return {
    ...audit,
    threshold,
    totalMissingQuestions: audit.conceptCoverage.reduce(
      (sum, row) => sum + row.missingPrimaryQuestions,
      0,
    ),
    totalActionableMissingQuestions: factoryConceptCoverage.reduce(
      (sum, row) => sum + row.actionableMissingPrimaryQuestions,
      0,
    ),
    totalBlockedBySourceCeiling: factoryConceptCoverage.reduce(
      (sum, row) => sum + row.blockedAdditionalQuestions,
      0,
    ),
    factoryConceptCoverage,
    mappingQa: {
      unmappedQuestionCodes: audit.unmappedQuestionIds,
      duplicatePrimaryQuestionCodes: audit.duplicatePrimaryQuestionIds,
      invalidConceptMappings,
      invalidQuestionMappings: [...invalidQuestionMappings].sort(),
    },
  };
}
