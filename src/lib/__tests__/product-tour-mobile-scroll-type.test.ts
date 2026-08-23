// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const component = readFileSync(
  new URL("../../components/product-tour.tsx", import.meta.url),
  "utf8",
);

describe("mobile product tour acceptance", () => {
  it("keeps forcing the first study unit into view until route scroll settles", () => {
    expect(component).toContain('const enforceStudyUnitScroll = item.target === "study-unit"');
    expect(component).toContain("const alignmentDelays = [160, 380, 680]");
    expect(component).toContain("bringRealTargetIntoView(target, item.target, true)");
    expect(component).toContain("scrollTimers.forEach((timer) => window.clearTimeout(timer))");
  });

  it("uses the larger mobile-first typography across every coach-mark layer", () => {
    expect(component).toContain('text-[16px] font-bold');
    expect(component).toContain('text-[25px] leading-[1.16]');
    expect(component).toContain('text-[19px] leading-[1.45]');
    expect(component).toContain('h-12 px-5 text-[18px]');
    expect(component).toContain('text-[27px] leading-[1.16]');
    expect(component).toContain('text-[20px] leading-[1.5]');
  });
});
