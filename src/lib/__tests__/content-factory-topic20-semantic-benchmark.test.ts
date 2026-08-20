// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import {
  topic20CanonicalSource,
  topic20CanonicalSourceRun1B,
  topic20ExistingQuestions,
  topic20FastPipelineRun1,
  topic20FastPipelineRun1BSourceOnly,
  topic20ManualInterventionLedger,
  topic20PreparedWorkPacketsRun1B,
  topic20Run1BSourceMetrics,
  topic20SemanticBenchmarkMetrics,
  topic20SemanticDraftRun1,
  topic20SemanticDraftRun1B,
} from "../content-factory/consumers/topic-20-semantic-benchmark";

describe("Content Factory Topic 20 Semantic Accelerator real benchmark", () => {
  test("preserves RUN 1A baseline", () => {
    expect(topic20ExistingQuestions).toHaveLength(220);
    expect(new Set(topic20ExistingQuestions.map((question) => question.code)).size).toBe(220);
    expect(topic20CanonicalSource).toHaveLength(30);
    expect(topic20SemanticDraftRun1.mappings).toHaveLength(220);
    expect(topic20SemanticBenchmarkMetrics.unitsProposed).toBe(7);
    expect(topic20SemanticBenchmarkMetrics.conceptsProposed).toBe(30);
    expect(topic20SemanticBenchmarkMetrics.mappingsHighConfidence).toBe(32);
    expect(topic20SemanticBenchmarkMetrics.mappingsMediumConfidence).toBe(188);
  });

  test("RUN 1B uses CanonicalPageText -> automatic SemanticSourceSpan without manual spans", () => {
    expect(topic20Run1BSourceMetrics.inputPages).toBe(37);
    expect(topic20Run1BSourceMetrics.extractedTextCharacters).toBeGreaterThan(60000);
    expect(topic20CanonicalSourceRun1B.length).toBeGreaterThan(30);
    expect(topic20CanonicalSourceRun1B.every((span) => (span.text ?? "").trim().length > 0)).toBe(true);
    expect(topic20SemanticDraftRun1B.mappings).toHaveLength(220);
    expect(topic20ManualInterventionLedger.every((entry) => entry.semanticDecision === false)).toBe(true);
  });

  test("RUN 1B emits executable canonical work packets and no confidence-only/technical blockers", () => {
    expect(topic20PreparedWorkPacketsRun1B.executableStudyContent).toBe(true);
    expect(topic20PreparedWorkPacketsRun1B.executableQuestions).toBe(true);
    expect(topic20PreparedWorkPacketsRun1B.studyContent).toHaveLength(topic20SemanticDraftRun1B.concepts.length);
    expect(topic20PreparedWorkPacketsRun1B.flashcards).toHaveLength(topic20SemanticDraftRun1B.concepts.length);
    expect(topic20PreparedWorkPacketsRun1B.questions).toHaveLength(topic20FastPipelineRun1BSourceOnly.generationSlots.length);
    expect(topic20Run1BSourceMetrics.confidenceOnlyBlockers).toBe(0);
    expect(topic20Run1BSourceMetrics.missingStudyContent).toBe(0);
    expect(topic20Run1BSourceMetrics.missingQuestionGenerator).toBe(0);
  });

  test("RUN 1B source-stage reaches Governance Packet without silent map repair", () => {
    expect(topic20FastPipelineRun1BSourceOnly.runNumber).toBe(1);
    expect(topic20FastPipelineRun1BSourceOnly.governancePacket.exceptions).toEqual(topic20FastPipelineRun1BSourceOnly.exceptionQueue);
    expect(topic20FastPipelineRun1BSourceOnly.readiness.importReady).toBe(false);
    expect(topic20SemanticDraftRun1B.concepts.every((concept) => concept.sourceCapacity == null)).toBe(true);
  });

  test("prints definitive source-stage metrics and packet targets", () => {
    const materialExceptions = topic20FastPipelineRun1BSourceOnly.exceptionQueue.map((exception) => ({
      id: exception.id,
      type: exception.type,
      blocker: exception.blocker,
      subject: exception.subject,
      explanation: exception.explanation,
      alternatives: exception.alternatives ?? [],
    }));
    const concepts = topic20SemanticDraftRun1B.concepts.map((concept) => ({
      code: concept.code,
      unitCode: concept.unitCode,
      title: concept.title,
      confidence: concept.confidence,
      sourceRefs: concept.sourceRefs,
    }));
    const slots = topic20PreparedWorkPacketsRun1B.questions.map((packet) => ({
      questionCode: packet.questionCode,
      conceptCode: packet.conceptCode,
      unitCode: packet.unitCode,
      dimension: packet.dimension,
      sourceRefs: packet.sourceRefs,
      sourceText: packet.sourceSpans.map((span) => span.text).join("\n"),
      existingQuestions: packet.existingQuestions,
    }));
    console.info("TOPIC20_RUN1B_SOURCE_METRICS", JSON.stringify(topic20Run1BSourceMetrics));
    console.info("TOPIC20_RUN1B_CONCEPTS", JSON.stringify(concepts));
    console.info("TOPIC20_RUN1B_MATERIAL_EXCEPTIONS", JSON.stringify(materialExceptions));
    console.info("TOPIC20_RUN1B_GENERATION_PACKETS", JSON.stringify(slots));
    console.info("TOPIC20_RUN1B_MANUAL_INTERVENTIONS", JSON.stringify(topic20ManualInterventionLedger));
    expect(topic20Run1BSourceMetrics.units).toBeGreaterThan(0);
  });
});
