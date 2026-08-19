import { jaccard } from "../similarity";
import { calculateFactoryCoverage, type FactoryCoverageResult } from "./coverage";
import type {
  ContentFactoryJob,
  FactoryProposalConfidence,
  FactoryQuestionAssignment,
  ProposedConcept,
  ProposedStudyUnit,
} from "./types";

export type Gate1ConceptReportRow = {
  code: string;
  unitCode: string;
  unitTitle: string;
  title: string;
  description: string;
  confidence: FactoryProposalConfidence;
  sourceReviewRequired: boolean;
  sourceReferences: string[];
  questionCodes: string[];
  primaryCount: number;
  ready: boolean;
  coverageGap: boolean;
  missing: number;
  possibleOverlaps: string[];
  observations: string[];
};

export type Gate1Report = {
  job: Pick<ContentFactoryJob, "oppositionCode" | "topicNumber" | "mode" | "codePrefix">;
  summary: {
    totalQuestions: number;
    concepts: number;
    units: number;
    meanPrimaryQuestions: number;
    medianPrimaryQuestions: number;
    readyConcepts: number;
    readyPercent: number;
    coverageGaps: number;
    sourceReviewRequired: number;
    unmappedQuestions: number;
    duplicatePrimaryQuestions: number;
    invalidConceptMappings: number;
    invalidQuestionMappings: number;
    questionsNeeded: number;
  };
  concepts: Gate1ConceptReportRow[];
  coverage: FactoryCoverageResult;
  warnings: string[];
};

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function detectTitleOverlaps(concepts: ProposedConcept[], threshold = 0.72) {
  const overlaps = new Map<string, string[]>();
  for (let left = 0; left < concepts.length; left += 1) {
    for (let right = left + 1; right < concepts.length; right += 1) {
      const a = concepts[left];
      const b = concepts[right];
      if (a.unitCode !== b.unitCode) continue;
      if (jaccard(a.title, b.title) < threshold) continue;
      overlaps.set(a.code, [...(overlaps.get(a.code) ?? []), b.code]);
      overlaps.set(b.code, [...(overlaps.get(b.code) ?? []), a.code]);
    }
  }
  return overlaps;
}

function displaySourceReferences(concept: ProposedConcept) {
  return (concept.sourceRefs ?? []).map((source) => `${source.label}: ${source.reference}`);
}

