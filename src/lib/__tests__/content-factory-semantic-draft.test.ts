// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import {
  benchmarkSemanticDraftAgainstGolden,
  buildSemanticTopicDraft,
  runContentFactoryTopicFromSemanticDraft,
  type BuildSemanticTopicDraftInput,
  type SemanticSourceSpan,
} from "../content-factory";
import { topic18Gate2Package } from "../content-factory/consumers/topic-18-v4-content";
import {
  topic19CanonicalAssignments,
  topic19Concepts,
  topic19Units,
} from "../content-factory/consumers/topic-19-fast-pipeline";
import type { ContentFactoryJob, FactoryQuestionMetadata } from "../content-factory/types";
import type { V4StudyContentPackage } from "../v4-content-package";
import { topic13EstatutoMarcoMaterializedPackage } from "../v4-pilots/topic-13-estatuto-marco-materialized";

const CANONICAL = "Temario_new.pdf";

function job(input: {
  topic: number;
  prefix: string;
  questions?: FactoryQuestionMetadata[];
  mode?: "existing_bank" | "greenfield";
}): ContentFactoryJob {
  return {
    version: "1.0",
    oppositionCode: "auxiliar-administrativo-sms",
    topicNumber: input.topic,
    mode: input.mode ?? "existing_bank",
    codePrefix: input.prefix,
    source: [{ label: CANONICAL, reference: `${CANONICAL}, Tema ${input.topic}.` }],
    sourcePolicy: { canonicalOnly: true, document: CANONICAL, externalVerificationAllowed: false },
    existingQuestions: input.questions ?? [],
  };
}

function canonicalRef(unit: V4StudyContentPackage["units"][number]) {
  return unit.sourceRefs.find((ref) => `${ref.label} ${ref.reference}`.includes(CANONICAL)) ?? unit.sourceRefs[0];
}

function sourceSpansFromGolden(pkg: Pick<V4StudyContentPackage, "units">): SemanticSourceSpan[] {
  return pkg.units.map((unit) => {
    const ref = canonicalRef(unit as V4StudyContentPackage["units"][number]);
    return {
      id: `source:${unit.code}`,
      document: CANONICAL,
      reference: ref?.reference ?? `${CANONICAL}, ${unit.title}`,
      heading: unit.title,
      sectionPath: [unit.title],
      text: "",
      pageStart: ref?.pageStart ?? null,
      pageEnd: ref?.pageEnd ?? null,
    };
  });
}

function questionsFromGolden(pkg: Pick<V4StudyContentPackage, "units" | "concepts" | "questionMappings">): FactoryQuestionMetadata[] {
  const concepts = new Map(pkg.concepts.map((concept) => [concept.code, concept]));
  const units = new Map(pkg.units.map((unit) => [unit.code, unit]));
  return pkg.questionMappings.map((mapping) => {
    const concept = concepts.get(mapping.primaryConceptCode)!;
    const unit = units.get(concept.unitCode)!;
    const ref = canonicalRef(unit as V4StudyContentPackage["units"][number]);
    return {
      code: mapping.questionCode,
      active: true,
      apartado: unit.title,
      subapartado: concept.title,
      conceptLabel: concept.title,
      learningObjective: concept.description,
      documentReference: CANONICAL,
      sourceReference: ref?.reference ?? `${CANONICAL}, ${unit.title}`,
      pageStart: ref?.pageStart ?? null,
      pageEnd: ref?.pageEnd ?? null,
    };
  });
}

function replay(pkg: Pick<V4StudyContentPackage, "oppositionCode" | "topicNumber" | "units" | "concepts" | "questionMappings">, prefix: string) {
  const questions = questionsFromGolden(pkg);
  const semantic = buildSemanticTopicDraft({
    job: job({ topic: pkg.topicNumber, prefix, questions }),
    canonicalSource: sourceSpansFromGolden(pkg),
  });
  return { semantic, benchmark: benchmarkSemanticDraftAgainstGolden(semantic, pkg) };
}

function topic19Golden() {
  const units: V4StudyContentPackage["units"] = topic19Units.map((unit) => ({
    code: unit.code,
    title: unit.title,
    position: unit.position,
    estimatedMinutes: 5,
    studySummary: "Golden structural replay only.",
    examKeys: [],
    confusions: [],
    traps: [],
    mnemonics: [],
    sourceRefs: unit.sourceRefs,
  }));
  const concepts: V4StudyContentPackage["concepts"] = topic19Concepts.map((concept) => ({
    code: concept.code,
    unitCode: concept.unitCode,
    title: concept.title,
    description: concept.description,
    position: concept.position,
  }));
  return {
    oppositionCode: "auxiliar-administrativo-sms",
    topicNumber: 19,
    units,
    concepts,
    questionMappings: topic19CanonicalAssignments.map((mapping) => ({
      questionCode: mapping.questionCode,
      primaryConceptCode: mapping.primaryConceptCode,
      secondaryConceptCodes: mapping.secondaryConceptCodes,
    })),
  };
}

