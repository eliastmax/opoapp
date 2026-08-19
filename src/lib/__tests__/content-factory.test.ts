// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import { parseCsv } from "../csv-parser";
import {
  auditGeneratedQuestionCandidates,
  buildGate1Report,
  calculateFactoryCoverage,
  generationAllowed,
  planDirectedQuestionGeneration,
  proposePreliminaryConceptMap,
  serializeV2Rows,
  stableConceptCode,
  stableUnitCode,
  validateContentFactoryJob,
  type ContentFactoryJob,
  type FactoryGeneratedQuestionCandidate,
  type FactoryQuestionAssignment,
  type FactoryQuestionMetadata,
  type ProposedConcept,
  type ProposedStudyUnit,
  type V2QuestionRow,
} from "../content-factory";

const source = [{ label: "Fuente oficial", reference: "Norma, art. 1", pageStart: 1, pageEnd: 2 }];

function concept(code: string, unitCode = "SMS-T01-U01"): ProposedConcept {
  return { code, unitCode, title: `Concepto ${code}`, description: "Descripción", position: 1 };
}

function question(code: string): FactoryQuestionMetadata {
  return { code, active: true, stem: `Pregunta ${code}` };
}

function v2Row(code: string, correct = "A"): V2QuestionRow {
  return {
    codigo: code,
    materia: "Materia",
    numero_tema: 1,
    tema: "Tema 1",
    apartado: "Apartado",
    subapartado: "Subapartado",
    concepto: "Concepto",
    objetivo_aprendizaje: "Objetivo",
    perspectiva: "aplicacion",
    nivel_pedagogico: "consolidacion",
    dificultad_conceptual: "medio",
    dificultad_examen: "medio",
    tipo_trampa: "concepto_proximo",
    pregunta: `¿Qué regla corresponde a ${code}?`,
    opcion_a: `Opción A ${code}`,
    opcion_b: `Opción B ${code}`,
    opcion_c: `Opción C ${code}`,
    opcion_d: `Opción D ${code}`,
    respuesta_correcta: correct,
    explicacion: "Explicación suficiente.",
    documento_referencia: "Temario.pdf",
    pagina_inicio: 10,
    pagina_fin: 11,
    referencia_fuente: "Norma, art. 1",
    frecuencia_historica: "no_determinada",
  };
}

describe("Content Factory coverage and mapping QA", () => {
  test("calculates missing exactly for 0, 1, 2, 3 and 4+ primary questions", () => {
    const concepts = [1, 2, 3, 4, 5].map((n) => concept(`SMS-T01-C0${n}`));
    const questions = Array.from({ length: 10 }, (_, index) => question(`SMS-T01-${String(index + 1).padStart(4, "0")}`));
    const assignments: FactoryQuestionAssignment[] = [];
    let cursor = 0;
    for (let count = 0; count <= 4; count += 1) {
      for (let index = 0; index < count; index += 1) {
        assignments.push({
          questionCode: questions[cursor++].code,
          primaryConceptCode: concepts[count].code,
        });
      }
    }

    const result = calculateFactoryCoverage({ questions, concepts, assignments, threshold: 4 });
    expect(result.conceptCoverage.map((row) => row.primaryQuestionCount)).toEqual([0, 1, 2, 3, 4]);
    expect(result.conceptCoverage.map((row) => row.missingPrimaryQuestions)).toEqual([4, 3, 2, 1, 0]);
    expect(result.conceptCoverage.map((row) => row.status)).toEqual([
      "coverage_gap",
      "coverage_gap",
      "coverage_gap",
      "coverage_gap",
      "ready",
    ]);
    expect(result.totalMissingQuestions).toBe(10);
  });

  test("detects unmapped, duplicate primary and invalid concept mappings", () => {
    const questions = [question("SMS-T01-0001"), question("SMS-T01-0002"), question("SMS-T01-0003")];
    const concepts = [concept("SMS-T01-C01"), concept("SMS-T01-C02")];
    const assignments: FactoryQuestionAssignment[] = [
      { questionCode: "SMS-T01-0001", primaryConceptCode: "SMS-T01-C01" },
      { questionCode: "SMS-T01-0001", primaryConceptCode: "SMS-T01-C02" },
      { questionCode: "SMS-T01-0002", primaryConceptCode: "SMS-T01-C99" },
      { questionCode: "SMS-T01-9999", primaryConceptCode: "SMS-T01-C01" },
    ];

    const result = calculateFactoryCoverage({ questions, concepts, assignments });
    expect(result.mappingQa.duplicatePrimaryQuestionCodes).toEqual(["SMS-T01-0001"]);
    expect(result.mappingQa.unmappedQuestionCodes).toEqual(["SMS-T01-0002", "SMS-T01-0003"]);
    expect(result.mappingQa.invalidConceptMappings).toEqual([
      { questionCode: "SMS-T01-0002", conceptCode: "SMS-T01-C99" },
    ]);
    expect(result.mappingQa.invalidQuestionMappings).toEqual(["SMS-T01-9999"]);
  });
});

