// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import {
  topic20CanonicalSource,
  topic20CanonicalSourceRun1B,
  topic20ExistingQuestions,
  topic20FastPipelineRun1,
  topic20FastPipelineRun1B,
  topic20FastPipelineRun1BSourceOnly,
  topic20ManualInterventionLedger,
  topic20PreparedWorkPacketsRun1B,
  topic20Run1BFinalMetrics,
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
    expect(topic20Run1BSourceMetrics.extractedTextCharacters).toBe(62632);
    expect(topic20CanonicalSourceRun1B).toHaveLength(38);
    expect(topic20CanonicalSourceRun1B.every((span) => (span.text ?? "").trim().length > 0)).toBe(true);
    expect(topic20SemanticDraftRun1B.mappings).toHaveLength(220);
    expect(topic20ManualInterventionLedger.every((entry) => entry.semanticDecision === false)).toBe(true);
  });

  test("RUN 1B emits executable canonical work packets and no confidence-only/technical blockers", () => {
    expect(topic20PreparedWorkPacketsRun1B.executableStudyContent).toBe(true);
    expect(topic20PreparedWorkPacketsRun1B.executableQuestions).toBe(true);
    expect(topic20PreparedWorkPacketsRun1B.studyContent).toHaveLength(30);
    expect(topic20PreparedWorkPacketsRun1B.flashcards).toHaveLength(30);
    expect(topic20PreparedWorkPacketsRun1B.questions).toHaveLength(6);
    expect(topic20Run1BFinalMetrics.confidenceOnlyBlockers).toBe(0);
    expect(topic20Run1BFinalMetrics.missingStudyContent).toBe(0);
    expect(topic20Run1BFinalMetrics.missingQuestionGenerator).toBe(0);
  });

  test("RUN 1B materializes study content, flashcards and exact gap questions", () => {
    expect(topic20Run1BFinalMetrics.studyUnitsMaterialized).toBe(7);
    expect(topic20Run1BFinalMetrics.studyConceptsMaterialized).toBe(30);
    expect(topic20Run1BFinalMetrics.flashcards).toBe(60);
    expect(topic20Run1BFinalMetrics.questionsGenerated).toBe(6);
    expect(topic20Run1BFinalMetrics.parserValidRows).toBe(6);
    expect(topic20Run1BFinalMetrics.questionQaErrors).toBe(0);
    expect(topic20FastPipelineRun1B.draft.generatedQuestions.map((candidate) => String(candidate.v2.codigo))).toEqual([
      "SMS-T20-0221",
      "SMS-T20-0222",
      "SMS-T20-0223",
      "SMS-T20-0224",
      "SMS-T20-0225",
      "SMS-T20-0226",
    ]);
    expect(topic20FastPipelineRun1B.draft.generatedQuestions.every((candidate) => candidate.v2.documento_referencia === "Temario_new.pdf")).toBe(true);
  });

  test("RUN 1B closes provisional coverage without map repair or source-capacity invention", () => {
    expect(topic20Run1BFinalMetrics.coverageReady).toBe(30);
    expect(topic20Run1BFinalMetrics.actionableGapConcepts).toBe(0);
    expect(topic20Run1BFinalMetrics.actionableMissingQuestions).toBe(0);
    expect(topic20Run1BFinalMetrics.coverageSourceReviewRequired).toBe(0);
    expect(topic20Run1BFinalMetrics.coverageSourceLimited).toBe(0);
    expect(topic20Run1BFinalMetrics.coverageUnmapped).toBe(0);
    expect(topic20Run1BFinalMetrics.coverageMultiplePrimary).toBe(0);
    expect(topic20Run1BFinalMetrics.sourceLimitedCandidates).toBe(0);
    expect(topic20SemanticDraftRun1B.concepts.every((concept) => concept.sourceCapacity == null)).toBe(true);
  });

  test("RUN 1B reaches the normal Governance Packet as RUN 1 and remains non-production", () => {
    expect(topic20FastPipelineRun1B.runNumber).toBe(1);
    expect(topic20FastPipelineRun1B.governancePacket.exceptions).toEqual(topic20FastPipelineRun1B.exceptionQueue);
    expect(topic20FastPipelineRun1B.readiness.importReady).toBe(false);
  });

  test("prints definitive RUN 1B metrics and remaining material exceptions", () => {
    const finalExceptions = topic20FastPipelineRun1B.exceptionQueue.map((exception) => ({
      id: exception.id,
      type: exception.type,
      blocker: exception.blocker,
      subject: exception.subject,
      explanation: exception.explanation,
      alternatives: exception.alternatives ?? [],
    }));
    const qaFlags = topic20FastPipelineRun1B.questionQa?.issues ?? [];
    console.info("TOPIC20_RUN1B_FINAL_METRICS", JSON.stringify(topic20Run1BFinalMetrics));
    console.info("TOPIC20_RUN1B_FINAL_EXCEPTIONS", JSON.stringify(finalExceptions));
    console.info("TOPIC20_RUN1B_QA_FLAGS", JSON.stringify(qaFlags));
    console.info("TOPIC20_RUN1B_MANUAL_INTERVENTIONS", JSON.stringify(topic20ManualInterventionLedger));
    expect(topic20Run1BFinalMetrics.units).toBe(7);
    expect(topic20Run1BFinalMetrics.conceptsHigh + topic20Run1BFinalMetrics.conceptsMedium + topic20Run1BFinalMetrics.conceptsLow).toBe(30);
    expect(topic20Run1BFinalMetrics.mappingsHigh + topic20Run1BFinalMetrics.mappingsMedium + topic20Run1BFinalMetrics.mappingsLow).toBe(220);
  });
});
