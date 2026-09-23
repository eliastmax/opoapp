// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const tour = readFileSync(new URL("../../components/product-tour.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");

describe("ELI-99 tutorial layout and progress readability", () => {
  it("lets the component own its responsive bottom-sheet geometry", () => {
    expect(tour).toContain("min-[700px]:items-center");
    expect(tour).toContain("overflow-y-auto");
    expect(tour).toContain("max-w-md");
    expect(styles).not.toContain('html body [role="dialog"][aria-labelledby="tour-title"]');
    expect(styles).not.toContain("max-height: min(46dvh, 380px)");
  });

  it("supports skip, back and a deterministic final close", () => {
    expect(tour).toContain("Omitir");
    expect(tour).toContain("Volver al paso anterior");
    expect(tour).toContain("Terminar tutorial");
    expect(tour).toContain('persist("completed")');
    expect(tour).toContain('persist("skipped")');
  });

  it("retains the larger minimum readable typography on Progress", () => {
    expect(styles).toContain('main:has([data-tour="progress-overview"]) h1');
    expect(styles).toContain("font-size: 2rem !important");
    expect(styles).toContain('main:has([data-tour="progress-overview"]) .text-sm');
    expect(styles).toContain("font-size: 1rem !important");
    expect(styles).toContain('main:has([data-tour="progress-overview"]) .text-xs');
    expect(styles).toContain("font-size: 0.875rem !important");
  });
});
