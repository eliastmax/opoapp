// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import { evaluateFactoryPipelineState } from "../content-factory";
import { calculateFactoryCoverage } from "../content-factory/coverage";
import {
  topic18ApprovedAssignments,
  topic18ApprovedConcepts,
} from "../content-factory/consumers/topic-18-approved-gate1";
import { topic18Gate21QuestionCandidates } from "../content-factory/consumers/topic-18-gap-questions-gate21";
import { topic18SourceLimitedSlots } from "../content-factory/consumers/topic-18-source-limited";
import {
  topic18Gate2Concepts,
  topic18Gate2Flashcards,
  topic18Gate2Mappings,
  topic18Gate2Package,
  topic18Gate2Units,
} from "../content-factory/consumers/topic-18-v4-content";
import { validateV4StudyContentPackage } from "../v4-content-package";
import { topic18SilencePilotPackage } from "../v4-pilots/topic-18-silence";

function semanticUnit(unit: (typeof topic18Gate2Units)[number]) {
  return {
    code: unit.code,
    title: unit.title,
    position: unit.position,
    estimatedMinutes: unit.estimatedMinutes,
    studySummary: unit.studySummary,
    examKeys: unit.examKeys,
    confusions: unit.confusions,
    traps: unit.traps,
    mnemonics: unit.mnemonics,
    sourceSubtopicName: unit.sourceSubtopicName,
  };
}

function semanticCard(card: (typeof topic18Gate2Flashcards)[number]) {
  return {
    code: card.code,
    conceptCode: card.conceptCode,
    type: card.type,
    prompt: card.prompt,
    answer: card.answer,
    position: card.position,
  };
}

