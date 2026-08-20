// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import type { V4StudyContentPackage } from "../v4-content-package";
import {
  runMasteryFamilyResolution,
  type ConceptFamilyResolutionOperationResult,
  type ConceptFamilyResolutionWorkPacket,
  type MasteryFamilySemanticOutput,
} from "../content-factory/mastery-family-resolution";
import type { SemanticSourceSpan } from "../content-factory/semantic-draft";
import type { ContentFactoryJob, FactoryQuestionMetadata } from "../content-factory/types";

const DOCUMENT = "Temario_new.pdf";

function source(article: number, page: number, text: string): SemanticSourceSpan {
  return {
    id: `SRC-${article}`,
    document: DOCUMENT,
    reference: `${DOCUMENT} · Artículo ${article} · p. ${page}`,
    article: `Artículo ${article}`,
    heading: `Artículo ${article}. Regla ${article}`,
    sectionPath: ["Unidad sintética", "Sección sintética"],
    text,
    pageStart: page,
    pageEnd: page,
  };
}

function question(input: {
  code: string;
  article?: number;
  page?: number;
  label: string;
  objective: string;
  perspective: string;
  trap?: string;
}): FactoryQuestionMetadata {
  const article = input.article ?? 1;
  const page = input.page ?? 10;
  return {
    code: input.code,
    active: true,
    stem: `${input.code}: pregunta sintética`,
    apartado: "Unidad sintética",
    subapartado: "Mismo subtopic",
    conceptLabel: input.label,
    learningObjective: input.objective,
    perspective: input.perspective,
    trapType: input.trap ?? "ninguna",
    pedagogicalLevel: "consolidacion",
    documentReference: DOCUMENT,
    sourceReference: `${DOCUMENT}, artículo ${article}`,
    pageStart: page,
    pageEnd: page,
  };
}

function job(questions: FactoryQuestionMetadata[]): ContentFactoryJob {
  return {
    version: "1.0",
    oppositionCode: "synthetic",
    topicNumber: 997,
    topicTitle: "Tema sintético",
    mode: "existing_bank",
    codePrefix: "SYN-FAM",
    coverageThreshold: 4,
    source: [{ label: DOCUMENT, reference: `${DOCUMENT}, synthetic` }],
    sourcePolicy: { canonicalOnly: true, document: DOCUMENT, externalVerificationAllowed: false },
    existingQuestions: questions,
  };
}

function family(packet: ConceptFamilyResolutionWorkPacket, input: {
  id: string;
  title: string;
  statement: string;
  codes: string[];
  facets?: string[];
  refs?: number[];
}): MasteryFamilySemanticOutput {
  const selectedRefs = input.refs?.map((index) => packet.sourceScope.sourceRefs[index]).filter(Boolean) ?? packet.sourceScope.sourceRefs;
  return {
    provisionalFamilyId: input.id,
    title: input.title,
    masteryStatement: input.statement,
    questionCodes: input.codes,
    sourceRefs: selectedRefs,
    includedFacets: input.facets ?? ["definición", "requisito", "excepción", "caso práctico"],
    excludedNearbyFamilyReason: "Las reglas cercanas requieren contenido canónico adicional distinto.",
    confidence: "high",
    rationale: "El texto canónico muestra un único núcleo enseñable para estas facetas.",
  };
}

function run(questions: FactoryQuestionMetadata[], spans: SemanticSourceSpan[], resolvePacket: (packet: ConceptFamilyResolutionWorkPacket) => ConceptFamilyResolutionOperationResult) {
  return runMasteryFamilyResolution({
    job: job(questions),
    canonicalSource: spans,
    existingQuestions: questions,
    resolvePacket,
  });
}

