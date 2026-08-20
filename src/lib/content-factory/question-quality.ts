import {
  HEADERS_V2,
  parseCsv,
  type Respuesta,
} from "../csv-parser";
import {
  getAnswerKeyDistribution,
  hasExtremeAnswerKeyImbalance,
  type AnswerKey,
  type AnswerKeyDistribution,
} from "../question-batch-quality";
import { jaccard, normalizeText } from "../similarity";
import type {
  FactoryGeneratedQuestionCandidate,
  FactoryQuestionMetadata,
  ProposedConcept,
  V2QuestionRow,
} from "./types";

export type FactoryQuestionQualityIssue = {
  severity: "error" | "warning";
  code:
    | "missing_v2_field"
    | "invalid_v2_row"
    | "invalid_answer_key"
    | "duplicate_options"
    | "duplicate_stem"
    | "duplicate_existing_stem"
    | "near_duplicate_stem"
    | "near_duplicate_existing_stem"
    | "missing_source"
    | "non_canonical_source"
    | "invalid_pages"
    | "unknown_concept"
    | "missing_dimension"
    | "repeated_evidence_dimension"
    | "undesired_all_none_option"
    | "gross_length_clue"
    | "answer_key_imbalance";
  questionCode?: string;
  message: string;
  relatedQuestionCode?: string;
};

export type FactoryQuestionQualityReport = {
  valid: boolean;
  issues: FactoryQuestionQualityIssue[];
  answerDistribution: AnswerKeyDistribution;
  extremeAnswerImbalance: boolean;
  parser: {
    validRows: number;
    errors: string[];
  };
};

function value(row: V2QuestionRow, header: (typeof HEADERS_V2)[number]) {
  return row[header];
}

function text(row: V2QuestionRow, header: (typeof HEADERS_V2)[number]) {
  return String(value(row, header) ?? "").trim();
}

function codeOf(candidate: FactoryGeneratedQuestionCandidate) {
  return text(candidate.v2, "codigo") || undefined;
}

