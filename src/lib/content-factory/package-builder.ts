import {
  V4_STUDY_CONTENT_VERSION,
  validateV4StudyContentPackage,
  type V4QuestionConceptMappingPackage,
  type V4StudyContentPackage,
} from "../v4-content-package";
import { auditGeneratedQuestionCandidates, type FactoryQuestionQualityReport } from "./question-quality";
import {
  evaluateFactoryPipelineState,
  validateContentFactoryJob,
} from "./validators";
import type {
  ContentFactoryJob,
  FactoryGates,
  FactoryGeneratedQuestionCandidate,
  FactoryQuestionAssignment,
  FactoryStudyContent,
  V2QuestionRow,
} from "./types";

export type ContentFactoryPortableOutput = {
  factoryVersion: "1.0";
  job: ContentFactoryJob;
  gates: FactoryGates;
  v2Questions: V2QuestionRow[];
  v4Package: V4StudyContentPackage;
  validation: {
    job: ReturnType<typeof validateContentFactoryJob>;
    pipeline: ReturnType<typeof evaluateFactoryPipelineState>;
    questions: FactoryQuestionQualityReport;
    v4: ReturnType<typeof validateV4StudyContentPackage>;
  };
  importReady: boolean;
};

function canonicalMappings(
  assignments: FactoryQuestionAssignment[],
  generated: FactoryGeneratedQuestionCandidate[],
): V4QuestionConceptMappingPackage[] {
  return [
    ...assignments.map((assignment) => ({
      questionCode: assignment.questionCode,
      primaryConceptCode: assignment.primaryConceptCode,
      ...(assignment.secondaryConceptCodes?.length
        ? { secondaryConceptCodes: assignment.secondaryConceptCodes }
        : {}),
    })),
    ...generated.map((candidate) => ({
      questionCode: String(candidate.v2.codigo ?? "").trim(),
      primaryConceptCode: candidate.conceptCode,
    })),
  ];
}

/**
 * Produces the portable handoff only. It never calls Supabase or either importer.
 * A draft can be structurally valid while Gate 2 is still pending. `importReady`
 * remains stricter: both human gates, structural QA, V2 QA, V4 QA and full
 * concept coverage must all pass.
 */
export function buildContentFactoryPortableOutput(input: {
  job: ContentFactoryJob;
  gates: FactoryGates;
  content: FactoryStudyContent;
  assignments: FactoryQuestionAssignment[];
  generatedQuestions?: FactoryGeneratedQuestionCandidate[];
}): ContentFactoryPortableOutput {
  const generatedQuestions = input.generatedQuestions ?? [];
  const v4Package: V4StudyContentPackage = {
    version: V4_STUDY_CONTENT_VERSION,
    oppositionCode: input.job.oppositionCode,
    topicNumber: input.job.topicNumber,
    sourceRevision: input.job.sourceRevision,
    units: input.content.units,
    concepts: input.content.concepts,
    questionMappings: canonicalMappings(input.assignments, generatedQuestions),
    flashcards: input.content.flashcards,
  };

  const jobValidation = validateContentFactoryJob(input.job);
  const pipeline = evaluateFactoryPipelineState(input.gates);
  const questionValidation = auditGeneratedQuestionCandidates({
    candidates: generatedQuestions,
    concepts: input.content.concepts,
  });
  const v4Validation = validateV4StudyContentPackage(v4Package);

  return {
    factoryVersion: "1.0",
    job: input.job,
    gates: input.gates,
    v2Questions: generatedQuestions.map((candidate) => candidate.v2),
    v4Package,
    validation: {
      job: jobValidation,
      pipeline,
      questions: questionValidation,
      v4: v4Validation,
    },
    importReady:
      pipeline.importReadiness.ready &&
      jobValidation.valid &&
      pipeline.structural.valid &&
      questionValidation.valid &&
      v4Validation.valid &&
      v4Validation.coverage.underCoveredConceptIds.length === 0,
  };
}
