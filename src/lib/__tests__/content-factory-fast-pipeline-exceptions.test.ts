// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import {
  classifyFastPipelineExceptions,
  stableFactoryExceptionId,
  type ContentFactoryJob,
  type ProposedConcept,
} from "../content-factory";

const source = [{
  label: "Temario_new.pdf",
  reference: "Temario_new.pdf, p. 10",
  pageStart: 10,
  pageEnd: 10,
}];

const job: ContentFactoryJob = {
  version: "1.0",
  oppositionCode: "auxiliar-administrativo-sms",
  topicNumber: 77,
  mode: "greenfield",
  codePrefix: "SMS-T77",
  source,
  sourcePolicy: {
    canonicalOnly: true,
    document: "Temario_new.pdf",
    externalVerificationAllowed: false,
  },
};

function baseConcept(): ProposedConcept {
  return {
    code: "SMS-T77-C01",
    unitCode: "SMS-T77-U01",
    title: "Concepto limitado por fuente",
    description: "Fixture de contrato Fast Pipeline.",
    position: 1,
    confidence: "high",
    sourceRefs: source,
    sourceCapacity: {
      status: "source_limited",
      sourceSupportedCeiling: 1,
      reason: "La fuente canónica sostiene una sola dimensión independiente en este fixture.",
    },
  };
}

describe("Fast Pipeline exception policy", () => {
  test("new source_limited capacity is a stable governance blocker", () => {
    const concept = baseConcept();
    const exceptions = classifyFastPipelineExceptions({
      job,
      units: [{
        code: "SMS-T77-U01",
        title: "Unidad fixture",
        position: 1,
        sourceRefs: source,
      }],
      concepts: [concept],
      assignments: [{
        questionCode: "SMS-T77-0001",
        primaryConceptCode: concept.code,
        confidence: "high",
      }],
      content: {
        units: [{
          code: "SMS-T77-U01",
          title: "Unidad fixture",
          position: 1,
          estimatedMinutes: 5,
          studySummary: "Resumen fixture.",
          examKeys: ["Clave"],
          confusions: [],
          traps: [],
          mnemonics: [],
          sourceRefs: source,
        }],
        concepts: [concept],
        flashcards: [{
          code: "SMS-T77-F01",
          conceptCode: concept.code,
          type: "direct",
          prompt: "Prompt",
          answer: "Answer",
          position: 1,
          sourceRefs: source,
        }],
      },
      coverage: null,
      questionQa: null,
    });

    const sourceLimited = exceptions.find((entry) => entry.type === "source_limited_candidate");
    expect(sourceLimited).toBeDefined();
    expect(sourceLimited?.id).toBe(
      stableFactoryExceptionId("source_limited_candidate", { kind: "concept", id: concept.code }),
    );
    expect(sourceLimited).toEqual(expect.objectContaining({
      blocker: true,
      confidence: "high",
      subject: { kind: "concept", id: concept.code },
    }));
    expect(sourceLimited?.explanation).toContain("ceiling 1");
    expect(sourceLimited?.affectedArtifacts).toContainEqual({ kind: "coverage", id: concept.code });
    expect(sourceLimited?.affectedArtifacts).toContainEqual({ kind: "generation_slot", id: concept.code });
  });

  test("the exact approved source_limited anchor does not create a false exception", () => {
    const concept = baseConcept();
    const approvedAnchors = {
      version: "4.0" as const,
      oppositionCode: job.oppositionCode,
      topicNumber: job.topicNumber,
      units: [{
        code: "SMS-T77-U01",
        title: "Unidad fixture",
        position: 1,
        estimatedMinutes: 5,
        studySummary: "Resumen fixture.",
        examKeys: ["Clave"],
        confusions: [],
        traps: [],
        mnemonics: [],
        sourceRefs: source,
      }],
      concepts: [{
        code: concept.code,
        unitCode: concept.unitCode,
        title: concept.title,
        description: concept.description,
        position: concept.position,
        sourceCapacity: concept.sourceCapacity?.status === "source_limited" ? concept.sourceCapacity : undefined,
      }],
      questionMappings: [{
        questionCode: "SMS-T77-0001",
        primaryConceptCode: concept.code,
      }],
      flashcards: [{
        code: "SMS-T77-F01",
        conceptCode: concept.code,
        type: "direct" as const,
        prompt: "Prompt",
        answer: "Answer",
        position: 1,
        sourceRefs: source,
      }],
    };

    const exceptions = classifyFastPipelineExceptions({
      job,
      units: [{ code: "SMS-T77-U01", title: "Unidad fixture", position: 1, sourceRefs: source }],
      concepts: [concept],
      assignments: [{ questionCode: "SMS-T77-0001", primaryConceptCode: concept.code, confidence: "high" }],
      content: {
        units: approvedAnchors.units,
        concepts: [concept],
        flashcards: approvedAnchors.flashcards,
      },
      coverage: null,
      questionQa: null,
      approvedAnchors,
    });

    expect(exceptions.filter((entry) => entry.type === "source_limited_candidate")).toEqual([]);
  });
});
