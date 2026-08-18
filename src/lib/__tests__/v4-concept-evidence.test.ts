// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import { evaluateConceptMastery } from "../concept-mastery";
import {
  conceptMasteryInputFromEvidence,
  type V4ConceptEvidenceRow,
} from "../v4-concept-evidence";

const baseRow = (): V4ConceptEvidenceRow => ({
  concept_id: "c1",
  concept_code: "SMS-T18-C14",
  concept_title: "Silencio",
  study_unit_id: "u1",
  study_unit_code: "SMS-T18-U07",
  study_unit_title: "Silencio a solicitud",
  previous_state: "unseen",
  unit_completed: false,
  active_primary_questions: 8,
  active_flashcards: 4,
  question_evidence: [],
  flashcard_evidence: [],
});

describe("V4 concept evidence adapter", () => {
  test("keeps exposure, question and card evidence in the mastery contract", () => {
    const row = baseRow();
    row.previous_state = "verifying";
    row.unit_completed = true;
    row.question_evidence = [
      {
        questionId: "q1",
        questionCode: "SMS-T18-0024",
        sessionId: "s1",
        answeredAt: "2026-08-19T10:00:00Z",
        correct: true,
        markedDoubt: false,
        retentionCheckpointDays: null,
        attribution: "primary",
      },
    ];
    row.flashcard_evidence = [
      {
        cardId: "f1",
        reviewedAt: "2026-08-19T09:00:00Z",
        correct: true,
      },
    ];

    expect(conceptMasteryInputFromEvidence(row)).toEqual({
      previousState: "verifying",
      unitCompleted: true,
      questionEvidence: [
        {
          questionId: "q1",
          sessionId: "s1",
          answeredAt: "2026-08-19T10:00:00Z",
          correct: true,
          markedDoubt: false,
          retentionCheckpointDays: null,
        },
      ],
      flashcardEvidence: [
        {
          cardId: "f1",
          reviewedAt: "2026-08-19T09:00:00Z",
          correct: true,
        },
      ],
    });
  });

  test("lets ordinary historical answers reach consolidation without fabricating retention", () => {
    const row = baseRow();
    row.question_evidence = [
      ["q1", "s1", true],
      ["q2", "s1", true],
      ["q3", "s2", true],
      ["q4", "s2", false],
    ].map(([questionId, sessionId, correct], index) => ({
      questionId: String(questionId),
      sessionId: String(sessionId),
      answeredAt: `2026-08-${String(10 + index).padStart(2, "0")}T10:00:00Z`,
      correct: Boolean(correct),
      markedDoubt: false,
      retentionCheckpointDays: null,
      attribution: "primary" as const,
    }));

    const result = evaluateConceptMastery(conceptMasteryInputFromEvidence(row));

    expect(result.state).toBe("consolidating");
    expect(result.retentionChecksPassed).toBe(0);
  });

  test("preserves targeted retention metadata so delayed checks can prove retention", () => {
    const row = baseRow();
    row.previous_state = "consolidating";
    row.question_evidence = [
      { questionId: "q1", sessionId: "s1", answeredAt: "2026-08-01T10:00:00Z", correct: true },
      { questionId: "q2", sessionId: "s1", answeredAt: "2026-08-01T10:01:00Z", correct: true },
      { questionId: "q3", sessionId: "s2", answeredAt: "2026-08-02T10:00:00Z", correct: true },
      { questionId: "q4", sessionId: "s2", answeredAt: "2026-08-02T10:01:00Z", correct: true },
      {
        questionId: "q5",
        sessionId: "s3",
        answeredAt: "2026-08-05T10:00:00Z",
        correct: true,
        retentionCheckpointDays: 3,
        attribution: "targeted" as const,
      },
      {
        questionId: "q6",
        sessionId: "s4",
        answeredAt: "2026-08-12T10:00:00Z",
        correct: true,
        retentionCheckpointDays: 7,
        attribution: "targeted" as const,
      },
    ].map((evidence) => ({
      markedDoubt: false,
      retentionCheckpointDays: null,
      attribution: "primary" as const,
      ...evidence,
    }));

    const result = evaluateConceptMastery(conceptMasteryInputFromEvidence(row));

    expect(result.state).toBe("retained");
    expect(result.retentionChecksPassed).toBe(2);
  });
});
