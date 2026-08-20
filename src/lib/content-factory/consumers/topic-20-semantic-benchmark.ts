import { canonicalPageTextToSemanticSourceSpans } from "../canonical-source-ingest";
import { buildSemanticTopicDraft, type SemanticSourceSpan } from "../semantic-draft";
import { runContentFactoryTopicWithSemanticDraft } from "../semantic-fast-pipeline";
import { prepareSemanticFactoryWorkPackets } from "../work-packets";
import type { ContentFactoryJob, FactoryQuestionMetadata } from "../types";
import { topic20CanonicalPageText, TOPIC20_CANONICAL_SOURCE_SHA256 } from "./topic-20-canonical-page-text";
import { topic20SemanticInputPart1 } from "./topic-20-semantic-input-part1";
import { topic20SemanticInputPart2 } from "./topic-20-semantic-input-part2";
import { topic20SemanticInputPart3 } from "./topic-20-semantic-input-part3";
import { topic20SemanticInputPart4 } from "./topic-20-semantic-input-part4";

type SemanticInputTuple = readonly [
  code: string,
  apartado: string,
  subapartado: string,
  conceptLabel: string,
  learningObjective: string,
  perspective: string,
  trapType: string,
  sourceReference: string,
  documentReference: string,
  pageStart: number,
  pageEnd: number,
];

const semanticRows: readonly SemanticInputTuple[] = [
  ...topic20SemanticInputPart1,
  ...topic20SemanticInputPart2,
  ...topic20SemanticInputPart3,
  ...topic20SemanticInputPart4,
];

export const topic20ExistingQuestions: FactoryQuestionMetadata[] = semanticRows.map(([
  code,
  apartado,
  subapartado,
  conceptLabel,
  learningObjective,
  perspective,
  trapType,
  sourceReference,
  documentReference,
  pageStart,
  pageEnd,
]) => ({
  code,
  active: true,
  apartado,
  subapartado,
  conceptLabel,
  learningObjective,
  perspective,
  trapType,
  sourceReference,
  documentReference,
  pageStart,
  pageEnd,
}));

/** Historical RUN 1A technical adapter. Kept only to preserve the benchmark baseline. */
export function buildTopic20CanonicalSourceSpansRun1A(): SemanticSourceSpan[] {
  const grouped = new Map<string, { apartado: string; subapartado: string; pageStart: number; pageEnd: number }>();
  for (const row of semanticRows) {
    const [, apartado, subapartado, , , , , , , pageStart, pageEnd] = row;
    const current = grouped.get(subapartado);
    if (!current) grouped.set(subapartado, { apartado, subapartado, pageStart, pageEnd });
    else {
      current.pageStart = Math.min(current.pageStart, pageStart);
      current.pageEnd = Math.max(current.pageEnd, pageEnd);
    }
  }
  return [...grouped.values()]
    .sort((left, right) => left.pageStart - right.pageStart || left.subapartado.localeCompare(right.subapartado, "es"))
    .map((group, index) => {
      const match = group.subapartado.match(/^Artículo\s+(\d+)/i);
      return {
        id: `SMS-T20-SRC-${String(index + 1).padStart(2, "0")}`,
        document: "Temario_new.pdf",
        reference: `Tema 20 · ${group.subapartado}`,
        heading: group.subapartado,
        sectionPath: [group.apartado],
        article: match ? `Artículo ${match[1]}` : null,
        pageStart: group.pageStart,
        pageEnd: group.pageEnd,
      } satisfies SemanticSourceSpan;
    });
}

export const topic20CanonicalSource = buildTopic20CanonicalSourceSpansRun1A();

export const topic20ContentFactoryJob: ContentFactoryJob = {
  version: "1.0",
  oppositionCode: "auxiliar-administrativo-sms",
  topicNumber: 20,
  topicTitle: "Tema 20. La Ley 40/2015, de 1 de octubre, de Régimen Jurídico del Sector Público (I). Ámbito de aplicación. Los órganos de las Administraciones Públicas. Responsabilidad patrimonial de las Administraciones Públicas: principios; responsabilidad de las autoridades y el personal al servicio de las Administraciones Públicas.",
  mode: "existing_bank",
  codePrefix: "SMS-T20",
  coverageThreshold: 4,
  sourceRevision: `Temario_new.pdf · sha256 ${TOPIC20_CANONICAL_SOURCE_SHA256} · PDF pp. 41-77`,
  source: [{ label: "Temario_new.pdf", reference: "Tema 20 · Ley 40/2015 (I)", pageStart: 41, pageEnd: 77 }],
  sourcePolicy: { canonicalOnly: true, document: "Temario_new.pdf", externalVerificationAllowed: false },
  existingQuestions: topic20ExistingQuestions,
};