describe("Content Factory Semantic Draft Builder", () => {
  test("clusters V2 + canonical spans into reusable units, concepts and primary mappings", () => {
    const questions: FactoryQuestionMetadata[] = [
      { code: "SYN-0001", active: true, apartado: "Inicio", subapartado: "Requisitos", conceptLabel: "Requisitos de inicio", learningObjective: "Identificar los requisitos de inicio", perspective: "requisitos", trapType: "concepto_proximo", documentReference: CANONICAL, sourceReference: `${CANONICAL}, art. 1, p. 10`, pageStart: 10, pageEnd: 10 },
      { code: "SYN-0002", active: true, apartado: "Inicio", subapartado: "Requisitos", conceptLabel: "Requisitos de inicio", learningObjective: "Identificar los requisitos de inicio", perspective: "mini_caso", trapType: "requisito", documentReference: CANONICAL, sourceReference: `${CANONICAL}, art. 1, p. 10`, pageStart: 10, pageEnd: 10 },
      { code: "SYN-0003", active: true, apartado: "Inicio", subapartado: "Efectos", conceptLabel: "Efectos del inicio", learningObjective: "Distinguir los efectos del inicio", perspective: "efecto", documentReference: CANONICAL, sourceReference: `${CANONICAL}, art. 2, p. 11`, pageStart: 11, pageEnd: 11 },
      { code: "SYN-0004", active: true, apartado: "Inicio", subapartado: "Efectos", conceptLabel: "Efectos del inicio", learningObjective: "Distinguir los efectos del inicio", perspective: "regla", documentReference: CANONICAL, sourceReference: `${CANONICAL}, art. 2, p. 11`, pageStart: 11, pageEnd: 11 },
    ];
    const source: SemanticSourceSpan[] = [
      { id: "s1", document: CANONICAL, reference: `${CANONICAL}, art. 1, p. 10`, heading: "Inicio", sectionPath: ["Inicio", "Requisitos"], article: "art. 1", text: "La solicitud debe contener los requisitos indicados. El plazo se computa desde su presentación.", pageStart: 10, pageEnd: 10 },
      { id: "s2", document: CANONICAL, reference: `${CANONICAL}, art. 2, p. 11`, heading: "Inicio", sectionPath: ["Inicio", "Efectos"], article: "art. 2", text: "La iniciación produce los efectos previstos en este apartado, salvo la excepción expresamente indicada.", pageStart: 11, pageEnd: 11 },
    ];
    const semantic = buildSemanticTopicDraft({ job: job({ topic: 99, prefix: "SYN", questions }), canonicalSource: source });

    expect(semantic.units).toHaveLength(1);
    expect(semantic.concepts).toHaveLength(2);
    expect(semantic.mappings).toHaveLength(4);
    expect(semantic.metrics.highConfidenceUnits).toBe(1);
    expect(semantic.metrics.highConfidenceConcepts).toBe(2);
    expect(semantic.metrics.automaticMappings).toBe(4);
    expect(semantic.metrics.blockers).toBe(0);
    expect(semantic.studyScaffolds).toHaveLength(2);
    expect(semantic.studyScaffolds.flatMap((scaffold) => scaffold.generationDimensions)).toContain("deadline");
    expect(semantic.studyScaffolds.flatMap((scaffold) => scaffold.generationDimensions)).toContain("exception");
  });

  test("quarantines explicit non-canonical V2 provenance instead of mapping it optimistically", () => {
    const questions: FactoryQuestionMetadata[] = [
      { code: "SYN-0001", active: true, apartado: "A", conceptLabel: "Regla A", documentReference: "otra-fuente.pdf", sourceReference: "otra-fuente.pdf, p. 1", pageStart: 1, pageEnd: 1 },
    ];
    const semantic = buildSemanticTopicDraft({
      job: job({ topic: 99, prefix: "SYN", questions }),
      canonicalSource: [{ id: "s1", document: CANONICAL, heading: "A", sectionPath: ["A"], text: "Contenido canónico.", pageStart: 1, pageEnd: 1 }],
    });
    expect(semantic.mappings).toEqual([]);
    expect(semantic.semanticExceptions).toEqual([
      expect.objectContaining({ type: "source_review_required", blocker: true, confidence: "low", subject: { kind: "question", id: "SYN-0001" } }),
    ]);
  });

  test("greenfield derives source-structured seeds and lowers concept confidence without bank evidence", () => {
    const semantic = buildSemanticTopicDraft({
      job: job({ topic: 77, prefix: "GREEN", mode: "greenfield" }),
      canonicalSource: [
        { id: "g1", document: CANONICAL, heading: "Bloque A", sectionPath: ["Bloque A"], article: "art. 1", text: "Regla uno.", pageStart: 1, pageEnd: 1 },
        { id: "g2", document: CANONICAL, heading: "Bloque A", sectionPath: ["Bloque A"], article: "art. 2", text: "Regla dos.", pageStart: 2, pageEnd: 2 },
      ],
    });
    expect(semantic.units).toHaveLength(1);
    expect(semantic.concepts).toHaveLength(2);
    expect(semantic.mappings).toEqual([]);
    expect(semantic.conceptProposals.every((proposal) => proposal.meta.confidence === "medium")).toBe(true);
    expect(semantic.metrics.automaticMappings).toBe(0);
  });

  test("feeds the structural provider directly into Fast Pipeline without caller-side map rewriting", () => {
    const questions: FactoryQuestionMetadata[] = Array.from({ length: 4 }, (_, index) => ({
      code: `SYN-${String(index + 1).padStart(4, "0")}`,
      active: true,
      apartado: "Unidad",
      subapartado: "Regla",
      conceptLabel: "Regla común",
      learningObjective: "Distinguir la regla común",
      documentReference: CANONICAL,
      sourceReference: `${CANONICAL}, art. 1, p. 10`,
      pageStart: 10,
      pageEnd: 10,
    }));
    const semanticJob = job({ topic: 99, prefix: "SYN", questions });
    const semantic = buildSemanticTopicDraft({
      job: semanticJob,
      canonicalSource: [{ id: "s1", document: CANONICAL, heading: "Unidad", sectionPath: ["Unidad", "Regla"], article: "art. 1", text: "La regla común se aplica en los términos indicados.", pageStart: 10, pageEnd: 10 }],
    });
    const run = runContentFactoryTopicFromSemanticDraft({
      job: semanticJob,
      semanticDraft: semantic,
      operations: {
        buildStudyContent: ({ structuralDraft }) => ({
          units: structuralDraft.units.map((unit) => ({ code: unit.code, title: unit.title, position: unit.position, estimatedMinutes: 5, studySummary: "Contenido canónico de prueba.", examKeys: [], confusions: [], traps: [], mnemonics: [], sourceRefs: unit.sourceRefs })),
          concepts: structuralDraft.concepts,
          flashcards: structuralDraft.concepts.flatMap((concept, index) => [
            { code: `SYN-F${index * 2 + 1}`, conceptCode: concept.code, type: "direct" as const, prompt: "Regla", answer: "Contenido canónico de prueba.", position: 1, sourceRefs: concept.sourceRefs },
            { code: `SYN-F${index * 2 + 2}`, conceptCode: concept.code, type: "contrast" as const, prompt: "Contraste", answer: "Contenido canónico de prueba.", position: 2, sourceRefs: concept.sourceRefs },
          ]),
        }),
      },
    });
    expect(run.draft.units.map((unit) => unit.code)).toEqual(semantic.units.map((unit) => unit.code));
    expect(run.draft.concepts.map((concept) => concept.code)).toEqual(semantic.concepts.map((concept) => concept.code));
    expect(run.draft.assignments).toEqual(semantic.mappings);
    expect(run.finalCoverage?.totalActionableMissingQuestions).toBe(0);
  });
});

