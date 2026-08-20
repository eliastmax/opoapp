import { canonicalPageTextToSemanticSourceSpans } from "../canonical-source-ingest";
import { buildSemanticTopicDraft } from "../semantic-draft";
import { runContentFactoryTopicWithSemanticDraft } from "../semantic-fast-pipeline";
import { prepareSemanticFactoryWorkPackets } from "../work-packets";
import {
  topic20ContentFactoryJob,
  topic20ExistingQuestions,
} from "./topic-20-semantic-benchmark";
import {
  TOPIC20_CANONICAL_PDF_PAGE_RANGE,
  TOPIC20_CANONICAL_SOURCE_SHA256,
  topic20CanonicalPageText,
} from "./topic-20-canonical-page-text";

export const topic20CanonicalSourceRun1B = canonicalPageTextToSemanticSourceSpans(
  topic20CanonicalPageText,
  {
    document: "Temario_new.pdf",
    codePrefix: "SMS-T20",
    referencePrefix: "Temario_new.pdf · Tema 20",
  },
);

export const topic20SemanticDraftRun1B = buildSemanticTopicDraft({
  job: topic20ContentFactoryJob,
  canonicalSource: topic20CanonicalSourceRun1B,
  existingQuestions: topic20ExistingQuestions,
});

export const topic20WorkPacketsRun1B = prepareSemanticFactoryWorkPackets({
  job: topic20ContentFactoryJob,
  semanticDraft: topic20SemanticDraftRun1B,
  canonicalSource: topic20CanonicalSourceRun1B,
});

export const topic20FastPipelineRun1BPreMaterialization = runContentFactoryTopicWithSemanticDraft({
  job: topic20ContentFactoryJob,
  semanticDraft: topic20SemanticDraftRun1B,
  canonicalSource: topic20CanonicalSourceRun1B,
});

function countConfidence<T extends { meta: { confidence: "high" | "medium" | "low" } }>(
  rows: T[],
  confidence: "high" | "medium" | "low",
) {
  return rows.filter((row) => row.meta.confidence === confidence).length;
}

const preCoverage = topic20FastPipelineRun1BPreMaterialization.finalCoverage?.factoryConceptCoverage ?? [];
const coverageCount = (status: "ready" | "coverage_gap" | "source_review_required" | "source_limited") =>
  preCoverage.filter((row) => row.status === status).length;

export const topic20Run1BPreMaterializationMetrics = {
  canonicalSha256: TOPIC20_CANONICAL_SOURCE_SHA256,
  canonicalPdfPageStart: TOPIC20_CANONICAL_PDF_PAGE_RANGE.start,
  canonicalPdfPageEnd: TOPIC20_CANONICAL_PDF_PAGE_RANGE.end,
  canonicalPages: topic20CanonicalPageText.length,
  canonicalTextCharacters: topic20CanonicalPageText.reduce((sum, page) => sum + page.text.length, 0),
  canonicalSourceSpans: topic20CanonicalSourceRun1B.length,
  sourceSpansWithText: topic20CanonicalSourceRun1B.filter((span) => Boolean(span.text?.trim())).length,
  units: topic20SemanticDraftRun1B.units.length,
  unitsHigh: topic20SemanticDraftRun1B.unitProposals.filter((row) => row.meta.confidence === "high").length,
  unitsMedium: topic20SemanticDraftRun1B.unitProposals.filter((row) => row.meta.confidence === "medium").length,
  unitsLow: topic20SemanticDraftRun1B.unitProposals.filter((row) => row.meta.confidence === "low").length,
  conceptsHigh: countConfidence(topic20SemanticDraftRun1B.conceptProposals, "high"),
  conceptsMedium: countConfidence(topic20SemanticDraftRun1B.conceptProposals, "medium"),
  conceptsLow: countConfidence(topic20SemanticDraftRun1B.conceptProposals, "low"),
  mappingsHigh: countConfidence(topic20SemanticDraftRun1B.mappingProposals, "high"),
  mappingsMedium: countConfidence(topic20SemanticDraftRun1B.mappingProposals, "medium"),
  mappingsLow: countConfidence(topic20SemanticDraftRun1B.mappingProposals, "low"),
  semanticConceptBoundaries: topic20SemanticDraftRun1B.semanticExceptions.filter((row) => row.type === "concept_boundary").length,
  semanticMappingAmbiguities: topic20SemanticDraftRun1B.semanticExceptions.filter((row) => row.type === "mapping_ambiguity").length,
  sourceIssues: topic20SemanticDraftRun1B.semanticExceptions.filter((row) => row.type === "source_review_required" || row.type === "source_traceability").length,
  sourceLimitedCandidates: topic20FastPipelineRun1BPreMaterialization.exceptionQueue.filter((row) => row.type === "source_limited_candidate").length,
  confidenceOnlyBlockers: topic20FastPipelineRun1BPreMaterialization.exceptionQueue.filter((row) => row.id.endsWith(":confidence")).length,
  missingStudyContentBlockers: topic20FastPipelineRun1BPreMaterialization.exceptionQueue.filter((row) => row.id.endsWith(":missing-study-content")).length,
  missingQuestionGeneratorBlockers: topic20FastPipelineRun1BPreMaterialization.exceptionQueue.filter((row) => row.id.endsWith(":missing-question-generator")).length,
  workPacketsStudy: topic20WorkPacketsRun1B.studyContent.length,
  workPacketsFlashcards: topic20WorkPacketsRun1B.flashcards.length,
  workPacketsQuestions: topic20WorkPacketsRun1B.questions.length,
  executableStudyContent: topic20WorkPacketsRun1B.executableStudyContent,
  executableQuestions: topic20WorkPacketsRun1B.executableQuestions,
  missingCanonicalTextConceptCodes: topic20WorkPacketsRun1B.missingCanonicalTextConceptCodes,
  coverageReady: coverageCount("ready"),
  coverageGaps: coverageCount("coverage_gap"),
  coverageSourceReviewRequired: coverageCount("source_review_required"),
  coverageSourceLimited: coverageCount("source_limited"),
  coverageMissingQuestions: topic20FastPipelineRun1BPreMaterialization.finalCoverage?.totalActionableMissingQuestions ?? null,
  generationSlots: topic20FastPipelineRun1BPreMaterialization.generationSlots,
  exceptions: topic20FastPipelineRun1BPreMaterialization.exceptionQueue.length,
  blockers: topic20FastPipelineRun1BPreMaterialization.exceptionQueue.filter((row) => row.blocker).length,
  review: topic20FastPipelineRun1BPreMaterialization.exceptionQueue.filter((row) => !row.blocker).length,
} as const;
