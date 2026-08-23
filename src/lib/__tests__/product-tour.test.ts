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
const preparationPage = readFileSync(
  new URL("../../routes/_authenticated/preparacion.tsx", import.meta.url),
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

  it("keeps four value moments while giving every micro-scene one exact target", () => {
    expect(PRODUCT_TOUR_STEPS).toHaveLength(4);
    expect(PRODUCT_TOUR_STEPS.map((_, index) => productTourSceneCount(index))).toEqual([5, 6, 1, 1]);
    expect(PRODUCT_TOUR_STEPS.map((_, index) => productTourJourneyLabel(index))).toEqual([
      "Estudia",
      "Practica",
      "Progreso",
      "“Hoy”",
    ]);

    const scenes = PRODUCT_TOUR_STEPS.flatMap<ProductTourScene>((phase) => phase.scenes);
    expect(scenes.map((scene) => scene.target)).toEqual([
      "study-unit",
      "tour-study-understand",
      "tour-study-traps",
      "tour-study-flashcard-question",
      "tour-study-flashcard-answer",
      "practice-builder",
      "tour-study-practice-aprendizaje",
      "tour-study-practice-consolidacion",
      "tour-study-practice-tribunal",
      "tour-study-practice-question",
      "tour-study-practice-feedback",
      "progress-overview",
      "today-session",
    ]);
    expect(new Set(scenes.map((scene) => scene.target)).size).toBe(scenes.length);
  });

  it("uses Today exactly once and only as the final close", () => {
    const scenes = PRODUCT_TOUR_STEPS.flatMap<ProductTourScene>((phase) => phase.scenes);
    const todayScenes = scenes.filter((scene) => scene.target === "today-session");
    expect(todayScenes).toHaveLength(1);
    expect(PRODUCT_TOUR_STEPS[3].final).toBe(true);
    expect(PRODUCT_TOUR_STEPS[3].scenes[0].route).toBe("/inicio");
    expect(productTourJourneyLabel(3)).toBe("“Hoy”");
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
    expect(productTourScene(1, 1).title).toBe("Aprendizaje · Construye la base");
    expect(productTourScene(1, 2).title).toBe("Consolidación · Domina lo que confunde");
    expect(productTourScene(1, 3).title).toBe("Tribunal · Prepárate para el examen");
    expect(productTourScene(1, 1).description).toContain("con criterio");
    expect(productTourScene(1, 2).description).toContain("fallos de examen");
    expect(productTourScene(1, 3).description).toContain("exámenes oficiales");
    expect(productTourScene(2, 0).title).toBe("Tus fallos sirven para algo");
  });

  it("uses fixed compact study targets and a real two-face flashcard", () => {
    expect(studyDemo).toContain('data-tour="tour-study-understand"');
    expect(studyDemo).toContain('data-tour="tour-study-traps"');
    expect(studyDemo).toContain('data-tour="tour-study-flashcard-question"');
    expect(studyDemo).toContain('data-tour="tour-study-flashcard-answer"');
    expect(productTourScene(0, 3).target).toBe("tour-study-flashcard-question");
    expect(productTourScene(0, 4).target).toBe("tour-study-flashcard-answer");
    expect(productTourScene(0, 3).title).toBe("¿Lo recuerdas sin mirar?");
    expect(productTourScene(0, 3).description).toContain("no basta");
    expect(productTourScene(0, 4).description).toContain("Después de intentarlo");

    expect(studyDemo).toContain('className="fixed inset-0 z-[50] overflow-hidden bg-background"');
    expect(studyDemo).toContain("h-[56dvh]");
    expect(studyDemo).not.toContain("pb-[48dvh]");
    expect(studyDemo).toContain("Al estudiar verás el resumen completo.");
    expect(studyDemo).toContain("flashcardCompactness");
    expect(studyDemo).toContain(".limit(12)");
    expect(studyDemo).toContain("[perspective:1200px]");
    expect(studyDemo).toContain("[transform-style:preserve-3d]");
    expect(studyDemo).toContain("[transform:rotateY(180deg)]");
    expect(studyDemo).toContain("[backface-visibility:hidden]");
    expect(studyDemo).toContain("motion-reduce:transition-none");
    expect(studyDemo).toContain("{data.flashcard.answer}");
    expect(studyDemo).not.toContain("excerpt(data.flashcard.answer");
    expect(studyDemo).toContain("const firstKey = data.keys[0] ?? null");
    expect(studyDemo).toContain("const confusion = data.confusions[0] ?? null");
    expect(studyDemo).toContain("const trap = data.traps[0] ?? null");
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

  it("anchors the first study moment to a visible card while retaining a real flashcard unit", () => {
    expect(study).toContain("model.continuation?.activeFlashcards");
    expect(study).toContain("model.units.find((unit) => unit.activeFlashcards > 0)");
    expect(study).toContain('data-tour="study-unit"');
    expect(study).toContain("data-tour-unit-id={tourUnitId}");
    expect(study).toContain('data-tour={tourTarget ? "study-unit" : undefined}');
    expect(study).toContain("data-tour-unit-id");
  });

  it("gives Aprendizaje, Consolidación and Tribunal independent spotlight targets", () => {
    expect(practiceDemo).toContain("STAGE_TARGETS");
    expect(practiceDemo).toContain('"tour-study-practice-aprendizaje"');
    expect(practiceDemo).toContain('"tour-study-practice-consolidacion"');
    expect(practiceDemo).toContain('"tour-study-practice-tribunal"');
    expect(practiceDemo).toContain("data-tour={STAGE_TARGETS[stage.index]}");
    expect(practiceDemo).toContain("const active = stage.index === activeIndex");
    expect(productTourScene(1, 1).target).toBe("tour-study-practice-aprendizaje");
    expect(productTourScene(1, 2).target).toBe("tour-study-practice-consolidacion");
    expect(productTourScene(1, 3).target).toBe("tour-study-practice-tribunal");
    expect(practiceDemo).toContain("Tres niveles. Un camino hacia el examen.");
    expect(practiceDemo).toContain("No son fácil, medio y difícil");
    expect(practiceDemo).toContain("Entiende la base del examen");
    expect(practiceDemo).toContain("Distingue relaciones y excepciones");
    expect(practiceDemo).toContain("Entrena al nivel del examen");
    expect(practiceDemo).toContain("exámenes oficiales");
  });

  it("makes each advanced-stage unlock run lock to open lock to activation sweep to final check", () => {
    expect(practiceDemo).toContain("const targetUnlock = scene - 1");
    expect(practiceDemo).toContain("setUnlocked(previousUnlock)");
    expect(practiceDemo).toContain("setUnlocking(targetUnlock)");
    expect(practiceDemo).toContain("setUnlocked(targetUnlock)");
    expect(practiceDemo).toContain("<Lock");
    expect(practiceDemo).toContain("<LockOpen");
    expect(practiceDemo).toContain(") : isUnlocking ? (");
    expect(practiceDemo).toContain("tour-lock-release");
    expect(practiceDemo).toContain("tour-unlock-open");
    expect(practiceDemo).toContain("tour-stage-activate");
    expect(practiceDemo).toContain("tour-unlock-sweep");
    expect(practiceDemo).toContain("tour-check-arrive");
    expect(practiceDemo).toContain("Desbloqueando…");
    expect(practiceDemo).toContain('{isUnlocking ? "Nivel disponible" : "Disponible"}');
    expect(practiceDemo).toContain("disponible");
    expect(practiceDemo).toContain("360");
    expect(practiceDemo).toContain("900");
    expect(practiceDemo).toContain("prefersReducedMotion");
  });

  it("chooses a compact real question and separates selection from correction", () => {
    expect(productTourScene(1, 4).target).toBe("tour-study-practice-question");
    expect(productTourScene(1, 5).target).toBe("tour-study-practice-feedback");
    expect(practiceDemo).toContain("question.pregunta.length <= 155");
    expect(practiceDemo).toContain("option.length <= 115");
    expect(practiceDemo).toContain("questionCompactness");
    expect(practiceDemo).toContain('data-tour="tour-study-practice-question"');
    expect(practiceDemo).toContain('data-tour="tour-study-practice-feedback"');
    expect(practiceDemo).toContain('setAnswerPhase("selected")');
    expect(practiceDemo).toContain('setAnswerPhase("feedback")');
    expect(practiceDemo).toContain("tour-answer-tap");
    expect(practiceDemo).toContain("Tu respuesta");
    expect(practiceDemo).toContain("Respuesta correcta");
    expect(practiceDemo).toContain("font-normal leading-[1.35] text-success");
  });

  it("keeps practice demos read-only", () => {
    expect(practiceDemo).toContain('supabase.rpc("prepare_my_v4_today_context")');
    expect(practiceDemo).toContain('.from("questions")');
    expect(practiceDemo).not.toContain('.from("tests")');
    expect(practiceDemo).not.toContain('.from("test_answers")');
    expect(practiceDemo).not.toContain(".insert(");
    expect(practiceDemo).not.toContain(".update(");
    expect(practiceDemo).not.toContain("complete_test");
  });

  it("keeps demo micro-scenes fixed so they never depend on user scrolling", () => {
    expect(practiceDemo).toContain('className="fixed inset-0 z-[50] overflow-hidden bg-background"');
    expect(studyDemo).toContain('className="fixed inset-0 z-[50] overflow-hidden bg-background"');
    expect(practiceDemo).toContain("h-[56dvh]");
    expect(studyDemo).toContain("h-[56dvh]");
    expect(practiceDemo).toContain("max-height: 42dvh !important");
    expect(studyDemo).toContain("max-height: 42dvh !important");
    expect(practiceDemo).not.toContain("pb-[48dvh]");
    expect(studyDemo).not.toContain("pb-[48dvh]");
    expect(component).toContain("bringRealTargetIntoView");
    expect(component).toContain('target.scrollIntoView({');
  });

  it("keeps desktop demo content and its spotlight in the same reserved rail geometry", () => {
    expect(component).toContain("function reserveDesktopDemoRail");
    expect(component).toContain("const coachWidth = window.innerWidth < 1000 ? 320 : 360");
    expect(component).toContain("const requiredShift = Math.max(0, stageRect.right - railLeft)");
    expect(component).toContain("const availableShift = Math.max(0, stageRect.left - 16)");
    expect(component).toContain('stage.style.transition = "none"');
    expect(component).not.toContain('translateX(-210px)');
    expect(component).toContain("const restoreDemoRail = reserveDesktopDemoRail(target, item.target)");
    expect(component).toContain("restoreDemoRail();");
    expect(component).toContain("desktopDemoRail ? 24");
    expect(component).toContain("right = desktopDemoRail ? 24");
  });

  it("keeps narrow real targets and the final Today action inside the viewport", () => {
    expect(component).toContain("const mobileDemoSheet = demo && vw < 900");
    expect(component).toContain("const narrowRealTarget = !demo && vw < 700");
    expect(component).toContain("const compactFinal = finalScene && (vw < 960 || vh < 760)");
    expect(component).toContain("const compactPopover = narrowRealTarget || compactFinal");
    expect(component).toContain("const fullWidthFinal = finalScene && vw < 700");
    expect(component).toContain("const realTargetMaxHeight = compactPopover");
    expect(component).toContain("new ResizeObserver(measure)");
    expect(component).toContain('overflowY: "auto"');
    expect(component).toContain('compactPopover ? "p-4" : "p-5"');
    expect(component).toContain('compactPopover ? "h-12 px-5 text-[18px]"');
    expect(component).not.toContain("const finalMobileTop");
  });

  it("anchors Progress to the real Conocimiento real card and excludes the map", () => {
    expect(layout).toContain("function ProgressTourTarget()");
    expect(layout).toContain("Distribución del conocimiento");
    expect(layout).toContain('closest<HTMLElement>(".overflow-hidden")');
    expect(layout).toContain('data-tour="progress-overview"');
    expect(layout).toContain("new ResizeObserver(measure)");
    expect(layout).toContain("new MutationObserver(measure)");
    expect(layout).not.toContain("+5.5rem");
    expect(layout).not.toContain("h-[min(39dvh,310px)]");
  });

  it("makes the coach marks easier to read", () => {
    expect(component).toContain('text-[27px]');
    expect(component).toContain('text-[25px]');
    expect(component).toContain('text-[20px]');
    expect(component).toContain('text-[19px]');
    expect(component).toContain('text-[18px]');
    expect(component).toContain('text-[17px]');
    expect(component).toContain('text-[16px]');
    expect(component).toContain("Saltar tutorial");
    expect(component).toContain("Paso {step + 1} de {PRODUCT_TOUR_STEPS.length}");
    expect(component).toContain('"h-12 px-5 text-[18px]"');
    expect(component).toContain("visualViewport");
    expect(studyDemo).toContain('@media (min-width: 900px)');
    expect(studyDemo).toContain('right: 24px !important');
    expect(studyDemo).toContain('@media (max-width: 899px)');
    expect(studyDemo).toContain('bottom: 12px !important');
    expect(practiceDemo).toContain('max-height: 42dvh !important');
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

  it("retries draft autosave silently and only surfaces final-save failure", () => {
    expect(preparationPage).toContain("for (let attempt = 0; attempt < 3; attempt += 1)");
    expect(preparationPage).toContain('if (complete) setSaveState("saving")');
    expect(preparationPage).toContain('if (complete) {\
      setSaveState("error")');
    expect(preparationPage).toContain('setSaveState("idle")');
    expect(preparationPage).toContain("Draft autosave is deliberately silent");
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
