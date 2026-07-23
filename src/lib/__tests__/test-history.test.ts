// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, it } from "bun:test";
import {
  historyOverview,
  historyTestLabel,
  matchesHistoryFilter,
  type HistoryTestSummary,
} from "../test-history";

const completed: HistoryTestSummary = {
  tipo: "mezcladas",
  completado: true,
  numero_preguntas: 10,
  aciertos: 7,
  sin_responder: 1,
};

describe("test history", () => {
  it("uses friendly labels for known and unknown test types", () => {
    expect(historyTestLabel("simulacro")).toBe("Simulacro de examen");
    expect(historyTestLabel("multitema_falladas")).toBe("Multitema · repaso de fallos");
    expect(historyTestLabel("legacy")).toBe("Test personalizado");
  });

  it("filters by completion state and simulation type", () => {
    expect(matchesHistoryFilter(completed, "completados")).toBe(true);
    expect(matchesHistoryFilter(completed, "pendientes")).toBe(false);
    expect(matchesHistoryFilter({ ...completed, tipo: "simulacro" }, "simulacros")).toBe(true);
  });

  it("calculates weighted accuracy using answered questions", () => {
    expect(
      historyOverview([
        completed,
        {
          tipo: "simulacro",
          completado: true,
          numero_preguntas: 20,
          aciertos: 8,
          sin_responder: 0,
        },
        { ...completed, completado: false },
      ]),
    ).toEqual({
      completed: 2,
      pending: 1,
      answered: 29,
      accuracy: 52,
    });
  });

  it("returns an empty overview without dividing by zero", () => {
    expect(historyOverview([])).toEqual({
      completed: 0,
      pending: 0,
      answered: 0,
      accuracy: 0,
    });
  });
});
