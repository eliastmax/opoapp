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

export type FactoryCoverageResult = V4CoverageAudit & {
  threshold: number;
  totalMissingQuestions: number;
  mappingQa: FactoryMappingQa;
};

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

  return {
    ...audit,
    threshold,
    totalMissingQuestions: audit.conceptCoverage.reduce(
      (sum, row) => sum + row.missingPrimaryQuestions,
      0,
    ),
    mappingQa: {
      unmappedQuestionCodes: audit.unmappedQuestionIds,
      duplicatePrimaryQuestionCodes: audit.duplicatePrimaryQuestionIds,
      invalidConceptMappings,
      invalidQuestionMappings: [...invalidQuestionMappings].sort(),
    },
  };
}
