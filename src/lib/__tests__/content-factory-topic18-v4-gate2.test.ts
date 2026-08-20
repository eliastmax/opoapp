// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import { validateV4StudyContentPackage } from "../v4-content-package";
import {
  topic18Gate2Concepts,
  topic18Gate2Flashcards,
  topic18Gate2Mappings,
  topic18Gate2Package,
  topic18Gate2Units,
} from "../content-factory/consumers/topic-18-v4-content";
import { topic18SilencePilotPackage } from "../v4-pilots/topic-18-silence";

function withoutSourceRefs<T extends { sourceRefs?: unknown }>(value: T) {
  const { sourceRefs: _sourceRefs, ...semantic } = value;
  return semantic;
}

describe("Content Factory Topic 18 Gate 2 V4 draft", () => {
  test("materializes the approved 16-unit / 44-concept map with canonical-only sources", () => {
    expect(topic18Gate2Units).toHaveLength(16);
    expect(topic18Gate2Concepts).toHaveLength(44);
    expect(topic18Gate2Mappings).toHaveLength(260);
    expect(new Set(topic18Gate2Mappings.map((entry) => entry.questionCode)).size).toBe(260);
    expect(topic18Gate2Flashcards).toHaveLength(93);
    expect(
      topic18Gate2Units.flatMap((unit) => unit.sourceRefs).every((ref) => `${ref.label} ${ref.reference}`.includes("Temario_new.pdf")),
    ).toBe(true);
    expect(
      topic18Gate2Flashcards.flatMap((card) => card.sourceRefs ?? []).every((ref) => `${ref.label} ${ref.reference}`.includes("Temario_new.pdf")),
    ).toBe(true);
  });

  test("preserves silence pilot semantics while replacing only its legacy source metadata in the draft", () => {
    for (const pilotUnit of topic18SilencePilotPackage.units) {
      const draftUnit = topic18Gate2Units.find((unit) => unit.code === pilotUnit.code);
      expect(draftUnit).toBeDefined();
      expect(withoutSourceRefs(draftUnit!)).toEqual(withoutSourceRefs(pilotUnit));
    }
    for (const pilotConcept of topic18SilencePilotPackage.concepts) {
      const draftConcept = topic18Gate2Concepts.find((concept) => concept.code === pilotConcept.code);
      expect(draftConcept).toEqual(pilotConcept);
    }
    for (const pilotCard of topic18SilencePilotPackage.flashcards) {
      const draftCard = topic18Gate2Flashcards.find((card) => card.code === pilotCard.code);
      expect(draftCard).toBeDefined();
      expect(withoutSourceRefs(draftCard!)).toEqual(withoutSourceRefs(pilotCard));
    }
  });

  test("maps 0239 to C30, maps the sole C29 primary, and never invents blocked C29 rows", () => {
    expect(topic18Gate2Mappings.find((entry) => entry.questionCode === "SMS-T18-0239")?.primaryConceptCode).toBe("SMS-T18-C30");
    expect(
      topic18Gate2Mappings
        .filter((entry) => entry.primaryConceptCode === "SMS-T18-C29")
        .map((entry) => entry.questionCode),
    ).toEqual(["SMS-T18-0199"]);
    for (let code = 241; code <= 263; code += 1) {
      const questionCode = `SMS-T18-${String(code).padStart(4, "0")}`;
      if ([245, 246, 247].includes(code)) {
        expect(topic18Gate2Mappings.some((entry) => entry.questionCode === questionCode)).toBe(false);
      } else {
        expect(topic18Gate2Mappings.some((entry) => entry.questionCode === questionCode)).toBe(true);
      }
    }
  });

  test("gives every canonical concept at least two study cards", () => {
    for (const concept of topic18Gate2Concepts) {
      expect(topic18Gate2Flashcards.filter((card) => card.conceptCode === concept.code).length).toBeGreaterThanOrEqual(2);
    }
  });

  test("passes V4 structural validation with 43 standard ready and one completed source-limited concept", () => {
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
        status: "source_limited",
        missingPrimaryQuestions: 3,
        actionableMissingPrimaryQuestions: 0,
        nominalThreshold: 4,
        sourceSupportedCeiling: 1,
        blockedAdditionalQuestions: 3,
      }),
    ]);
  });
});
