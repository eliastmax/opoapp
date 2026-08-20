import { buildGate1Report } from "../reports";
import type { FactoryQuestionAssignment, ProposedConcept } from "../types";
import {
  topic18Gate1Assignments,
  topic18Gate1Concepts,
  topic18Gate1Job,
  topic18Gate1Units,
} from "./topic-18-gate1";

const C29_SOURCE_LIMIT_REASON =
  "Temario_new.pdf, art. 38, contiene una única regla sustantiva de ejecutividad ya medida directamente por SMS-T18-0199; no admite más dimensiones independientes sin repetir conocimiento.";

/**
 * Governance-approved Topic 18 Gate 1.
 *
 * The original Gate 1 consumer remains as the review snapshot. This approved
 * layer applies the editorial decisions authorized by Governance:
 * - SMS-T18-0239 belongs primarily to C30 because efficacy delay is decisive.
 * - C29 remains separate and is source_limited at one independent primary item.
 */
export const topic18ApprovedAssignments: FactoryQuestionAssignment[] = topic18Gate1Assignments.map(
  (assignment) =>
    assignment.questionCode === "SMS-T18-0239"
      ? {
          ...assignment,
          primaryConceptCode: "SMS-T18-C30",
          confidence: "high",
          rationale:
            "Gate 1 approved: the decisive rule is efficacy delay in C30; C29/executivity is contrast only.",
        }
      : assignment,
);

export const topic18ApprovedConcepts: ProposedConcept[] = topic18Gate1Concepts.map((concept) =>
  concept.code === "SMS-T18-C29"
    ? {
        ...concept,
        confidence: "high",
        sourceCapacity: {
          status: "source_limited",
          sourceSupportedCeiling: 1,
          reason: C29_SOURCE_LIMIT_REASON,
        },
        observations: [
          ...(concept.observations ?? []),
          "Gate 2.1: source_limited; nominalThreshold=4, sourceSupportedCeiling=1, blockedAdditionalQuestions=3.",
        ],
      }
    : concept,
);

export const topic18ApprovedGate1Report = buildGate1Report({
  job: topic18Gate1Job,
  units: topic18Gate1Units,
  concepts: topic18ApprovedConcepts,
  assignments: topic18ApprovedAssignments,
});

export const topic18ApprovedGate1 = {
  status: "approved" as const,
  approvedStructure: {
    units: 16,
    concepts: 44,
    preservedSplits: [
      ["SMS-T18-C04", "SMS-T18-C05"],
      ["SMS-T18-C10", "SMS-T18-C11"],
      ["SMS-T18-C11", "SMS-T18-C13"],
      ["SMS-T18-C13", "SMS-T18-C23"],
      ["SMS-T18-C20", "SMS-T18-C21"],
      ["SMS-T18-C21", "SMS-T18-C22"],
      ["SMS-T18-C23", "SMS-T18-C24"],
      ["SMS-T18-C25", "SMS-T18-C26"],
      ["SMS-T18-C29", "SMS-T18-C30"],
    ],
    anchors: {
      units: ["SMS-T18-U07", "SMS-T18-U08"],
      concepts: ["SMS-T18-C14", "SMS-T18-C15", "SMS-T18-C16"],
    },
    canonicalSource: "Temario_new.pdf",
    sourceLimited: {
      conceptCode: "SMS-T18-C29",
      primaryCount: 1,
      nominalThreshold: 4,
      sourceSupportedCeiling: 1,
      blockedAdditionalQuestions: 3,
      reason: C29_SOURCE_LIMIT_REASON,
    },
  },
  correction: {
    questionCode: "SMS-T18-0239",
    from: "SMS-T18-C29",
    to: "SMS-T18-C30",
  },
  report: topic18ApprovedGate1Report,
} as const;
