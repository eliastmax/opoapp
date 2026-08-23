// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import {
  PRODUCT_TOUR_STEPS,
  maintainTourSession,
  productTourJourneyLabel,
  productTourPath,
  productTourScene,
  productTourSceneCount,
  shouldOpenProductTour,
  type ProductTourScene,
} from "../product-tour";

const component = readFileSync(
  new URL("../../components/product-tour.tsx", import.meta.url),
  "utf8",
);
const studyDemo = readFileSync(
  new URL("../../components/product-tour-study-demo.tsx", import.meta.url),
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
const study = readFileSync(
  new URL("../../routes/_authenticated/estudio.tsx", import.meta.url),
  "utf8",
);
const studyUnit = readFileSync(
  new URL("../../routes/_authenticated/estudiar.$unitId.tsx", import.meta.url),
  "utf8",
);
const preparationFlow = readFileSync(
  new URL("../../components/v3/preparation-profile-flow.tsx", import.meta.url),
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

describe("short product tour v2", () => {
  it("opens automatically only for an eligible first entry and remains mounted across routes", () => {
    expect(eligibility()).toBe(true);
    expect(eligibility({ preparationCompleted: false })).toBe(false);
    expect(eligibility({ completedAt: "2026-08-23" })).toBe(false);
    expect(eligibility({ dismissedForSession: true })).toBe(false);
    expect(eligibility({ pathname: "/estudio" })).toBe(false);

    const active = maintainTourSession(false, eligibility());
    expect(active).toBe(true);
    expect(maintainTourSession(active, eligibility({ pathname: "/estudio" }))).toBe(true);
    expect(component).toContain("replaying || tourSessionActive");
  });

  it("reduces the journey to four value moments", () => {
    expect(PRODUCT_TOUR_STEPS).toHaveLength(4);
    expect(PRODUCT_TOUR_STEPS.map((_, index) => productTourSceneCount(index))).toEqual([4, 3, 1, 1]);
    expect(PRODUCT_TOUR_STEPS.map((_, index) => productTourJourneyLabel(index))).toEqual([
      "Estudia",
      "Practica",
      "Progreso",
      "Hoy",
    ]);

    const scenes = PRODUCT_TOUR_STEPS.flatMap<ProductTourScene>((phase) => phase.scenes);
    expect(scenes.map((scene) => scene.target)).toEqual([
      "study-unit",
      "tour-study-understand",
      "tour-study-traps",
      "tour-study-flashcard",
      "practice-builder",
      "practice-levels",
      "practice-check",
      "progress-overview",
      "today-session",
    ]);
  });

  it("uses Today exactly once and only as the final close", () => {
    const scenes = PRODUCT_TOUR_STEPS.flatMap<ProductTourScene>((phase) => phase.scenes);
    const todayScenes = scenes.filter((scene) => scene.target === "today-session");
    expect(todayScenes).toHaveLength(1);
    expect(PRODUCT_TOUR_STEPS[3].final).toBe(true);
    expect(PRODUCT_TOUR_STEPS[3].scenes[0].route).toBe("/inicio");
    expect(PRODUCT_TOUR_STEPS[3].scenes[0].title).toContain("¿qué hago hoy?");
    expect(component).toContain('\"Empezar mi sesión\"');
  });

  it("keeps copy short, direct and benefit-led", () => {
    const scenes = PRODUCT_TOUR_STEPS.flatMap<ProductTourScene>((phase) => phase.scenes);
    for (const scene of scenes) {
      expect(scene.title.split(/\s+/).length).toBeLessThanOrEqual(8);
      expect(scene.description.length).toBeLessThanOrEqual(90);
      for (const fragment of scene.emphasis) expect(scene.description).toContain(fragment);
    }
    expect(productTourScene(0, 1).title).toBe("Entiende lo importante");
    expect(productTourScene(0, 2).title).toBe("No caigas en las trampas");
    expect(productTourScene(1, 1).title).toBe("No practiques siempre igual");
    expect(productTourScene(2, 0).title).toBe("Tus fallos sirven para algo");
  });

  it("uses focused study scenes instead of chasing long-page scroll targets", () => {
    expect(studyDemo).toContain('data-tour="tour-study-understand"');
    expect(studyDemo).toContain('data-tour="tour-study-traps"');
    expect(studyDemo).toContain('data-tour="tour-study-flashcard"');
    expect(studyDemo).toContain('className="fixed inset-0 z-[50] overflow-hidden bg-background"');
    expect(studyDemo).toContain("Al estudiar verás el resumen completo.");
    expect(studyDemo).toContain("data.keys.slice(0, 1)");
    expect(studyDemo).toContain("data.confusions.slice(0, 1)");
    expect(studyDemo).toContain("data.traps.slice(0, 1)");
    expect(component).toContain('targetName.startsWith("tour-study-")');
    expect(component).toContain("isDemoTarget(item.target)");
  });

  it("keeps study focus mode read-only and based on real catalog content", () => {
    expect(studyDemo).toContain('.from("study_units")');
    expect(studyDemo).toContain('.from("concepts")');
    expect(studyDemo).toContain('.from("flashcards")');
    expect(studyDemo).not.toContain(".insert(");
    expect(studyDemo).not.toContain(".update(");
    expect(studyDemo).not.toContain("complete_my_v4_study_unit");
    expect(studyDemo).not.toContain("review_my_v4_flashcard");
    expect(studyDemo).toContain("Vista del tutorial · tu progreso no cambia");

    expect(productTourPath("study-preview", "unit-1")).toBe("/estudiar/unit-1");
    expect(productTourPath("study-preview", null)).toBeNull();
    expect(component).toContain('search: { tour: "preview" }');
    expect(studyUnit).toContain('tour: search.tour === "preview" ? "preview" : undefined');
    expect(studyUnit).toContain("if (previewing) return loadStudyPreview(unitId)");
  });

  it("keeps a real unit with flashcards available for the tour", () => {
    expect(study).toContain("model.continuation?.activeFlashcards");
    expect(study).toContain("model.units.find((unit) => unit.activeFlashcards > 0)");
    expect(study).toContain('data-tour={tourTarget ? "study-unit" : undefined}');
    expect(study).toContain("data-tour-unit-id");
  });

  it("turns the three learning levels into one fast unlock demonstration", () => {
    expect(practiceDemo).toContain("Tres niveles. Tres objetivos.");
    expect(practiceDemo).toContain("Empiezas por la base y avanzas cuando tu práctica demuestra seguridad.");
    expect(practiceDemo).toContain("Base, reglas y conceptos esenciales. Empiezas aquí.");
    expect(practiceDemo).toContain("Se desbloquea cuando tu base ya es estable.");
    expect(practiceDemo).toContain("Se desbloquea tras consolidar con seguridad.");
    expect(practiceDemo).toContain("<Lock");
    expect(practiceDemo).toContain("<LockOpen");
    expect(practiceDemo).toContain("setUnlocked(1)");
    expect(practiceDemo).toContain("setUnlocked(2)");
    expect(practiceDemo).toContain("setUnlocking(1)");
    expect(practiceDemo).toContain("setUnlocking(2)");
    expect(practiceDemo).toContain("tour-lock-release");
    expect(practiceDemo).toContain("tour-unlock-pop");
    expect(practiceDemo).toContain("Desbloqueado");
    expect(practiceDemo).toContain('data-tour="practice-levels"');
  });

  it("shows a real question, visibly selects a wrong answer and then corrects it", () => {
    expect(practiceDemo).toContain('supabase.rpc("prepare_my_v4_today_context")');
    expect(practiceDemo).toContain('.from("questions")');
    expect(practiceDemo).toContain('setAnswerPhase("selected")');
    expect(practiceDemo).toContain('setAnswerPhase("feedback")');
    expect(practiceDemo).toContain("Tu respuesta");
    expect(practiceDemo).toContain("Respuesta correcta");
    expect(practiceDemo).toContain("font-normal leading-[1.45] text-success");
    expect(practiceDemo).toContain('data-tour="practice-check"');

    expect(practiceDemo).not.toContain('.from("tests")');
    expect(practiceDemo).not.toContain('.from("test_answers")');
    expect(practiceDemo).not.toContain(".insert(");
    expect(practiceDemo).not.toContain(".update(");
    expect(practiceDemo).not.toContain("complete_test");
  });

  it("makes the coach marks easier to read", () => {
    expect(component).toContain('text-[24px]');
    expect(component).toContain('text-[18px]');
    expect(component).toContain('text-[17px]');
    expect(component).toContain('text-[15px]');
    expect(component).toContain("Saltar tutorial");
    expect(component).toContain("Paso {step + 1} de {PRODUCT_TOUR_STEPS.length}");
    expect(component).toContain("h-12 px-5 text-[17px] font-bold");
    expect(component).toContain("visualViewport");
    expect(studyDemo).toContain('@media (min-width: 900px)');
    expect(studyDemo).toContain('right: 24px !important');
    expect(studyDemo).toContain('@media (max-width: 899px)');
    expect(studyDemo).toContain('bottom: 12px !important');
    expect(practiceDemo).toContain('max-height: 43dvh !important');
  });

  it("uses dots for micro-scenes instead of nested numeric progress", () => {
    expect(component).toContain("const dots = Array.from");
    expect(component).toContain("Momento ${scene + 1} de ${sceneCount}");
    expect(component).not.toContain("{journeyLabel} · {scene + 1} de {sceneCount}");
  });

  it("keeps the initial assessment readable without exposing background-save noise", () => {
    expect(preparationFlow).toContain('text-[16px] font-semibold text-muted-foreground');
    expect(preparationFlow).toContain('text-[22px] font-bold leading-[1.25]');
    expect(preparationFlow).toContain('text-[17px] leading-[1.5] text-muted-foreground');
    expect(preparationFlow).toContain('min-h-[82px]');
    expect(preparationFlow).toContain('text-[18px] font-bold');
    expect(preparationFlow).toContain('text-[16px] leading-[1.4] text-muted-foreground');
    expect(preparationFlow).not.toContain("Cambios guardados");
  });

  it("still exposes the real navigation targets required by the four steps", () => {
    expect(layout).toContain('"nav-study"');
    expect(layout).toContain('"nav-practice"');
    expect(layout).toContain('"nav-progress"');
    expect(layout).toContain('"practice-builder"');
    expect(layout).toContain('"progress-overview"');
    expect(today).toContain('data-tour="today-session"');
  });
});
