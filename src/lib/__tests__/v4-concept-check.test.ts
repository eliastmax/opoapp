// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import {
  validateV4ConceptCheckRequest,
  v4ConceptCheckQuestionRange,
  v4RetentionCheckpointForState,
} from "../v4-concept-check";

describe("V4 concept check contract", () => {
  test("uses the same spaced checkpoints as the mastery engine", () => {
    expect(v4RetentionCheckpointForState("unseen", 0)).toBeNull();
    expect(v4RetentionCheckpointForState("seen", 0)).toBeNull();
    expect(v4RetentionCheckpointForState("verifying", 0)).toBeNull();
    expect(v4RetentionCheckpointForState("consolidating", 0)).toBe(3);
    expect(v4RetentionCheckpointForState("consolidating", 1)).toBe(7);
    expect(v4RetentionCheckpointForState("retained", 2)).toBe(14);
    expect(v4RetentionCheckpointForState("retained", 3)).toBe(30);
  });

  test("keeps directed checks deliberately small", () => {
    expect(v4ConceptCheckQuestionRange("review")).toEqual({ min: 1, max: 2 });
    expect(v4ConceptCheckQuestionRange("repair")).toEqual({ min: 1, max: 3 });
    expect(v4ConceptCheckQuestionRange("verify")).toEqual({ min: 2, max: 4 });
  });

  test("validates a normal verify request", () => {
    expect(
      validateV4ConceptCheckRequest({ conceptId: "concept-1", questionCount: 3, mode: "verify" }),
    ).toEqual({
      ok: true,
      value: { conceptId: "concept-1", questionCount: 3, mode: "verify" },
    });
  });

  test("rejects counts that could distort the intended Today block", () => {
    expect(
      validateV4ConceptCheckRequest({ conceptId: "concept-1", questionCount: 4, mode: "repair" }),
    ).toMatchObject({ ok: false, code: "invalid_question_count" });
    expect(
      validateV4ConceptCheckRequest({ conceptId: "concept-1", questionCount: 1, mode: "verify" }),
    ).toMatchObject({ ok: false, code: "invalid_question_count" });
  });

  test("rejects missing concepts and unknown modes", () => {
    expect(
      validateV4ConceptCheckRequest({ conceptId: " ", questionCount: 2, mode: "verify" }),
    ).toMatchObject({ ok: false, code: "missing_concept" });
    expect(
      validateV4ConceptCheckRequest({ conceptId: "concept-1", questionCount: 2, mode: "exam" }),
    ).toMatchObject({ ok: false, code: "invalid_mode" });
  });
});
