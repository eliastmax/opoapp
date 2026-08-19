// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import { HEADERS_V2, parseCsv } from "../csv-parser";
import {
  getAnswerKeyDistribution,
  hasExtremeAnswerKeyImbalance,
} from "../question-batch-quality";
import { validateV4StudyContentPackage } from "../v4-content-package";
import { topic13ReviewedCoverageGapQuestions } from "../v4-pilots/topic-13-coverage-gap-questions-reviewed";
import { topic13EstatutoMarcoMaterializedPackage } from "../v4-pilots/topic-13-estatuto-marco-materialized";
import { topic13EstatutoMarcoPackage } from "../v4-pilots/topic-13-estatuto-marco";
import { topic13V2QuestionCandidates } from "../v4-pilots/topic-13-v2-question-candidates";

describe("V4 Topic 13 Estatuto Marco materialized package", () => {
  test("passes the portable package contract with the final production dimensions", () => {
    const result = validateV4StudyContentPackage(topic13EstatutoMarcoMaterializedPackage);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(topic13EstatutoMarcoMaterializedPackage.units).toHaveLength(18);
    expect(topic13EstatutoMarcoMaterializedPackage.concepts).toHaveLength(34);
    expect(topic13EstatutoMarcoMaterializedPackage.questionMappings).toHaveLength(144);
    expect(topic13EstatutoMarcoMaterializedPackage.flashcards).toHaveLength(68);
  });

  test("preserves all 99 original primaries and adds exactly the 45 approved bank rows", () => {
    const finalMappings = topic13EstatutoMarcoMaterializedPackage.questionMappings;
    const codes = finalMappings.map((entry) => entry.questionCode);
    const originalCodes = topic13EstatutoMarcoPackage.questionMappings.map((entry) => entry.questionCode);

    expect(topic13EstatutoMarcoPackage.questionMappings).toHaveLength(99);
    expect(originalCodes[0]).toBe("SMS-T13-0001");
    expect(originalCodes[98]).toBe("SMS-T13-0099");
    expect(finalMappings.slice(0, 99)).toEqual(topic13EstatutoMarcoPackage.questionMappings);
    expect(new Set(codes).size).toBe(144);
    expect(codes[0]).toBe("SMS-T13-0001");
    expect(codes[143]).toBe("SMS-T13-0144");

    const newMappings = finalMappings.slice(99);
    expect(newMappings).toEqual(
      topic13ReviewedCoverageGapQuestions.map((entry) => ({
        questionCode: entry.questionCode,
        primaryConceptCode: entry.conceptCode,
      })),
    );
  });

  test("has 100 percent canonical coverage with no coverage gap", () => {
    const result = validateV4StudyContentPackage(topic13EstatutoMarcoMaterializedPackage);
    const ready = result.coverage.conceptCoverage.filter((row) => row.status === "ready");
    const gaps = result.coverage.conceptCoverage.filter((row) => row.status === "coverage_gap");
    const zero = result.coverage.conceptCoverage.filter((row) => row.primaryQuestionCount === 0);

    expect(result.coverage.activeQuestionCount).toBe(144);
    expect(result.coverage.mappedPrimaryQuestionCount).toBe(144);
    expect(result.coverage.unmappedQuestionIds).toEqual([]);
    expect(result.coverage.duplicatePrimaryQuestionIds).toEqual([]);
    expect(ready).toHaveLength(34);
    expect(gaps).toEqual([]);
    expect(zero).toEqual([]);
    expect(result.warnings.filter((warning) => warning.code === "coverage_gap")).toEqual([]);
    expect(ready.every((row) => row.primaryQuestionCount >= 4)).toBe(true);
  });

  test("keeps the Governance-approved diagnostic splits and assigns their new questions precisely", () => {
    const mappings = (conceptCode: string) =>
      topic13EstatutoMarcoMaterializedPackage.questionMappings
        .filter((entry) => entry.primaryConceptCode === conceptCode)
        .map((entry) => entry.questionCode);

    expect(mappings("SMS-T13-C05")).toEqual(["SMS-T13-0018", "SMS-T13-0101", "SMS-T13-0102", "SMS-T13-0103"]);
    expect(mappings("SMS-T13-C30")).toEqual(["SMS-T13-0019", "SMS-T13-0104", "SMS-T13-0105", "SMS-T13-0106"]);
    expect(mappings("SMS-T13-C31")).toEqual(["SMS-T13-0020", "SMS-T13-0107", "SMS-T13-0108", "SMS-T13-0109"]);
    expect(mappings("SMS-T13-C06")).toEqual(["SMS-T13-0021", "SMS-T13-0022", "SMS-T13-0110", "SMS-T13-0111"]);
    expect(mappings("SMS-T13-C32")).toEqual(["SMS-T13-0023", "SMS-T13-0112", "SMS-T13-0113", "SMS-T13-0114"]);
    expect(mappings("SMS-T13-C17")).toEqual(["SMS-T13-0059", "SMS-T13-0122", "SMS-T13-0123", "SMS-T13-0124"]);
    expect(mappings("SMS-T13-C33")).toEqual(["SMS-T13-0060", "SMS-T13-0061", "SMS-T13-0125", "SMS-T13-0126"]);
    expect(mappings("SMS-T13-C27")).toEqual(["SMS-T13-0094", "SMS-T13-0135", "SMS-T13-0136", "SMS-T13-0137"]);
    expect(mappings("SMS-T13-C34")).toEqual(["SMS-T13-0095", "SMS-T13-0138", "SMS-T13-0139", "SMS-T13-0140"]);
  });

  test("keeps the corrected article 20.3 condition everywhere in the canonical package", () => {
    const serialized = JSON.stringify(topic13EstatutoMarcoMaterializedPackage);
    expect(serialized).not.toContain("no incorporarse justificadamente");
    expect(serialized).toContain("imputable al interesado");
    expect(serialized).toContain("no obedece a causa justificada");
  });

  test("keeps the approved stored answer distribution and rejects the former extreme bias", () => {
    const keys = topic13ReviewedCoverageGapQuestions.map((entry) => entry.correctOption);
    expect(getAnswerKeyDistribution(keys)).toEqual({ A: 11, B: 11, C: 11, D: 12 });
    expect(hasExtremeAnswerKeyImbalance(keys)).toBe(false);

    const oldBiasedKeys = [
      ...Array(7).fill("A"),
      ...Array(33).fill("B"),
      ...Array(4).fill("C"),
      "D",
    ] as Array<"A" | "B" | "C" | "D">;
    expect(hasExtremeAnswerKeyImbalance(oldBiasedKeys)).toBe(true);
  });

  test("0106 covers the complete six-year exclusion in article 73.1.a", () => {
    const q0106 = topic13ReviewedCoverageGapQuestions.find((entry) => entry.questionCode === "SMS-T13-0106");
    expect(q0106).toBeDefined();
    expect(q0106?.question).toContain("seis años");
    expect(q0106?.explanation).toContain("no concurrir a selección para fijo");
    expect(q0106?.explanation).toContain("estatutario temporal");
    expect(q0106?.explanation).toContain("Administración pública");
    expect(q0106?.explanation).toContain("fundaciones sanitarias");
  });

  test("every materialized question remains a complete valid V2 25-column row", () => {
    expect(topic13V2QuestionCandidates).toHaveLength(45);
    for (const row of topic13V2QuestionCandidates) {
      expect(Object.keys(row)).toHaveLength(25);
      for (const header of HEADERS_V2) {
        const value = (row as unknown as Record<string, string | number>)[header];
        expect(value).not.toBeUndefined();
        expect(String(value).trim().length).toBeGreaterThan(0);
      }
    }

    const quote = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const csv = [
      HEADERS_V2.join(";"),
      ...topic13V2QuestionCandidates.map((row) =>
        HEADERS_V2.map((header) =>
          quote((row as unknown as Record<string, string | number>)[header]),
        ).join(";"),
      ),
    ].join("\n");

    const parsed = parseCsv(csv);
    if ("fatal" in parsed) throw new Error(parsed.fatal);
    expect(parsed.mode).toBe("v2");
    expect(parsed.valid).toHaveLength(45);
    expect(parsed.errors).toEqual([]);
  });

  test("keeps fault prescription, sanction prescription and cancellation separate", () => {
    const titleByCode = Object.fromEntries(
      topic13EstatutoMarcoMaterializedPackage.concepts.map((entry) => [entry.code, entry.title]),
    );
    expect(titleByCode["SMS-T13-C25"]).toBe("Prescripción de faltas");
    expect(titleByCode["SMS-T13-C27"]).toBe("Prescripción de sanciones");
    expect(titleByCode["SMS-T13-C34"]).toBe("Cancelación de anotaciones disciplinarias");
  });

  test("gives every canonical concept at least two source-backed flashcards", () => {
    for (const concept of topic13EstatutoMarcoMaterializedPackage.concepts) {
      const cards = topic13EstatutoMarcoMaterializedPackage.flashcards.filter(
        (entry) => entry.conceptCode === concept.code,
      );
      expect(cards.length).toBeGreaterThanOrEqual(2);
      expect(cards.every((entry) => (entry.sourceRefs?.length ?? 0) >= 2)).toBe(true);
    }
  });
});
