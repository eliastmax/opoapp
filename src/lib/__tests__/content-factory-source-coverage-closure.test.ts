// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import type { V4StudyContentPackage } from "../v4-content-package";
import {
  applyGeneratedQuestionsToSourceCoverage,
  runSourceCoverageClosure,
  splitSemanticSourceSpanForCoverage,
  validateSourceCoverageClosure,
  type SourceCoverageOperationResult,
  type SourceCoverageWorkPacket,
} from "../content-factory/source-coverage-closure";
import type { ResolvedMasteryFamily } from "../content-factory/mastery-family-resolution";
import type { SemanticSourceSpan } from "../content-factory/semantic-draft";
import type { ContentFactoryJob, ProposedStudyUnit } from "../content-factory/types";

const DOCUMENT = "canonical.pdf";

function job(): ContentFactoryJob {
  return {
    version: "1.0",
    oppositionCode: "synthetic",
    topicNumber: 998,
    topicTitle: "Tema source coverage",
    mode: "existing_bank",
    codePrefix: "SYN-SC",
    coverageThreshold: 4,
    source: [{ label: DOCUMENT, reference: `${DOCUMENT}, synthetic` }],
    sourcePolicy: { canonicalOnly: true, document: DOCUMENT, externalVerificationAllowed: false },
    existingQuestions: [],
  };
}

function span(text: string, id = "SRC-1"): SemanticSourceSpan {
  return {
    id,
    document: DOCUMENT,
    reference: `${DOCUMENT} · pp. 1-3`,
    heading: "Tema sintético",
    sectionPath: [],
    article: null,
    text,
    pageStart: 1,
    pageEnd: 3,
  };
}

function unit(code: string, title: string, position: number): ProposedStudyUnit {
  return {
    code,
    title,
    position,
    sourceRefs: [{ label: DOCUMENT, reference: `${DOCUMENT} · ${title}`, pageStart: position, pageEnd: position }],
  };
}

function family(code: string, unitCode: string, questionCode: string, statement: string): ResolvedMasteryFamily {
  return {
    provisionalFamilyId: `PF-${code}`,
    code,
    unitCode,
    position: Number.parseInt(code.match(/(\d+)$/)?.[1] ?? "1", 10),
    packetId: `P-${code}`,
    title: statement,
    masteryStatement: statement,
    questionCodes: [questionCode],
    sourceRefs: [{ label: DOCUMENT, reference: `${DOCUMENT} · represented ${code}`, pageStart: 1, pageEnd: 1 }],
    includedFacets: ["rule"],
    excludedNearbyFamilyReason: "Adjacent material requires distinct canonical knowledge.",
    confidence: "high",
    rationale: "Synthetic represented family.",
  };
}

function run(input: {
  source: SemanticSourceSpan[];
  families?: ResolvedMasteryFamily[];
  units?: ProposedStudyUnit[];
  resolve: (packet: SourceCoverageWorkPacket) => SourceCoverageOperationResult;
}) {
  return runSourceCoverageClosure({
    job: job(),
    canonicalSource: input.source,
    families: input.families ?? [],
    units: input.units ?? [],
    resolveSourceCoverage: input.resolve,
  });
}

