// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import {
  PRODUCT_TOUR_STEPS,
  maintainTourSession,
  productTourPath,
  productTourScene,
  productTourSceneCount,
  shouldOpenProductTour,
  type ProductTourScene,
} from "../product-tour";

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
const studyUnit = readFileSync(
  new URL("../../routes/_authenticated/estudiar.$unitId.tsx", import.meta.url),
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

  it("keeps an automatic tour mounted while it moves through Study", () => {
    const startedOnToday = maintainTourSession(false, eligibility());
    expect(startedOnToday).toBe(true);
    const eligibilityAfterNavigation = eligibility({ pathname: "/estudio" });
    expect(eligibilityAfterNavigation).toBe(false);
    expect(maintainTourSession(startedOnToday, eligibilityAfterNavigation)).toBe(true);
    expect(component).toContain("tourSessionActive");
    expect(component).toContain("replaying || tourSessionActive");
  });

  it("keeps six top-level moments while teaching summary and flashcards inside Study", () => {
    expect(PRODUCT_TOUR_STEPS).toHaveLength(6);
    expect(PRODUCT_TOUR_STEPS.map((_, index) => productTourSceneCount(index))).toEqual([
      1, 1, 1, 2, 1, 1,
    ]);
    expect(
      PRODUCT_TOUR_STEPS.flatMap<ProductTourScene>((phase) => phase.scenes).map(
        (scene) => scene.target,
      ),
    ).toEqual([
      "today-session",
      "nav-study",
      "study-unit",
      "study-summary",
      "flashcard-preview",
      "nav-practice",
      "today-session",
    ]);
    expect(today).toContain('data-tour="today-session"');
    expect(layout).toContain('"nav-study"');
    expect(layout).toContain('"nav-practice"');
    expect(study).toContain('data-tour={tourTarget ? "study-unit" : undefined}');
    expect(studyUnit).toContain('data-tour="study-summary"');
    expect(studyUnit).toContain('data-tour="flashcard-preview"');
  });

  it("routes the learning demonstration to the real unit in read-only preview mode", () => {
    expect(productTourPath("study-preview", "unit-123")).toBe("/estudiar/unit-123");
    expect(productTourPath("study-preview", null)).toBeNull();
    expect(component).toContain('search: { tour: "preview" }');
    expect(studyUnit).toContain('tour: search.tour === "preview" ? "preview" : undefined');
    expect(studyUnit).toContain("if (previewing) return loadStudyPreview(unitId)");
    expect(studyUnit).toContain('.from("study_units")');
    expect(studyUnit).toContain('.from("concepts")');
    expect(studyUnit).toContain('.from("flashcards")');
    expect(studyUnit).toContain("if (previewing) return;");
    expect(studyUnit).toContain("Vista del tutorial · tu progreso no cambia");
  });

  it("uses real catalog content for the flashcard preview without reviewing it", () => {
    expect(studyUnit).toContain("const previewFlashcard = data.flashcards[0] ?? null");
    expect(studyUnit).toContain("{previewFlashcard.prompt}");
    expect(studyUnit).toContain("{previewFlashcard.answer}");
    expect(studyUnit).not.toContain("review_my_v4_flashcard");
  });

  it("keeps concise copy with selective emphasis", () => {
    const scenes = PRODUCT_TOUR_STEPS.flatMap<ProductTourScene>((phase) => phase.scenes);
    expect(scenes.map((scene) => scene.title)).toEqual([
      "Empieza por aquí",
      "Aquí está todo tu temario",
      "Estudia cada tema por partes",
      "Aquí es donde estudias",
      "Después, intenta recordarlo",
      "Comprueba qué sabes de verdad",
      "Siempre sabrás qué hacer después",
    ]);
    for (const scene of scenes) {
      for (const fragment of scene.emphasis) expect(scene.description).toContain(fragment);
    }
    expect(productTourScene(3, 0).emphasis).toEqual(["resumen, claves y conceptos"]);
    expect(productTourScene(3, 1).emphasis).toEqual(["qué recuerdas sin mirar"]);
    expect(component).toContain("EmphasizedDescription");
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

  it("keeps the coach mark readable and safe at 360, 390 and 430 px", () => {
    expect(Math.min(340, 360 - 32)).toBe(328);
    expect(Math.min(340, 390 - 32)).toBe(340);
    expect(Math.min(340, 430 - 32)).toBe(340);
    expect(component).toContain("Math.min(340, viewportWidth - 32)");
    expect(component).toContain("viewportWidth - width - 16");
    expect(component).toContain("min-[390px]:p-[18px]");
    expect(component).toContain(
      'className="mt-3 text-[19px] font-semibold leading-[1.2] min-[390px]:text-xl"',
    );
    expect(component).toContain('className="mt-2 text-base leading-[1.45] text-muted-foreground"');
  });

  it("keeps Omitir visible and exposes Anterior after the first scene", () => {
    expect(component).toContain("Omitir");
    expect(component).not.toContain('"Cerrar"');
    expect(component).toContain("step > 0 || scene > 0");
    expect(component).toContain("Anterior");
    expect(component).toContain("Empezar mi sesión");
  });

  it("moves smoothly between routes and between the two Study targets", () => {
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
