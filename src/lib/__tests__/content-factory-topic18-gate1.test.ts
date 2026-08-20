// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import {
  topic18Gate1Assignments,
  topic18Gate1Concepts,
  topic18Gate1Job,
  topic18Gate1Report,
  topic18Gate1Units,
} from "../content-factory/consumers/topic-18-gate1";
import { topic18SilencePilotPackage } from "../v4-pilots/topic-18-silence";

function proposalMappings(conceptCode: string) {
  return topic18Gate1Assignments
    .filter((entry) => entry.primaryConceptCode === conceptCode)
    .map((entry) => entry.questionCode)
    .sort();
}

function pilotMappings(conceptCode: string) {
  return topic18SilencePilotPackage.questionMappings
    .filter((entry) => entry.primaryConceptCode === conceptCode)
    .map((entry) => entry.questionCode)
    .sort();
}

describe("Content Factory Topic 18 Gate 1 consumer", () => {
  test("maps the complete 240-question bank exactly once without production writes", () => {
    expect(topic18Gate1Assignments).toHaveLength(240);
    expect(new Set(topic18Gate1Assignments.map((entry) => entry.questionCode)).size).toBe(240);
    expect(topic18Gate1Report.summary.totalQuestions).toBe(240);
    expect(topic18Gate1Report.summary.unmappedQuestions).toBe(0);
    expect(topic18Gate1Report.summary.duplicatePrimaryQuestions).toBe(0);
    expect(topic18Gate1Report.summary.invalidConceptMappings).toBe(0);
    expect(topic18Gate1Report.summary.invalidQuestionMappings).toBe(0);
  });

  test("uses Temario_new.pdf as the sole canonical substantive source", () => {
    expect(topic18Gate1Job.sourcePolicy).toEqual({
      canonicalOnly: true,
      document: "Temario_new.pdf",
      externalVerificationAllowed: false,
    });
    expect(topic18Gate1Job.source.every((entry) => `${entry.label} ${entry.reference}`.includes("Temario_new.pdf"))).toBe(true);
    expect(topic18Gate1Units.flatMap((entry) => entry.sourceRefs).every((entry) => `${entry.label} ${entry.reference}`.includes("Temario_new.pdf"))).toBe(true);
    expect(topic18Gate1Concepts.flatMap((entry) => entry.sourceRefs ?? []).every((entry) => `${entry.label} ${entry.reference}`.includes("Temario_new.pdf"))).toBe(true);
    expect(topic18Gate1Report.summary.sourceReviewRequired).toBe(0);
  });

  test("produces the reviewed Gate 1 dimensions and exact coverage arithmetic", () => {
    expect(topic18Gate1Units).toHaveLength(16);
    expect(topic18Gate1Concepts).toHaveLength(44);
    expect(topic18Gate1Report.summary.units).toBe(16);
    expect(topic18Gate1Report.summary.concepts).toBe(44);
    expect(topic18Gate1Report.summary.meanPrimaryQuestions).toBeCloseTo(240 / 44, 10);
    expect(topic18Gate1Report.summary.medianPrimaryQuestions).toBe(5);
    expect(topic18Gate1Report.summary.readyConcepts).toBe(31);
    expect(topic18Gate1Report.summary.coverageGaps).toBe(13);
    expect(topic18Gate1Report.summary.questionsNeeded).toBe(22);
  });

  test("keeps every existing silence pilot code, title and primary mapping unchanged", () => {
    for (const pilotUnit of topic18SilencePilotPackage.units) {
      const proposed = topic18Gate1Units.find((entry) => entry.code === pilotUnit.code);
      expect(proposed?.title).toBe(pilotUnit.title);
      expect(proposed?.position).toBe(pilotUnit.position);
    }
    for (const pilotConcept of topic18SilencePilotPackage.concepts) {
      const proposed = topic18Gate1Concepts.find((entry) => entry.code === pilotConcept.code);
      expect(proposed?.unitCode).toBe(pilotConcept.unitCode);
      expect(proposed?.title).toBe(pilotConcept.title);
      expect(proposalMappings(pilotConcept.code)).toEqual(pilotMappings(pilotConcept.code));
    }
    expect(topic18SilencePilotPackage.flashcards).toHaveLength(11);
  });

  test("keeps sparse legal concepts separate instead of merging them to turn coverage green", () => {
    const gaps = topic18Gate1Report.concepts
      .filter((entry) => entry.coverageGap)
      .map((entry) => [entry.code, entry.primaryCount, entry.missing]);
    expect(gaps).toEqual([
      ["SMS-T18-C01", 3, 1],
      ["SMS-T18-C25", 2, 2],
      ["SMS-T18-C28", 3, 1],
      ["SMS-T18-C29", 2, 2],
      ["SMS-T18-C31", 3, 1],
      ["SMS-T18-C34", 3, 1],
      ["SMS-T18-C35", 3, 1],
      ["SMS-T18-C36", 2, 2],
      ["SMS-T18-C38", 2, 2],
      ["SMS-T18-C40", 3, 1],
      ["SMS-T18-C41", 2, 2],
      ["SMS-T18-C42", 1, 3],
      ["SMS-T18-C43", 1, 3],
    ]);
  });

  test("surfaces the cross-article assignments that still need Governance review", () => {
    const overlaps = Object.fromEntries(
      topic18Gate1Report.concepts
        .filter((entry) => entry.possibleOverlaps.length > 0)
        .map((entry) => [entry.code, entry.possibleOverlaps]),
    );
    expect(overlaps["SMS-T18-C13"]).toContain("SMS-T18-C11");
    expect(overlaps["SMS-T18-C13"]).toContain("SMS-T18-C23");
    expect(overlaps["SMS-T18-C22"]).toContain("SMS-T18-C21");
    expect(overlaps["SMS-T18-C24"]).toContain("SMS-T18-C23");
    expect(overlaps["SMS-T18-C26"]).toContain("SMS-T18-C25");
    expect(overlaps["SMS-T18-C29"]).toContain("SMS-T18-C30");
  });
});
