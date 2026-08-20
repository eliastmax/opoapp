import { runContentFactoryTopic } from "../fast-pipeline";
import {
  topic19FastPipelineRun1,
  topic19SourceBoundaryException,
} from "./topic-19-fast-pipeline";

/**
 * Governance-approved RUN 2 for Topic 19.
 *
 * The source-boundary exception is intentionally injected into the previous
 * RUN 1 state because it was an ingest quarantine exception created outside
 * generic coverage classification. Governance resolved it by accepting the
 * Factory recommendation: archive the 19 legacy-source questions and keep
 * them outside V4. No external source is used to repair or remap them.
 */
export const topic19FastPipelineRun1Reviewed = {
  ...topic19FastPipelineRun1,
  exceptionQueue: [
    ...topic19FastPipelineRun1.exceptionQueue,
    topic19SourceBoundaryException,
  ],
  governancePacket: {
    ...topic19FastPipelineRun1.governancePacket,
    summary: {
      ...topic19FastPipelineRun1.governancePacket.summary,
      sourceReviewRequired:
        topic19FastPipelineRun1.governancePacket.summary.sourceReviewRequired + 1,
      blockers: topic19FastPipelineRun1.governancePacket.summary.blockers + 1,
    },
    exceptions: [
      ...topic19FastPipelineRun1.governancePacket.exceptions,
      topic19SourceBoundaryException,
    ],
  },
  readiness: {
    state: "blocked" as const,
    importReady: false,
    blockers: [
      ...topic19FastPipelineRun1.readiness.blockers,
      topic19SourceBoundaryException.id,
    ],
  },
};

export const topic19FastPipelineRun2 = runContentFactoryTopic({
  job: topic19FastPipelineRun1.job,
  previousRun: topic19FastPipelineRun1Reviewed,
  decisions: {
    gates: [
      {
        gate: "conceptMap",
        status: "approved",
        reviewedBy: "Governance",
        notes: ["Tema 19 RUN 1: 15 units, 40 concepts and 221 canonical mappings approved."],
      },
      {
        gate: "editorialQuality",
        status: "approved",
        reviewedBy: "Governance",
        notes: ["Tema 19 RUN 1: 80 flashcards and SMS-T19-0241..0245 approved."],
      },
    ],
    exceptions: [
      {
        exceptionId: topic19SourceBoundaryException.id,
        resolution: "accept_recommendation",
        note: "Archive SMS-T19-0041..0049, 0097..0100 and 0115..0120; preserve records/history; do not map to V4 or repair from external sources.",
      },
    ],
  },
});

export const topic19ProductionPlan = {
  archiveLegacyQuestionCodes: [
    "SMS-T19-0041","SMS-T19-0042","SMS-T19-0043","SMS-T19-0044","SMS-T19-0045","SMS-T19-0046","SMS-T19-0047","SMS-T19-0048","SMS-T19-0049",
    "SMS-T19-0097","SMS-T19-0098","SMS-T19-0099","SMS-T19-0100",
    "SMS-T19-0115","SMS-T19-0116","SMS-T19-0117","SMS-T19-0118","SMS-T19-0119","SMS-T19-0120",
  ],
  newQuestionCodes: [
    "SMS-T19-0241","SMS-T19-0242","SMS-T19-0243","SMS-T19-0244","SMS-T19-0245",
  ],
  v2Questions: topic19FastPipelineRun2.portable?.v2Questions ?? [],
  v4Package: topic19FastPipelineRun2.portable?.v4Package ?? null,
} as const;
