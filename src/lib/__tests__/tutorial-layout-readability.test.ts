// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const tour = readFileSync(
  new URL("../../components/product-tour.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");

describe("tutorial layout and progress readability", () => {
  it("keeps demo geometry stationary and separates the coach mark by viewport", () => {
    expect(styles).toContain("@media (min-width: 1400px)");
    expect(styles).toContain("@media (max-width: 1399px)");
    expect(styles).toContain('[role="dialog"][aria-labelledby="tour-title"]');
    expect(styles).toContain("right: 24px !important");
    expect(styles).toContain("bottom: 12px !important");
    expect(styles).toContain("max-height: min(46dvh, 380px) !important");
    expect(styles).toContain("transform: none !important");
    expect(tour).toContain("const compactLayout = window.innerWidth < 1400");
    expect(tour).toContain("Math.min(300, vh * 0.38)");
    expect(tour).toContain('block: "start"');
  });

  it("lets the user close the final screen without starting the session", () => {
    expect(tour).toContain("onCloseFinal");
    expect(tour).toContain('finalScene ? "Cerrar"');
    expect(tour).toContain("if (finalScene) onCloseFinal()");
    expect(tour).toContain('onCloseFinal={() => (replaying ? closeSafely() : void persist("completed"))}');
    expect(tour).toContain('finalScene ? "Empezar mi sesión"');
  });

  it("raises the minimum readable typography on Progress", () => {
    expect(styles).toContain('main:has([data-tour="progress-overview"]) h1');
    expect(styles).toContain("font-size: 2rem !important");
    expect(styles).toContain('main:has([data-tour="progress-overview"]) .text-sm');
    expect(styles).toContain("font-size: 1rem !important");
    expect(styles).toContain('main:has([data-tour="progress-overview"]) .text-xs');
    expect(styles).toContain("font-size: 0.875rem !important");
    expect(styles).toContain('[class~="text-[11px]"]');
    expect(styles).toContain('[class~="text-[10px]"]');
    expect(styles).toContain('[class~="text-[9px]"]');
    expect(styles).toContain('button[aria-label^="Abrir detalle del Tema"]');
  });
});
