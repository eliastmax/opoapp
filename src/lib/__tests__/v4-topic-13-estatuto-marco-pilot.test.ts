// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import { validateV4StudyContentPackage } from "../v4-content-package";
import { topic13ReviewedCoverageGapQuestions } from "../v4-pilots/topic-13-coverage-gap-questions-reviewed";
import { topic13EstatutoMarcoPackage } from "../v4-pilots/topic-13-estatuto-marco";

describe("V4 Topic 13 Estatuto Marco package", () => {
  test("passes the portable content-package contract", () => {
    const result = validateV4StudyContentPackage(topic13EstatutoMarcoPackage);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("uses the definitive post-gate dimensions", () => {
    expect(topic13EstatutoMarcoPackage.units).toHaveLength(18);
    expect(topic13EstatutoMarcoPackage.concepts).toHaveLength(34);
    expect(topic13EstatutoMarcoPackage.questionMappings).toHaveLength(99);
    expect(topic13EstatutoMarcoPackage.flashcards).toHaveLength(68);
    expect(topic13ReviewedCoverageGapQuestions).toHaveLength(45);
  });

  test("maps every original active bank question exactly once as primary", () => {
    const questionCodes = topic13EstatutoMarcoPackage.questionMappings.map((mapping) => mapping.questionCode);
    expect(new Set(questionCodes).size).toBe(99);
    expect(questionCodes[0]).toBe("SMS-T13-0001");
    expect(questionCodes[98]).toBe("SMS-T13-0099");

    const result = validateV4StudyContentPackage(topic13EstatutoMarcoPackage);
    expect(result.coverage.activeQuestionCount).toBe(99);
    expect(result.coverage.mappedPrimaryQuestionCount).toBe(99);
    expect(result.coverage.unmappedQuestionIds).toEqual([]);
    expect(result.coverage.duplicatePrimaryQuestionIds).toEqual([]);
  });

  test("fixes the article 20.3 incorporation condition everywhere in the canonical package", () => {
    const serialized = JSON.stringify(topic13EstatutoMarcoPackage);
    expect(serialized).not.toContain("no incorporarse justificadamente");
    expect(serialized).toContain("imputable al interesado");
    expect(serialized).toContain("no obedece a causa justificada");
  });

  test("splits the four governance-gated concepts for diagnostic precision", () => {
    const mappings = (conceptCode: string) =>
      topic13EstatutoMarcoPackage.questionMappings
        .filter((mapping) => mapping.primaryConceptCode === conceptCode)
        .map((mapping) => mapping.questionCode);

    expect(mappings("SMS-T13-C05")).toEqual(["SMS-T13-0018"]);
    expect(mappings("SMS-T13-C30")).toEqual(["SMS-T13-0019"]);
    expect(mappings("SMS-T13-C31")).toEqual(["SMS-T13-0020"]);
    expect(mappings("SMS-T13-C06")).toEqual(["SMS-T13-0021", "SMS-T13-0022"]);
    expect(mappings("SMS-T13-C32")).toEqual(["SMS-T13-0023"]);
    expect(mappings("SMS-T13-C17")).toEqual(["SMS-T13-0059"]);
    expect(mappings("SMS-T13-C33")).toEqual(["SMS-T13-0060", "SMS-T13-0061"]);
    expect(mappings("SMS-T13-C27")).toEqual(["SMS-T13-0094"]);
    expect(mappings("SMS-T13-C34")).toEqual(["SMS-T13-0095"]);
  });

  test("preserves the honest pre-generation coverage gaps after the gate", () => {
    const result = validateV4StudyContentPackage(topic13EstatutoMarcoPackage);
    const ready = result.coverage.conceptCoverage.filter((row) => row.status === "ready");
    const gaps = result.coverage.conceptCoverage.filter((row) => row.status === "coverage_gap");
    const missing = gaps.reduce((total, row) => total + row.missingPrimaryQuestions, 0);

    expect(ready).toHaveLength(12);
    expect(gaps).toHaveLength(22);
    expect(missing).toBe(45);
    expect(result.warnings.filter((warning) => warning.code === "coverage_gap")).toHaveLength(22);
  });

  test("the reviewed candidate batch closes every gap to exactly four questions", () => {
    const result = validateV4StudyContentPackage(topic13EstatutoMarcoPackage);
    const candidatesByConcept = new Map<string, number>();
    for (const candidate of topic13ReviewedCoverageGapQuestions) {
      candidatesByConcept.set(candidate.conceptCode, (candidatesByConcept.get(candidate.conceptCode) ?? 0) + 1);
    }

    const gapIds = result.coverage.conceptCoverage
      .filter((row) => row.status === "coverage_gap")
      .map((row) => row.conceptId)
      .sort();
    expect([...candidatesByConcept.keys()].sort()).toEqual(gapIds);

    for (const row of result.coverage.conceptCoverage.filter((entry) => entry.status === "coverage_gap")) {
      expect(row.primaryQuestionCount + (candidatesByConcept.get(row.conceptId) ?? 0)).toBe(4);
    }
  });

  test("reviewed candidate questions are unique, source-backed and structurally reviewable", () => {
    const codes = topic13ReviewedCoverageGapQuestions.map((entry) => entry.questionCode);
    const stems = topic13ReviewedCoverageGapQuestions.map((entry) => entry.question);
    expect(new Set(codes).size).toBe(45);
    expect(new Set(stems).size).toBe(45);
    expect(codes[0]).toBe("SMS-T13-0100");
    expect(codes[44]).toBe("SMS-T13-0144");

    for (const entry of topic13ReviewedCoverageGapQuestions) {
      expect(entry.options).toHaveLength(4);
      expect(new Set(entry.options).size).toBe(4);
      expect(["A", "B", "C", "D"]).toContain(entry.correctOption);
      expect(entry.dimension.trim().length).toBeGreaterThan(0);
      expect(entry.explanation.trim().length).toBeGreaterThan(0);
      expect(entry.sourceReference).toContain("Ley 55/2003");
      expect(entry.documentReference).toBe("Temario_new.pdf");
      expect(entry.pageStart).toBeGreaterThanOrEqual(245);
      expect(entry.pageEnd).toBeLessThanOrEqual(275);
      expect(entry.pageEnd).toBeGreaterThanOrEqual(entry.pageStart);
    }
  });

  test("keeps fault prescription, sanction prescription and cancellation separate", () => {
    const titleByCode = Object.fromEntries(topic13EstatutoMarcoPackage.concepts.map((entry) => [entry.code, entry.title]));
    expect(titleByCode["SMS-T13-C25"]).toBe("Prescripción de faltas");
    expect(titleByCode["SMS-T13-C27"]).toBe("Prescripción de sanciones");
    expect(titleByCode["SMS-T13-C34"]).toBe("Cancelación de anotaciones disciplinarias");
  });

  test("gives every canonical concept at least two source-backed flashcards", () => {
    for (const concept of topic13EstatutoMarcoPackage.concepts) {
      const cards = topic13EstatutoMarcoPackage.flashcards.filter((entry) => entry.conceptCode === concept.code);
      expect(cards.length).toBeGreaterThanOrEqual(2);
      expect(cards.every((entry) => (entry.sourceRefs?.length ?? 0) >= 2)).toBe(true);
    }
  });
});