describe("Semantic Accelerator retrospective goldens", () => {
  test("reconstructs Topic 13 semantic structure without changing the golden fixture", () => {
    const { semantic, benchmark } = replay(topic13EstatutoMarcoMaterializedPackage, "SMS-T13");
    expect(benchmark.goldenUnits).toBe(18);
    expect(benchmark.goldenConcepts).toBe(34);
    expect(benchmark.goldenMappings).toBe(144);
    expect(benchmark.unitTitleMatches).toBe(18);
    expect(benchmark.conceptTitleMatches).toBe(34);
    expect(benchmark.semanticTitleMappingMatches).toBe(144);
    expect(semantic.metrics.highConfidenceConcepts).toBe(34);
  });

  test("reconstructs Topic 18 semantic structure while leaving the approved source-limited golden untouched", () => {
    const { semantic, benchmark } = replay(topic18Gate2Package, "SMS-T18");
    expect(benchmark.goldenUnits).toBe(16);
    expect(benchmark.goldenConcepts).toBe(44);
    expect(benchmark.goldenMappings).toBe(260);
    expect(benchmark.unitTitleMatches).toBe(16);
    expect(benchmark.conceptTitleMatches).toBe(44);
    expect(benchmark.semanticTitleMappingMatches).toBe(260);
    expect(topic18Gate2Package.concepts.find((concept) => concept.code === "SMS-T18-C29")?.sourceCapacity).toEqual(expect.objectContaining({ status: "source_limited", sourceSupportedCeiling: 1 }));
    expect(semantic.concepts).toHaveLength(44);
  });

  test("reconstructs the Topic 19 approved 15/40/221 provider projection", () => {
    const golden = topic19Golden();
    const { semantic, benchmark } = replay(golden, "SMS-T19");
    expect(benchmark.goldenUnits).toBe(15);
    expect(benchmark.goldenConcepts).toBe(40);
    expect(benchmark.goldenMappings).toBe(221);
    expect(benchmark.unitTitleMatches).toBe(15);
    expect(benchmark.conceptTitleMatches).toBe(40);
    expect(benchmark.semanticTitleMappingMatches).toBe(221);
    expect(semantic.metrics.highConfidenceConcepts).toBe(40);
    expect(semantic.metrics.automaticMappings).toBe(221);
  });
});
