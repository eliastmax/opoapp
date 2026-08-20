// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import {
  runContentFactoryTopic,
  type ContentFactoryJob,
  type FactoryFastPipelineOperations,
  type FactoryQuestionGenerationSlot,
  type FactoryStudyContent,
  type ProposedConcept,
  type ProposedStudyUnit,
} from "../content-factory";
import type { V4StudyContentPackage } from "../v4-content-package";
import { topic13EstatutoMarcoMaterializedPackage } from "../v4-pilots/topic-13-estatuto-marco-materialized";
import { topic18Gate2Package } from "../content-factory/consumers/topic-18-v4-content";

const canonicalRef = [{
  label: "Temario_new.pdf",
  reference: "Temario_new.pdf, p. 1",
  pageStart: 1,
  pageEnd: 1,
}];

function closedJob(pkg: V4StudyContentPackage, codePrefix: string): ContentFactoryJob {
  return {
    version: "1.0",
    oppositionCode: pkg.oppositionCode,
    topicNumber: pkg.topicNumber,
    mode: "existing_bank",
    codePrefix,
    sourceRevision: pkg.sourceRevision,
    source: canonicalRef,
    sourcePolicy: {
      canonicalOnly: true,
      document: "Temario_new.pdf",
      externalVerificationAllowed: false,
    },
    existingQuestions: pkg.questionMappings.map((mapping) => ({
      code: mapping.questionCode,
      active: true,
    })),
  };
}

function v2Question(slot: FactoryQuestionGenerationSlot, topicNumber: number, answer: "A" | "B" | "C" | "D") {
  return {
    conceptCode: slot.conceptCode,
    dimensions: [slot.dimension],
    v2: {
      codigo: slot.questionCode,
      materia: "Fixture canonical",
      numero_tema: topicNumber,
      tema: `Tema ${topicNumber}`,
      apartado: "Apartado fixture",
      subapartado: "Subapartado fixture",
      concepto: slot.conceptCode,
      objetivo_aprendizaje: `Distinguir ${slot.dimension} en ${slot.conceptCode}`,
      perspectiva: "afirmacion_correcta",
      nivel_pedagogico: "consolidacion",
      dificultad_conceptual: "medio",
      dificultad_examen: "medio",
      tipo_trampa: "concepto_proximo",
      pregunta: `¿Qué regla corresponde a ${slot.conceptCode} en la dimensión ${slot.dimension} para ${slot.questionCode}?`,
      opcion_a: `Alternativa A específica de ${slot.questionCode}`,
      opcion_b: `Alternativa B específica de ${slot.questionCode}`,
      opcion_c: `Alternativa C específica de ${slot.questionCode}`,
      opcion_d: `Alternativa D específica de ${slot.questionCode}`,
      respuesta_correcta: answer,
      explicacion: `La respuesta ${answer} es la única que corresponde al fixture canónico de ${slot.conceptCode}.`,
      documento_referencia: "Temario_new.pdf",
      pagina_inicio: 1,
      pagina_fin: 1,
      referencia_fuente: "Temario_new.pdf, p. 1.",
      frecuencia_historica: "no_determinada",
    },
  };
}

function syntheticUnit(code: string): ProposedStudyUnit {
  return {
    code,
    title: `Unidad ${code}`,
    position: 1,
    sourceRefs: canonicalRef,
  };
}

function syntheticConcept(code: string, unitCode: string, position: number): ProposedConcept {
  return {
    code,
    unitCode,
    title: `Concepto ${code}`,
    description: `Descripción canónica ${code}`,
    position,
    sourceRefs: canonicalRef,
    confidence: "high",
  };
}

function syntheticContent(units: ProposedStudyUnit[], concepts: ProposedConcept[]): FactoryStudyContent {
  return {
    units: units.map((unit) => ({
      code: unit.code,
      title: unit.title,
      position: unit.position,
      estimatedMinutes: 5,
      studySummary: `Resumen canónico ${unit.code}`,
      examKeys: ["Clave canónica"],
      confusions: ["Confusión vecina"],
      traps: ["Trampa próxima"],
      mnemonics: [],
      sourceRefs: canonicalRef,
    })),
    concepts,
    flashcards: concepts.map((concept, index) => ({
      code: `SYN-F${String(index + 1).padStart(2, "0")}`,
      conceptCode: concept.code,
      type: "direct" as const,
      prompt: `Pregunta de tarjeta ${concept.code}`,
      answer: `Respuesta de tarjeta ${concept.code}`,
      position: 1,
      sourceRefs: canonicalRef,
    })),
  };
}

