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

  it("uses six contextual steps on real stable DOM targets", () => {
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

  it("uses selective emphasis and continuous coach-mark motion", () => {
    expect(PRODUCT_TOUR_STEPS.every((step) => step.description.includes(step.emphasis))).toBe(true);
    expect(component).toContain("EmphasizedDescription");
    expect(component).toContain("font-semibold text-card-foreground");
    expect(component).toContain("setPopoverVisible(false)");
    expect(component).toContain("duration-200 ease-out");
    expect(component).toContain("scale-[0.98]");
    expect(component).toContain("transition-[top,left,width,height,opacity]");
    expect(component).not.toContain("zoom-in-95");
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
