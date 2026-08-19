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
}): FactoryQuestionGenerationSlot[] {
  const missingRows = input.coverage.conceptCoverage.filter(
    (row) => row.missingPrimaryQuestions > 0,
  );
  const total = missingRows.reduce((sum, row) => sum + row.missingPrimaryQuestions, 0);
  const codes = allocateStableQuestionCodes({
    codePrefix: input.codePrefix,
    usedCodes: input.usedQuestionCodes,
    count: total,
  });

  const slots: FactoryQuestionGenerationSlot[] = [];
  let codeIndex = 0;
  for (const row of missingRows) {
    const preferred = input.preferredDimensionsByConcept?.[row.conceptId] ?? [];
    const dimensions = [...new Set([...preferred, ...FACTORY_EVIDENCE_DIMENSIONS])];
    for (let index = 0; index < row.missingPrimaryQuestions; index += 1) {
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
