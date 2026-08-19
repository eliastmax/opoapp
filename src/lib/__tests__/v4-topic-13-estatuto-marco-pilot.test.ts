// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import { validateV4StudyContentPackage } from "../v4-content-package";
import { topic13EstatutoMarcoPackage } from "../v4-pilots/topic-13-estatuto-marco";

describe("V4 Topic 13 Estatuto Marco package", () => {
  test("passes the portable content-package contract", () => {
    const result = validateV4StudyContentPackage(topic13EstatutoMarcoPackage);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("uses the audited Topic 13 dimensions", () => {
    expect(topic13EstatutoMarcoPackage.units).toHaveLength(18);
    expect(topic13EstatutoMarcoPackage.concepts).toHaveLength(29);
    expect(topic13EstatutoMarcoPackage.questionMappings).toHaveLength(99);
    expect(topic13EstatutoMarcoPackage.flashcards).toHaveLength(58);
  });

  test("maps every active bank question exactly once as primary", () => {
    const questionCodes = topic13EstatutoMarcoPackage.questionMappings.map(
      (mapping) => mapping.questionCode,
    );

    expect(new Set(questionCodes).size).toBe(99);
    expect(questionCodes[0]).toBe("SMS-T13-0001");
    expect(questionCodes[98]).toBe("SMS-T13-0099");

    const result = validateV4StudyContentPackage(topic13EstatutoMarcoPackage);
    expect(result.coverage.activeQuestionCount).toBe(99);
    expect(result.coverage.mappedPrimaryQuestionCount).toBe(99);
    expect(result.coverage.unmappedQuestionIds).toEqual([]);
    expect(result.coverage.duplicatePrimaryQuestionIds).toEqual([]);
  });

  test("preserves genuine coverage gaps instead of broadening concepts", () => {
    const result = validateV4StudyContentPackage(topic13EstatutoMarcoPackage);
    const ready = result.coverage.conceptCoverage.filter((row) => row.status === "ready");
    const gaps = result.coverage.conceptCoverage.filter((row) => row.status === "coverage_gap");
    const missing = gaps.reduce((total, row) => total + row.missingPrimaryQuestions, 0);

    expect(ready).toHaveLength(12);
    expect(gaps).toHaveLength(17);
    expect(missing).toBe(25);
    expect(result.coverage.underCoveredConceptIds).toContain("SMS-T13-C03");
    expect(result.coverage.underCoveredConceptIds).toContain("SMS-T13-C29");
    expect(result.warnings.filter((warning) => warning.code === "coverage_gap")).toHaveLength(17);
  });

  test("keeps prescripción de faltas separate from prescripción y cancelación de sanciones", () => {
    const faultPrescription = topic13EstatutoMarcoPackage.questionMappings
      .filter((mapping) => mapping.primaryConceptCode === "SMS-T13-C25")
      .map((mapping) => mapping.questionCode);
    const sanctionPrescription = topic13EstatutoMarcoPackage.questionMappings
      .filter((mapping) => mapping.primaryConceptCode === "SMS-T13-C27")
      .map((mapping) => mapping.questionCode);

    expect(faultPrescription).toEqual(["SMS-T13-0087", "SMS-T13-0088"]);
    expect(sanctionPrescription).toEqual(["SMS-T13-0094", "SMS-T13-0095"]);
  });

  test("keeps procedimiento separate from suspensión provisional", () => {
    const procedure = topic13EstatutoMarcoPackage.questionMappings
      .filter((mapping) => mapping.primaryConceptCode === "SMS-T13-C28")
      .map((mapping) => mapping.questionCode);
    const provisional = topic13EstatutoMarcoPackage.questionMappings
      .filter((mapping) => mapping.primaryConceptCode === "SMS-T13-C29")
      .map((mapping) => mapping.questionCode);

    expect(procedure).toEqual(["SMS-T13-0096", "SMS-T13-0097"]);
    expect(provisional).toEqual(["SMS-T13-0098", "SMS-T13-0099"]);
  });

  test("gives every canonical concept at least two source-backed flashcards", () => {
    for (const concept of topic13EstatutoMarcoPackage.concepts) {
      const cards = topic13EstatutoMarcoPackage.flashcards.filter(
        (entry) => entry.conceptCode === concept.code,
      );
      expect(cards.length).toBeGreaterThanOrEqual(2);
      expect(cards.every((entry) => (entry.sourceRefs?.length ?? 0) >= 2)).toBe(true);
    }
  });
});
