import { runContentFactoryTopic } from "../fast-pipeline";
import type { FactoryGeneratedQuestionCandidate } from "../types";
import { topic20Run1BGeneratedQuestionCandidates } from "./topic-20-run1b-materialization";
import {
  topic20ContentFactoryJob,
  topic20FastPipelineRun1B,
} from "./topic-20-semantic-benchmark";

export const TOPIC20_RUN2_GOVERNANCE_EXCEPTION_ID =
  "fx:weak_distractor:question:sms-t20-0222:gross_length_clue" as const;

const approved0222Options = {
  opcion_a: "Las bases que conforman el régimen jurídico de las Administraciones Públicas.",
  opcion_b: "Los principios del sistema de responsabilidad de las Administraciones Públicas.",
  opcion_c: "Los principios aplicables al ejercicio de la potestad sancionadora.",
  opcion_d: "La composición y categorías integrantes del sector público institucional.",
} as const;

const run1B0222 = topic20Run1BGeneratedQuestionCandidates.find(
  (candidate) => String(candidate.v2.codigo ?? "") === "SMS-T20-0222",
);
if (!run1B0222) throw new Error("RUN 1B candidate SMS-T20-0222 is missing.");

/**
 * Governance-authorized targeted regeneration. The code, concept, exception
 * dimension, objective, canonical source/pages and conceptual answer remain
 * unchanged. Only option wording is balanced to remove gross_length_clue.
 */
export const topic20Run2Regenerated0222: FactoryGeneratedQuestionCandidate = {
  ...run1B0222,
  dimensions: [...run1B0222.dimensions],
  v2: {
    ...run1B0222.v2,
    ...approved0222Options,
  },
};

const run2CandidateByCode = new Map(
  topic20Run1BGeneratedQuestionCandidates.map((candidate) => {
    const code = String(candidate.v2.codigo ?? "");
    return [code, code === "SMS-T20-0222" ? topic20Run2Regenerated0222 : candidate] as const;
  }),
);

export const topic20FastPipelineRun2 = runContentFactoryTopic({
  job: topic20ContentFactoryJob,
  previousRun: topic20FastPipelineRun1B,
  decisions: {
    gates: [
      {
        gate: "conceptMap",
        status: "approved",
        reviewedBy: "Governance",
        notes: [
          "T20 RUN 1B approved: 7 units, 30 concepts and 220 existing automated primary mappings.",
        ],
      },
      {
        gate: "editorialQuality",
        status: "approved",
        reviewedBy: "Governance",
        notes: [
          "T20 RUN 1B approved: study content, 60 flashcards and generated questions except targeted QA regeneration of SMS-T20-0222.",
        ],
      },
    ],
    exceptions: [
      {
        exceptionId: TOPIC20_RUN2_GOVERNANCE_EXCEPTION_ID,
        resolution: "patch",
        optionalPatch: { v2: approved0222Options },
        note: "TARGETED REGENERATION: preserve SMS-T20-0222 code/concept/exception dimension/objective/source/answer; balance A/B/C/D length and structure using only arts. 1-2 canonical text.",
      },
    ],
  },
  operations: {
    generateQuestions: ({ slots }) => {
      const requested = new Set(
        slots.map((slot) => `${slot.questionCode}|${slot.conceptCode}|${slot.dimension}`),
      );
      return [...run2CandidateByCode.values()].filter((candidate) => {
        const code = String(candidate.v2.codigo ?? "");
        return candidate.dimensions.some((dimension) =>
          requested.has(`${code}|${candidate.conceptCode}|${dimension}`),
        );
      });
    },
  },
});

export const topic20ProductionPlan = {
  newQuestionCodes: [
    "SMS-T20-0221",
    "SMS-T20-0222",
    "SMS-T20-0223",
    "SMS-T20-0224",
    "SMS-T20-0225",
    "SMS-T20-0226",
  ],
  v2Questions: topic20FastPipelineRun2.portable?.v2Questions ?? [],
  v4Package: topic20FastPipelineRun2.portable?.v4Package ?? null,
} as const;
