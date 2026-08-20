// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import { buildSemanticTopicDraft } from "../content-factory";
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
  });
});
