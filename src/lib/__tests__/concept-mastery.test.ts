// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import {
  conceptReviewDelayDays,
  evaluateConceptMastery,
  type ConceptQuestionEvidence,
} from "../concept-mastery";

const q = (
  questionId: string,
  sessionId: string,
  answeredAt: string,
  correct: boolean,
  overrides: Partial<ConceptQuestionEvidence> = {},
): ConceptQuestionEvidence => ({
  questionId,
  sessionId,
  answeredAt,
  correct,
  ...overrides,
});

describe("V4 concept mastery", () => {
  test("starts unseen and reading a unit only marks it as seen", () => {
    expect(evaluateConceptMastery({}).state).toBe("unseen");
    expect(evaluateConceptMastery({ unitCompleted: true }).state).toBe("seen");
  });

  test("flashcards support study but cannot prove mastery alone", () => {
    const result = evaluateConceptMastery({
      flashcardEvidence: Array.from({ length: 20 }, (_, index) => ({
        cardId: `c${index}`,
        reviewedAt: `2026-08-18T10:${String(index).padStart(2, "0")}:00Z`,
        correct: true,
      })),
    });
    expect(result.state).toBe("seen");
    expect(result.distinctQuestions).toBe(0);
  });

  test("requires at least two distinct questions before verification", () => {
    expect(
      evaluateConceptMastery({
        questionEvidence: [q("q1", "s1", "2026-08-18T10:00:00Z", true)],
      }).state,
    ).toBe("seen");

    expect(
      evaluateConceptMastery({
        questionEvidence: [
          q("q1", "s1", "2026-08-18T10:00:00Z", true),
          q("q2", "s1", "2026-08-18T10:01:00Z", true),
        ],
      }).state,
    ).toBe("verifying");
  });

  test("repeating one question never inflates distinct evidence", () => {
    const result = evaluateConceptMastery({
      questionEvidence: [
        q("q1", "s1", "2026-08-18T10:00:00Z", false),
        q("q1", "s2", "2026-08-19T10:00:00Z", true),
        q("q1", "s3", "2026-08-20T10:00:00Z", true),
      ],
    });
    expect(result.distinctQuestions).toBe(1);
    expect(result.state).toBe("seen");
  });

  test("a correct answer with doubt is not safe evidence", () => {
    const result = evaluateConceptMastery({
      questionEvidence: [
        q("q1", "s1", "2026-08-18T10:00:00Z", true),
        q("q2", "s1", "2026-08-18T10:01:00Z", true),
        q("q3", "s2", "2026-08-19T10:00:00Z", true),
        q("q4", "s2", "2026-08-19T10:01:00Z", true, { markedDoubt: true }),
      ],
    });
    expect(result.safeCorrectQuestions).toBe(3);
    expect(result.safeAccuracy).toBe(0.75);
    expect(result.needsAttention).toBe(true);
  });

  test("requires four distinct questions, 70 percent safe accuracy and two sessions to consolidate", () => {
    const oneSession = evaluateConceptMastery({
      questionEvidence: [
        q("q1", "s1", "2026-08-18T10:00:00Z", true),
        q("q2", "s1", "2026-08-18T10:01:00Z", true),
        q("q3", "s1", "2026-08-18T10:02:00Z", true),
        q("q4", "s1", "2026-08-18T10:03:00Z", false),
      ],
    });
    expect(oneSession.state).toBe("verifying");
    expect(oneSession.reasonCode).toBe("needs_more_sessions");

    const twoSessions = evaluateConceptMastery({
      questionEvidence: [
        q("q1", "s1", "2026-08-18T10:00:00Z", true),
        q("q2", "s1", "2026-08-18T10:01:00Z", true),
        q("q3", "s2", "2026-08-19T10:00:00Z", true),
        q("q4", "s2", "2026-08-19T10:01:00Z", false),
      ],
    });
    expect(twoSessions.state).toBe("consolidating");
  });

  test("does not consolidate when safe accuracy falls below 70 percent", () => {
    const result = evaluateConceptMastery({
      questionEvidence: [
        q("q1", "s1", "2026-08-18T10:00:00Z", true),
        q("q2", "s1", "2026-08-18T10:01:00Z", true),
        q("q3", "s2", "2026-08-19T10:00:00Z", false),
        q("q4", "s2", "2026-08-19T10:01:00Z", false),
      ],
    });
    expect(result.state).toBe("verifying");
    expect(result.reasonCode).toBe("accuracy_not_safe");
  });

  test("retained requires successful delayed checks at 3 and 7 days with different questions and sessions", () => {
    const result = evaluateConceptMastery({
      previousState: "consolidating",
      questionEvidence: [
        q("q1", "s1", "2026-08-01T10:00:00Z", true),
        q("q2", "s1", "2026-08-01T10:01:00Z", true),
        q("q3", "s2", "2026-08-02T10:00:00Z", true),
        q("q4", "s2", "2026-08-02T10:01:00Z", true),
        q("q5", "s3", "2026-08-05T10:00:00Z", true, { retentionCheckpointDays: 3 }),
        q("q6", "s4", "2026-08-12T10:00:00Z", true, { retentionCheckpointDays: 7 }),
      ],
    });
    expect(result.state).toBe("retained");
    expect(result.retentionChecksPassed).toBe(2);
  });

  test("one new failure on a retained concept raises attention without destroying retention", () => {
    const result = evaluateConceptMastery({
      previousState: "retained",
      questionEvidence: [
        q("q1", "s1", "2026-08-01T10:00:00Z", true),
        q("q2", "s1", "2026-08-01T10:01:00Z", true),
        q("q3", "s2", "2026-08-02T10:00:00Z", true),
        q("q4", "s2", "2026-08-02T10:01:00Z", true),
        q("q5", "s3", "2026-08-05T10:00:00Z", true, { retentionCheckpointDays: 3 }),
        q("q6", "s4", "2026-08-12T10:00:00Z", true, { retentionCheckpointDays: 7 }),
        q("q7", "s5", "2026-08-18T10:00:00Z", false),
      ],
    });
    expect(result.state).toBe("retained");
    expect(result.needsAttention).toBe(true);
    expect(result.nextReviewDelayDays).toBe(1);
  });

  test("repeated recent instability drops at most one state at a time", () => {
    const result = evaluateConceptMastery({
      previousState: "retained",
      questionEvidence: [
        q("q1", "s1", "2026-08-01T10:00:00Z", true),
        q("q2", "s1", "2026-08-01T10:01:00Z", true),
        q("q3", "s2", "2026-08-02T10:00:00Z", true),
        q("q4", "s2", "2026-08-02T10:01:00Z", true),
        q("q5", "s3", "2026-08-17T10:00:00Z", false),
        q("q6", "s4", "2026-08-18T10:00:00Z", false),
      ],
    });
    expect(result.state).toBe("consolidating");
    expect(result.reasonCode).toBe("recent_instability");
  });

  test("uses calm spaced review intervals and resets attention to tomorrow", () => {
    expect(conceptReviewDelayDays("unseen", 0, false)).toBeNull();
    expect(conceptReviewDelayDays("verifying", 0, false)).toBe(1);
    expect(conceptReviewDelayDays("consolidating", 0, false)).toBe(3);
    expect(conceptReviewDelayDays("consolidating", 1, false)).toBe(7);
    expect(conceptReviewDelayDays("retained", 2, false)).toBe(14);
    expect(conceptReviewDelayDays("retained", 3, false)).toBe(30);
    expect(conceptReviewDelayDays("retained", 3, true)).toBe(1);
  });
});
