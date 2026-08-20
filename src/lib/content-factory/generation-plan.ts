import type { FactoryCoverageResult } from "./coverage";
import { allocateStableQuestionCodes } from "./codes";
import {
  FACTORY_EVIDENCE_DIMENSIONS,
  type FactoryEvidenceDimension,
  type FactoryQuestionGenerationSlot,
} from "./types";

export function planDirectedQuestionGeneration(input: {
  coverage: FactoryCoverageResult;
  codePrefix: string;
  usedQuestionCodes: Iterable<string>;
  preferredDimensionsByConcept?: Record<string, FactoryEvidenceDimension[]>;
  /** Optional targeted-regeneration scope. Omitted preserves the original all-gap behavior. */
  conceptCodes?: Iterable<string>;
}): FactoryQuestionGenerationSlot[] {
  const conceptScope = input.conceptCodes ? new Set(input.conceptCodes) : null;
  const actionableRows = input.coverage.factoryConceptCoverage.filter(
    (row) =>
      row.status === "coverage_gap" &&
      row.actionableMissingPrimaryQuestions > 0 &&
      (conceptScope === null || conceptScope.has(row.conceptId)),
  );
  const total = actionableRows.reduce(
    (sum, row) => sum + row.actionableMissingPrimaryQuestions,
    0,
  );
  const codes = allocateStableQuestionCodes({
    codePrefix: input.codePrefix,
    usedCodes: input.usedQuestionCodes,
    count: total,
  });

  const slots: FactoryQuestionGenerationSlot[] = [];
  let codeIndex = 0;
  for (const row of actionableRows) {
    const preferred = input.preferredDimensionsByConcept?.[row.conceptId] ?? [];
    const dimensions = [...new Set([...preferred, ...FACTORY_EVIDENCE_DIMENSIONS])];
    for (let index = 0; index < row.actionableMissingPrimaryQuestions; index += 1) {
      slots.push({
        questionCode: codes[codeIndex++],
        conceptCode: row.conceptId,
        dimension: dimensions[index % dimensions.length],
        reason: row.primaryQuestionCount === 0 ? "greenfield_baseline" : "coverage_gap",
      });
    }
  }
  return slots;
}
