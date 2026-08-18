import { V4_MASTERY_THRESHOLDS } from "./v4-mastery-config";

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
  const recentInstability = recentUnsafe >= 2 || twoConsecutiveUnsafe;

  const questionAttention = recentQuestions.some((attempt) => !safeCorrect(attempt));
  const flashcardAttention = recentCards.some((review) => !review.correct);
  const needsAttention = questionAttention || flashcardAttention;

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

  const enoughForConsolidation =
    distinctQuestions >= V4_MASTERY_THRESHOLDS.minDistinctQuestions &&
    safeCorrectQuestions >= V4_MASTERY_THRESHOLDS.minSafeCorrectQuestions &&
    safeAccuracy !== null &&
    safeAccuracy >= V4_MASTERY_THRESHOLDS.minSafeAccuracy;

  if (enoughForConsolidation && distinctSessions < V4_MASTERY_THRESHOLDS.minDistinctSessions) {
    reasonCode = "needs_more_sessions";
  } else if (
    distinctQuestions >= V4_MASTERY_THRESHOLDS.minDistinctQuestions &&
    (safeAccuracy ?? 0) < V4_MASTERY_THRESHOLDS.minSafeAccuracy
  ) {
    reasonCode = "accuracy_not_safe";
  } else if (
    enoughForConsolidation &&
    distinctSessions >= V4_MASTERY_THRESHOLDS.minDistinctSessions
  ) {
    candidate = "consolidating";
    reasonCode = "consolidating";
  }

  const enoughForRetention =
    candidate === "consolidating" &&
    hasThreeDayPass &&
    hasSevenDayPass &&
    retentionDistinctQuestions >= V4_MASTERY_THRESHOLDS.minRetentionDistinctQuestions &&
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
