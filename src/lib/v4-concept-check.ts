import type { ConceptMasteryState } from "./concept-mastery";

export type V4ConceptCheckMode = "review" | "repair" | "verify";

export const V4_RETENTION_CHECKPOINTS = [3, 7, 14, 30] as const;

export function v4RetentionCheckpointForState(
  state: ConceptMasteryState,
  retentionChecksPassed: number,
): number | null {
  if (state === "consolidating") return retentionChecksPassed >= 1 ? 7 : 3;
  if (state === "retained") return retentionChecksPassed >= 3 ? 30 : 14;
  return null;
}

export function v4ConceptCheckQuestionRange(mode: V4ConceptCheckMode) {
  switch (mode) {
    case "review":
      return { min: 1, max: 2 } as const;
    case "repair":
      return { min: 1, max: 3 } as const;
    case "verify":
      return { min: 2, max: 4 } as const;
  }
}

export type V4ConceptCheckRequest = {
  conceptId: string;
  questionCount: number;
  mode: V4ConceptCheckMode;
};

export type V4ConceptCheckValidation =
  | { ok: true; value: V4ConceptCheckRequest }
  | {
      ok: false;
      code: "missing_concept" | "invalid_mode" | "invalid_question_count";
      message: string;
    };

export function validateV4ConceptCheckRequest(input: {
  conceptId: string | null | undefined;
  questionCount: number;
  mode: string;
}): V4ConceptCheckValidation {
  const conceptId = input.conceptId?.trim() ?? "";
  if (!conceptId) {
    return { ok: false, code: "missing_concept", message: "Concept id is required." };
  }

  if (input.mode !== "review" && input.mode !== "repair" && input.mode !== "verify") {
    return { ok: false, code: "invalid_mode", message: "Unsupported V4 concept check mode." };
  }

  const range = v4ConceptCheckQuestionRange(input.mode);
  if (
    !Number.isInteger(input.questionCount) ||
    input.questionCount < range.min ||
    input.questionCount > range.max
  ) {
    return {
      ok: false,
      code: "invalid_question_count",
      message: `Question count for ${input.mode} must be between ${range.min} and ${range.max}.`,
    };
  }

  return {
    ok: true,
    value: {
      conceptId,
      questionCount: input.questionCount,
      mode: input.mode,
    },
  };
}
