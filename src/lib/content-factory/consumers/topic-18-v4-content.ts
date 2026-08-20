import type { V4StudyContentPackage } from "../../v4-content-package";
import type { V4SourceCapacity } from "../../v4-source-capacity";
import {
  topic18Gate2Concepts as topic18Gate2RawConcepts,
  topic18Gate2Flashcards as topic18Gate2PrimaryCards,
  topic18Gate2QuestionMappings,
  topic18Gate2Units,
  topic18Gate2V4Package,
} from "./topic-18-v4-gate2";
import { topic18Gate2SecondCards } from "./topic-18-v4-second-cards";
import { topic18ApprovedGate1Report } from "./topic-18-approved-gate1";
import { topic18Gate1Concepts } from "./topic-18-gate1";
import { topic18Gate21QuestionCandidates } from "./topic-18-gap-questions-gate21";
import { topic18SourceLimitedSlots } from "./topic-18-source-limited";

const approvedCapacityByCode = new Map<string, V4SourceCapacity>();
for (const concept of topic18Gate1Concepts) {
  if (concept.sourceCapacity?.status === "source_limited") {
    approvedCapacityByCode.set(concept.code, concept.sourceCapacity);
  }
}

/** Generic promotion of approved Factory source_limited metadata into the V4 draft. */
export const topic18Gate2Concepts = topic18Gate2RawConcepts.map((concept) => {
  const sourceCapacity = approvedCapacityByCode.get(concept.code);
  return sourceCapacity ? { ...concept, sourceCapacity } : concept;
});

export { topic18Gate2Units };
export const topic18Gate2Mappings = topic18Gate2QuestionMappings;
export const topic18Gate2Flashcards = [...topic18Gate2PrimaryCards, ...topic18Gate2SecondCards];

export const topic18Gate2Package = {
  ...topic18Gate2V4Package,
  concepts: topic18Gate2Concepts,
  flashcards: topic18Gate2Flashcards,
} satisfies V4StudyContentPackage;

export const topic18Gate2EditorialState = {
  approvedGate1: topic18ApprovedGate1Report,
  generatedQuestions: topic18Gate21QuestionCandidates.length,
  sourceLimitedSlots: topic18SourceLimitedSlots,
  flashcards: topic18Gate2Flashcards.length,
  importReady: false,
} as const;
