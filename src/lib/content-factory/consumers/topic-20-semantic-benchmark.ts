import { buildSemanticTopicDraft, type SemanticSourceSpan } from "../semantic-draft";
import { runContentFactoryTopicWithSemanticDraft } from "../semantic-fast-pipeline";
import type { ContentFactoryJob, FactoryQuestionMetadata } from "../types";
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

/**
 * Technical source-ingest adapter for the benchmark only.
 *
 * It does not create semantic units/concepts/mappings. It reduces the canonical
 * traceability already stored on the real V2 rows to one article-level source
 * span per printed article heading, preserving only document, article heading,
 * broad section and page envelope. No legal text or concept boundary is added.
 * This is intentionally counted as manual/technical input preparation in the
 * benchmark ledger because Content Factory 4 does not ingest PDF bytes itself.
 */
export function buildTopic20CanonicalSourceSpans(): SemanticSourceSpan[] {
  const grouped = new Map<string, {
    apartado: string;
    subapartado: string;
    pageStart: number;
    pageEnd: number;
  }>();

  for (const row of semanticRows) {
    const [, apartado, subapartado, , , , , , , pageStart, pageEnd] = row;
    const current = grouped.get(subapartado);
    if (!current) {
      grouped.set(subapartado, { apartado, subapartado, pageStart, pageEnd });
      continue;
    }
    current.pageStart = Math.min(current.pageStart, pageStart);
    current.pageEnd = Math.max(current.pageEnd, pageEnd);
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

export const topic20CanonicalSource = buildTopic20CanonicalSourceSpans();

export const topic20ContentFactoryJob: ContentFactoryJob = {
  version: "1.0",
  oppositionCode: "auxiliar-administrativo-sms",
  topicNumber: 20,
  topicTitle: "Tema 20. La Ley 40/2015, de 1 de octubre, de Régimen Jurídico del Sector Público (I). Ámbito de aplicación. Los órganos de las Administraciones Públicas. Responsabilidad patrimonial de las Administraciones Públicas: principios; responsabilidad de las autoridades y el personal al servicio de las Administraciones Públicas.",
  mode: "existing_bank",
  codePrefix: "SMS-T20",
  coverageThreshold: 4,
  sourceRevision: "Temario_new.pdf · Tema 20 canonical benchmark · pp. 44-76",
  source: [{
    label: "Temario_new.pdf",
    reference: "Tema 20 · Ley 40/2015 (I)",
    pageStart: 44,
    pageEnd: 76,
  }],
  sourcePolicy: {
    canonicalOnly: true,
    document: "Temario_new.pdf",
    externalVerificationAllowed: false,
  },
  existingQuestions: topic20ExistingQuestions,
};

export const topic20SemanticDraftRun1 = buildSemanticTopicDraft({
  job: topic20ContentFactoryJob,
  canonicalSource: topic20CanonicalSource,
  existingQuestions: topic20ExistingQuestions,
});

export const topic20FastPipelineRun1 = runContentFactoryTopicWithSemanticDraft({
  job: topic20ContentFactoryJob,
  semanticDraft: topic20SemanticDraftRun1,
});

const countSemanticExceptions = (type: string) =>
  topic20SemanticDraftRun1.semanticExceptions.filter((exception) => exception.type === type).length;

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
  coverageStandardReady: topic20FastPipelineRun1.finalCoverage?.summary.standardReady ?? null,
  coverageSourceLimited: topic20FastPipelineRun1.finalCoverage?.summary.sourceLimited ?? null,
  coverageActionableGaps: topic20FastPipelineRun1.finalCoverage?.summary.actionableGaps ?? null,
  coverageUnmapped: topic20FastPipelineRun1.finalCoverage?.summary.unmapped ?? null,
  generationSlots: topic20FastPipelineRun1.generationSlots.length,
  generatedQuestions: topic20FastPipelineRun1.draft.generatedQuestions.length,
  questionQaIssues: topic20FastPipelineRun1.questionQa?.issues.length ?? null,
  governanceExceptions: topic20FastPipelineRun1.exceptionQueue.length,
  governanceBlockers: topic20FastPipelineRun1.exceptionQueue.filter((exception) => exception.blocker).length,
  importReady: topic20FastPipelineRun1.readiness.importReady,
  readinessState: topic20FastPipelineRun1.readiness.state,
} as const;

export const topic20ManualInterventionLedger = [
  {
    id: "T20-MANUAL-01",
    category: "A" as const,
    action: "Read-only extraction and 25-field V2 contract audit from Supabase; version only the FactoryQuestionMetadata fields consumed by Semantic Accelerator.",
    semanticDecision: false,
  },
  {
    id: "T20-MANUAL-02",
    category: "A" as const,
    action: "Technical article/page source-span preparation because Semantic Accelerator does not ingest PDF bytes directly; no unit, concept or mapping boundary was authored.",
    semanticDecision: false,
  },
] as const;
