// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import {
  buildSemanticTopicDraft,
  runContentFactoryTopicWithSemanticDraft,
} from "../content-factory";
import {
  TOPIC20_CANONICAL_DOCUMENT,
  TOPIC20_REAL_ACTIVE_QUESTION_COUNT,
  TOPIC20_REAL_V2_FIELD_COUNT,
  topic20CanonicalSource,
  topic20RealQuestions,
  topic20SemanticBenchmarkJob,
} from "../content-factory/consumers/topic-20-semantic-benchmark-input";

export const topic20RawSemanticDraft = buildSemanticTopicDraft({
  job: topic20SemanticBenchmarkJob,
  canonicalSource: topic20CanonicalSource,
  existingQuestions: topic20RealQuestions,
});

const mappingConfidence = topic20RawSemanticDraft.mappingProposals.reduce(
  (counts, proposal) => {
    counts[proposal.meta.confidence] += 1;
    return counts;
  },
  { high: 0, medium: 0, low: 0 },
);

const exceptionTypes = topic20RawSemanticDraft.semanticExceptions.reduce<Record<string, number>>(
  (counts, exception) => {
    counts[exception.type] = (counts[exception.type] ?? 0) + 1;
    return counts;
  },
  {},
);

console.log("TOPIC20_SEMANTIC_RAW_METRICS", JSON.stringify({
  inspectedV2Fields: TOPIC20_REAL_V2_FIELD_COUNT,
  activeQuestions: topic20RealQuestions.length,
  canonicalSourceSpans: topic20CanonicalSource.length,
  units: topic20RawSemanticDraft.units.length,
  highConfidenceUnits: topic20RawSemanticDraft.metrics.highConfidenceUnits,
  concepts: topic20RawSemanticDraft.concepts.length,
  highConfidenceConcepts: topic20RawSemanticDraft.metrics.highConfidenceConcepts,
  automaticMappings: topic20RawSemanticDraft.metrics.automaticMappings,
  mappingConfidence,
  doubtfulMappings: topic20RawSemanticDraft.metrics.doubtfulMappings,
  doubtfulConceptBoundaries: topic20RawSemanticDraft.metrics.doubtfulConceptBoundaries,
  sourceIssues: topic20RawSemanticDraft.metrics.sourceIssues,
  blockers: topic20RawSemanticDraft.metrics.blockers,
  totalExceptions: topic20RawSemanticDraft.metrics.totalExceptions,
  exceptionTypes,
}));

export const topic20FastPipelineRun1 = runContentFactoryTopicWithSemanticDraft({
  job: topic20SemanticBenchmarkJob,
  semanticDraft: topic20RawSemanticDraft,
});

const run1ExceptionTypes = topic20FastPipelineRun1.exceptionQueue.reduce<Record<string, number>>(
  (counts, exception) => {
    counts[exception.type] = (counts[exception.type] ?? 0) + 1;
    return counts;
  },
  {},
);

console.log("TOPIC20_FAST_PIPELINE_RUN1", JSON.stringify({
  runNumber: topic20FastPipelineRun1.runNumber,
  initialCoverage: topic20FastPipelineRun1.initialCoverage?.summary,
  finalCoverage: topic20FastPipelineRun1.finalCoverage?.summary,
  generationSlots: topic20FastPipelineRun1.generationSlots.map((slot) => ({ code: slot.questionCode, concept: slot.conceptCode })),
  generatedQuestions: topic20FastPipelineRun1.draft.generatedQuestions.length,
  qaValid: topic20FastPipelineRun1.questionQa?.valid,
  qaIssues: topic20FastPipelineRun1.questionQa?.issues.length,
  contentAvailable: topic20FastPipelineRun1.draft.content !== null,
  portableAvailable: topic20FastPipelineRun1.portable !== null,
  exceptionCount: topic20FastPipelineRun1.exceptionQueue.length,
  blockers: topic20FastPipelineRun1.exceptionQueue.filter((exception) => exception.blocker).length,
  exceptionTypes: run1ExceptionTypes,
  readiness: topic20FastPipelineRun1.readiness,
  phases: topic20FastPipelineRun1.phases,
}));

