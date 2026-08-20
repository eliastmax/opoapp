import { applyFactoryGovernanceDecisions } from "../fast-pipeline";
import { runContentFactoryTopicWithSemanticDraft } from "../semantic-fast-pipeline";
import type { FactoryGeneratedQuestionCandidate } from "../types";
import { topic20Run1BGeneratedQuestionCandidates } from "./topic-20-run1b-materialization";
import {
  topic20CanonicalSourceRun1B,
  topic20ContentFactoryJob,
  topic20FastPipelineRun1B,
  topic20SemanticDraftRun1B,
} from "./topic-20-semantic-benchmark";

export const TOPIC20_RUN2_GOVERNANCE_EXCEPTION_ID =
  "fx:weak_distractor:question:sms-t20-0222:gross_length_clue" as const;

export const topic20Run2Approved0222Options = {
  opcion_a: "Las bases que conforman el régimen jurídico de las Administraciones Públicas.",
  opcion_b: "Los principios del sistema de responsabilidad de las Administraciones Públicas.",
  opcion_c: "Los principios aplicables al ejercicio de la potestad sancionadora.",
  opcion_d: "La composición y categorías integrantes del sector público institucional.",
} as const;

const run1B0222 = topic20Run1BGeneratedQuestionCandidates.find(
  (candidate) => String(candidate.v2.codigo ?? "") === "SMS-T20-0222",
);
if (!run1B0222) throw new Error("RUN 1B candidate SMS-T20-0222 is missing.");

/** Governance-approved targeted regeneration output. */
export const topic20Run2Regenerated0222: FactoryGeneratedQuestionCandidate = {
  ...run1B0222,
  dimensions: [...run1B0222.dimensions],
  v2: {
    ...run1B0222.v2,
    ...topic20Run2Approved0222Options,
  },
};

export const topic20Run2GovernanceDecisions = {
  gates: [
    {
      gate: "conceptMap" as const,
      status: "approved" as const,
      reviewedBy: "Governance",
      notes: [
        "T20 RUN 1B approved: 7 units, 30 concepts and 220 existing automated primary mappings.",
      ],
    },
    {
      gate: "editorialQuality" as const,
      status: "approved" as const,
      reviewedBy: "Governance",
      notes: [
        "T20 RUN 1B approved; SMS-T20-0222 receives the sole targeted distractor-length regeneration.",
      ],
    },
  ],
  exceptions: [
    {
      exceptionId: TOPIC20_RUN2_GOVERNANCE_EXCEPTION_ID,
      resolution: "patch" as const,
      optionalPatch: { v2: topic20Run2Approved0222Options },
      note: "TARGETED REGENERATION: preserve SMS-T20-0222 code/concept/exception dimension/objective/source/answer; balance A/B/C/D length and structure using only arts. 1-2 canonical text.",
    },
  ],
};

/**
 * Apply the normal Governance decision contract first. A question-wording patch
 * is already the complete targeted regeneration artifact; feeding it back as an
 * affected concept would allocate new codes after 0226 and violate Governance's
 * stable-code requirement. RUN 2 therefore validates the reviewed patched state
 * without rebuilding the semantic map or any other generated question.
 */
export const topic20Run2AppliedDecision = applyFactoryGovernanceDecisions({
  previousRun: topic20FastPipelineRun1B,
  decisions: topic20Run2GovernanceDecisions,
});

export const topic20FastPipelineRun1BReviewed = {
  ...topic20FastPipelineRun1B,
  gates: topic20Run2AppliedDecision.gates,
  draft: topic20Run2AppliedDecision.draft,
  resolvedExceptionIds: topic20Run2AppliedDecision.resolvedExceptionIds,
};

export const topic20FastPipelineRun2 = runContentFactoryTopicWithSemanticDraft({
  job: topic20ContentFactoryJob,
  semanticDraft: topic20SemanticDraftRun1B,
  canonicalSource: topic20CanonicalSourceRun1B,
  previousRun: topic20FastPipelineRun1BReviewed,
  decisions: {},
});

const PRODUCTION_SUBJECT_NAME = "Ley 40/2015 — Régimen jurídico del sector público";
const PRODUCTION_TOPIC_NAME = topic20ContentFactoryJob.topicTitle;

const approvedV2Questions = topic20FastPipelineRun2.portable?.v2Questions ?? [];
export const topic20V2QuestionsForImport = approvedV2Questions.map((row) => ({
  ...row,
  materia: PRODUCTION_SUBJECT_NAME,
  tema: PRODUCTION_TOPIC_NAME,
}));

export const topic20ProductionPlan = {
  newQuestionCodes: [
    "SMS-T20-0221",
    "SMS-T20-0222",
    "SMS-T20-0223",
    "SMS-T20-0224",
    "SMS-T20-0225",
    "SMS-T20-0226",
  ],
  v2Questions: approvedV2Questions,
  v2QuestionsForImport: topic20V2QuestionsForImport,
  v4Package: topic20FastPipelineRun2.portable?.v4Package ?? null,
} as const;
