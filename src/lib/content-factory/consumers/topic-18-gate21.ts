import { calculateFactoryCoverage } from "../coverage";
import { topic18ApprovedAssignments, topic18ApprovedConcepts } from "./topic-18-approved-gate1";
import { topic18Gate21QuestionCandidates, topic18Gate21HardenedQuestionCodes } from "./topic-18-gap-questions-gate21";
import { topic18Gate1Job } from "./topic-18-gate1";
import { topic18SourceLimitedSlots } from "./topic-18-source-limited";

function questionCode(candidate: (typeof topic18Gate21QuestionCandidates)[number]) {
  return String(candidate.v2.codigo);
}

export const topic18Gate21Coverage = calculateFactoryCoverage({
  questions: [
    ...(topic18Gate1Job.existingQuestions ?? []),
    ...topic18Gate21QuestionCandidates.map((candidate) => ({
      code: questionCode(candidate),
      active: true,
      stem: String(candidate.v2.pregunta),
    })),
  ],
  concepts: topic18ApprovedConcepts,
  assignments: [
    ...topic18ApprovedAssignments,
    ...topic18Gate21QuestionCandidates.map((candidate) => ({
      questionCode: questionCode(candidate),
      primaryConceptCode: candidate.conceptCode,
    })),
  ],
  threshold: 4,
});

export const topic18Gate21Summary = {
  ready: topic18Gate21Coverage.factoryConceptCoverage.filter((row) => row.status === "ready").length,
  actionableCoverageGaps: topic18Gate21Coverage.factoryConceptCoverage.filter((row) => row.status === "coverage_gap").length,
  sourceLimited: topic18Gate21Coverage.factoryConceptCoverage.filter((row) => row.status === "source_limited").length,
  sourceReviewRequired: topic18Gate21Coverage.factoryConceptCoverage.filter((row) => row.status === "source_review_required").length,
  nominalMissingQuestions: topic18Gate21Coverage.totalMissingQuestions,
  actionableMissingQuestions: topic18Gate21Coverage.totalActionableMissingQuestions,
  blockedBySourceCeiling: topic18Gate21Coverage.totalBlockedBySourceCeiling,
  generatedQuestions: topic18Gate21QuestionCandidates.length,
  hardenedQuestions: topic18Gate21HardenedQuestionCodes.length,
  sourceLimitedSlots: topic18SourceLimitedSlots.length,
} as const;