describe("Content Factory Topic 18 Gate 2.1 draft", () => {
  test("materializes the approved 16/44 map with 240 existing plus 20 generated mappings", () => {
    expect(topic18Gate2Units).toHaveLength(16);
    expect(topic18Gate2Concepts).toHaveLength(44);
    expect(topic18Gate2Mappings).toHaveLength(260);
    expect(new Set(topic18Gate2Mappings.map((entry) => entry.questionCode)).size).toBe(260);
    expect(topic18ApprovedAssignments).toHaveLength(240);
    expect(topic18Gate21QuestionCandidates).toHaveLength(20);
  });

  test("keeps 0239 on C30 and classifies the residual C29 deficit as source_limited", () => {
    expect(topic18Gate2Mappings.find((entry) => entry.questionCode === "SMS-T18-0239")?.primaryConceptCode).toBe("SMS-T18-C30");
    expect(
      topic18Gate2Mappings
        .filter((entry) => entry.primaryConceptCode === "SMS-T18-C29")
        .map((entry) => entry.questionCode),
    ).toEqual(["SMS-T18-0199"]);
    const coverage = calculateFactoryCoverage({
      questions: topic18Gate2Mappings.map((mapping) => ({ code: mapping.questionCode, active: true })),
      concepts: topic18ApprovedConcepts,
      assignments: topic18Gate2Mappings,
      threshold: 4,
    });
    expect(coverage.factoryConceptCoverage.filter((entry) => entry.status === "coverage_gap")).toEqual([]);
    expect(coverage.factoryConceptCoverage.filter((entry) => entry.status === "ready")).toHaveLength(43);
    expect(coverage.factoryConceptCoverage.filter((entry) => entry.status === "source_limited")).toEqual([
      expect.objectContaining({
        conceptId: "SMS-T18-C29",
        primaryQuestionCount: 1,
        nominalThreshold: 4,
        sourceSupportedCeiling: 1,
        blockedAdditionalQuestions: 3,
      }),
    ]);
    expect(coverage.totalMissingQuestions).toBe(3);
    expect(coverage.totalActionableMissingQuestions).toBe(0);
    expect(coverage.totalBlockedBySourceCeiling).toBe(3);
    expect(coverage.mappingQa.unmappedQuestionCodes).toEqual([]);
    expect(coverage.mappingQa.duplicatePrimaryQuestionCodes).toEqual([]);
  });

  test("does not materialize the three C29 source-limited slots as questions or mappings", () => {
    expect(topic18SourceLimitedSlots.map((entry) => entry.questionCode)).toEqual([
      "SMS-T18-0245",
      "SMS-T18-0246",
      "SMS-T18-0247",
    ]);
    const mapped = new Set(topic18Gate2Mappings.map((entry) => entry.questionCode));
    for (const blocked of topic18SourceLimitedSlots) expect(mapped.has(blocked.questionCode)).toBe(false);
  });

  test("keeps the existing pilot semantics while replacing only source provenance in the portable package", () => {
    for (const pilotUnit of topic18SilencePilotPackage.units) {
      const prepared = topic18Gate2Units.find((entry) => entry.code === pilotUnit.code);
      expect(prepared).toBeDefined();
      expect(semanticUnit(prepared!)).toEqual(semanticUnit(pilotUnit));
    }
    for (const pilotConcept of topic18SilencePilotPackage.concepts) {
      expect(topic18Gate2Concepts.find((entry) => entry.code === pilotConcept.code)).toEqual(pilotConcept);
    }
    for (const pilotCard of topic18SilencePilotPackage.flashcards) {
      const prepared = topic18Gate2Flashcards.find((entry) => entry.code === pilotCard.code);
      expect(prepared).toBeDefined();
      expect(semanticCard(prepared!)).toEqual(semanticCard(pilotCard));
    }
  });

  test("uses Temario_new.pdf as the sole substantive source in the new complete package", () => {
    expect(topic18Gate2Package.sourceRevision).toContain("Temario_new.pdf");
    expect(topic18Gate2Package.sourceRevision).not.toContain("BOE");
    const refs = [
      ...topic18Gate2Units.flatMap((unit) => unit.sourceRefs),
      ...topic18Gate2Flashcards.flatMap((card) => card.sourceRefs ?? []),
    ];
    expect(refs.length).toBeGreaterThan(0);
    expect(refs.every((ref) => `${ref.label} ${ref.reference}`.includes("Temario_new.pdf"))).toBe(true);
    expect(refs.some((ref) => `${ref.label} ${ref.reference}`.includes("BOE"))).toBe(false);
  });

  test("prepares at least two flashcards for every concept without changing the 11 pilot card codes", () => {
    expect(topic18Gate2Flashcards).toHaveLength(93);
    expect(topic18Gate2Flashcards.slice(0, 11).map((card) => card.code)).toEqual(
      topic18SilencePilotPackage.flashcards.map((card) => card.code),
    );
    for (const concept of topic18Gate2Concepts) {
      expect(topic18Gate2Flashcards.filter((card) => card.conceptCode === concept.code).length).toBeGreaterThanOrEqual(2);
    }
  });

  test("keeps the V4 package structurally valid with no actionable coverage gap", () => {
    const validation = validateV4StudyContentPackage(topic18Gate2Package);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
    expect(validation.coverage.underCoveredConceptIds).toEqual([]);
    expect(validation.coverage.nominalUnderCoveredConceptIds).toEqual(["SMS-T18-C29"]);
    expect(validation.coverage.unmappedQuestionIds).toEqual([]);
    expect(validation.coverage.duplicatePrimaryQuestionIds).toEqual([]);
    expect(validation.coverage.conceptCoverage.filter((entry) => entry.status === "ready")).toHaveLength(43);
    expect(validation.coverage.conceptCoverage.filter((entry) => entry.status === "source_limited")).toEqual([
      expect.objectContaining({
        conceptId: "SMS-T18-C29",
        primaryQuestionCount: 1,
        sourceSupportedCeiling: 1,
        blockedAdditionalQuestions: 3,
      }),
    ]);

    const pipeline = evaluateFactoryPipelineState({
      conceptMap: { status: "approved" },
      editorialQuality: { status: "pending" },
    });
    expect(pipeline.structural.valid).toBe(true);
    expect(pipeline.generation.allowed).toBe(true);
    expect(pipeline.importReadiness.ready).toBe(false);
    expect(pipeline.importReadiness.blockers.map((entry) => entry.code)).toEqual(["gate_2_pending"]);
  });
});