// Historical RUN 1A baseline. Do not use these artifacts as RUN 1B input.
export const topic20SemanticDraftRun1 = buildSemanticTopicDraft({
  job: topic20ContentFactoryJob,
  canonicalSource: topic20CanonicalSource,
  existingQuestions: topic20ExistingQuestions,
});
export const topic20FastPipelineRun1 = runContentFactoryTopicWithSemanticDraft({
  job: topic20ContentFactoryJob,
  semanticDraft: topic20SemanticDraftRun1,
});

const countSemanticExceptions = (type: string) => topic20SemanticDraftRun1.semanticExceptions.filter((exception) => exception.type === type).length;
const coverageRows = topic20FastPipelineRun1.finalCoverage?.factoryConceptCoverage ?? [];
const coverageCount = (status: "ready" | "coverage_gap" | "source_review_required" | "source_limited") => coverageRows.filter((row) => row.status === status).length;
export const topic20SemanticBenchmarkMetrics = {
  inputQuestions: topic20ExistingQuestions.length,
  canonicalSourceSpans: topic20CanonicalSource.length,
  unitsProposed: topic20SemanticDraftRun1.units.length,
  unitsHighConfidence: topic20SemanticDraftRun1.metrics.highConfidenceUnits,
  conceptsProposed: topic20SemanticDraftRun1.concepts.length,
  conceptsHighConfidence: topic20SemanticDraftRun1.metrics.highConfidenceConcepts,
  mappingsHighConfidence: topic20SemanticDraftRun1.mappingProposals.filter((proposal) => proposal.meta.confidence === "high").length,
  mappingsMediumConfidence: topic20SemanticDraftRun1.mappingProposals.filter((proposal) => proposal.meta.confidence === "medium").length,
  mappingsLowConfidence: topic20SemanticDraftRun1.mappingProposals.filter((proposal) => proposal.meta.confidence === "low").length,
  conceptBoundaryExceptions: countSemanticExceptions("concept_boundary"),
  mappingAmbiguities: countSemanticExceptions("mapping_ambiguity"),
  sourceIssues: topic20SemanticDraftRun1.metrics.sourceIssues,
  anchorConflicts: countSemanticExceptions("anchor_conflict"),
  semanticBlockers: topic20SemanticDraftRun1.metrics.blockers,
  coverageStandardReady: coverageCount("ready"),
  coverageSourceLimited: coverageCount("source_limited"),
  coverageSourceReviewRequired: coverageCount("source_review_required"),
  coverageActionableGapConcepts: coverageCount("coverage_gap"),
  coverageActionableMissingQuestions: topic20FastPipelineRun1.finalCoverage?.totalActionableMissingQuestions ?? null,
  coverageUnmapped: topic20FastPipelineRun1.finalCoverage?.mappingQa.unmappedQuestionCodes.length ?? null,
  coverageMultiplePrimary: topic20FastPipelineRun1.finalCoverage?.mappingQa.duplicatePrimaryQuestionCodes.length ?? null,
  generationSlots: topic20FastPipelineRun1.generationSlots.length,
  generatedQuestions: topic20FastPipelineRun1.draft.generatedQuestions.length,
  questionQaIssues: topic20FastPipelineRun1.questionQa?.issues.length ?? null,
  governanceExceptions: topic20FastPipelineRun1.exceptionQueue.length,
  governanceBlockers: topic20FastPipelineRun1.exceptionQueue.filter((exception) => exception.blocker).length,
  importReady: topic20FastPipelineRun1.readiness.importReady,
  readinessState: topic20FastPipelineRun1.readiness.state,
} as const;

// Definitive RUN 1B source ingest: CanonicalPageText[] -> SemanticSourceSpan[]. No authored spans.
export const topic20CanonicalSourceRun1B = canonicalPageTextToSemanticSourceSpans(topic20CanonicalPageText, {
  document: "Temario_new.pdf",
  codePrefix: "SMS-T20",
  referencePrefix: "Temario_new.pdf · T20 canonical",
});
export const topic20SemanticDraftRun1B = buildSemanticTopicDraft({
  job: topic20ContentFactoryJob,
  canonicalSource: topic20CanonicalSourceRun1B,
  existingQuestions: topic20ExistingQuestions,
});
export const topic20PreparedWorkPacketsRun1B = prepareSemanticFactoryWorkPackets({
  job: topic20ContentFactoryJob,
  semanticDraft: topic20SemanticDraftRun1B,
  canonicalSource: topic20CanonicalSourceRun1B,
});
export const topic20FastPipelineRun1BSourceOnly = runContentFactoryTopicWithSemanticDraft({
  job: topic20ContentFactoryJob,
  semanticDraft: topic20SemanticDraftRun1B,
  canonicalSource: topic20CanonicalSourceRun1B,
});

