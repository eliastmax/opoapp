// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import {
  TOPIC20_RUN2_GOVERNANCE_EXCEPTION_ID,
  topic20FastPipelineRun2,
  topic20ProductionPlan,
  topic20Run2AppliedDecision,
  topic20Run2Regenerated0222,
} from "../content-factory/consumers/topic-20-run2";
import { topic20FastPipelineRun1B } from "../content-factory/consumers/topic-20-semantic-benchmark";

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
  test("applies the Governance question patch and becomes import-ready", () => {
    expect(topic20Run2AppliedDecision.decisionIds).toEqual([
      TOPIC20_RUN2_GOVERNANCE_EXCEPTION_ID,
    ]);
    expect(topic20Run2AppliedDecision.resolvedExceptionIds).toContain(
      TOPIC20_RUN2_GOVERNANCE_EXCEPTION_ID,
    );
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

  test("changes only 0222 substantively and preserves every stable generated code", () => {
    expect([...run2Generated.keys()].sort()).toEqual([...run1BGenerated.keys()].sort());
    for (const code of ["SMS-T20-0221", "SMS-T20-0223", "SMS-T20-0224", "SMS-T20-0225", "SMS-T20-0226"]) {
      expect(run2Generated.get(code)?.v2).toEqual(run1BGenerated.get(code)?.v2);
    }

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
    expect(topic20ProductionPlan.v2QuestionsForImport).toHaveLength(6);
    expect(topic20ProductionPlan.v4Package?.questionMappings).toHaveLength(226);

    expect(coverage?.factoryConceptCoverage.filter((row) => row.status === "ready")).toHaveLength(30);
    expect(coverage?.factoryConceptCoverage.filter((row) => row.status === "source_limited")).toHaveLength(0);
    expect(coverage?.factoryConceptCoverage.filter((row) => row.status === "source_review_required")).toHaveLength(0);
    expect(coverage?.factoryConceptCoverage.filter((row) => row.actionableMissingPrimaryQuestions > 0)).toHaveLength(0);
    expect(coverage?.mappingQa.unmappedQuestionCodes).toHaveLength(0);
    expect(coverage?.mappingQa.duplicatePrimaryQuestionCodes).toHaveLength(0);
  });

  test("keeps all six generated questions canonical and normalizes only import hierarchy labels", () => {
    topic20ProductionPlan.v2Questions.forEach((approved, index) => {
      expect(approved.documento_referencia).toBe("Temario_new.pdf");
      expect(String(approved.referencia_fuente)).toContain("Temario_new.pdf");
      expect(Number(approved.pagina_inicio)).toBeGreaterThanOrEqual(44);
      expect(Number(approved.pagina_fin)).toBeLessThanOrEqual(76);
      const transport = topic20ProductionPlan.v2QuestionsForImport[index];
      expect(transport.materia).toBe("Ley 40/2015 — Régimen jurídico del sector público");
      const { materia: _m1, tema: _t1, ...transportSubstantive } = transport;
      const { materia: _m2, tema: _t2, ...approvedSubstantive } = approved;
      expect(transportSubstantive).toEqual(approvedSubstantive);
    });
  });
});
