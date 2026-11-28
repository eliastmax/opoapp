// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, it } from "bun:test";
import { coverage, percent, recommendKnowledge, trainingActivity } from "../training-overview";
import type { TestsFirstProgressRow } from "../tests-first-progress";

const knowledge = (learner_state: TestsFirstProgressRow["learner_state"], changes = {}) =>
  ({
    learner_state,
    concept_title: "Conocimiento",
    safe_accuracy: null,
    distinct_test_questions: 0,
    active_primary_question_count: 5,
    doubt_answers: 0,
    ...changes,
  }) as TestsFirstProgressRow;

describe("Commercial training metrics", () => {
  it("counts only the evaluated states as worked and keeps the full catalog denominator", () => {
    const summary = coverage([
      knowledge("not_evaluated", { distinct_test_questions: 1 }),
      knowledge("consolidating"),
      knowledge("needs_reinforcement"),
      knowledge("mastered"),
      knowledge("not_evaluated"),
      knowledge("not_evaluated"),
    ]);
    expect(percent(summary.worked, summary.total)).toBe(50);
    expect(percent(summary.mastered, summary.total)).toBe(17);
    expect(percent(0, 6)).toBe(0);
    expect(percent(0, 0)).toBeNull();
  });

  it("prioritizes an evidenced weak point with enough active questions", () => {
    const newConcept = knowledge("not_evaluated");
    const weak = knowledge("needs_reinforcement", {
      distinct_test_questions: 2,
      active_primary_question_count: 4,
    });
    const insufficient = knowledge("needs_reinforcement", {
      distinct_test_questions: 2,
      active_primary_question_count: 2,
    });
    expect(recommendKnowledge([newConcept, insufficient, weak])).toEqual({
      row: weak,
      questionCount: 4,
      reason: "reinforce",
    });
    expect(recommendKnowledge([newConcept, insufficient])?.reason).toBe("evaluate");
    expect(recommendKnowledge([knowledge("mastered")])).toBeNull();
  });

  it("calculates a streak across the week boundary and keeps weekly accuracy scoped", () => {
    const now = new Date(2026, 10, 28, 12);
    const tests = Array.from({ length: 9 }, (_, i) => ({
      id: String(i),
      fecha_finalizacion: new Date(2026, 10, 27 - i, 23).toISOString(),
      aciertos: 4,
      fallos: 1,
    }));
    const data = trainingActivity(tests, now);
    expect(data.streak).toBe(9);
    expect(data.days.map((day) => day.count)).toEqual([1, 1, 1, 1, 1, 1, 0]);
    expect(data.tests).toBe(6);
    expect(data.answered).toBe(30);
    expect(data.correct).toBe(24);
    expect(data.accuracy).toBe(80);
    expect(trainingActivity([], now).accuracy).toBeNull();
  });
});
