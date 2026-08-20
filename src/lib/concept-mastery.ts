import { V4_MASTERY_THRESHOLDS } from "./v4-mastery-config";
import {
  sourceLimitedRetentionDistinctQuestions,
  type V4SourceCapacity,
} from "./v4-source-capacity";

export type ConceptMasteryState =
  | "unseen"
  | "seen"
  | "verifying"
  | "consolidating"
  | "retained";

export type ConceptQuestionEvidence = {
  questionId: string;
  sessionId: string;
  answeredAt: string;
  correct: boolean;
  markedDoubt?: boolean;
  /**
   * Set only when the attempt was deliberately scheduled as a retention check.
   * Typical checkpoints are 3, 7, 14 and 30 days.
   */
  retentionCheckpointDays?: number | null;
};

export type ConceptFlashcardEvidence = {
  cardId: string;
  reviewedAt: string;
  correct: boolean;
};

export type ConceptMasteryInput = {
  previousState?: ConceptMasteryState;
  unitCompleted?: boolean;
  questionEvidence?: ConceptQuestionEvidence[];
  flashcardEvidence?: ConceptFlashcardEvidence[];
  /** Catalog metadata. Omitted means the unchanged standard V4 policy. */
  sourceCapacity?: V4SourceCapacity;
};

export type ConceptMasteryEvaluation = {
  state: ConceptMasteryState;
  needsAttention: boolean;
  distinctQuestions: number;
  safeCorrectQuestions: number;
  safeAccuracy: number | null;
  distinctSessions: number;
  retentionChecksPassed: number;
  nextReviewDelayDays: number | null;
  reasonCode:
    | "no_evidence"
    | "exposed"
    | "limited_question_evidence"
    | "needs_more_sessions"
    | "accuracy_not_safe"
    | "consolidating"
    | "retained"
    | "recent_instability";
};

const STATE_ORDER: ConceptMasteryState[] = [
  "unseen",
  "seen",
  "verifying",
  "consolidating",
  "retained",
];

function safeCorrect(evidence: ConceptQuestionEvidence) {
  return evidence.correct && !evidence.markedDoubt;
}

