// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import {
  topic20CanonicalSource,
  topic20ExistingQuestions,
  topic20FastPipelineRun1,
  topic20ManualInterventionLedger,
  topic20SemanticBenchmarkMetrics,
  topic20SemanticDraftRun1,
} from "../content-factory/consumers/topic-20-semantic-benchmark";

describe("Content Factory Topic 20 Semantic Accelerator real benchmark RUN 1", () => {
  test("uses the real 220-row semantic input without a prebuilt provider", () => {
    expect(topic20ExistingQuestions).toHaveLength(220);
    expect(new Set(topic20ExistingQuestions.map((question) => question.code)).size).toBe(220);
    expect(topic20ExistingQuestions.every((question) => question.documentReference === "Temario_new.pdf")).toBe(true);
    expect(topic20ExistingQuestions.every((question) => question.pageStart != null && question.pageEnd != null)).toBe(true);
    expect(topic20CanonicalSource).toHaveLength(30);
    expect(topic20SemanticDraftRun1.mappings).toHaveLength(220);
    expect(topic20ManualInterventionLedger).toHaveLength(3);
    expect(topic20ManualInterventionLedger.every((entry) => entry.semanticDecision === false)).toBe(true);
  });

  test("builds the structural provider only through Semantic Accelerator", () => {
    expect(topic20SemanticDraftRun1.units.length).toBeGreaterThan(0);
    expect(topic20SemanticDraftRun1.concepts.length).toBeGreaterThan(0);
    expect(topic20SemanticDraftRun1.structuralDraft.units).toEqual(topic20SemanticDraftRun1.units);
    expect(topic20SemanticDraftRun1.structuralDraft.concepts).toEqual(topic20SemanticDraftRun1.concepts);
    expect(topic20SemanticDraftRun1.structuralDraft.assignments).toEqual(topic20SemanticDraftRun1.mappings);
    expect(topic20SemanticDraftRun1.mappingProposals.length).toBe(220);
  });

  test("does not silently create source-limited capacity or repair semantic exceptions", () => {
    expect(topic20SemanticDraftRun1.concepts.every((concept) => concept.sourceCapacity == null)).toBe(true);
    expect(topic20SemanticBenchmarkMetrics.coverageSourceLimited).toBe(0);
    expect(topic20SemanticDraftRun1.semanticExceptions).toEqual(
      topic20SemanticDraftRun1.semanticExceptions.slice().sort((left, right) => left.id.localeCompare(right.id, "es")),
    );
  });

  test("continues Fast Pipeline RUN 1 through adversarial QA and Governance Packet", () => {
    expect(topic20FastPipelineRun1.runNumber).toBe(1);
    expect(topic20FastPipelineRun1.phases.find((phase) => phase.phase === "provisional_generation")).toBeDefined();
    expect(topic20FastPipelineRun1.phases.find((phase) => phase.phase === "adversarial_qa")?.status).toBe("complete");
    expect(topic20FastPipelineRun1.phases.find((phase) => phase.phase === "exception_classification")?.status).toBe("complete");
    expect(topic20FastPipelineRun1.phases.find((phase) => phase.phase === "governance_packet")?.status).toBe("complete");
    expect(topic20FastPipelineRun1.questionQa?.valid).toBe(true);
    expect(topic20FastPipelineRun1.questionQa?.issues).toHaveLength(0);
    expect(topic20FastPipelineRun1.governancePacket.exceptions).toEqual(topic20FastPipelineRun1.exceptionQueue);
  });

  test("reports downstream work honestly instead of filling it manually", () => {
    expect(topic20FastPipelineRun1.draft.content).toBeNull();
    expect(topic20FastPipelineRun1.draft.generatedQuestions).toHaveLength(0);
    expect(topic20FastPipelineRun1.portable).toBeNull();
    expect(topic20FastPipelineRun1.readiness.importReady).toBe(false);
    expect(topic20FastPipelineRun1.exceptionQueue.some((exception) => exception.explanation.includes("no complete study-content"))).toBe(true);
    if (topic20FastPipelineRun1.generationSlots.length > 0) {
      expect(topic20FastPipelineRun1.exceptionQueue.some((exception) => exception.explanation.includes("no generateQuestions operation"))).toBe(true);
    }
  });

  test("emits compact complete governance membership for the audit log", () => {
    const mediumMappingGroups = Object.fromEntries(
      topic20SemanticDraftRun1.concepts.map((concept) => [
        concept.code,
        topic20SemanticDraftRun1.mappingProposals
          .filter((proposal) => proposal.meta.confidence === "medium" && proposal.mapping.primaryConceptCode === concept.code)
          .map((proposal) => proposal.mapping.questionCode),
      ]).filter(([, codes]) => (codes as string[]).length > 0),
    );
    const mediumConceptCodes = topic20SemanticDraftRun1.conceptProposals
      .filter((proposal) => proposal.meta.confidence === "medium")
      .map((proposal) => proposal.concept.code);
    const mixedBoundaryCodes = topic20SemanticDraftRun1.semanticExceptions
      .filter((exception) => exception.type === "concept_boundary")
      .map((exception) => exception.subject.id);
    const technicalBlockerIds = topic20FastPipelineRun1.exceptionQueue
      .filter((exception) => exception.subject.kind === "topic")
      .map((exception) => exception.id);
    const coverageBlockers = topic20FastPipelineRun1.exceptionQueue
      .filter((exception) => exception.type === "coverage_anomaly" && exception.subject.kind === "concept")
      .map((exception) => ({ id: exception.id, concept: exception.subject.id, explanation: exception.explanation }));

    console.info("TOPIC20_SEMANTIC_BENCHMARK", JSON.stringify(topic20SemanticBenchmarkMetrics));
    console.info("TOPIC20_MEDIUM_CONCEPTS", JSON.stringify(mediumConceptCodes));
    console.info("TOPIC20_MIXED_BOUNDARIES", JSON.stringify(mixedBoundaryCodes));
    console.info("TOPIC20_MEDIUM_MAPPING_GROUPS", JSON.stringify(mediumMappingGroups));
    console.info("TOPIC20_COVERAGE_BLOCKERS", JSON.stringify(coverageBlockers));
    console.info("TOPIC20_TECHNICAL_BLOCKERS", JSON.stringify(technicalBlockerIds));
    console.info("TOPIC20_MANUAL_INTERVENTIONS", JSON.stringify(topic20ManualInterventionLedger));
    expect(topic20SemanticBenchmarkMetrics.inputQuestions).toBe(220);
    expect(Object.values(mediumMappingGroups).flat()).toHaveLength(188);
    expect(mediumConceptCodes).toHaveLength(29);
    expect(mixedBoundaryCodes).toHaveLength(29);
    expect(technicalBlockerIds).toHaveLength(2);
    expect(coverageBlockers).toHaveLength(3);
  });
});
