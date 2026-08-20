import { runContentFactoryTopic } from "./fast-pipeline";
import type {
  FactoryException,
  FactoryFastPipelineInput,
  FactoryFastPipelineRun,
  FactoryGovernancePacket,
} from "./fast-pipeline-types";
import { pruneNonMaterialFactoryExceptions } from "./material-exceptions";
import type { SemanticSourceSpan, SemanticTopicDraft } from "./semantic-draft";
import {
  buildSemanticFactoryWorkPackets,
  type SemanticFactoryWorkPacketBundle,
} from "./work-packets";

function dedupeExceptions(exceptions: FactoryException[]) {
  return [...new Map(exceptions.map((exception) => [exception.id, exception])).values()]
    .sort((left, right) => left.id.localeCompare(right.id, "es"));
}

function replaceGovernancePacketExceptions(
  packet: FactoryGovernancePacket,
  exceptions: FactoryException[],
  semanticDraft: SemanticTopicDraft,
): FactoryGovernancePacket {
  const exceptionConceptCodes = new Set(
    exceptions.flatMap((exception) => [
      ...(exception.subject.kind === "concept" ? [exception.subject.id] : []),
      ...exception.affectedArtifacts
        .filter((artifact) => artifact.kind === "concept")
        .map((artifact) => artifact.id),
    ]),
  );
  return {
    ...packet,
    summary: {
      ...packet.summary,
      sourceReviewRequired: exceptions.filter((exception) => exception.type === "source_review_required").length,
      blockers: exceptions.filter((exception) => exception.blocker).length,
      reviewRecommended: exceptions.filter((exception) => !exception.blocker).length,
      highConfidenceConceptsWithoutSpecificReview: semanticDraft.concepts.filter(
        (concept) => (concept.confidence ?? "high") === "high" && !exceptionConceptCodes.has(concept.code),
      ).length,
    },
    exceptions,
  };
}

function isMissingStudyContent(exception: FactoryException) {
  return exception.id.endsWith(":missing-study-content");
}

function isMissingQuestionGenerator(exception: FactoryException) {
  return exception.id.endsWith(":missing-question-generator");
}

function technicalExceptionResolvedByPackets(
  exception: FactoryException,
  workPackets: SemanticFactoryWorkPacketBundle | null,
) {
  if (!workPackets) return false;
  if (isMissingStudyContent(exception)) return workPackets.executableStudyContent;
  if (isMissingQuestionGenerator(exception)) {
    return workPackets.executableQuestions &&
      workPackets.questions.length === workPackets.generationSlots.length;
  }
  return false;
}

function technicalReadinessBlocker(id: string) {
  return id === "portable_output_unavailable" ||
    id.includes(":coverage-calculation") ||
    id.includes(":final-coverage-calculation") ||
    id.includes(":generation-slot-");
}

export type SemanticFastPipelineInput = Omit<FactoryFastPipelineInput, "draft"> & {
  semanticDraft: SemanticTopicDraft;
  canonicalSource?: SemanticSourceSpan[];
};

export type SemanticFastPipelineRun = FactoryFastPipelineRun & {
  workPackets: SemanticFactoryWorkPacketBundle | null;
};

/**
 * Semantic Accelerator entry point for FAST PIPELINE.
 *
 * CONTENT-FACTORY.5 keeps proposal confidence separate from Governance review.
 * Medium confidence continues provisionally unless a concrete material decision
 * exists. Canonical text may also be supplied so the runner emits executable
 * study/flashcard/question work packets instead of technical missing-generator
 * blockers while the agent has not yet returned packet outputs.
 */
export function runContentFactoryTopicWithSemanticDraft(
  input: SemanticFastPipelineInput,
): SemanticFastPipelineRun {
  const run = runContentFactoryTopic({
    ...input,
    draft: input.previousRun
      ? undefined
      : {
          units: input.semanticDraft.units,
          concepts: input.semanticDraft.concepts,
          assignments: input.semanticDraft.mappings,
          content: null,
          generatedQuestions: [],
        },
  });

  const workPackets = input.canonicalSource
    ? buildSemanticFactoryWorkPackets({
        job: input.job,
        semanticDraft: input.semanticDraft,
        canonicalSource: input.canonicalSource,
        generationSlots: run.generationSlots,
      })
    : null;

  const resolved = new Set(run.resolvedExceptionIds);
  const semanticExceptions = pruneNonMaterialFactoryExceptions(
    input.semanticDraft.semanticExceptions.filter((exception) => !resolved.has(exception.id)),
  );
  const fastExceptions = pruneNonMaterialFactoryExceptions(run.exceptionQueue)
    .filter((exception) => !technicalExceptionResolvedByPackets(exception, workPackets));
  const exceptionQueue = dedupeExceptions([
    ...fastExceptions,
    ...semanticExceptions,
  ]);
  const governancePacket = replaceGovernancePacketExceptions(
    run.governancePacket,
    exceptionQueue,
    input.semanticDraft,
  );

  const finalExceptionIds = new Set(exceptionQueue.map((exception) => exception.id));
  const blockers = [...new Set([
    ...run.readiness.blockers.filter((id) => !id.startsWith("fx:") || finalExceptionIds.has(id)),
    ...exceptionQueue.filter((exception) => exception.blocker).map((exception) => exception.id),
  ])];
  const importReady = run.portable?.importReady === true && blockers.length === 0;
  const hasTechnicalBlocker = blockers.some(technicalReadinessBlocker);

  const phases = run.phases.map((phase) => {
    if (
      phase.phase === "provisional_generation" &&
      phase.status === "blocked" &&
      workPackets?.executableQuestions &&
      workPackets.questions.length === workPackets.generationSlots.length
    ) {
      return {
        ...phase,
        status: "provisional" as const,
        note: `${workPackets.questions.length} executable canonical question work packet(s) prepared for agent execution.`,
      };
    }
    return phase;
  });

  return {
    ...run,
    phases,
    workPackets,
    exceptionQueue,
    governancePacket,
    decisionTrace: exceptionQueue.map((exception) => ({
      id: `trace:${exception.id}`,
      provisional: true,
      confidence: exception.confidence,
      reason: exception.explanation,
      subject: exception.subject,
      affectedArtifacts: exception.affectedArtifacts,
    })),
    readiness: {
      ...run.readiness,
      importReady,
      state: importReady
        ? "import_ready"
        : hasTechnicalBlocker
          ? "blocked"
          : "governance_required",
      blockers,
    },
  };
}
