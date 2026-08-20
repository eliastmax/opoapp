// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import {
  buildSemanticTopicDraft,
  canonicalPageTextToSemanticSourceSpans,
  isMaterialFactoryException,
  prepareSemanticFactoryWorkPackets,
  pruneNonMaterialFactoryExceptions,
  runContentFactoryTopicWithSemanticDraft,
  type FactoryException,
  type FactoryQuestionMetadata,
} from "../content-factory";
import {
  buildPdftotextArgs,
  pdftotextOutputToCanonicalPages,
} from "../content-factory/tooling/pdf-source-ingest";
import type { ContentFactoryJob } from "../content-factory/types";

const DOCUMENT = "Temario_new.pdf";

function job(questions: FactoryQuestionMetadata[], coverageThreshold = 4): ContentFactoryJob {
  return {
    version: "1.0",
    oppositionCode: "synthetic",
    topicNumber: 99,
    topicTitle: "Tema sintético",
    mode: "existing_bank",
    codePrefix: "SYN",
    coverageThreshold,
    source: [{ label: DOCUMENT, reference: `${DOCUMENT} · Tema sintético`, pageStart: 10, pageEnd: 11 }],
    sourcePolicy: {
      canonicalOnly: true,
      document: DOCUMENT,
      externalVerificationAllowed: false,
    },
    existingQuestions: questions,
  };
}

const pageText = [
  {
    document: DOCUMENT,
    pageNumber: 10,
    text: [
      "CAPÍTULO I",
      "Reglas generales",
      "Artículo 1. Objeto.",
      "La regla general se aplica a todos los sujetos incluidos.",
      "Salvo la excepción prevista expresamente, produce sus efectos desde la resolución.",
    ].join("\n"),
  },
  {
    document: DOCUMENT,
    pageNumber: 11,
    text: [
      "La autoridad competente debe motivar la decisión.",
      "Artículo 2. Requisitos.",
      "La solicitud debe contener los requisitos indicados y presentarse en el plazo previsto.",
    ].join("\n"),
  },
];

function questions(count = 1): FactoryQuestionMetadata[] {
  return Array.from({ length: count }, (_, index) => ({
    code: `SYN-${String(index + 1).padStart(4, "0")}`,
    active: true,
    stem: `Pregunta existente ${index + 1}`,
    apartado: "Reglas generales",
    subapartado: "Objeto",
    conceptLabel: "Objeto y regla general",
    learningObjective: "Distinguir la regla general",
    perspective: index % 2 === 0 ? "reconocimiento_directo" : "efectos",
    trapType: "concepto_proximo",
    documentReference: DOCUMENT,
    sourceReference: `${DOCUMENT}, art. 1, p. 10`,
    pageStart: 10,
    pageEnd: 10,
  }));
}

function exception(overrides: Partial<FactoryException>): FactoryException {
  return {
    id: "fx:test",
    type: "concept_boundary",
    blocker: true,
    severity: "warning",
    confidence: "medium",
    subject: { kind: "concept", id: "SYN-C01" },
    explanation: "Provisional signal.",
    recommendation: "Continue provisionally.",
    affectedArtifacts: [{ kind: "concept", id: "SYN-C01" }],
    ...overrides,
  };
}

