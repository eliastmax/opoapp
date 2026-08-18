import type {
  ConceptFlashcardEvidence,
  ConceptMasteryInput,
  ConceptMasteryState,
  ConceptQuestionEvidence,
} from "./concept-mastery";

export type V4QuestionEvidenceRow = ConceptQuestionEvidence & {
  questionCode?: string;
  attribution?: "primary" | "targeted";
};

export type V4ConceptEvidenceRow = {
  concept_id: string;
  concept_code: string;
  concept_title: string;
  study_unit_id: string;
  study_unit_code: string;
  study_unit_title: string;
  previous_state: ConceptMasteryState;
  unit_completed: boolean;
  active_primary_questions: number;
  active_flashcards: number;
  question_evidence: V4QuestionEvidenceRow[];
  flashcard_evidence: ConceptFlashcardEvidence[];
};

/**
 * Converts the Supabase concept-evidence RPC contract into the pure mastery
 * evaluator input. Metadata used for display/diagnostics is deliberately kept
 * outside the evaluator so mastery remains deterministic and easy to test.
 */
export function conceptMasteryInputFromEvidence(
  row: V4ConceptEvidenceRow,
): ConceptMasteryInput {
  return {
    previousState: row.previous_state,
    unitCompleted: row.unit_completed,
    questionEvidence: row.question_evidence.map((evidence) => ({
      questionId: evidence.questionId,
      sessionId: evidence.sessionId,
      answeredAt: evidence.answeredAt,
      correct: evidence.correct,
      markedDoubt: evidence.markedDoubt,
      retentionCheckpointDays: evidence.retentionCheckpointDays,
    })),
    flashcardEvidence: row.flashcard_evidence,
  };
}
