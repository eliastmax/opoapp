// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import { validateV4StudyContentPackage } from "../v4-content-package";
import {
  topic18Gate2Concepts,
  topic18Gate2Flashcards,
  topic18Gate2QuestionMappings,
  topic18Gate2Units,
  topic18Gate2V4Package,
} from "../content-factory/consumers/topic-18-v4-gate2";
import { topic18SilencePilotPackage } from "../v4-pilots/topic-18-silence";

function withoutSourceRefs<T extends { sourceRefs?: unknown }>(value: T) {
  const { sourceRefs: _sourceRefs, ...semantic } = value;
  return semantic;
}

describe("Content Factory Topic 18 Gate 2 V4 draft", () => {
  test("materializes the approved 16-unit / 44-concept map with canonical-only sources", () => {
    expect(topic18Gate2Units).toHaveLength(16);
    expect(topic18Gate2Concepts).toHaveLength(44);
    expect(topic18Gate2QuestionMappings).toHaveLength(260);
    expect(new Set(topic18Gate2QuestionMappings.map((entry) => entry.questionCode)).size).toBe(260);
    expect(topic18Gate2Flashcards).toHaveLength(52);
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

  test("maps 0239 to C30, maps all generated questions, and never invents blocked C29 rows", () => {
    expect(topic18Gate2QuestionMappings.find((entry) => entry.questionCode === "SMS-T18-0239")?.primaryConceptCode).toBe("SMS-T18-C30");
    for (let code = 241; code <= 263; code += 1) {
      const questionCode = `SMS-T18-${String(code).padStart(4, "0")}`;
      if ([245, 246, 247].includes(code)) {
        expect(topic18Gate2QuestionMappings.some((entry) => entry.questionCode === questionCode)).toBe(false);
      } else {
        expect(topic18Gate2QuestionMappings.some((entry) => entry.questionCode === questionCode)).toBe(true);
      }
    }
  });

  test("gives every canonical concept study-card support", () => {
    const cardConceptCodes = new Set(topic18Gate2Flashcards.map((card) => card.conceptCode));
    expect(topic18Gate2Concepts.every((concept) => cardConceptCodes.has(concept.code))).toBe(true);
  });

  test("passes V4 structural validation and leaves only the honest C29 coverage gap", () => {
    const validation = validateV4StudyContentPackage(topic18Gate2V4Package);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
    expect(validation.coverage.underCoveredConceptIds).toEqual(["SMS-T18-C29"]);
  });
});
