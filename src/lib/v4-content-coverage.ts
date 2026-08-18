import { V4_MASTERY_THRESHOLDS } from "./v4-mastery-config";

export type V4CoverageQuestion = {
  id: string;
  active?: boolean;
};

export type V4CoverageConcept = {
  id: string;
  active?: boolean;
};

export type V4CoverageMapping = {
  questionId: string;
  conceptId: string;
  role: "primary" | "secondary";
};

export type V4ConceptCoverageRow = {
  conceptId: string;
  primaryQuestionCount: number;
  status: "ready" | "coverage_gap";
  missingPrimaryQuestions: number;
};

export type V4CoverageAudit = {
  activeQuestionCount: number;
  activeConceptCount: number;
  mappedPrimaryQuestionCount: number;
  unmappedQuestionIds: string[];
  duplicatePrimaryQuestionIds: string[];
  conceptCoverage: V4ConceptCoverageRow[];
  underCoveredConceptIds: string[];
};

/**
 * Audits the canonical V4 mapping before import.
 *
 * Secondary mappings never satisfy the baseline mastery-coverage requirement.
 * A concept needs enough distinct primary questions to make the mastery model
 * measurable without relying on memorising one repeated question.
 */
export function auditV4ConceptCoverage(input: {
  questions: V4CoverageQuestion[];
  concepts: V4CoverageConcept[];
  mappings: V4CoverageMapping[];
}): V4CoverageAudit {
  const activeQuestionIds = new Set(
    input.questions.filter((question) => question.active !== false).map((question) => question.id),
  );
  const activeConceptIds = new Set(
    input.concepts.filter((concept) => concept.active !== false).map((concept) => concept.id),
  );

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

  const conceptCoverage = [...activeConceptIds]
    .map((conceptId): V4ConceptCoverageRow => {
      const primaryQuestionCount = primaryQuestionsByConcept.get(conceptId)?.size ?? 0;
      const missingPrimaryQuestions = Math.max(
        0,
        V4_MASTERY_THRESHOLDS.minDistinctQuestions - primaryQuestionCount,
      );
      return {
        conceptId,
        primaryQuestionCount,
        status: missingPrimaryQuestions === 0 ? "ready" : "coverage_gap",
        missingPrimaryQuestions,
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
      .filter((row) => row.status === "coverage_gap")
      .map((row) => row.conceptId),
  };
}
