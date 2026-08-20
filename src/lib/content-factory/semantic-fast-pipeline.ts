import { runContentFactoryTopic } from "./fast-pipeline";
import type {
  FactoryException,
  FactoryFastPipelineInput,
  FactoryFastPipelineRun,
  FactoryGovernancePacket,
} from "./fast-pipeline-types";
import type { SemanticTopicDraft } from "./semantic-draft";

function dedupeExceptions(exceptions: FactoryException[]) {
  return [...new Map(exceptions.map((exception) => [exception.id, exception])).values()]
    .sort((left, right) => left.id.localeCompare(right.id, "es"));
}

function mergeGovernancePacket(
  packet: FactoryGovernancePacket,
  semanticExceptions: FactoryException[],
): FactoryGovernancePacket {
  const exceptions = dedupeExceptions([...packet.exceptions, ...semanticExceptions]);
  return {
    ...packet,
    summary: {
      ...packet.summary,
      sourceReviewRequired: exceptions.filter((exception) => exception.type === "source_review_required").length,
      blockers: exceptions.filter((exception) => exception.blocker).length,
      reviewRecommended: exceptions.filter((exception) => !exception.blocker).length,
    },
    exceptions,
  };
}

/**
 * Semantic Accelerator entry point for FAST PIPELINE.
 *
 * Upstream semantic exceptions are intentionally merged into the same
 * exceptionQueue/Governance packet used by the normal runner. They do not form
 * a parallel review channel. Resolved semantic exception ids stay resolved in
 * RUN 2 and therefore are not reintroduced.
 */
export function runContentFactoryTopicWithSemanticDraft(
  input: Omit<FactoryFastPipelineInput, "draft" | "extraExceptions"> & {
    semanticDraft: SemanticTopicDraft;
  },
): FactoryFastPipelineRun {
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

  const resolved = new Set(run.resolvedExceptionIds);
  const semanticExceptions = input.semanticDraft.semanticExceptions.filter(
    (exception) => !resolved.has(exception.id),
  );
  const exceptionQueue = dedupeExceptions([
    ...run.exceptionQueue,
    ...semanticExceptions,
  ]);
  const governancePacket = mergeGovernancePacket(
    run.governancePacket,
    semanticExceptions,
  );
  const semanticBlockers = semanticExceptions
    .filter((exception) => exception.blocker)
    .map((exception) => exception.id);
  const blockers = [...new Set([...run.readiness.blockers, ...semanticBlockers])];
  const importReady = run.readiness.importReady && semanticBlockers.length === 0;

  return {
    ...run,
    exceptionQueue,
    governancePacket,
    readiness: {
      ...run.readiness,
      importReady,
      state: importReady
        ? "import_ready"
        : semanticBlockers.length > 0
          ? "blocked"
          : run.readiness.state,
      blockers,
    },
  };
}
