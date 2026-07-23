// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, it } from "bun:test";
import { resultFeedback } from "@/lib/result-feedback";

describe("resultFeedback", () => {
  it("celebrates a perfect test without claiming mastery of the topic", () => {
    const result = resultFeedback({
      percentage: 100,
      correct: 10,
      failures: 0,
      unanswered: 0,
      doubts: 0,
      questionCount: 10,
    });

    expect(result.title).toBe("Test perfecto");
    expect(result.message).not.toContain("tema dominado");
  });

  it("distinguishes a perfect score that still contains doubts", () => {
    const result = resultFeedback({
      percentage: 100,
      correct: 10,
      failures: 0,
      unanswered: 0,
      doubts: 2,
      questionCount: 10,
    });

    expect(result.title).toContain("dudas");
    expect(result.message).toContain("seguridad");
  });

  it("uses the excellent tier from 90 percent", () => {
    const result = resultFeedback({
      percentage: 90,
      correct: 9,
      failures: 1,
      unanswered: 0,
      doubts: 0,
      questionCount: 10,
    });

    expect(result.tone).toBe("excellent");
    expect(result.message).toContain("1 fallo");
  });

  it("uses the solid tier from 75 percent", () => {
    expect(
      resultFeedback({
        percentage: 80,
        correct: 8,
        failures: 2,
        unanswered: 0,
        doubts: 1,
        questionCount: 10,
      }).tone,
    ).toBe("solid");
  });

  it("uses the building tier from 60 percent", () => {
    expect(
      resultFeedback({
        percentage: 60,
        correct: 6,
        failures: 4,
        unanswered: 0,
        doubts: 0,
        questionCount: 10,
      }).tone,
    ).toBe("building");
  });

  it("frames low results as a useful diagnosis", () => {
    const result = resultFeedback({
      percentage: 40,
      correct: 4,
      failures: 5,
      unanswered: 1,
      doubts: 0,
      questionCount: 10,
    });

    expect(result.tone).toBe("diagnostic");
    expect(result.message).toContain("no es una sentencia");
  });
});
