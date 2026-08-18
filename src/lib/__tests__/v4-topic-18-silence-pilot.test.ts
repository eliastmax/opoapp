// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import { validateV4StudyContentPackage } from "../v4-content-package";
import { topic18SilencePilotPackage } from "../v4-pilots/topic-18-silence";

describe("V4 Topic 18 silence pilot", () => {
  test("passes the portable content-package contract", () => {
    const result = validateV4StudyContentPackage(topic18SilencePilotPackage);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.coverage.underCoveredConceptIds).toEqual([]);
  });

  test("uses the expected vertical-slice dimensions", () => {
    expect(topic18SilencePilotPackage.units).toHaveLength(2);
    expect(topic18SilencePilotPackage.concepts).toHaveLength(3);
    expect(topic18SilencePilotPackage.questionMappings).toHaveLength(19);
    expect(topic18SilencePilotPackage.flashcards).toHaveLength(11);
  });

  test("keeps every pilot concept above the four-question mastery floor", () => {
    const result = validateV4StudyContentPackage(topic18SilencePilotPackage);
    const counts = Object.fromEntries(
      result.coverage.conceptCoverage.map((row) => [row.conceptId, row.primaryQuestionCount]),
    );

    expect(counts["SMS-T18-C14"]).toBe(8);
    expect(counts["SMS-T18-C15"]).toBe(6);
    expect(counts["SMS-T18-C16"]).toBe(5);
  });

  test("maps each existing question exactly once as primary in this slice", () => {
    const questionCodes = topic18SilencePilotPackage.questionMappings.map(
      (mapping) => mapping.questionCode,
    );

    expect(new Set(questionCodes).size).toBe(questionCodes.length);
    expect(questionCodes).toContain("SMS-T18-0024");
    expect(questionCodes).toContain("SMS-T18-0232");
  });

  test("gives every concept at least three flashcards", () => {
    for (const concept of topic18SilencePilotPackage.concepts) {
      const cards = topic18SilencePilotPackage.flashcards.filter(
        (card) => card.conceptCode === concept.code,
      );
      expect(cards.length).toBeGreaterThanOrEqual(3);
    }
  });

  test("keeps request and ex-officio silence in separate study units", () => {
    const requestConcepts = topic18SilencePilotPackage.concepts.filter(
      (concept) => concept.unitCode === "SMS-T18-U07",
    );
    const exOfficioConcepts = topic18SilencePilotPackage.concepts.filter(
      (concept) => concept.unitCode === "SMS-T18-U08",
    );

    expect(requestConcepts.map((concept) => concept.code)).toEqual([
      "SMS-T18-C14",
      "SMS-T18-C15",
    ]);
    expect(exOfficioConcepts.map((concept) => concept.code)).toEqual(["SMS-T18-C16"]);
  });
});