describe("Content Factory question QA", () => {
  const concepts = [concept("SMS-T01-C01")];

  test("reuses the real V2 parser for a complete generated row", () => {
    const candidate: FactoryGeneratedQuestionCandidate = {
      conceptCode: "SMS-T01-C01",
      dimensions: ["rule"],
      v2: v2Row("SMS-T01-0001"),
    };
    const report = auditGeneratedQuestionCandidates({ candidates: [candidate], concepts });
    expect(report.valid).toBe(true);
    expect(report.parser.validRows).toBe(1);
    expect(report.parser.errors).toEqual([]);

    const parsed = parseCsv(serializeV2Rows([candidate.v2]));
    if ("fatal" in parsed) throw new Error(parsed.fatal);
    expect(parsed.mode).toBe("v2");
    expect(parsed.valid).toHaveLength(1);
    expect(parsed.errors).toEqual([]);
  });

  test("detects answer imbalance, duplicate options and invalid keys", () => {
    const imbalanced = Array.from({ length: 20 }, (_, index): FactoryGeneratedQuestionCandidate => ({
      conceptCode: "SMS-T01-C01",
      dimensions: ["rule"],
      v2: v2Row(`SMS-T01-${String(index + 1).padStart(4, "0")}`, "B"),
    }));
    const imbalanceReport = auditGeneratedQuestionCandidates({ candidates: imbalanced, concepts });
    expect(imbalanceReport.extremeAnswerImbalance).toBe(true);
    expect(imbalanceReport.issues.some((issue) => issue.code === "answer_key_imbalance")).toBe(true);

    const brokenRow = v2Row("SMS-T01-0100", "Z");
    brokenRow.opcion_d = brokenRow.opcion_c;
    const brokenReport = auditGeneratedQuestionCandidates({
      candidates: [{ conceptCode: "SMS-T01-C01", dimensions: ["contrast"], v2: brokenRow }],
      concepts,
    });
    expect(brokenReport.valid).toBe(false);
    expect(brokenReport.issues.some((issue) => issue.code === "duplicate_options")).toBe(true);
    expect(brokenReport.issues.some((issue) => issue.code === "invalid_answer_key")).toBe(true);
  });
});

describe("Content Factory modes and gates", () => {
  test("greenfield accepts a topic with no initial questions and births slots inside concepts", () => {
    const job: ContentFactoryJob = {
      version: "1.0",
      oppositionCode: "celador-sms",
      topicNumber: 8,
      topicTitle: "Tema 8",
      mode: "greenfield",
      codePrefix: "CEL-T08",
      source,
    };
    expect(validateContentFactoryJob(job).valid).toBe(true);

    const unit: ProposedStudyUnit = {
      code: stableUnitCode(job.codePrefix, 1),
      title: "Unidad",
      position: 1,
      sourceRefs: source,
    };
    const concepts = [{ ...concept(stableConceptCode(job.codePrefix, 1), unit.code), title: "Concepto greenfield" }];
    const coverage = calculateFactoryCoverage({ questions: [], concepts, assignments: [] });
    expect(coverage.totalMissingQuestions).toBe(4);

    const plan = planDirectedQuestionGeneration({
      coverage,
      codePrefix: job.codePrefix,
      usedQuestionCodes: [],
      preferredDimensionsByConcept: { [concepts[0].code]: ["rule", "exception", "contrast", "mini_case"] },
    });
    expect(plan).toHaveLength(4);
    expect(plan.map((slot) => slot.questionCode)).toEqual([
      "CEL-T08-0001",
      "CEL-T08-0002",
      "CEL-T08-0003",
      "CEL-T08-0004",
    ]);
    expect(plan.every((slot) => slot.conceptCode === concepts[0].code)).toBe(true);
    expect(plan.map((slot) => slot.dimension)).toEqual(["rule", "exception", "contrast", "mini_case"]);
    expect(generationAllowed({
      conceptMap: { status: "approved" },
      editorialQuality: { status: "pending" },
    })).toBe(true);
  });

  test("existing-bank structural proposal stays explicitly preliminary", () => {
    const job: ContentFactoryJob = {
      version: "1.0",
      oppositionCode: "auxiliar-administrativo-sms",
      topicNumber: 1,
      mode: "existing_bank",
      codePrefix: "SMS-T01",
      source,
      existingQuestions: [
        { ...question("SMS-T01-0001"), apartado: "A", subapartado: "A.1", conceptLabel: "Regla uno" },
        { ...question("SMS-T01-0002"), apartado: "A", subapartado: "A.1", conceptLabel: "Regla dos" },
      ],
    };
    const proposed = proposePreliminaryConceptMap(job);
    expect(proposed.units).toHaveLength(1);
    expect(proposed.concepts).toHaveLength(2);
    expect(proposed.assignments).toHaveLength(2);
    expect(proposed.clusters).toHaveLength(1);
    expect(proposed.concepts.every((entry) => entry.observations?.includes("No canónico hasta aprobación de Gate 1."))).toBe(true);
  });

  test("Gate 1 report includes exact governance review metrics", () => {
    const job: ContentFactoryJob = {
      version: "1.0",
      oppositionCode: "auxiliar-administrativo-sms",
      topicNumber: 1,
      mode: "existing_bank",
      codePrefix: "SMS-T01",
      source,
      existingQuestions: [question("SMS-T01-0001")],
    };
    const units: ProposedStudyUnit[] = [{ code: "SMS-T01-U01", title: "Unidad", position: 1, sourceRefs: source }];
    const concepts = [concept("SMS-T01-C01")];
    const report = buildGate1Report({
      job,
      units,
      concepts,
      assignments: [{ questionCode: "SMS-T01-0001", primaryConceptCode: "SMS-T01-C01" }],
    });
    expect(report.summary.totalQuestions).toBe(1);
    expect(report.summary.concepts).toBe(1);
    expect(report.summary.questionsNeeded).toBe(3);
    expect(report.concepts[0].primaryCount).toBe(1);
    expect(report.concepts[0].coverageGap).toBe(true);
  });
});
