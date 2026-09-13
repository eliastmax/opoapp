// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import {
  PRODUCT_TOUR_STEPS,
  maintainTourSession,
  productTourJourneyLabel,
  productTourSceneCount,
  shouldOpenProductTour,
  type ProductTourScene,
} from "../product-tour";

const component = readFileSync(new URL("../../components/product-tour.tsx", import.meta.url), "utf8");
const settings = readFileSync(new URL("../../routes/_authenticated/ajustes.tsx", import.meta.url), "utf8");
const postAuth = readFileSync(new URL("../post-auth-route.ts", import.meta.url), "utf8");

const eligibility = (overrides: Partial<Parameters<typeof shouldOpenProductTour>[0]> = {}) =>
  shouldOpenProductTour({
    loading: false,
    error: false,
    completedAt: null,
    dismissedForSession: false,
    oppositionSelected: true,
    pathname: "/inicio",
    ...overrides,
  });

describe("ELI-99 final product tour", () => {
  it("opens automatically for an eligible fresh user and remains mounted across routes", () => {
    expect(eligibility()).toBe(true);
    expect(eligibility({ completedAt: "2026-09-11" })).toBe(false);
    expect(eligibility({ dismissedForSession: true })).toBe(false);
    expect(eligibility({ oppositionSelected: false })).toBe(false);
    const active = maintainTourSession(false, eligibility());
    expect(active).toBe(true);
    expect(maintainTourSession(active, eligibility({ pathname: "/crear" }))).toBe(true);
  });

  it("exposes exactly five learner ideas and zero Study scenes", () => {
    expect(PRODUCT_TOUR_STEPS).toHaveLength(5);
    expect(PRODUCT_TOUR_STEPS.map((_, index) => productTourSceneCount(index))).toEqual([1, 1, 1, 1, 1]);
    expect(PRODUCT_TOUR_STEPS.map((_, index) => productTourJourneyLabel(index))).toEqual(["Comprueba", "Ángulos", "Evidencia", "Progreso", "Siguiente"]);
    expect(PRODUCT_TOUR_STEPS.map((step) => step.scenes[0].title)).toEqual([
      "Una pregunta no basta",
      "Mismo concepto, distintos ángulos",
      "Tus respuestas generan evidencia",
      "Progreso muestra dominio real",
      "Tu siguiente entrenamiento ya está preparado",
    ]);
    const scenes = PRODUCT_TOUR_STEPS.flatMap((phase): ProductTourScene[] => [...phase.scenes]);
    const serialized = JSON.stringify(scenes);
    for (const forbidden of ["/estudio", "/estudiar/", "/recordar/", "study-preview", "flashcard"]) expect(serialized).not.toContain(forbidden);
  });

  it("keeps the demo learner-read-only and solution-safe", () => {
    expect(component).toContain('.from("product_tour_states")');
    for (const forbidden of ['.from("tests")', '.from("test_answers")', '.from("questions")', '.from("question_statistics")', "mastery", "flashcard"]) {
      expect(component).not.toContain(forbidden);
    }
    expect(component).not.toContain("respuesta_correcta");
    expect(component).not.toContain("opcion_correcta");
    expect(component).not.toContain("ProductTourStudyDemo");
    expect(component).not.toContain("ProductTourPracticeDemo");
  });

  it("persists only completion/skip while replay remains independent", () => {
    expect(component).toContain('completion_kind: kind');
    expect(component).toContain('persist("skipped")');
    expect(component).toContain('persist("completed")');
    expect(component).toContain("setReplaying(true)");
    expect(settings).toContain("useProductTour");
    expect(settings).toContain("Ver tutorial de OpoTest");
  });

  it("uses active opposition rather than preparation profile completion", () => {
    expect(postAuth).toContain('select("active_opposition_id")');
    expect(postAuth).not.toContain('from("preparation_profiles")');
  });
});
