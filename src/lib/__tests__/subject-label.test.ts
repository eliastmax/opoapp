// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import { subjectLabel, subjectTopicPrefix } from "../subject-label";

describe("subject label", () => {
  it("prefixes a subject containing one topic", () => {
    expect(subjectLabel("Ley 39/2015", [19])).toBe("Tema 19 · Ley 39/2015");
  });

  it("compacts consecutive topic numbers", () => {
    expect(subjectLabel("Personal estatutario", [14, 13, 14])).toBe(
      "Temas 13–14 · Personal estatutario",
    );
  });

  it("keeps non-consecutive topics explicit", () => {
    expect(subjectLabel("Materia común", [21, 19])).toBe("Temas 19, 21 · Materia común");
  });

  it("preserves subjects without topics", () => {
    expect(subjectLabel("Sin preguntas", [])).toBe("Sin preguntas");
  });

  it("returns a reusable topic prefix for two-line selectors", () => {
    expect(subjectTopicPrefix([14, 13, 14])).toBe("Temas 13–14");
    expect(subjectTopicPrefix([])).toBe("");
  });
});
