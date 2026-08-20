import type { SemanticSourceSpan } from "../semantic-draft";
import type { ContentFactoryJob, FactoryQuestionMetadata } from "../types";
import { topic20RowsPart1 } from "./topic-20-semantic-benchmark-data/part-1";
import { topic20RowsPart2 } from "./topic-20-semantic-benchmark-data/part-2";
import { topic20RowsPart3 } from "./topic-20-semantic-benchmark-data/part-3";
import { topic20RowsPart4 } from "./topic-20-semantic-benchmark-data/part-4";

export const TOPIC20_CANONICAL_DOCUMENT = "Temario_new.pdf";
export const TOPIC20_REAL_ACTIVE_QUESTION_COUNT = 220;
export const TOPIC20_REAL_V2_FIELD_COUNT = 25;

const rawRows = [
  ...topic20RowsPart1,
  ...topic20RowsPart2,
  ...topic20RowsPart3,
  ...topic20RowsPart4,
];

function parseRow(row: string): FactoryQuestionMetadata {
  const [
    code,
    apartado,
    subapartado,
    conceptLabel,
    learningObjective,
    perspective,
    trapType,
    sourceReference,
    pageStart,
    pageEnd,
  ] = row.split("|");
  if (!code || !apartado || !subapartado || !conceptLabel || !learningObjective || !perspective || !trapType || !sourceReference || !pageStart || !pageEnd) {
    throw new Error(`Invalid Tema 20 production semantic snapshot row: ${row}`);
  }
  return {
    code,
    active: true,
    apartado,
    subapartado,
    conceptLabel,
    learningObjective,
    perspective,
    trapType,
    sourceReference,
    documentReference: TOPIC20_CANONICAL_DOCUMENT,
    pageStart: Number(pageStart),
    pageEnd: Number(pageEnd),
  };
}

/**
 * Read-only production snapshot of the semantic fields consumed by Semantic Accelerator.
 * The source audit performed for RUN 1 inspected all 25 V2 fields on all 220 active rows;
 * this fixture intentionally persists only the subset that buildSemanticTopicDraft() reads.
 */
export const topic20RealQuestions: FactoryQuestionMetadata[] = rawRows.map(parseRow);

function articleFromSubpart(subapartado: string) {
  return subapartado.match(/Artículo\s+(\d+)/i)?.[1] ?? null;
}

/**
 * Technical source-span projection only: no semantic provider is hand-authored here.
 * One span is derived mechanically per real V2 subapartado using canonical document,
 * article heading and min/max canonical page metadata from the production bank.
 */
export function deriveTopic20CanonicalSourceSpans(
  questions: FactoryQuestionMetadata[] = topic20RealQuestions,
): SemanticSourceSpan[] {
  const groups = new Map<string, FactoryQuestionMetadata[]>();
  for (const question of questions) {
    const key = question.subapartado?.trim() ?? "";
    if (!key) throw new Error(`Tema 20 question ${question.code} has no subapartado.`);
    groups.set(key, [...(groups.get(key) ?? []), question]);
  }

  return [...groups.entries()]
    .map(([subapartado, rows]) => {
      const article = articleFromSubpart(subapartado);
      const pageStart = Math.min(...rows.map((row) => row.pageStart ?? Number.MAX_SAFE_INTEGER));
      const pageEnd = Math.max(...rows.map((row) => row.pageEnd ?? Number.MIN_SAFE_INTEGER));
      const apartado = rows[0]?.apartado?.trim() ?? "";
      return {
        id: `sms-t20-source-${article ?? subapartado.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        document: TOPIC20_CANONICAL_DOCUMENT,
        reference: `Tema 20, ${subapartado}`,
        heading: subapartado,
        sectionPath: [apartado, subapartado].filter(Boolean),
        article: article ? `Artículo ${article}` : null,
        pageStart: Number.isFinite(pageStart) ? pageStart : null,
        pageEnd: Number.isFinite(pageEnd) ? pageEnd : null,
      } satisfies SemanticSourceSpan;
    })
    .sort((left, right) => (left.pageStart ?? 9999) - (right.pageStart ?? 9999) || left.id.localeCompare(right.id, "es"));
}

export const topic20CanonicalSource = deriveTopic20CanonicalSourceSpans();

export const topic20SemanticBenchmarkJob: ContentFactoryJob = {
  version: "1.0",
  oppositionCode: "auxiliar-administrativo-sms",
  topicNumber: 20,
  topicTitle: "Ley 40/2015 (I): ámbito de aplicación, órganos y responsabilidad patrimonial",
  mode: "existing_bank",
  codePrefix: "SMS-T20",
  coverageThreshold: 4,
  sourceRevision: "Temario_new.pdf · Tema 20 · production metadata snapshot 2026-08-20",
  source: [{
    label: TOPIC20_CANONICAL_DOCUMENT,
    reference: "Tema 20, pp. 44-76",
    pageStart: 44,
    pageEnd: 76,
  }],
  sourcePolicy: {
    canonicalOnly: true,
    document: TOPIC20_CANONICAL_DOCUMENT,
    externalVerificationAllowed: false,
  },
  existingQuestions: topic20RealQuestions,
};

if (topic20RealQuestions.length !== TOPIC20_REAL_ACTIVE_QUESTION_COUNT) {
  throw new Error(`Tema 20 benchmark snapshot expected ${TOPIC20_REAL_ACTIVE_QUESTION_COUNT} questions, got ${topic20RealQuestions.length}.`);
}
