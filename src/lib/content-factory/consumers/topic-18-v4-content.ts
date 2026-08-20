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
import { topic18Gate21QuestionCandidates } from "./topic-18-gap-questions-gate21";
import { topic18SourceLimitedSlots } from "./topic-18-source-limited";

export { topic18Gate2Concepts, topic18Gate2Units };

export const topic18Gate2Mappings = topic18Gate2QuestionMappings;
export const topic18Gate2Flashcards = [...topic18Gate2PrimaryCards, ...topic18Gate2SecondCards];

/**
 * Consolidated portable Gate 2 package. The V4 contract still reports C29 below
 * its nominal four-question mastery floor because mastery has deliberately not
 * been changed yet. Content Factory classifies that residual as source_limited,
 * not as actionable editorial work.
 */
export const topic18Gate2Package = {
  ...topic18Gate2V4Package,
  flashcards: topic18Gate2Flashcards,
} satisfies V4StudyContentPackage;

export const topic18Gate2EditorialState = {
  approvedGate1: topic18ApprovedGate1Report,
  generatedQuestions: topic18Gate21QuestionCandidates.length,
  sourceLimitedSlots: topic18SourceLimitedSlots,
  flashcards: topic18Gate2Flashcards.length,
  importReady: false,
} as const;