const countRun1BConfidence = (kind: "concept" | "mapping", confidence: "high" | "medium" | "low") =>
  kind === "concept"
    ? topic20SemanticDraftRun1B.conceptProposals.filter((proposal) => proposal.meta.confidence === confidence).length
    : topic20SemanticDraftRun1B.mappingProposals.filter((proposal) => proposal.meta.confidence === confidence).length;
const run1BCoverageRows = topic20FastPipelineRun1BSourceOnly.finalCoverage?.factoryConceptCoverage ?? [];
export const topic20Run1BSourceMetrics = {
  inputPages: topic20CanonicalPageText.length,
  extractedTextCharacters: topic20CanonicalPageText.reduce((sum, page) => sum + page.text.length, 0),
  automaticSpans: topic20CanonicalSourceRun1B.length,
  units: topic20SemanticDraftRun1B.units.length,
  conceptsHigh: countRun1BConfidence("concept", "high"),
  conceptsMedium: countRun1BConfidence("concept", "medium"),
  conceptsLow: countRun1BConfidence("concept", "low"),
  mappingsHigh: countRun1BConfidence("mapping", "high"),
  mappingsMedium: countRun1BConfidence("mapping", "medium"),
  mappingsLow: countRun1BConfidence("mapping", "low"),
  semanticConceptBoundariesMaterial: topic20FastPipelineRun1BSourceOnly.exceptionQueue.filter((exception) => exception.type === "concept_boundary").length,
  semanticMappingAmbiguitiesMaterial: topic20FastPipelineRun1BSourceOnly.exceptionQueue.filter((exception) => exception.type === "mapping_ambiguity").length,
  sourceIssues: topic20SemanticDraftRun1B.metrics.sourceIssues,
  sourceLimitedCandidates: topic20FastPipelineRun1BSourceOnly.exceptionQueue.filter((exception) => exception.type === "source_limited_candidate").length,
  confidenceOnlyBlockers: topic20FastPipelineRun1BSourceOnly.exceptionQueue.filter((exception) => exception.id.endsWith(":confidence")).length,
  missingStudyContent: topic20FastPipelineRun1BSourceOnly.exceptionQueue.filter((exception) => exception.id.endsWith(":missing-study-content")).length,
  missingQuestionGenerator: topic20FastPipelineRun1BSourceOnly.exceptionQueue.filter((exception) => exception.id.endsWith(":missing-question-generator")).length,
  workPacketsStudy: topic20PreparedWorkPacketsRun1B.studyContent.length,
  workPacketsFlashcards: topic20PreparedWorkPacketsRun1B.flashcards.length,
  workPacketsQuestions: topic20PreparedWorkPacketsRun1B.questions.length,
  executableStudyContent: topic20PreparedWorkPacketsRun1B.executableStudyContent,
  executableQuestions: topic20PreparedWorkPacketsRun1B.executableQuestions,
  actionableGapConcepts: run1BCoverageRows.filter((row) => row.status === "coverage_gap").length,
  actionableMissingQuestions: topic20FastPipelineRun1BSourceOnly.finalCoverage?.totalActionableMissingQuestions ?? null,
  totalExceptions: topic20FastPipelineRun1BSourceOnly.exceptionQueue.length,
  blockers: topic20FastPipelineRun1BSourceOnly.exceptionQueue.filter((exception) => exception.blocker).length,
  reviewRecommended: topic20FastPipelineRun1BSourceOnly.exceptionQueue.filter((exception) => !exception.blocker).length,
} as const;

export const topic20ManualInterventionLedger = [
  { id: "T20-MANUAL-01", category: "A" as const, action: "Read-only V2 extraction/audit from Supabase; Semantic Accelerator receives only its consumed metadata contract.", semanticDecision: false },
  { id: "T20-RUN1B-INPUT", category: "A" as const, action: "CanonicalPageText[] supplied from Temario_new.pdf SHA-256 96768192445fa7da87e09d265b0b578737d38ffca2559f22225ea49ac4cebe2a; page->pageNumber field normalization only.", semanticDecision: false },
] as const;
