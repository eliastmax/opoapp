// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import { resultImpact, type ResultImpactAnswer } from "../result-impact";

function answer(
  questionId: string,
  overrides: Partial<ResultImpactAnswer> = {},
): ResultImpactAnswer {
  return {
    question_id: questionId,
    respuesta_usuario: "A",
    correcta: true,
    marked_doubt: false,
    ...overrides,
  };
}

describe("result impact", () => {
  it("explains new coverage, recovered failures and scheduled retention", () => {
    const impact = resultImpact(
      [answer("new"), answer("failure"), answer("review")],
      [
        { question_id: "new", selection_group: "nueva" },
        { question_id: "failure", selection_group: "fallo" },
        { question_id: "review", selection_group: "repaso_programado" },
      ],
    );

    expect(impact.map((item) => [item.kind, item.value])).toEqual([
      ["new", 1],
      ["recovered", 1],
      ["retained", 1],
    ]);
  });

  it("does not claim a recovery or retention when the answer remains doubtful", () => {
    const impact = resultImpact(
      [answer("failure", { marked_doubt: true }), answer("review", { correcta: false })],
      [
        { question_id: "failure", selection_group: "fallo_duda" },
        { question_id: "review", selection_group: "repaso_programado" },
      ],
    );

    expect(impact.map((item) => item.kind)).toEqual(["worked"]);
  });

  it("does not count an unanswered new question as worked", () => {
    const impact = resultImpact(
      [answer("new", { respuesta_usuario: null, correcta: null })],
      [{ question_id: "new", selection_group: "nueva" }],
    );

    expect(impact.map((item) => [item.kind, item.value])).toEqual([["worked", 0]]);
  });

  it("uses factual session activity when selection trace is unavailable", () => {
    const impact = resultImpact(
      [
        answer("one"),
        answer("two", { correcta: false }),
        answer("three", { respuesta_usuario: null }),
      ],
      [],
    );

    expect(impact.map((item) => [item.kind, item.value])).toEqual([
      ["worked", 2],
      ["secure", 1],
    ]);
  });

  it("limits the summary to three meaningful facts", () => {
    const answers = [answer("new"), answer("failure"), answer("review"), answer("weak")];
    const impact = resultImpact(answers, [
      { question_id: "new", selection_group: "nueva" },
      { question_id: "failure", selection_group: "fallo" },
      { question_id: "review", selection_group: "repaso_programado" },
      { question_id: "weak", selection_group: "rendimiento_bajo" },
    ]);

    expect(impact).toHaveLength(3);
  });
});
