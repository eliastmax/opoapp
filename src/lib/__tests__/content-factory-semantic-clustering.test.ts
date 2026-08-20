// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import { buildSemanticTopicDraft, type SemanticSourceSpan } from "../content-factory/semantic-draft";
import type { ContentFactoryJob, FactoryQuestionMetadata } from "../content-factory/types";

const DOCUMENT = "Temario_new.pdf";
const source: SemanticSourceSpan[] = [{
  id: "CHAIN-SRC-01",
  document: DOCUMENT,
  reference: `${DOCUMENT}, art. 1, p. 10`,
  heading: "Regla electrónica",
  sectionPath: ["Unidad electrónica", "Regla electrónica"],
  article: "Artículo 1",
  text: "La regla electrónica contiene varias previsiones conceptualmente distintas.",
  pageStart: 10,
  pageEnd: 10,
}];

function question(input: {
  code: string;
  label: string;
  objective: string;
  subpart?: string;
}): FactoryQuestionMetadata {
  return {
    code: input.code,
    active: true,
    apartado: "Unidad electrónica",
    subapartado: input.subpart ?? "Regla electrónica",
    conceptLabel: input.label,
    learningObjective: input.objective,
    documentReference: DOCUMENT,
    sourceReference: `${DOCUMENT}, art. 1, p. 10`,
    pageStart: 10,
    pageEnd: 10,
  };
}

function run(questions: FactoryQuestionMetadata[]) {
  const job: ContentFactoryJob = {
    version: "1.0",
    oppositionCode: "synthetic",
    topicNumber: 999,
    mode: "existing_bank",
    codePrefix: "SYN-CHAIN",
    source: [{ label: DOCUMENT, reference: `${DOCUMENT}, synthetic` }],
    sourcePolicy: { canonicalOnly: true, document: DOCUMENT, externalVerificationAllowed: false },
    existingQuestions: questions,
  };
  return buildSemanticTopicDraft({ job, canonicalSource: source, existingQuestions: questions });
}

function groups(questions: FactoryQuestionMetadata[]) {
  return run(questions).conceptProposals
    .map((proposal) => [...proposal.meta.affectedQuestionCodes].sort())
    .sort((left, right) => left[0].localeCompare(right[0]));
}

describe("Content Factory.6 anti-overmerge clustering", () => {
  test("does not collapse a single-link compatibility chain", () => {
    const result = groups([
      question({ code: "Q-A", label: "acceso notificacion electronica", objective: "identificar acceso electronico" }),
      question({ code: "Q-B", label: "acceso notificacion electronica sede", objective: "distinguir acceso por sede" }),
      question({ code: "Q-C", label: "notificacion electronica sede", objective: "identificar notificacion en sede" }),
    ]);

    expect(result.some((cluster) => cluster.length === 3)).toBe(false);
    expect(result).toEqual([["Q-A", "Q-B"], ["Q-C"]]);
  });

  test("keeps a genuinely homogeneous group together", () => {
    const result = groups([
      question({ code: "Q-1", label: "acceso a la notificacion electronica", objective: "identificar acceso a notificacion" }),
      question({ code: "Q-2", label: "acceso a notificacion electronica", objective: "identificar acceso notificacion" }),
      question({ code: "Q-3", label: "acceso a la notificacion electronica", objective: "identificar acceso a notificacion" }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(["Q-1", "Q-2", "Q-3"]);
  });

  test("preserves exact sameLabel and sameObjective as strong signals", () => {
    const sameLabel = groups([
      question({ code: "L-1", label: "Sello electrónico", objective: "objetivo alfa", subpart: "Uno" }),
      question({ code: "L-2", label: "Sello electrónico", objective: "objetivo beta", subpart: "Dos" }),
    ]);
    const sameObjective = groups([
      question({ code: "O-1", label: "Concepto alfa", objective: "Distinguir el mismo efecto", subpart: "Uno" }),
      question({ code: "O-2", label: "Concepto beta", objective: "Distinguir el mismo efecto", subpart: "Dos" }),
    ]);
    expect(sameLabel).toEqual([["L-1", "L-2"]]);
    expect(sameObjective).toEqual([["O-1", "O-2"]]);
  });

  test("does not merge distinct nearby concepts only because span and subpart are shared", () => {
    const result = groups([
      question({ code: "N-1", label: "Plazo para comunicar sucesion", objective: "calcular plazo de sucesion" }),
      question({ code: "N-2", label: "Gestion de direccion electronica habilitada", objective: "identificar organo gestor" }),
    ]);
    expect(result).toEqual([["N-1"], ["N-2"]]);
  });
});
