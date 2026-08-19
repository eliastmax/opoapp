import type {
  V4ConceptPackage,
  V4FlashcardPackage,
  V4StudyContentPackage,
  V4StudyUnitPackage,
} from "../../v4-content-package";
import { topic18SilencePilotPackage } from "../../v4-pilots/topic-18-silence";
import {
  topic18ApprovedAssignments,
  topic18ApprovedGate1Report,
} from "./topic-18-approved-gate1";
import {
  topic18GapQuestionCandidates,
  topic18SourceReviewRequiredSlots,
} from "./topic-18-gap-questions";
import {
  topic18Gate1Concepts,
  topic18Gate1Units,
} from "./topic-18-gate1";

const ANCHOR_UNIT_CODES = new Set(["SMS-T18-U07", "SMS-T18-U08"]);
const ANCHOR_CONCEPT_CODES = new Set(["SMS-T18-C14", "SMS-T18-C15", "SMS-T18-C16"]);

const conceptByCode = new Map(topic18Gate1Concepts.map((concept) => [concept.code, concept]));
const pilotUnitByCode = new Map(topic18SilencePilotPackage.units.map((unit) => [unit.code, unit]));
const pilotConceptByCode = new Map(topic18SilencePilotPackage.concepts.map((concept) => [concept.code, concept]));

function conceptsForUnit(unitCode: string) {
  return topic18Gate1Concepts.filter((concept) => concept.unitCode === unitCode);
}

function sourceRefsForConcept(conceptCode: string) {
  const sourceRefs = conceptByCode.get(conceptCode)?.sourceRefs ?? [];
  if (sourceRefs.length === 0) {
    throw new Error(`Missing canonical Temario_new.pdf source for ${conceptCode}.`);
  }
  return sourceRefs;
}

function sourceLabel(conceptCode: string) {
  return sourceRefsForConcept(conceptCode).map((source) => source.reference).join(" · ");
}

function canonicalUnit(unit: (typeof topic18Gate1Units)[number]): V4StudyUnitPackage {
  const pilot = pilotUnitByCode.get(unit.code);
  if (pilot) {
    return {
      ...pilot,
      sourceRefs: unit.sourceRefs,
    };
  }

  const concepts = conceptsForUnit(unit.code);
  const overlapPairs = concepts.flatMap((concept) =>
    (concept.overlapCandidates ?? []).map((otherCode) => {
      const other = conceptByCode.get(otherCode);
      return other ? `${concept.title} / ${other.title}` : `${concept.title} / ${otherCode}`;
    }),
  );
  const uniqueOverlapPairs = [...new Set(overlapPairs)];

  return {
    code: unit.code,
    title: unit.title,
    position: unit.position,
    estimatedMinutes: Math.min(30, Math.max(5, concepts.length * 4)),
    studySummary: concepts
      .map((concept) => `${concept.title}: ${concept.description}`)
      .join(" "),
    examKeys: concepts.map((concept) => concept.description),
    confusions: uniqueOverlapPairs.map((pair) => `Mantener separados los conceptos ${pair}.`),
    traps: uniqueOverlapPairs.length > 0
      ? uniqueOverlapPairs.map((pair) => `No resolver por semejanza entre ${pair}; identificar la regla decisiva del temario.`)
      : ["Identificar el artículo y la regla exacta del temario antes de escoger entre conceptos próximos."],
    mnemonics: [],
    sourceRefs: unit.sourceRefs,
    sourceSubtopicName: unit.title,
  };
}

function canonicalConcept(concept: (typeof topic18Gate1Concepts)[number]): V4ConceptPackage {
  const pilot = pilotConceptByCode.get(concept.code);
  if (pilot) return { ...pilot };
  return {
    code: concept.code,
    unitCode: concept.unitCode,
    title: concept.title,
    description: concept.description,
    position: concept.position,
  };
}

function canonicalPilotCards(): V4FlashcardPackage[] {
  return topic18SilencePilotPackage.flashcards.map((card) => ({
    ...card,
    sourceRefs: sourceRefsForConcept(card.conceptCode),
  }));
}

function generatedConceptCards(): V4FlashcardPackage[] {
  const nonAnchors = topic18Gate1Concepts.filter((concept) => !ANCHOR_CONCEPT_CODES.has(concept.code));
  const cards: V4FlashcardPackage[] = [];

  nonAnchors.forEach((concept, index) => {
    const firstCode = 12 + index * 2;
    const secondCode = firstCode + 1;
    const otherCode = concept.overlapCandidates?.[0];
    const other = otherCode ? conceptByCode.get(otherCode) : undefined;

    cards.push({
      code: `SMS-T18-F${String(firstCode).padStart(2, "0")}`,
      conceptCode: concept.code,
      type: "direct",
      prompt: `¿Cuál es el núcleo de estudio de «${concept.title}» en el Tema 18?`,
      answer: concept.description,
      position: 1,
      sourceRefs: sourceRefsForConcept(concept.code),
    });

    cards.push({
      code: `SMS-T18-F${String(secondCode).padStart(2, "0")}`,
      conceptCode: concept.code,
      type: other ? "contrast" : "direct",
      prompt: other
        ? `¿Qué frontera debe mantenerse entre «${concept.title}» y «${other.title}»?`
        : `¿Dónde se localiza en el temario el concepto «${concept.title}»?`,
      answer: other
        ? `${concept.title}: ${concept.description} ${other.title}: ${other.description}`
        : sourceLabel(concept.code),
      position: 2,
      sourceRefs: sourceRefsForConcept(concept.code),
    });
  });

  return cards;
}

export const topic18Gate2Units: V4StudyUnitPackage[] = topic18Gate1Units.map(canonicalUnit);
export const topic18Gate2Concepts: V4ConceptPackage[] = topic18Gate1Concepts.map(canonicalConcept);

export const topic18Gate2Mappings = [
  ...topic18ApprovedAssignments.map((assignment) => ({
    questionCode: assignment.questionCode,
    primaryConceptCode: assignment.primaryConceptCode,
    ...(assignment.secondaryConceptCodes?.length
      ? { secondaryConceptCodes: assignment.secondaryConceptCodes }
      : {}),
  })),
  ...topic18GapQuestionCandidates.map((candidate) => ({
    questionCode: candidate.questionCode,
    primaryConceptCode: candidate.conceptCode,
  })),
];

export const topic18Gate2Flashcards: V4FlashcardPackage[] = [
  ...canonicalPilotCards(),
  ...generatedConceptCards(),
];

/**
 * Portable Gate 2 package only. It is deliberately not import-ready while C29
 * remains source_review_required and Gate 2 has not been approved by Governance.
 * No importer is invoked from this module.
 */
export const topic18Gate2Package = {
  version: "4.0",
  oppositionCode: "auxiliar-administrativo-sms",
  topicNumber: 18,
  sourceRevision: "Temario_new.pdf · Tema 18 · pp. 113-149 · fuente canónica exclusiva · Gate 2 draft",
  units: topic18Gate2Units,
  concepts: topic18Gate2Concepts,
  questionMappings: topic18Gate2Mappings,
  flashcards: topic18Gate2Flashcards,
} satisfies V4StudyContentPackage;

export const topic18Gate2EditorialState = {
  approvedGate1: topic18ApprovedGate1Report,
  generatedQuestions: topic18GapQuestionCandidates.length,
  blockedSourceReview: topic18SourceReviewRequiredSlots,
  anchorUnits: [...ANCHOR_UNIT_CODES],
  anchorConcepts: [...ANCHOR_CONCEPT_CODES],
} as const;
