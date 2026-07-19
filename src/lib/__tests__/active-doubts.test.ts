// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import { keepActiveDoubtIds, uniqueActiveDoubtIds } from "../active-doubts";

describe("active doubts helpers", () => {
  it("returns unique non-null active doubt ids", () => {
    expect(
      uniqueActiveDoubtIds([
        { question_id: "q1" },
        { question_id: null },
        { question_id: "q1" },
        { question_id: "q2" },
      ]),
    ).toEqual(["q1", "q2"]);
  });

  it("keeps only doubts that are still active", () => {
    expect(
      keepActiveDoubtIds(
        ["cleared", "still-doubt", "still-doubt", "doubted-again"],
        [{ question_id: "still-doubt" }, { question_id: "doubted-again" }],
      ),
    ).toEqual(["still-doubt", "doubted-again"]);
  });

  it("returns an empty list after all historical doubts are cleared", () => {
    expect(keepActiveDoubtIds(["cleared"], [])).toEqual([]);
  });
});
