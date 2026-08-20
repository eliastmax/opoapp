export type Topic18SourceLimitedSlot = {
  questionCode: string;
  conceptCode: "SMS-T18-C29";
  status: "source_limited";
  nominalThreshold: 4;
  sourceSupportedCeiling: 1;
  blockedAdditionalQuestions: 3;
  sourceReference: string;
  reason: string;
};

const reason =
  "Temario_new.pdf, art. 38, contiene una única regla sustantiva de ejecutividad ya medida directamente por SMS-T18-0199; crear más preguntas exigiría repetir la misma evidencia o introducir inferencias ajenas a la fuente.";

/**
 * Reserved codes from the original mathematical deficit. They are deliberately
 * non-materialized: source_limited is a source-ceiling decision, not unfinished
 * editorial work and not a source_review_required ambiguity.
 */
export const topic18SourceLimitedSlots: Topic18SourceLimitedSlot[] = [
  "SMS-T18-0245",
  "SMS-T18-0246",
  "SMS-T18-0247",
].map((questionCode) => ({
  questionCode,
  conceptCode: "SMS-T18-C29" as const,
  status: "source_limited" as const,
  nominalThreshold: 4 as const,
  sourceSupportedCeiling: 1 as const,
  blockedAdditionalQuestions: 3 as const,
  sourceReference: "Temario_new.pdf, art. 38, p. 139.",
  reason,
}));