function quoteCsv(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function canonicalText(value: string) {
  return value.trim().toLocaleLowerCase("es");
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function hasUndesiredAllNone(textValue: string) {
  const normalized = normalizeText(textValue);
  return [
    "todas las anteriores",
    "ninguna de las anteriores",
    "todas son correctas",
    "ninguna es correcta",
    "todas las opciones",
    "ninguna de las opciones",
  ].some((needle) => normalized.includes(normalizeText(needle)));
}

function correctOptionIndex(answer: string) {
  return ({ A: 0, B: 1, C: 2, D: 3 } as Record<string, number>)[answer];
}

export function serializeV2Rows(rows: V2QuestionRow[]) {
  return [
    HEADERS_V2.join(";"),
    ...rows.map((row) => HEADERS_V2.map((header) => quoteCsv(value(row, header) ?? "")).join(";")),
  ].join("\n");
}

/**
 * Adversarial-but-conservative QA. Heuristics surface review candidates; they do
 * not pretend to replace semantic/legal editorial review. Only structural,
 * parser and canonical-source violations are hard errors.
 */
export function auditGeneratedQuestionCandidates(input: {
  candidates: FactoryGeneratedQuestionCandidate[];
  concepts: ProposedConcept[];
  nearDuplicateThreshold?: number;
  existingQuestions?: FactoryQuestionMetadata[];
  canonicalDocument?: string;
}): FactoryQuestionQualityReport {
  const issues: FactoryQuestionQualityIssue[] = [];
  const conceptCodes = new Set(input.concepts.map((concept) => concept.code));
  const nearDuplicateThreshold = input.nearDuplicateThreshold ?? 0.85;
  const answerKeys: AnswerKey[] = [];
  const canonicalDocument = input.canonicalDocument?.trim();

  input.candidates.forEach((candidate) => {
    const questionCode = codeOf(candidate);
    const missingHeaders = HEADERS_V2.filter((header) => value(candidate.v2, header) === undefined);
    for (const header of missingHeaders) {
      issues.push({
        severity: "error",
        code: "missing_v2_field",
        questionCode,
        message: `Missing V2 field ${header}.`,
      });
    }

    if (!conceptCodes.has(candidate.conceptCode)) {
      issues.push({
        severity: "error",
        code: "unknown_concept",
        questionCode,
        message: `Unknown concept ${candidate.conceptCode}.`,
      });
    }
    if (candidate.dimensions.length === 0) {
      issues.push({
        severity: "error",
        code: "missing_dimension",
        questionCode,
        message: "Generated questions must declare at least one evidence dimension.",
      });
    }

    const rawOptions = ["opcion_a", "opcion_b", "opcion_c", "opcion_d"].map((header) =>
      text(candidate.v2, header as (typeof HEADERS_V2)[number]),
    );
    const options = rawOptions.map((option) => option.toLocaleLowerCase("es"));
    if (new Set(options).size !== 4) {
      issues.push({
        severity: "error",
        code: "duplicate_options",
        questionCode,
        message: "The four stored options must be unique.",
      });
    }
    if (rawOptions.some(hasUndesiredAllNone)) {
      issues.push({
        severity: "warning",
        code: "undesired_all_none_option",
        questionCode,
        message: "Option batch contains an undesired todas/ninguna shortcut; review distractor quality.",
      });
    }

    const answer = text(candidate.v2, "respuesta_correcta").toUpperCase();
    if (!["A", "B", "C", "D"].includes(answer)) {
      issues.push({
        severity: "error",
        code: "invalid_answer_key",
        questionCode,
        message: `Invalid answer key ${answer || "<empty>"}.`,
      });
    } else {
      answerKeys.push(answer as AnswerKey);
      const correctIndex = correctOptionIndex(answer);
      const lengths = rawOptions.map((option) => normalizeText(option).length);
      const referenceLength = median(lengths.filter((_, index) => index !== correctIndex));
      const correctLength = lengths[correctIndex] ?? 0;
      if (
        referenceLength > 0 &&
        Math.abs(correctLength - referenceLength) >= 35 &&
        (correctLength > referenceLength * 1.8 || correctLength < referenceLength * 0.55)
      ) {
        issues.push({
          severity: "warning",
          code: "gross_length_clue",
          questionCode,
          message: "Correct option has a gross length contrast versus distractors; review for answer-position leakage.",
        });
      }
    }

    const documentReference = text(candidate.v2, "documento_referencia");
    const sourceReference = text(candidate.v2, "referencia_fuente");
    if (!documentReference || !sourceReference) {
      issues.push({
        severity: "error",
        code: "missing_source",
        questionCode,
        message: "documento_referencia and referencia_fuente are required by Factory editorial QA.",
      });
    }
    if (
      canonicalDocument &&
      (canonicalText(documentReference) !== canonicalText(canonicalDocument) ||
        !canonicalText(sourceReference).includes(canonicalText(canonicalDocument)))
    ) {
      issues.push({
        severity: "error",
        code: "non_canonical_source",
        questionCode,
        message: `canonicalOnly candidate must use ${canonicalDocument} as its substantive source.`,
      });
    }

    const pageStart = Number(value(candidate.v2, "pagina_inicio"));
    const pageEnd = Number(value(candidate.v2, "pagina_fin"));
    if (
      !Number.isInteger(pageStart) ||
      pageStart < 1 ||
      !Number.isInteger(pageEnd) ||
      pageEnd < pageStart
    ) {
      issues.push({
        severity: "error",
        code: "invalid_pages",
        questionCode,
        message: "Factory candidates require valid source pages with pagina_fin >= pagina_inicio.",
      });
    }
  });

  const seenStems = new Map<string, string | undefined>();
  for (const candidate of input.candidates) {
    const questionCode = codeOf(candidate);
    const stem = text(candidate.v2, "pregunta");
    const normalizedStem = normalizeText(stem);
    const previous = seenStems.get(normalizedStem);
    if (previous !== undefined || seenStems.has(normalizedStem)) {
      issues.push({
        severity: "error",
        code: "duplicate_stem",
        questionCode,
        relatedQuestionCode: previous,
        message: "Exact normalized duplicate question stem.",
      });
    } else {
      seenStems.set(normalizedStem, questionCode);
    }
  }

  for (let left = 0; left < input.candidates.length; left += 1) {
    for (let right = left + 1; right < input.candidates.length; right += 1) {
      const a = input.candidates[left];
      const b = input.candidates[right];
      const stemA = text(a.v2, "pregunta");
      const stemB = text(b.v2, "pregunta");
      if (normalizeText(stemA) === normalizeText(stemB)) continue;
      const score = jaccard(stemA, stemB);
      if (score > nearDuplicateThreshold) {
        issues.push({
          severity: "warning",
          code: "near_duplicate_stem",
          questionCode: codeOf(a),
          relatedQuestionCode: codeOf(b),
          message: `Near-duplicate stem candidate (Jaccard ${score.toFixed(2)}). Review semantically.`,
        });
      }
    }
  }

  for (const candidate of input.candidates) {
    const questionCode = codeOf(candidate);
    const stem = text(candidate.v2, "pregunta");
    for (const existing of input.existingQuestions ?? []) {
      if (!existing.stem?.trim()) continue;
      const normalizedCandidate = normalizeText(stem);
      const normalizedExisting = normalizeText(existing.stem);
      if (normalizedCandidate === normalizedExisting) {
        issues.push({
          severity: "error",
          code: "duplicate_existing_stem",
          questionCode,
          relatedQuestionCode: existing.code,
          message: "Generated stem duplicates an existing active-bank stem.",
        });
        continue;
      }
      const score = jaccard(stem, existing.stem);
      if (score > nearDuplicateThreshold) {
        issues.push({
          severity: "warning",
          code: "near_duplicate_existing_stem",
          questionCode,
          relatedQuestionCode: existing.code,
          message: `Generated stem is near an existing-bank stem (Jaccard ${score.toFixed(2)}).`,
        });
      }
    }
  }

  const candidatesByConcept = new Map<string, FactoryGeneratedQuestionCandidate[]>();
  for (const candidate of input.candidates) {
    const bucket = candidatesByConcept.get(candidate.conceptCode) ?? [];
    bucket.push(candidate);
    candidatesByConcept.set(candidate.conceptCode, bucket);
  }
  for (const [conceptCode, candidates] of candidatesByConcept) {
    if (candidates.length < 2) continue;
    const distinctDimensions = new Set(candidates.flatMap((candidate) => candidate.dimensions));
    if (distinctDimensions.size < Math.min(2, candidates.length)) {
      issues.push({
        severity: "warning",
        code: "repeated_evidence_dimension",
        questionCode: codeOf(candidates[0]),
        message: `${conceptCode} generated ${candidates.length} questions without enough evidence-dimension diversity.`,
      });
    }
  }

  const parserResult = parseCsv(serializeV2Rows(input.candidates.map((candidate) => candidate.v2)));
  const parserErrors: string[] = [];
  let parserValidRows = 0;
  if ("fatal" in parserResult) {
    parserErrors.push(parserResult.fatal);
  } else {
    parserValidRows = parserResult.valid.length;
    for (const error of parserResult.errors) {
      parserErrors.push(`row ${error.row}${error.field ? ` ${error.field}` : ""}: ${error.reason}`);
    }
  }
  for (const parserError of parserErrors) {
    issues.push({ severity: "error", code: "invalid_v2_row", message: parserError });
  }

  const extremeAnswerImbalance = hasExtremeAnswerKeyImbalance(answerKeys);
  if (extremeAnswerImbalance) {
    issues.push({
      severity: "error",
      code: "answer_key_imbalance",
      message: "Stored A/B/C/D answer positions are extremely imbalanced for this batch.",
    });
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    issues,
    answerDistribution: getAnswerKeyDistribution(answerKeys),
    extremeAnswerImbalance,
    parser: { validRows: parserValidRows, errors: parserErrors },
  };
}

export function isAnswerKey(value: string): value is Respuesta {
  return ["A", "B", "C", "D"].includes(value);
}