describe("Content Factory.8 source coverage closure", () => {
  test("fixture 1: material section III with no seeded question becomes source-only coverage work", () => {
    const families = [
      family("SYN-SC-C01", "SYN-SC-U01", "Q-I", "Dominar I."),
      family("SYN-SC-C02", "SYN-SC-U02", "Q-II", "Dominar II."),
    ];
    const units = [unit("SYN-SC-U01", "Sección I", 1), unit("SYN-SC-U02", "Sección II", 2)];
    const result = run({
      source: [span("I. PRIMER BLOQUE\nRegla cubierta I.\nII. SEGUNDO BLOQUE\nRegla cubierta II.\nIII. TERCER BLOQUE\nRegla material nueva y evaluable.")],
      families,
      units,
      resolve: (packet) => ({
        decisions: packet.chunks.map((chunk) => {
          if (chunk.heading?.startsWith("III")) {
            return {
              action: "CREATE_SOURCE_FAMILY" as const,
              chunkId: chunk.id,
              rationale: "La regla III exige conocimiento adicional no representado.",
              provisionalFamilyId: "SRC-F-III",
              title: "Regla material III",
              masteryStatement: "Dominar la regla material de la tercera sección.",
              includedFacets: ["definición", "aplicación"],
              excludedNearbyFamilyReason: "I y II ya representan núcleos diferentes.",
              confidence: "high" as const,
              unit: { kind: "new" as const, title: "Tercera sección material" },
            };
          }
          return {
            action: "ATTACH_TO_EXISTING_FAMILY" as const,
            chunkId: chunk.id,
            existingFamilyCode: chunk.heading?.startsWith("II") ? "SYN-SC-C02" : "SYN-SC-C01",
            rationale: "El texto es otra evidencia de una family ya representada.",
          };
        }),
      }),
    });
    expect(result.validation.valid).toBe(true);
    expect(result.families.filter((item) => item.origin === "source_only")).toHaveLength(1);
    expect(result.families.find((item) => item.origin === "source_only")?.generationRequired).toBe(true);
    expect(result.units).toHaveLength(3);
  });

  test("fixture 2: uncovered material can ATTACH_TO_EXISTING_FAMILY without duplicating mastery", () => {
    const existing = family("SYN-SC-C01", "SYN-SC-U01", "Q-1", "Dominar autenticidad documental.");
    const result = run({
      source: [span("I. AUTENTICIDAD\nLa misma autenticidad también puede acreditarse por código seguro.")],
      families: [existing],
      units: [unit("SYN-SC-U01", "Autenticidad", 1)],
      resolve: (packet) => ({ decisions: packet.chunks.map((chunk) => ({
        action: "ATTACH_TO_EXISTING_FAMILY" as const,
        chunkId: chunk.id,
        existingFamilyCode: "SYN-SC-C01",
        rationale: "Es una faceta adicional del mismo núcleo de autenticidad.",
      })) }),
    });
    expect(result.validation.valid).toBe(true);
    expect(result.families).toHaveLength(1);
    expect(result.families[0].origin).toBe("question_backed");
  });

  test("fixture 3: nonmaterial heading may be ignored only with rationale", () => {
    const result = run({
      source: [span("III. EJEMPLO GRÁFICO")],
      resolve: (packet) => ({ decisions: packet.chunks.map((chunk) => ({
        action: "IGNORE_NONMATERIAL" as const,
        chunkId: chunk.id,
        rationale: "Es únicamente un rótulo sin regla, dato o conocimiento evaluable.",
      })) }),
    });
    expect(result.validation.valid).toBe(true);
    expect(result.ignored).toHaveLength(1);
  });

  test("fixture 4: one coarse span/chunk can contain represented and uncovered material", () => {
    const coarse = span("Regla cubierta: la solicitud identifica al interesado. Regla nueva: el soporte debe conservarse durante el plazo canónico.", "SRC-COARSE");
    expect(splitSemanticSourceSpanForCoverage(coarse)).toHaveLength(1);
    const result = run({
      source: [coarse],
      families: [family("SYN-SC-C01", "SYN-SC-U01", "Q-1", "Dominar identificación del interesado.")],
      units: [unit("SYN-SC-U01", "Identificación", 1)],
      resolve: (packet) => {
        const chunk = packet.chunks[0];
        return { decisions: [
          {
            action: "ATTACH_TO_EXISTING_FAMILY",
            chunkId: chunk.id,
            sourceExcerpt: "Regla cubierta: la solicitud identifica al interesado.",
            existingFamilyCode: "SYN-SC-C01",
            rationale: "La primera oración ya pertenece a la family existente.",
          },
          {
            action: "CREATE_SOURCE_FAMILY",
            chunkId: chunk.id,
            sourceExcerpt: "Regla nueva: el soporte debe conservarse durante el plazo canónico.",
            rationale: "La conservación exige conocimiento material adicional.",
            provisionalFamilyId: "SRC-F-CONS",
            title: "Conservación del soporte",
            masteryStatement: "Dominar la obligación independiente de conservación.",
            includedFacets: ["requisito"],
            excludedNearbyFamilyReason: "Identificación y conservación responden a reglas distintas.",
            confidence: "high",
            unit: { kind: "new", title: "Conservación" },
          },
        ] };
      },
    });
    expect(result.validation.valid).toBe(true);
    expect(result.families.some((item) => item.origin === "source_only")).toBe(true);
  });

  test("fixture 5: source-only family with zero questions is valid pre-generation", () => {
    const result = run({
      source: [span("III. REGLA NUEVA\nExiste una regla material sin pregunta.")],
      resolve: (packet) => ({ decisions: packet.chunks.map((chunk) => ({
        action: "CREATE_SOURCE_FAMILY" as const,
        chunkId: chunk.id,
        rationale: "Núcleo material todavía no evaluado.",
        provisionalFamilyId: "SRC-F-0Q",
        title: "Regla sin semilla",
        masteryStatement: "Dominar la regla sin semilla.",
        includedFacets: ["regla"],
        excludedNearbyFamilyReason: "No existe una family equivalente.",
        confidence: "high" as const,
        unit: { kind: "new" as const, title: "Unidad source-only" },
      })) }),
    });
    expect(result.validation.phase).toBe("pre_generation");
    expect(result.validation.valid).toBe(true);
    expect(result.validation.sourceOnlyFamiliesWithoutQuestions).toBe(1);
  });

  test("fixture 6: same zero-question source-only family is invalid at import-ready", () => {
    const result = run({
      source: [span("III. REGLA NUEVA\nExiste una regla material sin pregunta.")],
      resolve: (packet) => ({ decisions: packet.chunks.map((chunk) => ({
        action: "CREATE_SOURCE_FAMILY" as const,
        chunkId: chunk.id,
        rationale: "Núcleo material todavía no evaluado.",
        provisionalFamilyId: "SRC-F-0Q",
        title: "Regla sin semilla",
        masteryStatement: "Dominar la regla sin semilla.",
        includedFacets: ["regla"],
        excludedNearbyFamilyReason: "No existe una family equivalente.",
        confidence: "high" as const,
        unit: { kind: "new" as const, title: "Unidad source-only" },
      })) }),
    });
    const final = validateSourceCoverageClosure({ run: result, phase: "import_ready" });
    expect(final.valid).toBe(false);
    expect(final.issues.some((issue) => issue.code === "source_only_unmapped")).toBe(true);
  });

  test("fixture 7: generated question keeps conceptCode-at-birth and yields final primary mapping", () => {
    const result = run({
      source: [span("III. REGLA NUEVA\nExiste una regla material sin pregunta.")],
      resolve: (packet) => ({ decisions: packet.chunks.map((chunk) => ({
        action: "CREATE_SOURCE_FAMILY" as const,
        chunkId: chunk.id,
        rationale: "Núcleo material todavía no evaluado.",
        provisionalFamilyId: "SRC-F-GEN",
        title: "Regla a generar",
        masteryStatement: "Dominar la regla generada.",
        includedFacets: ["regla"],
        excludedNearbyFamilyReason: "Es conocimiento independiente.",
        confidence: "high" as const,
        unit: { kind: "new" as const, title: "Unidad generada" },
      })) }),
    });
    const conceptCode = result.families.find((item) => item.origin === "source_only")!.code;
    const generated = applyGeneratedQuestionsToSourceCoverage({
      run: result,
      generated: [{ questionCode: "SYN-SC-0001", conceptCode }],
    });
    expect(generated.primaryMappings).toEqual([expect.objectContaining({ questionCode: "SYN-SC-0001", primaryConceptCode: conceptCode })]);
    expect(generated.run.families.find((item) => item.code === conceptCode)?.questionCodes).toEqual(["SYN-SC-0001"]);
    expect(validateSourceCoverageClosure({ run: generated.run, phase: "import_ready" }).valid).toBe(true);
  });

  test("approved structure replays without source-coverage reinterpretation", () => {
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
    const result = runSourceCoverageClosure({
      job: job(),
      canonicalSource: [span("III. WOULD OTHERWISE BE MATERIAL\nRegla.")],
      families: [],
      units: [],
      approvedStructure: approved,
      resolveSourceCoverage: () => {
        calls += 1;
        return { decisions: [] };
      },
    });
    expect(result.mode).toBe("approved_replay");
    expect(result.operationCount).toBe(0);
    expect(calls).toBe(0);
    expect(result.approvedStructure).toBe(approved);
  });
});
