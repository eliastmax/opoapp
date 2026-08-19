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
    | "near_duplicate_stem"
    | "missing_source"
    | "invalid_pages"
    | "unknown_concept"
    | "missing_dimension"
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

export function serializeV2Rows(rows: V2QuestionRow[]) {
  return [
    HEADERS_V2.join(";"),
    ...rows.map((row) => HEADERS_V2.map((header) => quoteCsv(value(row, header) ?? "")).join(";")),
  ].join("\n");
}

export function auditGeneratedQuestionCandidates(input: {
  candidates: FactoryGeneratedQuestionCandidate[];
  concepts: ProposedConcept[];
  nearDuplicateThreshold?: number;
}): FactoryQuestionQualityReport {
  const issues: FactoryQuestionQualityIssue[] = [];
  const conceptCodes = new Set(input.concepts.map((concept) => concept.code));
  const nearDuplicateThreshold = input.nearDuplicateThreshold ?? 0.85;
  const answerKeys: AnswerKey[] = [];

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

    const options = ["opcion_a", "opcion_b", "opcion_c", "opcion_d"].map((header) =>
      text(candidate.v2, header as (typeof HEADERS_V2)[number]).toLocaleLowerCase("es"),
    );
    if (new Set(options).size !== 4) {
      issues.push({
        severity: "error",
        code: "duplicate_options",
        questionCode,
        message: "The four stored options must be unique.",
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
    }

    if (!text(candidate.v2, "documento_referencia") || !text(candidate.v2, "referencia_fuente")) {
      issues.push({
        severity: "error",
        code: "missing_source",
        questionCode,
        message: "documento_referencia and referencia_fuente are required by Factory editorial QA.",
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