console.log("TOPIC20_RUN1_EXCEPTION_QUEUE", JSON.stringify(topic20FastPipelineRun1.exceptionQueue.map((exception) => ({
  id: exception.id,
  type: exception.type,
  blocker: exception.blocker,
  confidence: exception.confidence,
  subject: exception.subject,
  explanation: exception.explanation,
  recommendation: exception.recommendation,
}))));

describe("Tema 20 real Semantic Accelerator benchmark input", () => {
  test("freezes the complete active production bank as canonical semantic input without a hand-authored provider", () => {
    expect(topic20RealQuestions).toHaveLength(TOPIC20_REAL_ACTIVE_QUESTION_COUNT);
    expect(new Set(topic20RealQuestions.map((question) => question.code)).size).toBe(TOPIC20_REAL_ACTIVE_QUESTION_COUNT);
    expect(topic20RealQuestions.every((question) => question.active && question.documentReference === TOPIC20_CANONICAL_DOCUMENT)).toBe(true);
    expect(topic20SemanticBenchmarkJob.mode).toBe("existing_bank");
  });

  test("derives source spans mechanically from real subapartado/article/page metadata", () => {
    expect(topic20CanonicalSource).toHaveLength(30);
    expect(topic20CanonicalSource.every((span) => span.document === TOPIC20_CANONICAL_DOCUMENT)).toBe(true);
    expect(Math.min(...topic20CanonicalSource.map((span) => span.pageStart ?? 999))).toBe(44);
    expect(Math.max(...topic20CanonicalSource.map((span) => span.pageEnd ?? 0))).toBe(76);
  });

  test("runs the uncorrected semantic draft over all active questions", () => {
    expect(topic20RawSemanticDraft.topic.topicNumber).toBe(20);
    expect(topic20RawSemanticDraft.mappings).toHaveLength(TOPIC20_REAL_ACTIVE_QUESTION_COUNT);
    expect(topic20RawSemanticDraft.sourcePolicy.document).toBe(TOPIC20_CANONICAL_DOCUMENT);
    expect(topic20RawSemanticDraft.metrics).toMatchObject({
      highConfidenceUnits: 7,
      highConfidenceConcepts: 1,
      automaticMappings: 32,
      doubtfulMappings: 188,
      doubtfulConceptBoundaries: 29,
      sourceIssues: 0,
      blockers: 0,
    });
  });

  test("continues through Fast Pipeline RUN 1 to the Governance Packet without a Gate 1 stop", () => {
    expect(topic20FastPipelineRun1.runNumber).toBe(1);
    expect(topic20FastPipelineRun1.governancePacket.auditPack.assignments).toHaveLength(TOPIC20_REAL_ACTIVE_QUESTION_COUNT);
    expect(topic20FastPipelineRun1.phases.find((phase) => phase.phase === "governance_packet")?.status).toBe("complete");
    expect(topic20FastPipelineRun1.phases.find((phase) => phase.phase === "provisional_generation")?.status).toBe("blocked");
    expect(topic20FastPipelineRun1.generationSlots).toHaveLength(6);
    expect(topic20FastPipelineRun1.draft.generatedQuestions).toHaveLength(0);
  });

  test("keeps semantic exceptions in the normal Fast Pipeline queue", () => {
    expect(topic20FastPipelineRun1.exceptionQueue.filter((exception) => exception.type === "concept_boundary")).toHaveLength(29);
    expect(topic20FastPipelineRun1.governancePacket.exceptions.map((exception) => exception.id)).toEqual(
      topic20FastPipelineRun1.exceptionQueue.map((exception) => exception.id),
    );
  });
});