export function buildGate1Report(input: {
  job: ContentFactoryJob;
  units: ProposedStudyUnit[];
  concepts: ProposedConcept[];
  assignments: FactoryQuestionAssignment[];
}): Gate1Report {
  const questions = input.job.existingQuestions ?? [];
  const coverage = calculateFactoryCoverage({
    questions,
    concepts: input.concepts,
    assignments: input.assignments,
    threshold: input.job.coverageThreshold,
  });
  const coverageByConcept = new Map(coverage.conceptCoverage.map((row) => [row.conceptId, row]));
  const unitByCode = new Map(input.units.map((unit) => [unit.code, unit]));
  const titleOverlaps = detectTitleOverlaps(input.concepts);
  const questionCodesByConcept = new Map<string, Set<string>>();
  for (const assignment of input.assignments) {
    const bucket = questionCodesByConcept.get(assignment.primaryConceptCode) ?? new Set<string>();
    bucket.add(assignment.questionCode);
    questionCodesByConcept.set(assignment.primaryConceptCode, bucket);
  }

  const concepts = input.concepts.map((concept): Gate1ConceptReportRow => {
    const row = coverageByConcept.get(concept.code);
    const possibleOverlaps = [
      ...(concept.overlapCandidates ?? []),
      ...(titleOverlaps.get(concept.code) ?? []),
    ];
    return {
      code: concept.code,
      unitCode: concept.unitCode,
      unitTitle: unitByCode.get(concept.unitCode)?.title ?? "<unknown unit>",
      title: concept.title,
      description: concept.description,
      confidence: concept.confidence ?? "medium",
      sourceReviewRequired: concept.sourceReviewRequired === true,
      sourceReferences: displaySourceReferences(concept),
      questionCodes: [...(questionCodesByConcept.get(concept.code) ?? new Set())].sort(),
      primaryCount: row?.primaryQuestionCount ?? 0,
      ready: row?.status === "ready",
      coverageGap: row?.status !== "ready",
      missing: row?.missingPrimaryQuestions ?? coverage.threshold,
      possibleOverlaps: [...new Set(possibleOverlaps)].sort(),
      observations: concept.observations ?? [],
    };
  });

  const counts = concepts.map((concept) => concept.primaryCount);
  const readyConcepts = concepts.filter((concept) => concept.ready).length;
  const sourceReviewRequired = concepts.filter((concept) => concept.sourceReviewRequired).length;
  const warnings: string[] = [];
  if (coverage.mappingQa.unmappedQuestionCodes.length > 0) warnings.push("There are active questions without a primary concept.");
  if (coverage.mappingQa.duplicatePrimaryQuestionCodes.length > 0) warnings.push("There are questions with multiple primary assignments.");
  if (coverage.mappingQa.invalidConceptMappings.length > 0) warnings.push("There are mappings to concepts outside the proposed map.");
  if (concepts.some((concept) => concept.possibleOverlaps.length > 0)) warnings.push("Possible overlapping concept titles require Gate 1 review.");
  if (sourceReviewRequired > 0) warnings.push("Some concepts are marked source_review_required; do not resolve them from external sources.");

  return {
    job: {
      oppositionCode: input.job.oppositionCode,
      topicNumber: input.job.topicNumber,
      mode: input.job.mode,
      codePrefix: input.job.codePrefix,
    },
    summary: {
      totalQuestions: questions.filter((question) => question.active !== false).length,
      concepts: concepts.length,
      units: input.units.length,
      meanPrimaryQuestions: counts.length === 0 ? 0 : counts.reduce((a, b) => a + b, 0) / counts.length,
      medianPrimaryQuestions: median(counts),
      readyConcepts,
      readyPercent: concepts.length === 0 ? 0 : (readyConcepts / concepts.length) * 100,
      coverageGaps: concepts.length - readyConcepts,
      sourceReviewRequired,
      unmappedQuestions: coverage.mappingQa.unmappedQuestionCodes.length,
      duplicatePrimaryQuestions: coverage.mappingQa.duplicatePrimaryQuestionCodes.length,
      invalidConceptMappings: coverage.mappingQa.invalidConceptMappings.length,
      invalidQuestionMappings: coverage.mappingQa.invalidQuestionMappings.length,
      questionsNeeded: coverage.totalMissingQuestions,
    },
    concepts,
    coverage,
    warnings,
  };
}

export function renderGate1ReportMarkdown(report: Gate1Report) {
  const s = report.summary;
  const lines = [
    `# Gate 1 — ${report.job.oppositionCode} · Tema ${report.job.topicNumber}`,
    "",
    `Modo: \`${report.job.mode}\``,
    "",
    "## Resumen",
    "",
    `- Preguntas activas: ${s.totalQuestions}`,
    `- Unidades propuestas: ${s.units}`,
    `- Conceptos propuestos: ${s.concepts}`,
    `- Media de primarias/concepto: ${s.meanPrimaryQuestions.toFixed(2)}`,
    `- Mediana: ${s.medianPrimaryQuestions}`,
    `- Ready: ${s.readyConcepts}/${s.concepts} (${s.readyPercent.toFixed(1)}%)`,
    `- Coverage gaps: ${s.coverageGaps}`,
    `- source_review_required: ${s.sourceReviewRequired}`,
    `- Sin asignar: ${s.unmappedQuestions}`,
    `- Múltiples primary: ${s.duplicatePrimaryQuestions}`,
    `- Mappings a concepto inválido: ${s.invalidConceptMappings}`,
    `- Preguntas adicionales exactas necesarias: ${s.questionsNeeded}`,
    "",
    "## Conceptos",
    "",
    "| Código | Unidad | Concepto | Primarias | Estado | Faltan | Fuente | Confianza | Source review | Solapamientos | Observaciones |",
    "|---|---|---|---:|---|---:|---|---|---|---|---|",
    ...report.concepts.map((row) =>
      `| ${row.code} | ${row.unitCode} · ${row.unitTitle} | ${row.title} | ${row.primaryCount} | ${row.ready ? "ready" : "coverage_gap"} | ${row.missing} | ${row.sourceReferences.join(" · ") || "—"} | ${row.confidence} | ${row.sourceReviewRequired ? "source_review_required" : "—"} | ${row.possibleOverlaps.join(", ") || "—"} | ${row.observations.join(" · ") || "—"} |`,
    ),
  ];
  if (report.warnings.length > 0) {
    lines.push("", "## Avisos", "", ...report.warnings.map((warning) => `- ${warning}`));
  }
  return lines.join("\n");
}
