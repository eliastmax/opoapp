// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const component = readFileSync(new URL("../../components/product-tour.tsx", import.meta.url), "utf8");

describe("ELI-99 mobile product tour acceptance", () => {
  it("fits a scrollable safe-area sheet at 360, 390 and 430 without legacy geometry hacks", () => {
    expect(component).toContain("max-w-md");
    expect(component).toContain("max-h-[calc(100svh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-1.5rem)]");
    expect(component).toContain("overflow-y-auto");
    expect(component).toContain("env(safe-area-inset-top,0px)");
    expect(component).toContain("env(safe-area-inset-bottom,0px)");
    expect(component).toContain("min-[390px]:p-5");
    expect(component).not.toContain("enforceStudyUnitScroll");
    expect(component).not.toContain("alignmentDelays");
  });

  it("keeps readable touch targets and reduced-motion-safe transitions", () => {
    expect(component).toContain("text-[24px]");
    expect(component).toContain("min-[390px]:text-[26px]");
    expect(component).toContain("text-[16px] leading-[1.5]");
    expect(component).toContain("h-12");
    expect(component).toContain("motion-reduce:transition-none");
    expect(component).toContain("Paso ${step + 1} de 5");
  });
});
