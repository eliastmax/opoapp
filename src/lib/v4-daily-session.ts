import type { ConceptMasteryState } from "./concept-mastery";
import type { V4TodayPlan, V4TodayPlanBlock } from "./v4-today-plan";

export type V4DailySessionStatus = "active" | "completed" | "closed_early";
export type V4DailyBlockStatus = "planned" | "in_progress" | "completed" | "skipped";

export type V4DailySessionBlockInput = Pick<
  V4TodayPlanBlock,
  | "kind"
  | "label"
  | "minutes"
  | "topicId"
  | "studyUnitId"
  | "conceptId"
  | "targetQuestions"
  | "retentionCheckpointDays"
  | "reasonCode"
  | "reason"
>;

export type V4DailySessionPlanInput = {
  localDate: string;
  availableMinutes: number;
  blocks: V4DailySessionBlockInput[];
};

export type V4ConceptDebriefSnapshot = {
  beforeState: ConceptMasteryState | null;
  afterState: ConceptMasteryState | null;
  neededAttentionBefore: boolean;
  needsAttentionAfter: boolean;
};

export type V4DailySessionDebrief = {
  status: "complete" | "closed_early" | "still_active";
  completedBlocks: number;
  totalBlocks: number;
  skippedBlocks: number;
  improvedConcepts: number;
  newlyRetainedConcepts: number;
  attentionResolved: number;
  attentionRemaining: number;
  messageCode:
    | "session_in_progress"
    | "session_complete"
    | "session_complete_attention"
    | "session_closed_early"
    | "session_closed_early_attention";
};

const STATE_ORDER: ConceptMasteryState[] = [
  "unseen",
  "seen",
  "verifying",
  "consolidating",
  "retained",
];

function stateRank(state: ConceptMasteryState | null) {
  if (state === null) return -1;
  return STATE_ORDER.indexOf(state);
}

export function dailySessionPlanFromTodayPlan(args: {
  localDate: string;
  plan: V4TodayPlan;
}): V4DailySessionPlanInput {
  return {
    localDate: args.localDate.slice(0, 10),
    availableMinutes: args.plan.availableMinutes,
    blocks: args.plan.blocks.map((block) => ({
      kind: block.kind,
      label: block.label,
      minutes: block.minutes,
      topicId: block.topicId,
      studyUnitId: block.studyUnitId,
      conceptId: block.conceptId,
      targetQuestions: block.targetQuestions,
      retentionCheckpointDays: block.retentionCheckpointDays,
      reasonCode: block.reasonCode,
      reason: block.reason,
    })),
  };
}

/**
 * The debrief is interpretation only. It never mutates mastery or awards progress.
 * Improvement means the concept's evidence-derived state is now higher than it
 * was when the session was planned.
 */
export function buildV4DailySessionDebrief(args: {
  sessionStatus: V4DailySessionStatus;
  blockStatuses: V4DailyBlockStatus[];
  concepts: V4ConceptDebriefSnapshot[];
}): V4DailySessionDebrief {
  const completedBlocks = args.blockStatuses.filter((status) => status === "completed").length;
  const skippedBlocks = args.blockStatuses.filter((status) => status === "skipped").length;
  const totalBlocks = args.blockStatuses.length;
  const improvedConcepts = args.concepts.filter(
    (concept) => stateRank(concept.afterState) > stateRank(concept.beforeState),
  ).length;
  const newlyRetainedConcepts = args.concepts.filter(
    (concept) => concept.afterState === "retained" && concept.beforeState !== "retained",
  ).length;
  const attentionResolved = args.concepts.filter(
    (concept) => concept.neededAttentionBefore && !concept.needsAttentionAfter,
  ).length;
  const attentionRemaining = args.concepts.filter((concept) => concept.needsAttentionAfter).length;

  const status =
    args.sessionStatus === "active"
      ? "still_active"
      : args.sessionStatus === "completed"
        ? "complete"
        : "closed_early";

  const messageCode: V4DailySessionDebrief["messageCode"] =
    status === "still_active"
      ? "session_in_progress"
      : status === "complete"
        ? attentionRemaining > 0
          ? "session_complete_attention"
          : "session_complete"
        : attentionRemaining > 0
          ? "session_closed_early_attention"
          : "session_closed_early";

  return {
    status,
    completedBlocks,
    totalBlocks,
    skippedBlocks,
    improvedConcepts,
    newlyRetainedConcepts,
    attentionResolved,
    attentionRemaining,
    messageCode,
  };
}
