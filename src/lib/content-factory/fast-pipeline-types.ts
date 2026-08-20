import type { V4StudyContentPackage } from "../v4-content-package";
import type { FactoryCoverageResult } from "./coverage";
import type { ContentFactoryPortableOutput } from "./package-builder";
import type { FactoryQuestionQualityReport } from "./question-quality";
import type {
  ContentFactoryJob,
  FactoryGates,
  FactoryGeneratedQuestionCandidate,
  FactoryProposalConfidence,
  FactoryQuestionAssignment,
  FactoryQuestionGenerationSlot,
  FactoryStudyContent,
  ProposedConcept,
  ProposedStudyUnit,
} from "./types";

export const CONTENT_FACTORY_FAST_PIPELINE_VERSION = "1.0" as const;

export const FACTORY_EXCEPTION_TYPES = [
  "concept_boundary",
  "mapping_ambiguity",
  "source_limited_candidate",
  "source_review_required",
  "anchor_conflict",
  "weak_distractor",
  "near_duplicate",
  "source_traceability",
  "generation_dimension",
  "coverage_anomaly",
] as const;

export type FactoryExceptionType = (typeof FACTORY_EXCEPTION_TYPES)[number];
export type FactoryExceptionSeverity = "info" | "warning" | "error";

export type FactoryArtifactKind =
  | "topic"
  | "unit"
  | "concept"
  | "mapping"
  | "coverage"
  | "generation_slot"
  | "question"
  | "flashcard"
  | "v2_package"
  | "v4_package"
  | "qa"
  | "governance_packet";

export type FactoryArtifactRef = {
  kind: FactoryArtifactKind;
  id: string;
};

export type FactoryExceptionSubject = {
  kind: "topic" | "unit" | "concept" | "mapping" | "question" | "flashcard";
  id: string;
};

export type FactoryException = {
  id: string;
  type: FactoryExceptionType;
  blocker: boolean;
  severity: FactoryExceptionSeverity;
  confidence: FactoryProposalConfidence;
  subject: FactoryExceptionSubject;
  explanation: string;
  recommendation: string;
  alternatives?: string[];
  affectedArtifacts: FactoryArtifactRef[];
};

export type FactoryDecisionTrace = {
  id: string;
  provisional: boolean;
  confidence: FactoryProposalConfidence;
  reason: string;
  subject: FactoryExceptionSubject;
  affectedArtifacts: FactoryArtifactRef[];
};

export type FactoryFastPipelinePhase =
  | "ingest"
  | "analyze"
  | "structural_draft"
  | "provisional_generation"
  | "adversarial_qa"
  | "exception_classification"
  | "governance_packet"
  | "apply_decisions"
  | "targeted_regeneration"
  | "final_validation"
  | "import_ready";

export type FactoryPhaseResult = {
  phase: FactoryFastPipelinePhase;
  status: "complete" | "provisional" | "blocked" | "skipped";
  note?: string;
};

export type FactoryStructuralDraft = {
  units: ProposedStudyUnit[];
  concepts: ProposedConcept[];
  assignments: FactoryQuestionAssignment[];
};

export type FactoryTopicDraft = FactoryStructuralDraft & {
  content: FactoryStudyContent | null;
  generatedQuestions: FactoryGeneratedQuestionCandidate[];
};

export type FactoryFastPipelineOperations = {
  buildStructuralDraft?: (context: {
    job: ContentFactoryJob;
    existingV4Content?: V4StudyContentPackage;
    approvedAnchors?: V4StudyContentPackage;
  }) => FactoryStructuralDraft;
  buildStudyContent?: (context: {
    job: ContentFactoryJob;
    structuralDraft: FactoryStructuralDraft;
    previousContent?: FactoryStudyContent | null;
    impactedConceptCodes?: string[];
  }) => FactoryStudyContent;
  generateQuestions?: (context: {
    job: ContentFactoryJob;
    slots: FactoryQuestionGenerationSlot[];
    concepts: ProposedConcept[];
    existingQuestions: ContentFactoryJob["existingQuestions"];
    previousGeneratedQuestions: FactoryGeneratedQuestionCandidate[];
  }) => FactoryGeneratedQuestionCandidate[];
  hardenQuestions?: (context: {
    job: ContentFactoryJob;
    candidates: FactoryGeneratedQuestionCandidate[];
    concepts: ProposedConcept[];
  }) => FactoryGeneratedQuestionCandidate[];
};

export type FactoryGovernanceDecisionResolution =
  | "accept_recommendation"
  | "choose_alternative"
  | "patch"
  | "reject";

export type FactoryGovernanceDecision = {
  exceptionId: string;
  resolution: FactoryGovernanceDecisionResolution;
  optionalPatch?: Record<string, unknown>;
  note?: string;
};

export type FactoryGateDecision = {
  gate: keyof FactoryGates;
  status: "approved" | "rejected";
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string[];
};

export type FactoryGovernanceDecisions = {
  exceptions?: FactoryGovernanceDecision[];
  gates?: FactoryGateDecision[];
};

export type FactoryRegenerationReport = {
  decisionIds: string[];
  affectedConceptCodes: string[];
  invalidatedArtifacts: FactoryArtifactRef[];
  preservedArtifacts: FactoryArtifactRef[];
  recomputedCoverageConceptCodes: string[];
  removedGeneratedQuestionCodes: string[];
  generatedQuestionCodes: string[];
};

export type FactoryGovernancePacket = {
  title: string;
  summary: {
    existingBankQuestions: number;
    units: number;
    concepts: number;
    standardReady: number;
    sourceLimited: number;
    sourceReviewRequired: number;
    actionableCoverageGaps: number;
    generatedQuestions: number;
    blockers: number;
    reviewRecommended: number;
    highConfidenceConceptsWithoutSpecificReview: number;
  };
  exceptions: FactoryException[];
  auditPack: {
    units: ProposedStudyUnit[];
    concepts: ProposedConcept[];
    assignments: FactoryQuestionAssignment[];
    generatedQuestions: FactoryGeneratedQuestionCandidate[];
  };
};

export type FactoryFastPipelineReadiness = {
  state: "draft" | "governance_required" | "blocked" | "import_ready";
  importReady: boolean;
  blockers: string[];
};

export type FactoryFastPipelineRun = {
  version: typeof CONTENT_FACTORY_FAST_PIPELINE_VERSION;
  runNumber: 1 | 2;
  job: ContentFactoryJob;
  gates: FactoryGates;
  phases: FactoryPhaseResult[];
  provisional: boolean;
  decisionTrace: FactoryDecisionTrace[];
  draft: FactoryTopicDraft;
  initialCoverage: FactoryCoverageResult | null;
  finalCoverage: FactoryCoverageResult | null;
  generationSlots: FactoryQuestionGenerationSlot[];
  questionQa: FactoryQuestionQualityReport | null;
  portable: ContentFactoryPortableOutput | null;
  exceptionQueue: FactoryException[];
  governancePacket: FactoryGovernancePacket;
  readiness: FactoryFastPipelineReadiness;
  regeneration: FactoryRegenerationReport | null;
  resolvedExceptionIds: string[];
};

export type FactoryFastPipelineInput = {
  job: ContentFactoryJob;
  gates?: FactoryGates;
  existingV4Content?: V4StudyContentPackage;
  approvedAnchors?: V4StudyContentPackage;
  draft?: Partial<FactoryTopicDraft>;
  operations?: FactoryFastPipelineOperations;
  previousRun?: FactoryFastPipelineRun;
  decisions?: FactoryGovernanceDecisions;
};
