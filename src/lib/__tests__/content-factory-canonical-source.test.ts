// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import { validateContentFactoryJob, type ContentFactoryJob } from "../content-factory";

function job(source: ContentFactoryJob["source"], references?: ContentFactoryJob["references"]): ContentFactoryJob {
  return {
    version: "1.0",
    oppositionCode: "auxiliar-administrativo-sms",
    topicNumber: 18,
    mode: "existing_bank",
    codePrefix: "SMS-T18",
    sourcePolicy: {
      canonicalOnly: true,
      document: "Temario_new.pdf",
      externalVerificationAllowed: false,
    },
    source,
    references,
    existingQuestions: [{ code: "SMS-T18-0001", active: true }],
  };
}

describe("Content Factory canonical source policy", () => {
  test("accepts Temario_new as the sole substantive source", () => {
    const result = validateContentFactoryJob(
      job([
        {
          label: "Temario_new.pdf",
          reference: "Temario_new.pdf, Tema 18, art. 24, pp. 125-126",
          pageStart: 125,
          pageEnd: 126,
        },
      ]),
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test("rejects external or auxiliary content sources in a canonical-only job", () => {
    const result = validateContentFactoryJob(
      job(
        [{ label: "Temario_new.pdf", reference: "Temario_new.pdf, Tema 18, pp. 113-149" }],
        [{ label: "Fuente externa", reference: "BOE-A-2015-10565, art. 24" }],
      ),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.map((entry) => entry.code)).toContain("non_canonical_source");
  });

  test("does not require changing legacy jobs that predate the canonical-only policy", () => {
    const legacy: ContentFactoryJob = {
      version: "1.0",
      oppositionCode: "auxiliar-administrativo-sms",
      topicNumber: 13,
      mode: "existing_bank",
      codePrefix: "SMS-T13",
      source: [{ label: "Legacy fixture", reference: "Existing approved package" }],
      existingQuestions: [{ code: "SMS-T13-0001", active: true }],
    };
    expect(validateContentFactoryJob(legacy).valid).toBe(true);
  });
});
