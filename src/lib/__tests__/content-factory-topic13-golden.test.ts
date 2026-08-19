// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import { buildGate1Report, type ContentFactoryJob } from "../content-factory";
import { validateV4StudyContentPackage } from "../v4-content-package";
import { topic13EstatutoMarcoMaterializedPackage } from "../v4-pilots/topic-13-estatuto-marco-materialized";

describe("Content Factory Topic 13 golden regression", () => {
  test("recognizes the closed production result without changing the fixture", () => {
    const pkg = topic13EstatutoMarcoMaterializedPackage;
    const job: ContentFactoryJob = {
      version: "1.0",
      oppositionCode: pkg.oppositionCode,
      topicNumber: pkg.topicNumber,
      mode: "existing_bank",
      codePrefix: "SMS-T13",
      sourceRevision: pkg.sourceRevision,
      source: pkg.units[0].sourceRefs,
      existingQuestions: pkg.questionMappings.map((mapping) => ({
        code: mapping.questionCode,
        active: true,
      })),
    };

    const gate1 = buildGate1Report({
      job,
      units: pkg.units.map((unit) => ({
        code: unit.code,
        title: unit.title,
        position: unit.position,
        sourceRefs: unit.sourceRefs,
        sourceSubtopicName: unit.sourceSubtopicName,
      })),
      concepts: pkg.concepts,
      assignments: pkg.questionMappings.map((mapping) => ({
        questionCode: mapping.questionCode,
        primaryConceptCode: mapping.primaryConceptCode,
      })),
    });
    const packageValidation = validateV4StudyContentPackage(pkg);

    expect(pkg.units).toHaveLength(18);
    expect(pkg.concepts).toHaveLength(34);
    expect(pkg.questionMappings).toHaveLength(144);
    expect(pkg.flashcards).toHaveLength(68);
    expect(gate1.summary.totalQuestions).toBe(144);
    expect(gate1.summary.readyConcepts).toBe(34);
    expect(gate1.summary.coverageGaps).toBe(0);
    expect(gate1.summary.questionsNeeded).toBe(0);
    expect(gate1.summary.unmappedQuestions).toBe(0);
    expect(gate1.summary.duplicatePrimaryQuestions).toBe(0);
    expect(gate1.coverage.mappedPrimaryQuestionCount).toBe(144);
    expect(gate1.coverage.conceptCoverage.every((row) => row.primaryQuestionCount >= 4)).toBe(true);
    expect(packageValidation.valid).toBe(true);
    expect(packageValidation.coverage.underCoveredConceptIds).toEqual([]);
  });
});
