import { auditV4ConceptCoverage, type V4CoverageAudit } from "./v4-content-coverage";

export const V4_STUDY_CONTENT_VERSION = "4.0" as const;

export type V4SourceRef = {
  label: string;
  reference: string;
  pageStart?: number | null;
  pageEnd?: number | null;
};

export type V4StudyUnitPackage = {
  code: string;
  title: string;
  position: number;
  estimatedMinutes: number;
  studySummary: string;
  examKeys: string[];
  confusions: string[];
  traps: string[];
  mnemonics: string[];
  sourceRefs: V4SourceRef[];
  sourceSubtopicName?: string | null;
};

export type V4ConceptPackage = {
  code: string;
  unitCode: string;
  title: string;
  description: string;
  position: number;
};

export type V4QuestionConceptMappingPackage = {
  questionCode: string;
  primaryConceptCode: string;
  secondaryConceptCodes?: string[];
};

export type V4FlashcardPackage = {
  code: string;
  conceptCode: string;
  type: "direct" | "contrast" | "number_or_deadline" | "exception" | "mini_case";
  prompt: string;
  answer: string;
  position: number;
  sourceRefs?: V4SourceRef[];
};

export type V4StudyContentPackage = {
  version: typeof V4_STUDY_CONTENT_VERSION;
  oppositionCode: string;
  topicNumber: number;
  sourceRevision?: string | null;
  units: V4StudyUnitPackage[];
  concepts: V4ConceptPackage[];
  questionMappings: V4QuestionConceptMappingPackage[];
  flashcards: V4FlashcardPackage[];
};

export type V4ContentValidationIssue = {
  code:
    | "invalid_version"
    | "missing_opposition_code"
    | "invalid_topic_number"
    | "empty_units"
    | "empty_concepts"
    | "duplicate_unit_code"
    | "duplicate_concept_code"
    | "duplicate_flashcard_code"
    | "duplicate_question_mapping"
    | "invalid_unit"
    | "missing_unit_source"
    | "unknown_unit"
    | "unknown_primary_concept"
    | "unknown_secondary_concept"
    | "duplicate_secondary_concept"
    | "primary_repeated_as_secondary"
    | "unknown_flashcard_concept"
    | "invalid_flashcard"
    | "concept_without_flashcards"
    | "unmapped_concept"
    | "coverage_gap";
  message: string;
  path?: string;
};

export type V4ContentValidationResult = {
  valid: boolean;
  errors: V4ContentValidationIssue[];
  warnings: V4ContentValidationIssue[];
  coverage: V4CoverageAudit;
};

function normalized(value: string) {
  return value.trim();
}

function duplicateValues(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    const key = normalized(value);
    if (seen.has(key)) duplicates.add(key);
    seen.add(key);
  }
  return [...duplicates].sort();
}

function validSourceRef(source: V4SourceRef) {
  if (!normalized(source.label) || !normalized(source.reference)) return false;
  if (source.pageStart != null && (!Number.isInteger(source.pageStart) || source.pageStart < 1)) return false;
  if (source.pageEnd != null && (!Number.isInteger(source.pageEnd) || source.pageEnd < 1)) return false;
  if (source.pageStart != null && source.pageEnd != null && source.pageEnd < source.pageStart) return false;
  return true;
}

/**
 * Validates a generated V4 topic package before any database import.
 *
 * Structural/reference failures are errors. Coverage gaps are warnings because
 * they are useful generator output: they tell us where more validated questions
 * are required before the concept can support full mastery.
 */
