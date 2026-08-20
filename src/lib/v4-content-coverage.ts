import { V4_MASTERY_THRESHOLDS } from "./v4-mastery-config";
import type { V4SourceCapacity } from "./v4-source-capacity";

export type V4CoverageQuestion = {
  id: string;
  active?: boolean;
};

export type V4CoverageConcept = {
  id: string;
  active?: boolean;
  sourceCapacity?: V4SourceCapacity;
};

export type V4CoverageMapping = {
  questionId: string;
  conceptId: string;
  role: "primary" | "secondary";
};

export type V4ConceptCoverageRow = {
  conceptId: string;
  primaryQuestionCount: number;
  status: "ready" | "coverage_gap" | "source_limited";
  /** Nominal gap against the standard mastery floor; never hidden. */
  missingPrimaryQuestions: number;
  actionableMissingPrimaryQuestions: number;
  nominalThreshold: number;
  sourceSupportedCeiling: number | null;
  blockedAdditionalQuestions: number;
};

export type V4CoverageAudit = {
  activeQuestionCount: number;
  activeConceptCount: number;
  mappedPrimaryQuestionCount: number;
  unmappedQuestionIds: string[];
  duplicatePrimaryQuestionIds: string[];
  conceptCoverage: V4ConceptCoverageRow[];
  /** Concepts for which more primary questions can legitimately be created. */
  underCoveredConceptIds: string[];
  /** Concepts below the nominal threshold, including completed source-limited concepts. */
  nominalUnderCoveredConceptIds: string[];
};

/**
 * Audits canonical V4 mapping before import.
 * Standard concepts retain the four-primary floor. A source-limited concept may
 * have a lower approved evidence ceiling, but the nominal four-question deficit
 * remains visible for editorial diagnostics.
 */
export function auditV4ConceptCoverage(input: {
  questions: V4CoverageQuestion[];
  concepts: V4CoverageConcept[];
  mappings: V4CoverageMapping[];
  minimumPrimaryQuestions?: number;
}): V4CoverageAudit {
  const minimumPrimaryQuestions =
    input.minimumPrimaryQuestions ?? V4_MASTERY_THRESHOLDS.minDistinctQuestions;
  if (!Number.isInteger(minimumPrimaryQuestions) || minimumPrimaryQuestions < 1) {
    throw new Error("minimumPrimaryQuestions must be a positive integer.");
  }

  const activeQuestions = input.questions.filter((question) => question.active !== false);
  const activeConcepts = input.concepts.filter((concept) => concept.active !== false);
  const activeQuestionIds = new Set(activeQuestions.map((question) => question.id));
  const activeConceptIds = new Set(activeConcepts.map((concept) => concept.id));

  const primaryConceptsByQuestion = new Map<string, string[]>();
  const primaryQuestionsByConcept = new Map<string, Set<string>>();

  for (const mapping of input.mappings) {
    if (mapping.role !== "primary") continue;
    if (!activeQuestionIds.has(mapping.questionId)) continue;
    if (!activeConceptIds.has(mapping.conceptId)) continue;

    const conceptsForQuestion = primaryConceptsByQuestion.get(mapping.questionId) ?? [];
    conceptsForQuestion.push(mapping.conceptId);
    primaryConceptsByQuestion.set(mapping.questionId, conceptsForQuestion);

    const questionsForConcept = primaryQuestionsByConcept.get(mapping.conceptId) ?? new Set<string>();
    questionsForConcept.add(mapping.questionId);
    primaryQuestionsByConcept.set(mapping.conceptId, questionsForConcept);
  }

  const unmappedQuestionIds = [...activeQuestionIds]
    .filter((questionId) => (primaryConceptsByQuestion.get(questionId)?.length ?? 0) === 0)
    .sort();

  const duplicatePrimaryQuestionIds = [...primaryConceptsByQuestion.entries()]
    .filter(([, conceptIds]) => conceptIds.length > 1)
    .map(([questionId]) => questionId)
    .sort();

  const conceptCoverage = activeConcepts
    .map((concept): V4ConceptCoverageRow => {
      const primaryQuestionCount = primaryQuestionsByConcept.get(concept.id)?.size ?? 0;
      const missingPrimaryQuestions = Math.max(0, minimumPrimaryQuestions - primaryQuestionCount);
      const ceiling = concept.sourceCapacity?.status === "source_limited"
        ? concept.sourceCapacity.sourceSupportedCeiling
        : null;

      if (ceiling !== null) {
        if (!Number.isInteger(ceiling) || ceiling < 1 || ceiling > 3 || ceiling >= minimumPrimaryQuestions) {
          throw new Error(`${concept.id}: invalid sourceSupportedCeiling.`);
        }
        if (primaryQuestionCount > ceiling) {
          throw new Error(`${concept.id}: primary question count exceeds sourceSupportedCeiling.`);
        }
        const actionableMissingPrimaryQuestions = Math.max(0, ceiling - primaryQuestionCount);
        return {
          conceptId: concept.id,
          primaryQuestionCount,
          status: actionableMissingPrimaryQuestions > 0 ? "coverage_gap" : "source_limited",
          missingPrimaryQuestions,
          actionableMissingPrimaryQuestions,
          nominalThreshold: minimumPrimaryQuestions,
          sourceSupportedCeiling: ceiling,
          blockedAdditionalQuestions: minimumPrimaryQuestions - ceiling,
        };
      }

      return {
        conceptId: concept.id,
        primaryQuestionCount,
        status: missingPrimaryQuestions === 0 ? "ready" : "coverage_gap",
        missingPrimaryQuestions,
        actionableMissingPrimaryQuestions: missingPrimaryQuestions,
        nominalThreshold: minimumPrimaryQuestions,
        sourceSupportedCeiling: null,
        blockedAdditionalQuestions: 0,
      };
    })
    .sort((a, b) => a.conceptId.localeCompare(b.conceptId));

  return {
    activeQuestionCount: activeQuestionIds.size,
    activeConceptCount: activeConceptIds.size,
    mappedPrimaryQuestionCount: [...activeQuestionIds].filter(
      (questionId) => (primaryConceptsByQuestion.get(questionId)?.length ?? 0) >= 1,
    ).length,
    unmappedQuestionIds,
    duplicatePrimaryQuestionIds,
    conceptCoverage,
    underCoveredConceptIds: conceptCoverage
      .filter((row) => row.actionableMissingPrimaryQuestions > 0)
      .map((row) => row.conceptId),
    nominalUnderCoveredConceptIds: conceptCoverage
      .filter((row) => row.missingPrimaryQuestions > 0)
      .map((row) => row.conceptId),
  };
}
