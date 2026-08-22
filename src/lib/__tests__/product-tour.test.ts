// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { PRODUCT_TOUR_STEPS, maintainTourSession, shouldOpenProductTour } from "../product-tour";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260822190000_first_run_product_tour.sql",
    import.meta.url,
  ),
  "utf8",
);
const component = readFileSync(
  new URL("../../components/product-tour.tsx", import.meta.url),
  "utf8",
);
const layout = readFileSync(
  new URL("../../routes/_authenticated/route.tsx", import.meta.url),
  "utf8",
);
const today = readFileSync(
  new URL("../../routes/_authenticated/inicio.tsx", import.meta.url),
  "utf8",
);
const study = readFileSync(
  new URL("../../routes/_authenticated/estudio.tsx", import.meta.url),
  "utf8",
);

const eligibility = (overrides: Partial<Parameters<typeof shouldOpenProductTour>[0]> = {}) =>
  shouldOpenProductTour({
    loading: false,
    error: false,
    completedAt: null,
    dismissedForSession: false,
    preparationCompleted: true,
    pathname: "/inicio",
    ...overrides,
  });

describe("first-run spotlight tour", () => {
  it("opens automatically only for an eligible normal first entry", () => {
    expect(eligibility()).toBe(true);
    expect(eligibility({ preparationCompleted: false })).toBe(false);
    expect(eligibility({ pathname: "/preparacion" })).toBe(false);
    expect(eligibility({ loading: true })).toBe(false);
    expect(eligibility({ error: true })).toBe(false);
  });

  it("does not reopen after completion, omission or a safe session dismissal", () => {
    expect(eligibility({ completedAt: "2026-08-22" })).toBe(false);
    expect(eligibility({ dismissedForSession: true })).toBe(false);
  });

  it("keeps an automatic tour mounted after navigating from step 2 to Study", () => {
    const startedOnToday = maintainTourSession(false, eligibility());
    expect(startedOnToday).toBe(true);
    const eligibilityAfterNavigation = eligibility({ pathname: "/estudio" });
    expect(eligibilityAfterNavigation).toBe(false);
    expect(maintainTourSession(startedOnToday, eligibilityAfterNavigation)).toBe(true);
    expect(component).toContain("tourSessionActive");
    expect(component).toContain("replaying || tourSessionActive");
  });

  it("uses exactly six contextual steps on the existing real DOM targets", () => {
    expect(PRODUCT_TOUR_STEPS).toHaveLength(6);
    expect(PRODUCT_TOUR_STEPS.map((step) => step.target)).toEqual([
      "today-session",
      "nav-study",
      "study-topic",
      "nav-practice",
      "study-progress",
      "today-session",
    ]);
    expect(today).toContain('data-tour="today-session"');
    expect(layout).toContain('"nav-study"');
    expect(layout).toContain('"nav-practice"');
    expect(study).toContain('data-tour="study-progress"');
    expect(study).toContain('"study-topic"');
  });

  it("keeps the definitive concise copy and exact emphasis fragments", () => {
    expect(
      PRODUCT_TOUR_STEPS.map(({ title, description, emphasis }) => ({
        title,
        description,
        emphasis: [...emphasis],
      })),
    ).toEqual([
      {
        title: "Empieza por aquí",
        description: "OpoTest te propone qué hacer ahora: estudiar, practicar o repasar.",
        emphasis: ["estudiar, practicar o repasar"],
      },
      {
        title: "Aquí está todo tu temario",
        description: "Entra en cualquier tema, estudia sus unidades y ve qué has avanzado y qué te queda.",
        emphasis: ["qué has avanzado", "qué te queda"],
      },
      {
        title: "Estudia cada tema por partes",
        description: "Cada tema se divide en unidades para que puedas avanzar poco a poco sin perderte.",
        emphasis: ["poco a poco"],
      },
      {
        title: "Comprueba qué sabes de verdad",
        description: "Haz tests para descubrir qué dominas, dónde fallas y qué necesitas reforzar.",
        emphasis: ["qué dominas", "dónde fallas"],
      },
      {
        title: "Vuelve a lo que todavía falla",
        description: "Tus fallos, dudas y puntos débiles vuelven para que puedas trabajarlos otra vez.",
        emphasis: ["fallos, dudas y puntos débiles"],
      },
      {
        title: "Siempre sabrás qué hacer después",
        description: "Estudias, practicas y refuerzas. Con tu progreso, OpoTest te propone el siguiente paso.",
        emphasis: ["el siguiente paso"],
      },
    ]);
    for (const step of PRODUCT_TOUR_STEPS) {
      for (const fragment of step.emphasis) expect(step.description).toContain(fragment);
    }
    expect(component).toContain("EmphasizedDescription");
    expect(component).toContain("readonly string[]");
    expect(component).toContain("font-semibold text-foreground");
  });

  it("renders a measured spotlight and anchored coach mark without mockups", () => {
    expect(component).toContain("getBoundingClientRect");
    expect(component).toContain("scrollIntoView");
    expect(component).toContain("ResizeObserver");
    expect(component).toContain("MutationObserver");
    expect(component).toContain("12_000");
    expect(component).not.toContain("attempts++ < 180");
    expect(component).toContain('role="dialog"');
    expect(component).toContain('setAttribute("inert"');
    expect(component).not.toContain("TourVisual");
    expect(component).not.toContain("DialogContent");
  });

  it("keeps the coach mark compact and safe at 360, 390 and 430 px", () => {
    expect(Math.min(340, 360 - 32)).toBe(328);
    expect(Math.min(340, 390 - 32)).toBe(340);
    expect(Math.min(340, 430 - 32)).toBe(340);
    expect(component).toContain("Math.min(340, viewportWidth - 32)");
    expect(component).toContain("viewportWidth - width - 16");
    expect(component).toContain('className="mt-1 text-lg font-semibold leading-tight"');
    expect(component).toContain('className="mt-2 text-[15px] leading-[1.45] text-muted-foreground"');
    expect(component).not.toContain("ArrowLeft");
    expect(component).not.toContain("ArrowRight");
  });

  it("keeps Omitir visible and only shows Anterior after the first step", () => {
    expect(component).toContain("Omitir");
    expect(component).not.toContain('"Cerrar"');
    expect(component).toContain("{step > 0 && (");
    expect(component).toContain("Anterior");
    expect(component).toContain("Empezar mi sesión");
  });

  it("sequences a 120 ms exit before changing step and a settled 220 ms re-entry", () => {
    expect(component).toContain("setPopoverVisible(false)");
    expect(component).toContain("prefersReducedMotion() ? 0 : 130");
    expect(component).toContain('popoverVisible ? "210ms" : "120ms"');
    expect(component).toContain("prefersReducedMotion() ? 0 : 220");
    expect(component).toContain("setRouteTransition(true)");
    expect(component).toContain("routeTransition ? 1 : 0");
    expect(component).toContain("motion-reduce:transition-none");
  });

  it("keeps spotlight movement subtle with a single non-repeating target accent", () => {
    expect(component).toContain("targetAccent");
    expect(component).toContain("setTargetAccent(true)");
    expect(component).toContain("}, 240)");
    expect(component).toContain("transition-[top,left,width,height,box-shadow]");
    expect(component).not.toContain("animate-pulse");
  });

  it("persists completion and skip while replay preserves prior state", () => {
    expect(component).toContain('persist("skipped")');
    expect(component).toContain('persist("completed")');
    expect(component).not.toContain("delete()");
    expect(component).toContain("replaying ? closeSafely()");
    expect(component).toContain('navigate({ to: "/inicio" })');
  });

  it("keeps strict per-user RLS and no local truth source", () => {
    expect(migration).toContain("user_id uuid PRIMARY KEY REFERENCES auth.users(id)");
    expect(migration.match(/user_id = \(SELECT auth\.uid\(\)\)/g)?.length).toBeGreaterThanOrEqual(
      3,
    );
    expect(component).not.toContain("localStorage");
    expect(component).not.toContain("onAuthStateChange");
  });
});