describe("Content Factory.7 canonical mastery family resolution", () => {
  test("CASO A: four different local labels/objectives can resolve to one mastery family", () => {
    const questions = [
      question({ code: "Q-DEF", label: "Definición local", objective: "Reconocer definición", perspective: "definicion" }),
      question({ code: "Q-REQ", label: "Requisito local", objective: "Identificar requisito", perspective: "requisitos" }),
      question({ code: "Q-EXC", label: "Excepción local", objective: "Aplicar excepción", perspective: "excepcion" }),
      question({ code: "Q-CASE", label: "Caso local", objective: "Resolver caso", perspective: "caso_practico" }),
    ];
    const result = run(questions, [source(1, 10, "Una misma regla define el supuesto, fija un requisito y su excepción, aplicables a los casos previstos.")], (packet) => ({
      families: [family(packet, { id: "F-1", title: "Regla única", statement: "Dominar la regla, su requisito y su excepción.", codes: questions.map((item) => item.code) })],
    }));
    expect(result.operationCount).toBe(1);
    expect(result.validation?.valid).toBe(true);
    expect(result.validation?.families).toHaveLength(1);
    expect(result.validation?.families[0].questionCodes).toHaveLength(4);
  });

  test("CASO B: two materially distinct rules in the same article remain two families", () => {
    const questions = [
      question({ code: "Q-A", label: "Regla A", objective: "Aprender A", perspective: "definicion" }),
      question({ code: "Q-B", label: "Regla B", objective: "Aprender B", perspective: "efectos" }),
    ];
    const result = run(questions, [source(1, 10, "El artículo contiene una regla A sobre acceso y una regla B distinta sobre conservación.")], (packet) => ({
      families: [
        family(packet, { id: "F-A", title: "Acceso", statement: "Dominar la regla A de acceso.", codes: ["Q-A"] }),
        family(packet, { id: "F-B", title: "Conservación", statement: "Dominar la regla B de conservación.", codes: ["Q-B"] }),
      ],
    }));
    expect(result.validation?.valid).toBe(true);
    expect(result.validation?.families).toHaveLength(2);
  });

  test("CASO C: adjacent articles may form one family when the semantic operation justifies one teachable nucleus", () => {
    const questions = [
      question({ code: "Q-1", article: 1, page: 10, label: "Inicio", objective: "Comprender inicio", perspective: "definicion" }),
      question({ code: "Q-2", article: 2, page: 11, label: "Efecto", objective: "Comprender efecto", perspective: "efectos" }),
    ];
    const result = run(questions, [
      source(1, 10, "El artículo 1 establece el presupuesto de una regla continuada."),
      source(2, 11, "El artículo 2 completa esa misma regla indicando su efecto necesario."),
    ], (packet) => ({
      families: [family(packet, { id: "F-CROSS", title: "Regla continuada", statement: "Dominar conjuntamente el presupuesto y el efecto de la misma regla.", codes: ["Q-1", "Q-2"], refs: [0, 1] })],
    }));
    expect(result.validation?.valid).toBe(true);
    expect(result.validation?.families[0].questionCodes).toEqual(["Q-1", "Q-2"]);
    expect(result.validation?.families[0].sourceRefs).toHaveLength(2);
  });

  test("CASO D: same subtopic and span do not force materially distinct knowledge into one family", () => {
    const questions = [
      question({ code: "Q-X", label: "Plazo", objective: "Calcular un plazo", perspective: "plazo" }),
      question({ code: "Q-Y", label: "Órgano competente", objective: "Identificar competencia", perspective: "competencia" }),
    ];
    const result = run(questions, [source(1, 10, "La norma contiene tanto un plazo como una competencia independiente, que exigen conocimientos distintos.")], (packet) => ({
      families: [
        family(packet, { id: "F-X", title: "Plazo", statement: "Dominar el plazo específico.", codes: ["Q-X"] }),
        family(packet, { id: "F-Y", title: "Competencia", statement: "Dominar la atribución competencial independiente.", codes: ["Q-Y"] }),
      ],
    }));
    expect(result.validation?.families).toHaveLength(2);
    expect(result.validation?.valid).toBe(true);
  });

  test("CASO E: perspective changes do not force a mastery split", () => {
    const questions = [
      question({ code: "Q-P1", label: "Faceta literal", objective: "Reconocer literalidad", perspective: "reconocimiento_directo" }),
      question({ code: "Q-P2", label: "Faceta práctica", objective: "Aplicar la misma regla", perspective: "caso_practico" }),
      question({ code: "Q-P3", label: "Faceta contraste", objective: "Contrastar la misma regla", perspective: "comparacion" }),
    ];
    const result = run(questions, [source(1, 10, "La misma regla puede preguntarse de forma literal, práctica o por contraste sin cambiar su contenido.")], (packet) => ({
      families: [family(packet, { id: "F-P", title: "Misma regla", statement: "Dominar una regla desde distintas perspectivas de examen.", codes: questions.map((item) => item.code), facets: ["literal", "caso práctico", "contraste"] })],
    }));
    expect(result.validation?.families).toHaveLength(1);
    expect(result.validation?.families[0].includedFacets).toEqual(["literal", "caso práctico", "contraste"]);
  });

  test("material overmerge and undermerge guards require concrete family/question/proposal evidence", () => {
    const questions = [
      question({ code: "Q-1", label: "A", objective: "A", perspective: "definicion" }),
      question({ code: "Q-2", label: "B", objective: "B", perspective: "requisitos" }),
      question({ code: "Q-3", label: "C", objective: "C", perspective: "caso_practico" }),
    ];
    const result = run(questions, [source(1, 10, "Tres facetas cercanas permiten revisar fronteras con propuestas concretas.")], (packet) => ({
      families: [
        family(packet, { id: "F-12", title: "Familia 12", statement: "Núcleo 12.", codes: ["Q-1", "Q-2"] }),
        family(packet, { id: "F-3", title: "Familia 3", statement: "Núcleo 3.", codes: ["Q-3"] }),
      ],
      guards: [
        { type: "overmerge", familyIds: ["F-12"], questionCodes: ["Q-1", "Q-2"], explanation: "Q-1 y Q-2 requieren dos reglas materiales.", proposal: "Split F-12 en Q-1 y Q-2." },
        { type: "undermerge", familyIds: ["F-12", "F-3"], questionCodes: ["Q-1", "Q-2", "Q-3"], explanation: "Las familias comparten realmente un único núcleo.", proposal: "Merge F-12 y F-3." },
      ],
    }));
    expect(result.validation?.valid).toBe(true);
    expect(result.validation?.overmergeGuards).toHaveLength(1);
    expect(result.validation?.undermergeGuards).toHaveLength(1);
    expect(result.semanticDraft?.semanticExceptions).toHaveLength(2);
  });

  test("deterministic validation rejects lost questions and multiple primary assignment", () => {
    const questions = [
      question({ code: "Q-1", label: "A", objective: "A", perspective: "definicion" }),
      question({ code: "Q-2", label: "B", objective: "B", perspective: "requisitos" }),
    ];
    const result = run(questions, [source(1, 10, "Dos preguntas deben tener exactamente un primary cada una.")], (packet) => ({
      families: [
        family(packet, { id: "F-1", title: "Uno", statement: "Regla uno.", codes: ["Q-1"] }),
        family(packet, { id: "F-2", title: "Dos", statement: "Regla dos.", codes: ["Q-1"] }),
      ],
    }));
    expect(result.validation?.valid).toBe(false);
    expect(result.validation?.multiplePrimaryCount).toBe(1);
    expect(result.validation?.lostQuestionCount).toBe(1);
    expect(result.semanticDraft).toBeNull();
  });

  test("approved structures replay without semantic reinterpretation", () => {
    const approved: V4StudyContentPackage = {
      version: "4.0",
      oppositionCode: "approved",
      topicNumber: 20,
      units: [],
      concepts: [],
      questionMappings: [],
      flashcards: [],
    };
    let calls = 0;
    const result = runMasteryFamilyResolution({
      job: job([]),
      canonicalSource: [],
      approvedStructure: approved,
      resolvePacket: () => {
        calls += 1;
        return { families: [] };
      },
    });
    expect(result.mode).toBe("approved_replay");
    expect(result.operationCount).toBe(0);
    expect(calls).toBe(0);
    expect(result.approvedStructure).toBe(approved);
  });
});