describe("CONTENT-FACTORY.3 Fast Pipeline", () => {
  test("recognizes closed Topic 13 without false exceptions", () => {
    const pkg = topic13EstatutoMarcoMaterializedPackage;
    const run = runContentFactoryTopic({
      job: closedJob(pkg, "SMS-T13"),
      gates: {
        conceptMap: { status: "approved" },
        editorialQuality: { status: "approved" },
      },
      existingV4Content: pkg,
      approvedAnchors: pkg,
    });

    expect(run.draft.content?.units).toHaveLength(18);
    expect(run.draft.concepts).toHaveLength(34);
    expect(run.draft.assignments).toHaveLength(144);
    expect(run.draft.content?.flashcards).toHaveLength(68);
    expect(run.finalCoverage?.factoryConceptCoverage.filter((row) => row.status === "ready")).toHaveLength(34);
    expect(run.finalCoverage?.factoryConceptCoverage.filter((row) => row.status === "source_limited")).toHaveLength(0);
    expect(run.finalCoverage?.totalActionableMissingQuestions).toBe(0);
    expect(run.generationSlots).toEqual([]);
    expect(run.exceptionQueue).toEqual([]);
    expect(run.governancePacket.summary.highConfidenceConceptsWithoutSpecificReview).toBe(34);
    expect(run.readiness.importReady).toBe(true);
  });

  test("recognizes closed Topic 18 including its approved source ceiling", () => {
    const pkg = topic18Gate2Package;
    const run = runContentFactoryTopic({
      job: closedJob(pkg, "SMS-T18"),
      gates: {
        conceptMap: { status: "approved" },
        editorialQuality: { status: "approved" },
      },
      existingV4Content: pkg,
      approvedAnchors: pkg,
    });

    expect(run.draft.content?.units).toHaveLength(16);
    expect(run.draft.concepts).toHaveLength(44);
    expect(run.draft.assignments).toHaveLength(260);
    expect(run.draft.content?.flashcards).toHaveLength(93);
    expect(run.finalCoverage?.factoryConceptCoverage.filter((row) => row.status === "ready")).toHaveLength(43);
    expect(run.finalCoverage?.factoryConceptCoverage.filter((row) => row.status === "source_limited")).toEqual([
      expect.objectContaining({
        conceptId: "SMS-T18-C29",
        primaryQuestionCount: 1,
        sourceSupportedCeiling: 1,
        blockedAdditionalQuestions: 3,
      }),
    ]);
    expect(run.finalCoverage?.totalActionableMissingQuestions).toBe(0);
    expect(run.generationSlots.map((slot) => slot.questionCode)).not.toContain("SMS-T18-0245");
    expect(run.generationSlots.map((slot) => slot.questionCode)).not.toContain("SMS-T18-0246");
    expect(run.generationSlots.map((slot) => slot.questionCode)).not.toContain("SMS-T18-0247");
    expect(run.draft.assignments.find((mapping) => mapping.questionCode === "SMS-T18-0239")?.primaryConceptCode).toBe("SMS-T18-C30");
    expect(run.draft.assignments.filter((mapping) => mapping.primaryConceptCode === "SMS-T18-C29").map((mapping) => mapping.questionCode)).toEqual(["SMS-T18-0199"]);
    expect(run.exceptionQueue).toEqual([]);
    expect(run.readiness.importReady).toBe(true);
  });

  test("greenfield RUN 1 builds a complete provisional draft before human approval", () => {
    const unit = syntheticUnit("GF-U01");
    const concept = syntheticConcept("GF-C01", unit.code, 1);
    let hardened = false;
    const operations: FactoryFastPipelineOperations = {
      buildStructuralDraft: () => ({ units: [unit], concepts: [concept], assignments: [] }),
      buildStudyContent: ({ structuralDraft }) => syntheticContent(structuralDraft.units, structuralDraft.concepts),
      generateQuestions: ({ slots }) => slots.map((slot, index) =>
        v2Question(slot, 99, (["A", "B", "C", "D"] as const)[index % 4]),
      ),
      hardenQuestions: ({ candidates }) => {
        hardened = true;
        return candidates;
      },
    };
    const job: ContentFactoryJob = {
      version: "1.0",
      oppositionCode: "greenfield-fixture",
      topicNumber: 99,
      mode: "greenfield",
      codePrefix: "GF",
      sourceRevision: "Temario_new.pdf fixture",
      source: canonicalRef,
      sourcePolicy: { canonicalOnly: true, document: "Temario_new.pdf", externalVerificationAllowed: false },
    };

    const run1 = runContentFactoryTopic({ job, operations });
    expect(hardened).toBe(true);
    expect(run1.draft.units).toHaveLength(1);
    expect(run1.draft.concepts).toHaveLength(1);
    expect(run1.draft.generatedQuestions).toHaveLength(4);
    expect(run1.draft.content?.flashcards).toHaveLength(1);
    expect(run1.finalCoverage?.factoryConceptCoverage[0]).toEqual(expect.objectContaining({ status: "ready", primaryQuestionCount: 4 }));
    expect(run1.portable?.v2Questions).toHaveLength(4);
    expect(run1.portable?.v4Package.questionMappings).toHaveLength(4);
    expect(run1.questionQa?.valid).toBe(true);
    expect(run1.exceptionQueue).toEqual([]);
    expect(run1.readiness.state).toBe("governance_required");
    expect(run1.readiness.blockers).toContain("gate:conceptMap:pending");
    expect(run1.readiness.blockers).toContain("gate:editorialQuality:pending");

    const run2 = runContentFactoryTopic({
      job,
      operations,
      previousRun: run1,
      decisions: {
        gates: [
          { gate: "conceptMap", status: "approved" },
          { gate: "editorialQuality", status: "approved" },
        ],
      },
    });
    expect(run2.draft.generatedQuestions.map((candidate) => candidate.v2.codigo)).toEqual(
      run1.draft.generatedQuestions.map((candidate) => candidate.v2.codigo),
    );
    expect(run2.regeneration?.affectedConceptCodes).toEqual([]);
    expect(run2.readiness.importReady).toBe(true);
  });

  test("RUN 2 applies a mapping decision and regenerates only affected coverage/generation", () => {
    const unit = syntheticUnit("SYN-U01");
    const concepts = [
      syntheticConcept("SYN-C01", unit.code, 1),
      syntheticConcept("SYN-C02", unit.code, 2),
      syntheticConcept("SYN-C03", unit.code, 3),
    ];
    const codes = Array.from({ length: 11 }, (_, index) => `SYN-Q${String(index + 1).padStart(2, "0")}`);
    const assignments = [
      ...codes.slice(0, 4).map((questionCode, index) => ({
        questionCode,
        primaryConceptCode: "SYN-C01",
        confidence: index === 3 ? "medium" as const : "high" as const,
        rationale: index === 3 ? "Q04 is hybrid between C01 and C02; Factory recommends C01 provisionally." : "Clear mapping.",
        ...(index === 3 ? { secondaryConceptCodes: ["SYN-C02"] } : {}),
      })),
      ...codes.slice(4, 7).map((questionCode) => ({ questionCode, primaryConceptCode: "SYN-C02", confidence: "high" as const })),
      ...codes.slice(7, 11).map((questionCode) => ({ questionCode, primaryConceptCode: "SYN-C03", confidence: "high" as const })),
    ];
    const job: ContentFactoryJob = {
      version: "1.0",
      oppositionCode: "synthetic-existing",
      topicNumber: 98,
      mode: "existing_bank",
      codePrefix: "SYN-Q",
      sourceRevision: "Temario_new.pdf fixture",
      source: canonicalRef,
      sourcePolicy: { canonicalOnly: true, document: "Temario_new.pdf", externalVerificationAllowed: false },
      existingQuestions: codes.map((code) => ({ code, active: true })),
    };
    const operations: FactoryFastPipelineOperations = {
      generateQuestions: ({ slots }) => slots.map((slot) => v2Question(slot, 98, "A")),
      hardenQuestions: ({ candidates }) => candidates,
    };
    const run1 = runContentFactoryTopic({
      job,
      gates: {
        conceptMap: { status: "pending" },
        editorialQuality: { status: "pending" },
      },
      draft: {
        units: [unit],
        concepts,
        assignments,
        content: syntheticContent([unit], concepts),
      },
      operations,
    });

    expect(run1.draft.generatedQuestions).toHaveLength(1);
    expect(run1.draft.generatedQuestions[0].conceptCode).toBe("SYN-C02");
    expect(run1.finalCoverage?.totalActionableMissingQuestions).toBe(0);
    const ambiguity = run1.exceptionQueue.find((exception) => exception.type === "mapping_ambiguity" && exception.subject.id === "SYN-Q04");
    expect(ambiguity).toBeDefined();
    expect(run1.governancePacket.exceptions).toEqual(run1.exceptionQueue);

    const run2 = runContentFactoryTopic({
      job,
      previousRun: run1,
      operations,
      decisions: {
        gates: [
          { gate: "conceptMap", status: "approved" },
          { gate: "editorialQuality", status: "approved" },
        ],
        exceptions: [{
          exceptionId: ambiguity!.id,
          resolution: "patch",
          optionalPatch: { primaryConceptCode: "SYN-C02" },
        }],
      },
    });

    expect(run2.draft.assignments.find((mapping) => mapping.questionCode === "SYN-Q04")?.primaryConceptCode).toBe("SYN-C02");
    expect(run2.regeneration?.affectedConceptCodes).toEqual(["SYN-C01", "SYN-C02"]);
    expect(run2.regeneration?.recomputedCoverageConceptCodes).toEqual(["SYN-C01", "SYN-C02"]);
    expect(run2.regeneration?.removedGeneratedQuestionCodes).toEqual(["SYN-Q12"]);
    expect(run2.regeneration?.generatedQuestionCodes).toEqual(["SYN-Q12"]);
    expect(run2.draft.generatedQuestions).toHaveLength(1);
    expect(run2.draft.generatedQuestions[0].conceptCode).toBe("SYN-C01");
    expect(run2.regeneration?.preservedArtifacts).toContainEqual({ kind: "concept", id: "SYN-C03" });
    expect(run2.regeneration?.preservedArtifacts).toContainEqual({ kind: "flashcard", id: "SYN-F03" });
    expect(run2.finalCoverage?.factoryConceptCoverage.every((row) => row.status === "ready")).toBe(true);
    expect(run2.finalCoverage?.totalActionableMissingQuestions).toBe(0);
    expect(run2.exceptionQueue).toEqual([]);
    expect(run2.questionQa?.valid).toBe(true);
    expect(run2.readiness.importReady).toBe(true);
  });
});
