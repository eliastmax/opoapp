// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import { evaluateConceptMastery, type ConceptQuestionEvidence } from "../concept-mastery";

const q = (
  questionId: string,
  sessionId: string,
  answeredAt: string,
  correct: boolean,
): ConceptQuestionEvidence => ({ questionId, sessionId, answeredAt, correct });

describe("V4 concept attention recency", () => {
  test("an old failure stops demanding attention after three newer safe questions", () => {
    const result = evaluateConceptMastery({
      questionEvidence: [
        q("old-failure", "s1", "2026-07-01T10:00:00Z", false),
        q("q2", "s2", "2026-08-16T10:00:00Z", true),
        q("q3", "s3", "2026-08-17T10:00:00Z", true),
        q("q4", "s4", "2026-08-18T10:00:00Z", true),
      ],
    });

    expect(result.needsAttention).toBe(false);
  });

  test("a recent failure still requests attention even with older successes", () => {
    const result = evaluateConceptMastery({
      questionEvidence: [
        q("q1", "s1", "2026-08-01T10:00:00Z", true),
        q("q2", "s2", "2026-08-02T10:00:00Z", true),
        q("q3", "s3", "2026-08-17T10:00:00Z", true),
        q("q4", "s4", "2026-08-18T10:00:00Z", false),
      ],
    });

    expect(result.needsAttention).toBe(true);
    expect(result.nextReviewDelayDays).toBe(1);
  });
});
