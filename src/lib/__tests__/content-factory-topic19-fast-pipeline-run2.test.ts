import { describe, expect, test } from "bun:test";
import {
  topic19FastPipelineRun2,
  topic19ProductionPlan,
} from "../content-factory/consumers/topic-19-fast-pipeline-run2";

const coverage = topic19FastPipelineRun2.finalCoverage;

describe("Content Factory Topic 19 FAST PIPELINE RUN 2", () => {
  test("applies the single central Governance review and becomes import-ready", () => {
    expect(topic19FastPipelineRun2.runNumber).toBe(2);
    expect(topic19FastPipelineRun2.gates.conceptMap.status).toBe("approved");
    expect(topic19FastPipelineRun2.gates.editorialQuality.status).toBe("approved");
    expect(topic19FastPipelineRun2.resolvedExceptionIds).toContain(
      "fx:source_review_required:topic:sms-t19-resource-source-boundary:legacy-resource-bank",
    );
    expect(topic19FastPipelineRun2.exceptionQueue).toHaveLength(0);
    expect(topic19FastPipelineRun2.readiness.importReady).toBe(true);
    expect(topic19FastPipelineRun2.portable?.importReady).toBe(true);
  });

  test("preserves the approved 15/40/221 structure and five generated questions", () => {
    expect(topic19FastPipelineRun2.draft.units).toHaveLength(15);
    expect(topic19FastPipelineRun2.draft.concepts).toHaveLength(40);
    expect(topic19FastPipelineRun2.draft.assignments).toHaveLength(221);
    expect(topic19FastPipelineRun2.draft.generatedQuestions.map((row) => row.v2.codigo)).toEqual([
      "SMS-T19-0241","SMS-T19-0242","SMS-T19-0243","SMS-T19-0244","SMS-T19-0245",
    ]);
    expect(topic19FastPipelineRun2.draft.content?.flashcards).toHaveLength(80);
    expect(topic19ProductionPlan.archiveLegacyQuestionCodes).toHaveLength(19);
  });

  test("closes standard coverage without source-limited concepts or mapping anomalies", () => {
    expect(coverage).not.toBeNull();
    expect(coverage?.factoryConceptCoverage.filter((row) => row.status === "ready")).toHaveLength(40);
    expect(coverage?.factoryConceptCoverage.filter((row) => row.status === "source_limited")).toHaveLength(0);
    expect(coverage?.factoryConceptCoverage.filter((row) => row.actionableMissingPrimaryQuestions > 0)).toHaveLength(0);
    expect(coverage?.mappingQa.unmappedQuestionCodes).toHaveLength(0);
    expect(coverage?.mappingQa.duplicatePrimaryQuestionCodes).toHaveLength(0);
  });

  test("keeps the archived legacy rows outside V4 and all generated rows canonical-only", () => {
    const mappings = new Set(topic19FastPipelineRun2.portable?.v4Package.questionMappings.map((row) => row.questionCode) ?? []);
    for (const code of topic19ProductionPlan.archiveLegacyQuestionCodes) expect(mappings.has(code)).toBe(false);
    for (const row of topic19ProductionPlan.v2Questions) {
      expect(row.documento_referencia).toBe("Temario_new.pdf");
      expect(String(row.referencia_fuente)).toContain("Temario_new.pdf");
    }
  });
});
