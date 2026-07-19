// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import {
  comparisonMessage,
  comparisonState,
  verifiedProgressTotals,
  type VerifiedProgressRow,
} from "../verified-progress";

function row(overrides: Partial<VerifiedProgressRow> = {}): VerifiedProgressRow {
  return {
    accuracy_change: null,
    baseline_accuracy: null,
    baseline_correct_count: 0,
    baseline_session_count: 0,
    comparable_question_count: 0,
    comparison_state: "insuficiente",
    corrected_failures_30d: 0,
    current_accuracy: null,
    current_correct_count: 0,
    current_session_count: 0,
    metric_version: "verified-progress-v1.0",
    retained_questions_30d: 0,
    topic_id: "topic-1",
    ...overrides,
  };
}

describe("verified progress presentation", () => {
  it("falls back to insufficient evidence for unknown states", () => {
    expect(comparisonState("future_state")).toBe("insuficiente");
  });

  it("does not invent progress without comparable evidence", () => {
    expect(comparisonMessage(row())).toContain("Aún no hay dos bloques comparables");
  });

  it("reports only an improvement that the database has verified", () => {
    expect(
      comparisonMessage(
        row({
          accuracy_change: 7.5,
          comparable_question_count: 20,
          comparison_state: "mejora_verificada",
        }),
      ),
    ).toBe("Mejora verificada: +7,5 puntos en 20 preguntas comparables.");
  });

  it("aggregates factual signals without turning activity into achievements", () => {
    expect(
      verifiedProgressTotals([
        row({ corrected_failures_30d: 2, retained_questions_30d: 3 }),
        row({
          topic_id: "topic-2",
          corrected_failures_30d: 1,
          comparison_state: "mejora_verificada",
        }),
      ]),
    ).toEqual({ corrected: 3, retained: 3, improvedTopics: 1 });
  });
});