function timestamp(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Only the latest attempt for each question is considered when calculating
 * mastery. Repeating the same question can update whether it is currently
 * answered safely, but never increases the amount of distinct evidence.
 */
function latestAttemptPerQuestion(evidence: ConceptQuestionEvidence[]) {
  const latest = new Map<string, ConceptQuestionEvidence>();
  for (const attempt of evidence) {
    const current = latest.get(attempt.questionId);
    if (!current || timestamp(attempt.answeredAt) >= timestamp(current.answeredAt)) {
      latest.set(attempt.questionId, attempt);
    }
  }
  return [...latest.values()].sort((a, b) => timestamp(a.answeredAt) - timestamp(b.answeredAt));
}

function latestAttemptPerCard(evidence: ConceptFlashcardEvidence[]) {
  const latest = new Map<string, ConceptFlashcardEvidence>();
  for (const review of evidence) {
    const current = latest.get(review.cardId);
    if (!current || timestamp(review.reviewedAt) >= timestamp(current.reviewedAt)) {
      latest.set(review.cardId, review);
    }
  }
  return [...latest.values()].sort((a, b) => timestamp(a.reviewedAt) - timestamp(b.reviewedAt));
}

function previousStateFloor(previousState: ConceptMasteryState | undefined) {
  return previousState ? STATE_ORDER.indexOf(previousState) : 0;
}

function dropAtMostOneState(
  previousState: ConceptMasteryState | undefined,
  candidate: ConceptMasteryState,
  recentInstability: boolean,
) {
  if (!previousState || !recentInstability) return candidate;

  const previousIndex = previousStateFloor(previousState);
  const candidateIndex = STATE_ORDER.indexOf(candidate);

  if (candidateIndex >= previousIndex) return candidate;
  return STATE_ORDER[Math.max(previousIndex - 1, candidateIndex)];
}

export function conceptReviewDelayDays(
  state: ConceptMasteryState,
  retentionChecksPassed: number,
  needsAttention: boolean,
) {
  if (state === "unseen") return null;
  if (needsAttention) return 1;
  if (state === "seen" || state === "verifying") return 1;
  if (state === "consolidating") return retentionChecksPassed >= 1 ? 7 : 3;
  return retentionChecksPassed >= 3 ? 30 : 14;
}

export function evaluateConceptMastery(input: ConceptMasteryInput): ConceptMasteryEvaluation {
  const questionEvidence = input.questionEvidence ?? [];
  const flashcardEvidence = input.flashcardEvidence ?? [];
  const latestQuestions = latestAttemptPerQuestion(questionEvidence);
  const latestCards = latestAttemptPerCard(flashcardEvidence);
  const sourceLimited = input.sourceCapacity?.status === "source_limited" ? input.sourceCapacity : null;

  const hasExposure = Boolean(input.unitCompleted) || questionEvidence.length > 0 || flashcardEvidence.length > 0;
  const distinctQuestions = latestQuestions.length;
  const safeCorrectQuestions = latestQuestions.filter(safeCorrect).length;
  const safeAccuracy = distinctQuestions > 0 ? safeCorrectQuestions / distinctQuestions : null;
  const distinctSessions = new Set(questionEvidence.map((attempt) => attempt.sessionId)).size;

  const retentionPasses = questionEvidence
    .filter(
      (attempt) =>
        safeCorrect(attempt) &&
        typeof attempt.retentionCheckpointDays === "number" &&
        attempt.retentionCheckpointDays >= V4_MASTERY_THRESHOLDS.firstRetentionCheckpointDays,
    )
    .sort((a, b) => timestamp(a.answeredAt) - timestamp(b.answeredAt));

  const retentionChecksPassed = new Set(
    retentionPasses.map((attempt) => `${attempt.retentionCheckpointDays}:${attempt.questionId}`),
  ).size;
  const hasThreeDayPass = retentionPasses.some(
    (attempt) =>
      (attempt.retentionCheckpointDays ?? 0) >= V4_MASTERY_THRESHOLDS.firstRetentionCheckpointDays,
  );
  const hasSevenDayPass = retentionPasses.some(
    (attempt) =>
      (attempt.retentionCheckpointDays ?? 0) >= V4_MASTERY_THRESHOLDS.secondRetentionCheckpointDays,
  );
  const retentionDistinctQuestions = new Set(retentionPasses.map((attempt) => attempt.questionId)).size;
  const retentionDistinctSessions = new Set(retentionPasses.map((attempt) => attempt.sessionId)).size;

  const recentQuestions = latestQuestions.slice(-3);
  const recentCards = latestCards.slice(-3);
  const recentUnsafe = recentQuestions.filter((attempt) => !safeCorrect(attempt)).length;
  const twoConsecutiveUnsafe =
    recentQuestions.length >= 2 && recentQuestions.slice(-2).every((attempt) => !safeCorrect(attempt));

  const questionAttention = recentQuestions.some((attempt) => !safeCorrect(attempt));
  const flashcardAttention = recentCards.some((review) => !review.correct);
  const needsAttention = questionAttention || flashcardAttention;
  // Standard keeps the exact former instability rule. With a source-limited
  // atomic pool, one unsafe latest question may represent the whole concept;
  // treat that as instability so an established state still falls at most one step.
  const recentInstability =
    recentUnsafe >= 2 || twoConsecutiveUnsafe || Boolean(sourceLimited && questionAttention);

  let candidate: ConceptMasteryState = "unseen";
  let reasonCode: ConceptMasteryEvaluation["reasonCode"] = "no_evidence";

  if (hasExposure) {
    candidate = "seen";
    reasonCode = "exposed";
  }

  if (distinctQuestions >= 2) {
    candidate = "verifying";
    reasonCode = "limited_question_evidence";
  }

  const requiredDistinctQuestions = sourceLimited
    ? sourceLimited.sourceSupportedCeiling
    : V4_MASTERY_THRESHOLDS.minDistinctQuestions;
  const requiredSafeCorrectQuestions = sourceLimited
    ? sourceLimited.sourceSupportedCeiling
    : V4_MASTERY_THRESHOLDS.minSafeCorrectQuestions;
  const requiredSafeAccuracy = sourceLimited ? 1 : V4_MASTERY_THRESHOLDS.minSafeAccuracy;

  const enoughForConsolidation =
    distinctQuestions >= requiredDistinctQuestions &&
    safeCorrectQuestions >= requiredSafeCorrectQuestions &&
    safeAccuracy !== null &&
    safeAccuracy >= requiredSafeAccuracy;

  if (enoughForConsolidation && distinctSessions < V4_MASTERY_THRESHOLDS.minDistinctSessions) {
    reasonCode = "needs_more_sessions";
  } else if (
    distinctQuestions >= requiredDistinctQuestions &&
    (safeAccuracy ?? 0) < requiredSafeAccuracy
  ) {
    reasonCode = "accuracy_not_safe";
  } else if (
    enoughForConsolidation &&
    distinctSessions >= V4_MASTERY_THRESHOLDS.minDistinctSessions
  ) {
    candidate = "consolidating";
    reasonCode = "consolidating";
  }

  const requiredRetentionDistinctQuestions = sourceLimited
    ? sourceLimitedRetentionDistinctQuestions(sourceLimited)
    : V4_MASTERY_THRESHOLDS.minRetentionDistinctQuestions;
  const enoughForRetention =
    candidate === "consolidating" &&
    hasThreeDayPass &&
    hasSevenDayPass &&
    retentionDistinctQuestions >= requiredRetentionDistinctQuestions &&
    retentionDistinctSessions >= V4_MASTERY_THRESHOLDS.minRetentionDistinctSessions;

  if (enoughForRetention) {
    candidate = "retained";
    reasonCode = "retained";
  }

  const state = dropAtMostOneState(input.previousState, candidate, recentInstability);
  if (state !== candidate && recentInstability) reasonCode = "recent_instability";

  return {
    state,
    needsAttention,
    distinctQuestions,
    safeCorrectQuestions,
    safeAccuracy,
    distinctSessions,
    retentionChecksPassed,
    nextReviewDelayDays: conceptReviewDelayDays(state, retentionChecksPassed, needsAttention),
    reasonCode,
  };
}
