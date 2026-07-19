// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import { keepActiveFailureIds, uniqueActiveFailureIds } from "../active-failures";

describe("active failures helpers", () => {
  it("returns unique non-null active failure ids", () => {
    expect(
      uniqueActiveFailureIds([
        { question_id: "q1" },
        { question_id: null },
        { question_id: "q1" },
        { question_id: "q2" },
      ]),
    ).toEqual(["q1", "q2"]);
  });

  it("keeps only failures that are still active", () => {
    expect(
      keepActiveFailureIds(
        ["corrected", "still-failed", "still-failed", "failed-again"],
        [{ question_id: "still-failed" }, { question_id: "failed-again" }],
      ),
    ).toEqual(["still-failed", "failed-again"]);
  });

  it("returns an empty list after all historical failures are corrected", () => {
    expect(keepActiveFailureIds(["corrected"], [])).toEqual([]);
  });
});
