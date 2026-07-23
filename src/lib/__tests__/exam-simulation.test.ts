// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, it } from "bun:test";
import {
  elapsedExamMinutes,
  examDeadline,
  formatExamTime,
  remainingExamSeconds,
} from "@/lib/exam-simulation";

describe("exam simulation time", () => {
  const start = "2026-07-23T20:00:00.000Z";

  it("calculates a deadline from the server start time", () => {
    expect(examDeadline(start, 60)).toBe(new Date("2026-07-23T21:00:00.000Z").getTime());
  });

  it("never reports a negative remaining time", () => {
    expect(remainingExamSeconds(start, 60, new Date("2026-07-23T20:59:30.000Z").getTime())).toBe(
      30,
    );
    expect(remainingExamSeconds(start, 60, new Date("2026-07-23T21:05:00.000Z").getTime())).toBe(0);
  });

  it("formats short and long countdowns", () => {
    expect(formatExamTime(65)).toBe("01:05");
    expect(formatExamTime(3_665)).toBe("1:01:05");
  });

  it("caps elapsed time at the configured duration", () => {
    expect(elapsedExamMinutes(start, "2026-07-23T20:42:10.000Z", 60)).toBe(43);
    expect(elapsedExamMinutes(start, "2026-07-23T21:10:00.000Z", 60)).toBe(60);
  });
});