describe("CONTENT-FACTORY.5 real pipeline close", () => {
  test("canonical page text becomes semantic spans with real text, pages and detectable article structure", () => {
    const spans = canonicalPageTextToSemanticSourceSpans(pageText, {
      document: DOCUMENT,
      codePrefix: "SYN",
      referencePrefix: `${DOCUMENT} · Tema 99`,
    });
    expect(spans).toHaveLength(2);
    expect(spans[0]).toEqual(expect.objectContaining({
      document: DOCUMENT,
      article: "Artículo 1",
      pageStart: 10,
      pageEnd: 11,
    }));
    expect(spans[0].text).toContain("La regla general se aplica");
    expect(spans[0].text).toContain("La autoridad competente debe motivar");
    expect(spans[1]).toEqual(expect.objectContaining({
      article: "Artículo 2",
      pageStart: 11,
      pageEnd: 11,
    }));
    expect(spans[1].text).toContain("La solicitud debe contener");
  });

  test("pdftotext adapter preserves the PDF-to-page-text boundary without coupling Semantic Builder to Poppler", () => {
    const pages = pdftotextOutputToCanonicalPages({
      stdout: "Página uno\fPágina dos\f",
      document: DOCUMENT,
      firstPage: 44,
    });
    expect(pages).toEqual([
      { document: DOCUMENT, pageNumber: 44, text: "Página uno" },
      { document: DOCUMENT, pageNumber: 45, text: "Página dos" },
    ]);
    expect(buildPdftotextArgs({ pdfPath: "/tmp/source.pdf", document: DOCUMENT, pageStart: 44, pageEnd: 76 }))
      .toEqual(["-layout", "-f", "44", "-l", "76", "/tmp/source.pdf", "-"]);
  });

  test("medium concept confidence alone is not a blocker or exception", () => {
    const candidate = exception({
      type: "concept_boundary",
      confidence: "medium",
      alternatives: undefined,
    });
    expect(isMaterialFactoryException(candidate)).toBe(false);
    expect(pruneNonMaterialFactoryExceptions([candidate])).toEqual([]);
  });

  test("medium mapping with one primary and no competitor is not a blocker", () => {
    const candidate = exception({
      type: "mapping_ambiguity",
      subject: { kind: "mapping", id: "SYN-0001" },
      confidence: "medium",
      alternatives: undefined,
    });
    expect(isMaterialFactoryException(candidate)).toBe(false);
  });

  test("mapping with two genuinely competitive primaries remains a material exception", () => {
    const candidate = exception({
      type: "mapping_ambiguity",
      subject: { kind: "mapping", id: "SYN-0001" },
      confidence: "medium",
      explanation: "SYN-C01 and SYN-C02 are both credible primaries on the same canonical evidence.",
      recommendation: "Keep SYN-C01 provisionally and choose the primary boundary.",
      alternatives: ["Use SYN-C02 as primary."],
    });
    expect(isMaterialFactoryException(candidate)).toBe(true);
  });

  test("concept lexical diversity without a defensible structural alternative is not an exception", () => {
    const candidate = exception({
      type: "concept_boundary",
      confidence: "medium",
      explanation: "The cluster contains several labels and objectives.",
      alternatives: undefined,
    });
    expect(isMaterialFactoryException(candidate)).toBe(false);
  });

  test("concept boundary with a concrete split alternative remains reviewable", () => {
    const candidate = exception({
      type: "concept_boundary",
      confidence: "medium",
      explanation: "Questions SYN-0003 and SYN-0004 form a distinct canonical rule from SYN-0001 and SYN-0002.",
      recommendation: "Review whether to split the second group into a separate concept.",
      alternatives: ["Split SYN-0003,SYN-0004 into SYN-C02."],
    });
    expect(isMaterialFactoryException(candidate)).toBe(true);
  });

  test("LOW confidence remains a blocker", () => {
    const candidate = exception({
      confidence: "low",
      severity: "error",
      blocker: true,
      alternatives: undefined,
    });
    expect(isMaterialFactoryException(candidate)).toBe(true);
  });

  test("anchor conflict remains a blocker regardless of qualitative confidence", () => {
    const candidate = exception({
      type: "anchor_conflict",
      confidence: "medium",
      severity: "error",
      blocker: true,
      alternatives: ["Restore approved anchor."],
    });
    expect(isMaterialFactoryException(candidate)).toBe(true);
  });

  test("source traceability retains the previous substantive behavior", () => {
    const candidate = exception({
      type: "source_traceability",
      confidence: "medium",
      blocker: true,
      alternatives: undefined,
    });
    expect(isMaterialFactoryException(candidate)).toBe(true);
  });

  test("study, flashcard and exact question-gap work packets carry canonical text and executable schemas", () => {
    const source = canonicalPageTextToSemanticSourceSpans(pageText, {
      document: DOCUMENT,
      codePrefix: "SYN",
    });
    const existingQuestions = questions(1);
    const semanticJob = job(existingQuestions, 4);
    const semantic = buildSemanticTopicDraft({
      job: semanticJob,
      canonicalSource: source,
    });
    const packets = prepareSemanticFactoryWorkPackets({
      job: semanticJob,
      semanticDraft: semantic,
      canonicalSource: source,
    });
    expect(packets.studyContent).toHaveLength(1);
    expect(packets.flashcards).toHaveLength(1);
    expect(packets.questions).toHaveLength(3);
    expect(packets.executableStudyContent).toBe(true);
    expect(packets.executableQuestions).toBe(true);
    expect(packets.studyContent[0].sourceSpans[0].text.length).toBeGreaterThan(20);
    expect(packets.flashcards[0].sourceSpans[0].text.length).toBeGreaterThan(20);
    expect(packets.questions.every((packet) => packet.outputSchema.headers.length === 25)).toBe(true);
    expect(packets.questions.map((packet) => packet.questionCode)).toEqual([
      "SYN-0002",
      "SYN-0003",
      "SYN-0004",
    ]);
  });

  test("executable canonical work packets remove confidence-only and missing-operation blockers without faking HIGH", () => {
    const source = canonicalPageTextToSemanticSourceSpans(pageText, {
      document: DOCUMENT,
      codePrefix: "SYN",
    });
    const existingQuestions = questions(1);
    const semanticJob = job(existingQuestions, 4);
    const semantic = buildSemanticTopicDraft({
      job: semanticJob,
      canonicalSource: source,
    });
    semantic.concepts[0] = { ...semantic.concepts[0], confidence: "medium" };
    semantic.conceptProposals[0] = {
      ...semantic.conceptProposals[0],
      concept: semantic.concepts[0],
      meta: { ...semantic.conceptProposals[0].meta, confidence: "medium" },
    };
    semantic.mappings[0] = { ...semantic.mappings[0], confidence: "medium" };
    semantic.mappingProposals[0] = {
      ...semantic.mappingProposals[0],
      mapping: semantic.mappings[0],
      meta: { ...semantic.mappingProposals[0].meta, confidence: "medium" },
    };
    semantic.structuralDraft = {
      ...semantic.structuralDraft,
      concepts: semantic.concepts,
      assignments: semantic.mappings,
    };

    const run = runContentFactoryTopicWithSemanticDraft({
      job: semanticJob,
      semanticDraft: semantic,
      canonicalSource: source,
    });
    expect(run.draft.concepts[0].confidence).toBe("medium");
    expect(run.draft.assignments[0].confidence).toBe("medium");
    expect(run.exceptionQueue.some((item) => item.id.endsWith(":confidence"))).toBe(false);
    expect(run.exceptionQueue.some((item) => item.id.endsWith(":missing-study-content"))).toBe(false);
    expect(run.exceptionQueue.some((item) => item.id.endsWith(":missing-question-generator"))).toBe(false);
    expect(run.workPackets?.questions).toHaveLength(3);
  });
});
