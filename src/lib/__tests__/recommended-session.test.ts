// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import { describeRecommendedSession, RECOMMENDED_SESSION_SIZES } from "../recommended-session";

describe("recommended session presentation", () => {
  it("keeps the quick size selector intentionally small", () => {
    expect(RECOMMENDED_SESSION_SIZES).toEqual([5, 10, 20]);
  });

  it("explains only the groups that were actually selected", () => {
    expect(
      describeRecommendedSession({
        selected_count: 10,
        review_count: 4,
        current_topic_count: 3,
        weak_count: 0,
        retention_new_count: 2,
        fallback_count: 1,
        current_topic_name: "Procedimiento administrativo",
      }),
    ).toBe(
      "Sesión preparada: 4 de repaso, 3 del tema actual, 2 de retención o nuevas, 1 de variedad.",
    );
  });
});