export function validateV4StudyContentPackage(
  pkg: V4StudyContentPackage,
): V4ContentValidationResult {
  const errors: V4ContentValidationIssue[] = [];
  const warnings: V4ContentValidationIssue[] = [];

  if (pkg.version !== V4_STUDY_CONTENT_VERSION) {
    errors.push({
      code: "invalid_version",
      message: `Expected content version ${V4_STUDY_CONTENT_VERSION}.`,
      path: "version",
    });
  }
  if (!normalized(pkg.oppositionCode)) {
    errors.push({
      code: "missing_opposition_code",
      message: "oppositionCode is required.",
      path: "oppositionCode",
    });
  }
  if (!Number.isInteger(pkg.topicNumber) || pkg.topicNumber < 1) {
    errors.push({
      code: "invalid_topic_number",
      message: "topicNumber must be a positive integer.",
      path: "topicNumber",
    });
  }
  if (pkg.units.length === 0) {
    errors.push({ code: "empty_units", message: "A V4 topic package needs at least one study unit.", path: "units" });
  }
  if (pkg.concepts.length === 0) {
    errors.push({ code: "empty_concepts", message: "A V4 topic package needs at least one concept.", path: "concepts" });
  }

  for (const code of duplicateValues(pkg.units.map((unit) => unit.code))) {
    errors.push({ code: "duplicate_unit_code", message: `Duplicate study-unit code: ${code}.`, path: "units" });
  }
  for (const code of duplicateValues(pkg.concepts.map((concept) => concept.code))) {
    errors.push({ code: "duplicate_concept_code", message: `Duplicate concept code: ${code}.`, path: "concepts" });
  }
  for (const code of duplicateValues(pkg.flashcards.map((card) => card.code))) {
    errors.push({ code: "duplicate_flashcard_code", message: `Duplicate flashcard code: ${code}.`, path: "flashcards" });
  }
  for (const code of duplicateValues(pkg.questionMappings.map((mapping) => mapping.questionCode))) {
    errors.push({
      code: "duplicate_question_mapping",
      message: `Question ${code} appears more than once in the package. Each question must declare one canonical primary mapping row.`,
      path: "questionMappings",
    });
  }

  const unitCodes = new Set(pkg.units.map((unit) => normalized(unit.code)));
  const conceptCodes = new Set(pkg.concepts.map((concept) => normalized(concept.code)));

  pkg.units.forEach((unit, index) => {
    const base = `units[${index}]`;
    if (
      !normalized(unit.code) ||
      !normalized(unit.title) ||
      !Number.isInteger(unit.position) ||
      unit.position < 0 ||
      !Number.isInteger(unit.estimatedMinutes) ||
      unit.estimatedMinutes < 1 ||
      unit.estimatedMinutes > 30 ||
      !normalized(unit.studySummary) ||
      unit.examKeys.some((item) => !normalized(item)) ||
      unit.confusions.some((item) => !normalized(item)) ||
      unit.traps.some((item) => !normalized(item)) ||
      unit.mnemonics.some((item) => !normalized(item)) ||
      unit.sourceRefs.some((source) => !validSourceRef(source))
    ) {
      errors.push({
        code: "invalid_unit",
        message: `Study unit ${unit.code || index} has an invalid required field or source reference.`,
        path: base,
      });
    }
    if (unit.sourceRefs.length === 0) {
      errors.push({
        code: "missing_unit_source",
        message: `Study unit ${unit.code || index} must cite at least one validated source.`,
        path: `${base}.sourceRefs`,
      });
    }
  });

  pkg.concepts.forEach((concept, index) => {
    if (!unitCodes.has(normalized(concept.unitCode))) {
      errors.push({
        code: "unknown_unit",
        message: `Concept ${concept.code} references unknown unit ${concept.unitCode}.`,
        path: `concepts[${index}].unitCode`,
      });
    }
    if (
      !normalized(concept.code) ||
      !normalized(concept.title) ||
      !Number.isInteger(concept.position) ||
      concept.position < 0
    ) {
      errors.push({
        code: "invalid_unit",
        message: `Concept at index ${index} has an invalid code, title or position.`,
        path: `concepts[${index}]`,
      });
    }
  });

  pkg.questionMappings.forEach((mapping, index) => {
    const primary = normalized(mapping.primaryConceptCode);
    const secondaries = (mapping.secondaryConceptCodes ?? []).map(normalized);
    if (!conceptCodes.has(primary)) {
      errors.push({
        code: "unknown_primary_concept",
        message: `Question ${mapping.questionCode} references unknown primary concept ${mapping.primaryConceptCode}.`,
        path: `questionMappings[${index}].primaryConceptCode`,
      });
    }
    for (const secondary of secondaries) {
      if (!conceptCodes.has(secondary)) {
        errors.push({
          code: "unknown_secondary_concept",
          message: `Question ${mapping.questionCode} references unknown secondary concept ${secondary}.`,
          path: `questionMappings[${index}].secondaryConceptCodes`,
        });
      }
    }
    for (const duplicate of duplicateValues(secondaries)) {
      errors.push({
        code: "duplicate_secondary_concept",
        message: `Question ${mapping.questionCode} repeats secondary concept ${duplicate}.`,
        path: `questionMappings[${index}].secondaryConceptCodes`,
      });
    }
    if (secondaries.includes(primary)) {
      errors.push({
        code: "primary_repeated_as_secondary",
        message: `Question ${mapping.questionCode} repeats its primary concept as secondary.`,
        path: `questionMappings[${index}]`,
      });
    }
  });

  pkg.flashcards.forEach((card, index) => {
    if (!conceptCodes.has(normalized(card.conceptCode))) {
      errors.push({
        code: "unknown_flashcard_concept",
        message: `Flashcard ${card.code} references unknown concept ${card.conceptCode}.`,
        path: `flashcards[${index}].conceptCode`,
      });
    }
    if (
      !normalized(card.code) ||
      !normalized(card.prompt) ||
      !normalized(card.answer) ||
      !Number.isInteger(card.position) ||
      card.position < 0 ||
      (card.sourceRefs ?? []).some((source) => !validSourceRef(source))
    ) {
      errors.push({
        code: "invalid_flashcard",
        message: `Flashcard ${card.code || index} has an invalid required field or source reference.`,
        path: `flashcards[${index}]`,
      });
    }
  });

  const validQuestionCodes = pkg.questionMappings
    .map((mapping) => normalized(mapping.questionCode))
    .filter(Boolean);
  const coverageMappings = pkg.questionMappings.flatMap((mapping) => {
    const rows = [
      {
        questionId: normalized(mapping.questionCode),
        conceptId: normalized(mapping.primaryConceptCode),
        role: "primary" as const,
      },
    ];
    for (const conceptCode of mapping.secondaryConceptCodes ?? []) {
      rows.push({
        questionId: normalized(mapping.questionCode),
        conceptId: normalized(conceptCode),
        role: "secondary" as const,
      });
    }
    return rows;
  });

  const coverage = auditV4ConceptCoverage({
    questions: [...new Set(validQuestionCodes)].map((id) => ({ id })),
    concepts: [...conceptCodes].filter(Boolean).map((id) => ({ id })),
    mappings: coverageMappings,
  });

  const cardsByConcept = new Map<string, number>();
  for (const card of pkg.flashcards) {
    const code = normalized(card.conceptCode);
    cardsByConcept.set(code, (cardsByConcept.get(code) ?? 0) + 1);
  }

  for (const concept of pkg.concepts) {
    const code = normalized(concept.code);
    if ((cardsByConcept.get(code) ?? 0) === 0) {
      warnings.push({
        code: "concept_without_flashcards",
        message: `Concept ${code} has no flashcards.`,
        path: "flashcards",
      });
    }
  }

  for (const row of coverage.conceptCoverage) {
    if (row.primaryQuestionCount === 0) {
      warnings.push({
        code: "unmapped_concept",
        message: `Concept ${row.conceptId} has no primary questions mapped.`,
        path: "questionMappings",
      });
    }
    if (row.status === "coverage_gap") {
      warnings.push({
        code: "coverage_gap",
        message: `Concept ${row.conceptId} has ${row.primaryQuestionCount} primary questions and needs ${row.missingPrimaryQuestions} more to meet the V4 mastery-coverage contract.`,
        path: "questionMappings",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    coverage,
  };
}
