// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import {
  PRODUCT_TOUR_STEPS,
  maintainTourSession,
  productTourJourneyLabel,
  productTourScene,
  productTourSceneCount,
  shouldOpenProductTour,
  type ProductTourScene,
} from "../product-tour";

const component = readFileSync(
  new URL("../../components/product-tour.tsx", import.meta.url),
  "utf8",
);
const practiceDemo = readFileSync(
  new URL("../../components/product-tour-practice-demo.tsx", import.meta.url),
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
const settings = readFileSync(
  new URL("../../routes/_authenticated/ajustes.tsx", import.meta.url),
  "utf8",
);
const postAuth = readFileSync(new URL("../post-auth-route.ts", import.meta.url), "utf8");

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

describe("tests-first product shell", () => {
  it("opens the tour once from Today and keeps it mounted while moving through the app", () => {
    expect(eligibility()).toBe(true);
    expect(eligibility({ completedAt: "2026-09-02" })).toBe(false);
    expect(eligibility({ dismissedForSession: true })).toBe(false);
    expect(eligibility({ pathname: "/crear" })).toBe(false);

    const active = maintainTourSession(false, eligibility());
    expect(active).toBe(true);
    expect(maintainTourSession(active, eligibility({ pathname: "/crear" }))).toBe(true);
    expect(component).toContain("replaying || tourSessionActive");
  });

  it("teaches training, configuration, progress and Today without exposing Study", () => {
    expect(PRODUCT_TOUR_STEPS).toHaveLength(4);
    expect(PRODUCT_TOUR_STEPS.map((_, index) => productTourSceneCount(index))).toEqual([1, 6, 1, 1]);
    expect(PRODUCT_TOUR_STEPS.map((_, index) => productTourJourneyLabel(index))).toEqual([
      "Entrena",
      "Configura",
      "Progreso",
      "“Hoy”",
    ]);

    const scenes = PRODUCT_TOUR_STEPS.flatMap<ProductTourScene>((phase) => phase.scenes);
    expect(scenes.some((scene) => scene.route === "/estudio")).toBe(false);
    expect(scenes.some((scene) => scene.route === "study-preview")).toBe(false);
    expect(scenes.some((scene) => scene.target === "study-unit")).toBe(false);
    expect(scenes.some((scene) => scene.target.includes("flashcard"))).toBe(false);
    expect(productTourScene(0, 0).target).toBe("nav-practice");
    expect(productTourScene(1, 0).target).toBe("practice-builder");
  });

  it("keeps the three practice levels and feedback demo read-only", () => {
    expect(productTourScene(1, 1).title).toBe("Aprendizaje · Construye la base");
    expect(productTourScene(1, 2).title).toBe("Consolidación · Domina lo que confunde");
    expect(productTourScene(1, 3).title).toBe("Tribunal · Prepárate para el examen");
    expect(productTourScene(1, 4).target).toBe("tour-study-practice-question");
    expect(productTourScene(1, 5).target).toBe("tour-study-practice-feedback");
    expect(practiceDemo).toContain('.from("questions")');
    expect(practiceDemo).not.toContain('.from("tests")');
    expect(practiceDemo).not.toContain('.from("test_answers")');
    expect(practiceDemo).not.toContain(".insert(");
    expect(practiceDemo).not.toContain(".update(");
  });

  it("makes Today the tests-first landing instead of a study-plan dashboard", () => {
    expect(today).toContain('queryKey: ["today-tests-first"]');
    expect(today).toContain("Entrenar ahora");
    expect(today).toContain("Continuar test");
    expect(today).toContain('data-tour="today-session"');
    expect(today).not.toContain("WeeklyRoadmapSummary");
    expect(today).not.toContain("Centro de estudio");
    expect(today).not.toContain('to: "/estudio"');
    expect(today).not.toContain('from("preparation_profiles")');
    expect(today).not.toContain("prepare_my_v4_today_context");
  });

  it("bypasses the old preparation-profile completion gate once an opposition is active", () => {
    expect(postAuth).toContain('select("active_opposition_id")');
    expect(postAuth).toContain('return profile.data?.active_opposition_id ? "/inicio" : "/preparacion"');
    expect(postAuth).not.toContain('from("preparation_profiles")');
    expect(postAuth).not.toContain('status === "completed"');
  });

  it("exposes the new five-section navigation and no Study tab", () => {
    expect(layout).toContain('{ to: "/inicio", label: "Hoy"');
    expect(layout).toContain('{ to: "/crear", label: "Entrenar"');
    expect(layout).toContain('{ to: "/progreso", label: "Progreso"');
    expect(layout).toContain('{ to: "/historial", label: "Historial"');
    expect(layout).toContain('{ to: "/ajustes", label: "Ajustes"');
    expect(layout).toContain('"nav-practice"');
    expect(layout).toContain('"nav-progress"');
    expect(layout).not.toContain('{ to: "/estudio"');
    expect(layout).not.toContain('"nav-study"');
  });

  it("updates settings language to the tests-first direction", () => {
    expect(settings).toContain("Repasa cómo entrenar y leer tu progreso");
    expect(settings).toContain("Datos de entrenamiento");
    expect(settings).not.toContain("Repasa cómo estudiar con la app");
    expect(settings).not.toContain("Datos de estudio");
  });

  it("keeps concise tour copy and closes on Today", () => {
    const scenes = PRODUCT_TOUR_STEPS.flatMap<ProductTourScene>((phase) => phase.scenes);
    for (const scene of scenes) {
      expect(scene.title.split(/\s+/).length).toBeLessThanOrEqual(8);
      expect(scene.description.length).toBeLessThanOrEqual(110);
      for (const fragment of scene.emphasis) expect(scene.description).toContain(fragment);
    }
    expect(PRODUCT_TOUR_STEPS[3].final).toBe(true);
    expect(PRODUCT_TOUR_STEPS[3].scenes[0].route).toBe("/inicio");
    expect(PRODUCT_TOUR_STEPS[3].scenes[0].title).toContain("entrenamiento");
  });
});
