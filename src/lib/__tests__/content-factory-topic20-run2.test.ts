// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import {
  TOPIC20_RUN2_GOVERNANCE_EXCEPTION_ID,
  topic20FastPipelineRun2,
  topic20ProductionPlan,
  topic20Run2Regenerated0222,
} from "../content-factory/consumers/topic-20-run2";
import {
  topic20FastPipelineRun1B,
} from "../content-factory/consumers/topic-20-semantic-benchmark";

const coverage = topic20FastPipelineRun2.finalCoverage;
const run1BGenerated = new Map(
  topic20FastPipelineRun1B.draft.generatedQuestions.map((candidate) => [
    String(candidate.v2.codigo ?? ""),
    candidate,
  ]),
);
const run2Generated = new Map(
  topic20FastPipelineRun2.draft.generatedQuestions.map((candidate) => [
    String(candidate.v2.codigo ?? ""),
    candidate,
  ]),
);

describe("Content Factory Topic 20 RUN 2 final", () => {
  test("applies Governance targeted regeneration and becomes import-ready", () => {
    expect(topic20FastPipelineRun2.runNumber).toBe(2);
    expect(topic20FastPipelineRun2.gates.conceptMap.status).toBe("approved");
    expect(topic20FastPipelineRun2.gates.editorialQuality.status).toBe("approved");
    expect(topic20FastPipelineRun2.resolvedExceptionIds).toContain(
      TOPIC20_RUN2_GOVERNANCE_EXCEPTION_ID,
    );
    expect(topic20FastPipelineRun2.exceptionQueue).toHaveLength(0);
    expect(topic20FastPipelineRun2.readiness.importReady).toBe(true);
    expect(topic20FastPipelineRun2.portable?.importReady).toBe(true);
  });

  test("changes only 0222 substantively inside the C01 regeneration scope", () => {
    expect(topic20FastPipelineRun2.regeneration?.affectedConceptCodes).toEqual(["SMS-T20-C01"]);
    expect(topic20FastPipelineRun2.regeneration?.removedGeneratedQuestionCodes).toEqual([
      "SMS-T20-0221",
      "SMS-T20-0222",
      "SMS-T20-0223",
    ]);
    expect(topic20FastPipelineRun2.regeneration?.generatedQuestionCodes).toEqual([
      "SMS-T20-0221",
      "SMS-T20-0222",
      "SMS-T20-0223",
    ]);

    expect(run2Generated.get("SMS-T20-0221")?.v2).toEqual(run1BGenerated.get("SMS-T20-0221")?.v2);
    expect(run2Generated.get("SMS-T20-0223")?.v2).toEqual(run1BGenerated.get("SMS-T20-0223")?.v2);
    expect(run2Generated.get("SMS-T20-0224")?.v2).toEqual(run1BGenerated.get("SMS-T20-0224")?.v2);
    expect(run2Generated.get("SMS-T20-0225")?.v2).toEqual(run1BGenerated.get("SMS-T20-0225")?.v2);
    expect(run2Generated.get("SMS-T20-0226")?.v2).toEqual(run1BGenerated.get("SMS-T20-0226")?.v2);

    const before = run1BGenerated.get("SMS-T20-0222")!;
    const after = run2Generated.get("SMS-T20-0222")!;
    expect(after.v2.pregunta).toBe(before.v2.pregunta);
    expect(after.conceptCode).toBe("SMS-T20-C01");
    expect(after.dimensions).toEqual(["exception"]);
    expect(after.v2.objetivo_aprendizaje).toBe(before.v2.objetivo_aprendizaje);
    expect(after.v2.documento_referencia).toBe("Temario_new.pdf");
    expect(after.v2.pagina_inicio).toBe(44);
    expect(after.v2.pagina_fin).toBe(45);
    expect(after.v2.referencia_fuente).toContain("arts. 1-2");
    expect(after.v2.respuesta_correcta).toBe("D");
    expect(after.v2.opcion_d).toBe(
      "La composición y categorías integrantes del sector público institucional.",
    );
    expect(after.v2.opcion_d).not.toBe(before.v2.opcion_d);
    expect(topic20Run2Regenerated0222).toEqual(after);
  });

  test("passes parser, source, duplicate, balance and adversarial QA with no flags", () => {
    expect(topic20FastPipelineRun2.questionQa?.parser.validRows).toBe(6);
    expect(topic20FastPipelineRun2.questionQa?.parser.errors).toHaveLength(0);
    expect(topic20FastPipelineRun2.questionQa?.issues).toHaveLength(0);
    expect(topic20FastPipelineRun2.questionQa?.valid).toBe(true);
  });

  test("finishes at the approved final cardinalities and clean standard coverage", () => {
    expect(topic20FastPipelineRun2.draft.units).toHaveLength(7);
    expect(topic20FastPipelineRun2.draft.concepts).toHaveLength(30);
    expect(topic20FastPipelineRun2.draft.generatedQuestions).toHaveLength(6);
    expect(topic20FastPipelineRun2.draft.content?.flashcards).toHaveLength(60);
    expect(topic20ProductionPlan.v2Questions).toHaveLength(6);
    expect(topic20ProductionPlan.v4Package?.questionMappings).toHaveLength(226);

    expect(coverage?.factoryConceptCoverage.filter((row) => row.status === "ready")).toHaveLength(30);
    expect(coverage?.factoryConceptCoverage.filter((row) => row.status === "source_limited")).toHaveLength(0);
    expect(coverage?.factoryConceptCoverage.filter((row) => row.status === "source_review_required")).toHaveLength(0);
    expect(coverage?.factoryConceptCoverage.filter((row) => row.actionableMissingPrimaryQuestions > 0)).toHaveLength(0);
    expect(coverage?.mappingQa.unmappedQuestionCodes).toHaveLength(0);
    expect(coverage?.mappingQa.duplicatePrimaryQuestionCodes).toHaveLength(0);
  });

  test("keeps all six generated questions canonical and V2-complete", () => {
    for (const candidate of topic20FastPipelineRun2.draft.generatedQuestions) {
      expect(candidate.v2.documento_referencia).toBe("Temario_new.pdf");
      expect(String(candidate.v2.referencia_fuente)).toContain("Temario_new.pdf");
      expect(Number(candidate.v2.pagina_inicio)).toBeGreaterThanOrEqual(44);
      expect(Number(candidate.v2.pagina_fin)).toBeLessThanOrEqual(76);
    }
  });
});
