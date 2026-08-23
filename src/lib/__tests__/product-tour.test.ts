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

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260822190000_first_run_product_tour.sql", import.meta.url),
  "utf8",
);
const component = readFileSync(new URL("../../components/product-tour.tsx", import.meta.url), "utf8");
const practiceDemo = readFileSync(
  new URL("../../components/product-tour-practice-demo.tsx", import.meta.url),
  "utf8",
);
const layout = readFileSync(new URL("../../routes/_authenticated/route.tsx", import.meta.url), "utf8");
const today = readFileSync(new URL("../../routes/_authenticated/inicio.tsx", import.meta.url), "utf8");
const study = readFileSync(new URL("../../routes/_authenticated/estudio.tsx", import.meta.url), "utf8");
const studyUnit = readFileSync(
  new URL("../../routes/_authenticated/estudiar.$unitId.tsx", import.meta.url),
  "utf8",
);
const recallUnit = readFileSync(
  new URL("../../routes/_authenticated/recordar.$unitId.tsx", import.meta.url),
  "utf8",
);
const contract = readFileSync(
  new URL("../../../docs/PRODUCT_TOUR_METHOD_DEMO_2026-08-23.md", import.meta.url),
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
    expect(eligibility({ completedAt: "2026-08-22" })).toBe(false);
    expect(eligibility({ dismissedForSession: true })).toBe(false);
  });

  it("keeps an automatic tour mounted while it moves through routes", () => {
    const started = maintainTourSession(false, eligibility());
    expect(started).toBe(true);
    expect(maintainTourSession(started, eligibility({ pathname: "/estudio" }))).toBe(true);
    expect(component).toContain("tourSessionActive");
    expect(component).toContain("replaying || tourSessionActive");
  });

  it("uses six unique top-level moments and shows Today only once, at the end", () => {
    expect(PRODUCT_TOUR_STEPS).toHaveLength(6);
    expect(PRODUCT_TOUR_STEPS.map((_, index) => productTourSceneCount(index))).toEqual([
      1, 1, 6, 10, 1, 1,
    ]);
    expect(productTourJourneyLabel(2)).toBe("Dentro de una unidad");
    expect(productTourJourneyLabel(3)).toBe("Crear un test");

    const scenes = PRODUCT_TOUR_STEPS.flatMap<ProductTourScene>((phase) => phase.scenes);
    expect(scenes.filter((scene) => scene.target === "today-session")).toHaveLength(1);
    expect(PRODUCT_TOUR_STEPS[0].scenes[0].target).toBe("nav-study");
    expect(PRODUCT_TOUR_STEPS[0].scenes[0].title).toBe("Empieza conociendo tu temario");
    expect(PRODUCT_TOUR_STEPS[4].scenes[0].route).toBe("/progreso");
    expect(PRODUCT_TOUR_STEPS[5].scenes[0].route).toBe("/inicio");
    expect(PRODUCT_TOUR_STEPS[5].scenes[0].target).toBe("today-session");
    expect(PRODUCT_TOUR_STEPS[5].scenes[0].title).toBe(
      "Ahora sí: siempre sabrás qué hacer después",
    );
    expect(today).toContain('data-tour="today-session"');
    expect(layout).toContain('"nav-study"');
    expect(layout).toContain('"nav-progress"');
  });

  it("teaches Study downward using compact, intentionally complete tutorial targets", () => {
    const studyScenes = PRODUCT_TOUR_STEPS[2].scenes;
    expect(studyScenes.map((scene) => scene.target)).toEqual([
      "study-summary",
      "study-keys",
      "study-confusions",
      "study-traps",
      "flashcard-preview",
      "flashcard-answer",
    ]);
    expect(studyScenes[0].description).toContain("idea central");
    expect(studyScenes[4].description).toBe(
      "Las flashcards te piden la respuesta antes de mostrarla para que compruebes qué recuerdas sin mirar.",
    );
    expect(studyUnit).toContain("compactTourText");
    expect(studyUnit).toContain("En tu estudio real verás el resumen completo.");
    expect(studyUnit).toContain("const visibleItems = tourTarget ? items.slice(0, 3) : items");
    expect(studyUnit).toContain("puntos más");
    expect(studyUnit).toContain('data-tour="flashcard-preview"');
    expect(studyUnit.indexOf('title="No lo confundas"')).toBeLessThan(
      studyUnit.indexOf('data-tour="flashcard-preview"'),
    );
    expect(studyUnit.indexOf('title="Trampas frecuentes"')).toBeLessThan(
      studyUnit.indexOf('data-tour="flashcard-preview"'),
    );
  });

  it("routes Study preview to real catalog content without learning writes", () => {
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
    expect(study).toContain("model.continuation?.activeFlashcards");
    expect(study).toContain("model.units.find((unit) => unit.activeFlashcards > 0)");
    expect(recallUnit).not.toContain('data-tour="flashcard-card"');
    expect(studyUnit).not.toContain("review_my_v4_flashcard");
  });

  it("shows real flashcard prompt then flips only the answer panel", () => {
    expect(studyUnit).toContain("const previewFlashcard = data.flashcards[0] ?? null");
    expect(studyUnit).toContain("{previewFlashcard.prompt}");
    expect(studyUnit).toContain("{previewFlashcard.answer}");
    expect(component).toContain('answerPanel.dataset.tour = "flashcard-answer"');
    expect(component).toContain("rotateY(88deg)");
    expect(component).toContain("perspective(900px)");
  });

  it("explains stages with locked Consolidación and Tribunal and animated unlocks", () => {
    const practiceScenes = PRODUCT_TOUR_STEPS[3].scenes;
    expect(practiceScenes.map((scene) => scene.title)).toContain("Aprendizaje · entiende la base");
    expect(practiceScenes.map((scene) => scene.title)).toContain(
      "Consolidación · conecta y distingue",
    );
    expect(practiceScenes.map((scene) => scene.title)).toContain("Tribunal · entrena la precisión");
    expect(practiceDemo).toContain("LockOpen");
    expect(practiceDemo).toContain("<Lock");
    expect(practiceDemo).toContain('if (stage === "consolidacion") return scene >= 2');
    expect(practiceDemo).toContain('if (stage === "tribunal") return scene >= 3');
    expect(practiceDemo).toContain("stageUnlocking");
    expect(practiceDemo).toContain("zoom-in-50 spin-in-12 duration-300");
    expect(practiceDemo).toContain("Se desbloquea al avanzar en el nivel anterior.");
  });

  it("shows a visible answer selection before correction", () => {
    expect(productTourSceneCount(3)).toBe(10);
    expect(productTourScene(3, 7).target).toBe("practice-question");
    expect(productTourScene(3, 8).target).toBe("practice-answer");
    expect(productTourScene(3, 9).target).toBe("practice-feedback");
    expect(practiceDemo).toContain("const showingSelection = scene >= 8");
    expect(practiceDemo).toContain("const showingFeedback = scene >= 9");
    expect(practiceDemo).toContain('data-tour={selected ? "practice-answer" : undefined}');
    expect(practiceDemo).toContain('transform: "scale(.965)"');
  });

  it("keeps answer comparison as the feedback spotlight instead of the whole tall card", () => {
    expect(practiceDemo).toContain('data-tour="practice-feedback"');
    expect(practiceDemo).toContain("Tu respuesta simulada");
    expect(practiceDemo).toContain("Respuesta correcta");
    expect(practiceDemo).toContain(
      '<p className="text-sm font-bold text-foreground">Respuesta correcta</p>',
    );
    expect(practiceDemo).toContain('className="mt-1 font-normal leading-relaxed text-success"');
  });

  it("simulates a real question while performing no test or mastery writes", () => {
    expect(practiceDemo).toContain('supabase.rpc("prepare_my_v4_today_context")');
    expect(practiceDemo).toContain('.from("questions")');
    expect(practiceDemo).not.toContain('.from("tests")');
    expect(practiceDemo).not.toContain('.from("test_answers")');
    expect(practiceDemo).not.toContain(".insert(");
    expect(practiceDemo).not.toContain(".update(");
    expect(practiceDemo).not.toContain("complete_test");
    expect(practiceDemo).toContain("no crea fallo, duda, test, historial ni cambios de mastery");
  });

  it("scrolls every scene automatically before showing its coach mark", () => {
    expect(component).toContain("visualViewportSize");
    expect(component).toContain("window.visualViewport?.height");
    expect(component).toContain("target.scrollIntoView");
    expect(component).toContain('block: "center"');
    expect(component).toContain("alignTargetExactly");
    expect(component).toContain("nearestScrollContainer");
    expect(component).toContain("scrollContainer.scrollBy");
    expect(component).toContain("window.scrollBy");
    expect(component).toContain("popoverHeightRef");
    expect(component).toContain("setCutout(null)");
    expect(component).toContain("ResizeObserver");
    expect(component).toContain("MutationObserver");
    expect(component).toContain('step === 3 ? <ProductTourPracticeDemo scene={scene} /> : null');
  });

  it("keeps coach marks mobile-safe and motion restrained", () => {
    expect(Math.min(340, 360 - 32)).toBe(328);
    expect(Math.min(340, 390 - 32)).toBe(340);
    expect(Math.min(340, 430 - 32)).toBe(340);
    expect(component).toContain("Math.min(340, viewport.width - 32)");
    expect(component).toContain("motion-reduce:transition-none");
    expect(component).not.toContain("animate-pulse");
    expect(practiceDemo).not.toContain("confetti");
  });

  it("uses selective emphasis and keeps navigation controls", () => {
    const scenes = PRODUCT_TOUR_STEPS.flatMap<ProductTourScene>((phase) => phase.scenes);
    for (const scene of scenes) {
      for (const fragment of scene.emphasis) expect(scene.description).toContain(fragment);
    }
    expect(productTourScene(2, 4).emphasis).toEqual(["qué recuerdas sin mirar"]);
    expect(productTourScene(3, 9).emphasis).toContain("aciertos, fallos y dudas");
    expect(component).toContain("EmphasizedDescription");
    expect(component).toContain("Omitir");
    expect(component).toContain("Anterior");
    expect(component).toContain("Empezar mi sesión");
    expect(component).toContain('navigate({ to: "/inicio" })');
  });

  it("persists completion and skip with strict per-user state", () => {
    expect(component).toContain('persist("skipped")');
    expect(component).toContain('persist("completed")');
    expect(component).not.toContain("localStorage");
    expect(migration).toContain("user_id uuid PRIMARY KEY REFERENCES auth.users(id)");
    expect(migration.match(/user_id = \(SELECT auth\.uid\(\)\)/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("stores the method-demo contract in the repository", () => {
    expect(contract).toContain("Tutorial como demostración del método");
    expect(contract).toContain("Aprendizaje → Consolidación → Tribunal");
    expect(contract).toContain("no crear tests");
  });
});
