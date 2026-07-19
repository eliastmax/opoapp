// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import { summarizeSelection } from "../smart-selection";

describe("smart selection summary", () => {
  it("groups selection reasons and counts overlap", () => {
    expect(
      summarizeSelection([
        {
          selection_group: "nueva",
          selection_reason: "Pregunta todavía no vista",
          was_in_previous_test: false,
          overlap_exception: false,
        },
        {
          selection_group: "fallo",
          selection_reason: "Fallo pendiente de corregir",
          was_in_previous_test: true,
          overlap_exception: false,
        },
        {
          selection_group: "nueva",
          selection_reason: "Pregunta todavía no vista",
          was_in_previous_test: false,
          overlap_exception: false,
        },
      ]),
    ).toEqual({
      counts: { nueva: 2, fallo: 1 },
      previousOverlap: 1,
      overlapException: false,
    });
  });

  it("reports a justified overlap exception", () => {
    const summary = summarizeSelection([
      {
        selection_group: "variedad",
        selection_reason: "Variedad y cobertura del tema",
        was_in_previous_test: true,
        overlap_exception: true,
      },
    ]);

    expect(summary.overlapException).toBe(true);
  });
});
