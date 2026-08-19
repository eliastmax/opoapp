// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import { scheduleV4Flashcard } from "../v4-flashcards";

describe("V4 flashcard scheduling", () => {
  test("spaces known cards through the calm 3, 7, 14 and 30 day ladder", () => {
    expect(scheduleV4Flashcard("known", 0)).toMatchObject({
      correct: true,
      knownStreakAfter: 1,
      delayDays: 3,
    });
    expect(scheduleV4Flashcard("known", 1)).toMatchObject({ knownStreakAfter: 2, delayDays: 7 });
    expect(scheduleV4Flashcard("known", 2)).toMatchObject({ knownStreakAfter: 3, delayDays: 14 });
    expect(scheduleV4Flashcard("known", 3)).toMatchObject({ knownStreakAfter: 4, delayDays: 30 });
    expect(scheduleV4Flashcard("known", 8)).toMatchObject({ knownStreakAfter: 9, delayDays: 30 });
  });

  test("an unsure answer is not safe evidence and returns tomorrow", () => {
    expect(scheduleV4Flashcard("unsure", 4)).toEqual({
      rating: "unsure",
      correct: false,
      knownStreakAfter: 0,
      delayMinutes: 1440,
      delayDays: 1,
    });
  });

  test("a missed card resets the streak and returns after ten minutes", () => {
    expect(scheduleV4Flashcard("missed", 3)).toEqual({
      rating: "missed",
      correct: false,
      knownStreakAfter: 0,
      delayMinutes: 10,
      delayDays: null,
    });
  });

  test("sanitizes invalid previous streaks instead of inflating spacing", () => {
    expect(scheduleV4Flashcard("known", -10)).toMatchObject({ knownStreakAfter: 1, delayDays: 3 });
    expect(scheduleV4Flashcard("known", Number.NaN)).toMatchObject({
      knownStreakAfter: 1,
      delayDays: 3,
    });
  });
});
