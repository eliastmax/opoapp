import type { V4StudyContentPackage } from "../../v4-content-package";
import {
  topic18Gate2Concepts,
  topic18Gate2Flashcards as topic18Gate2PrimaryCards,
  topic18Gate2QuestionMappings,
  topic18Gate2Units,
  topic18Gate2V4Package,
} from "./topic-18-v4-gate2";
import { topic18Gate2SecondCards } from "./topic-18-v4-second-cards";
import { topic18ApprovedGate1Report } from "./topic-18-approved-gate1";
import { topic18GapQuestionCandidates, topic18SourceReviewRequiredSlots } from "./topic-18-gap-questions";

export { topic18Gate2Concepts, topic18Gate2Units };

export const topic18Gate2Mappings = topic18Gate2QuestionMappings;
export const topic18Gate2Flashcards = [...topic18Gate2PrimaryCards, ...topic18Gate2SecondCards];

/**
 * Consolidated portable Gate 2 package. It is structurally complete but remains
 * deliberately under-covered at C29 and therefore is not import-ready.
 */
export const topic18Gate2Package = {
  ...topic18Gate2V4Package,
  flashcards: topic18Gate2Flashcards,
} satisfies V4StudyContentPackage;

export const topic18Gate2EditorialState = {
  approvedGate1: topic18ApprovedGate1Report,
  generatedQuestions: topic18GapQuestionCandidates.length,
  blockedSourceReview: topic18SourceReviewRequiredSlots,
  flashcards: topic18Gate2Flashcards.length,
  importReady: false,
} as const;
