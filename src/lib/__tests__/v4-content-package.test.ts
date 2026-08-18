// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import {
  validateV4StudyContentPackage,
  type V4StudyContentPackage,
} from "../v4-content-package";

const basePackage = (): V4StudyContentPackage => ({
  version: "4.0",
  oppositionCode: "sms_aux_admin",
  topicNumber: 18,
  sourceRevision: "2026-08-19",
  units: [
    {
      code: "SMS-T18-U01",
      title: "Relación electrónica",
      position: 1,
      estimatedMinutes: 6,
      studySummary: "Resumen validado de la unidad.",
      examKeys: ["Regla principal"],
      confusions: ["No confundir obligación con opción"],
      traps: ["Sujetos obligados"],
      mnemonics: [],
      sourceRefs: [{ label: "Ley 39/2015", reference: "art. 14" }],
    },
  ],
  concepts: [
    {
      code: "SMS-T18-C01",
      unitCode: "SMS-T18-U01",
      title: "Sujetos obligados a relación electrónica",
      description: "Quién debe relacionarse electrónicamente.",
      position: 1,
    },
  ],
  questionMappings: ["SMS-T18-0001", "SMS-T18-0002", "SMS-T18-0003", "SMS-T18-0004"].map(
    (questionCode) => ({
      questionCode,
      primaryConceptCode: "SMS-T18-C01",
    }),
  ),
  flashcards: [
    {
      code: "SMS-T18-F01",
      conceptCode: "SMS-T18-C01",
      type: "direct",
      prompt: "¿Quién está obligado?",
      answer: "Los sujetos previstos legalmente.",
      position: 1,
      sourceRefs: [{ label: "Ley 39/2015", reference: "art. 14" }],
    },
  ],
});

describe("V4 study content package", () => {
  test("accepts a structurally valid package with enough question coverage", () => {
    const result = validateV4StudyContentPackage(basePackage());

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.coverage.underCoveredConceptIds).toEqual([]);
    expect(result.warnings.filter((warning) => warning.code === "coverage_gap")).toEqual([]);
  });

  test("reports coverage gaps without pretending the package is structurally broken", () => {
    const pkg = basePackage();
    pkg.questionMappings = pkg.questionMappings.slice(0, 3);

    const result = validateV4StudyContentPackage(pkg);

    expect(result.valid).toBe(true);
    expect(result.coverage.underCoveredConceptIds).toEqual(["SMS-T18-C01"]);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: "coverage_gap" }),
    );
  });

  test("rejects duplicate stable codes and duplicate question mapping rows", () => {
    const pkg = basePackage();
    pkg.units.push({ ...pkg.units[0] });
    pkg.concepts.push({ ...pkg.concepts[0] });
    pkg.flashcards.push({ ...pkg.flashcards[0] });
    pkg.questionMappings.push({ ...pkg.questionMappings[0] });

    const result = validateV4StudyContentPackage(pkg);
    const codes = result.errors.map((error) => error.code);

    expect(result.valid).toBe(false);
    expect(codes).toContain("duplicate_unit_code");
    expect(codes).toContain("duplicate_concept_code");
    expect(codes).toContain("duplicate_flashcard_code");
    expect(codes).toContain("duplicate_question_mapping");
  });

  test("rejects broken unit, concept and flashcard references", () => {
    const pkg = basePackage();
    pkg.concepts[0].unitCode = "UNKNOWN-U";
    pkg.questionMappings[0].primaryConceptCode = "UNKNOWN-C";
    pkg.questionMappings[1].secondaryConceptCodes = ["UNKNOWN-S"];
    pkg.flashcards[0].conceptCode = "UNKNOWN-F";

    const result = validateV4StudyContentPackage(pkg);
    const codes = result.errors.map((error) => error.code);

    expect(result.valid).toBe(false);
    expect(codes).toContain("unknown_unit");
    expect(codes).toContain("unknown_primary_concept");
    expect(codes).toContain("unknown_secondary_concept");
    expect(codes).toContain("unknown_flashcard_concept");
  });

  test("requires a real study summary and validated source on every unit", () => {
    const pkg = basePackage();
    pkg.units[0].studySummary = "  ";
    pkg.units[0].sourceRefs = [];

    const result = validateV4StudyContentPackage(pkg);
    const codes = result.errors.map((error) => error.code);

    expect(result.valid).toBe(false);
    expect(codes).toContain("invalid_unit");
    expect(codes).toContain("missing_unit_source");
  });

  test("warns when a concept has no flashcards", () => {
    const pkg = basePackage();
    pkg.flashcards = [];

    const result = validateV4StudyContentPackage(pkg);

    expect(result.valid).toBe(true);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: "concept_without_flashcards" }),
    );
  });

  test("rejects a secondary concept repeated or equal to the primary", () => {
    const pkg = basePackage();
    pkg.concepts.push({
      code: "SMS-T18-C02",
      unitCode: "SMS-T18-U01",
      title: "Otro concepto",
      description: "Concepto secundario.",
      position: 2,
    });
    pkg.questionMappings[0].secondaryConceptCodes = [
      "SMS-T18-C01",
      "SMS-T18-C02",
      "SMS-T18-C02",
    ];

    const result = validateV4StudyContentPackage(pkg);
    const codes = result.errors.map((error) => error.code);

    expect(result.valid).toBe(false);
    expect(codes).toContain("primary_repeated_as_secondary");
    expect(codes).toContain("duplicate_secondary_concept");
  });
});
