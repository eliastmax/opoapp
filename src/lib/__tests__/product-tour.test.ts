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
  });

  it("does not reopen after completion, omission or a safe session dismissal", () => {
    expect(eligibility({ completedAt: "2026-08-22" })).toBe(false);
    expect(eligibility({ dismissedForSession: true })).toBe(false);
  });

  it("keeps an automatic tour mounted while it moves through the product", () => {
    const startedOnToday = maintainTourSession(false, eligibility());
    expect(startedOnToday).toBe(true);
    const eligibilityAfterNavigation = eligibility({ pathname: "/estudio" });
    expect(eligibilityAfterNavigation).toBe(false);
    expect(maintainTourSession(startedOnToday, eligibilityAfterNavigation)).toBe(true);
    expect(component).toContain("tourSessionActive");
    expect(component).toContain("replaying || tourSessionActive");
  });

  it("keeps six top-level moments while making Study and Practice rich guided demonstrations", () => {
    expect(PRODUCT_TOUR_STEPS).toHaveLength(6);
    expect(PRODUCT_TOUR_STEPS.map((_, index) => productTourSceneCount(index))).toEqual([
      1, 1, 1, 6, 10, 2,
    ]);
    expect(productTourJourneyLabel(3)).toBe("Dentro de una unidad");
    expect(productTourJourneyLabel(4)).toBe("Crear un test");

    expect(
      PRODUCT_TOUR_STEPS.flatMap<ProductTourScene>((phase) => phase.scenes).map(
        (scene) => scene.target,
      ),
    ).toEqual([
      "today-session",
      "nav-study",
      "study-unit",
      "study-summary",
      "study-keys",
      "study-confusions",
      "study-traps",
      "flashcard-preview",
      "flashcard-answer",
      "practice-builder",
      "practice-level-aprendizaje",
      "practice-level-consolidacion",
      "practice-level-tribunal",
      "practice-level-mezcladas",
      "practice-format",
      "practice-start",
      "practice-question",
      "practice-answer",
      "practice-feedback",
      "progress-overview",
      "today-session",
    ]);

    expect(today).toContain('data-tour="today-session"');
    expect(layout).toContain('"nav-study"');
    expect(layout).toContain('"nav-practice"');
    expect(layout).toContain('"nav-progress"');
    expect(layout).toContain('"practice-builder"');
    expect(layout).toContain('"progress-overview"');
    expect(study).toContain('data-tour={tourTarget ? "study-unit" : undefined}');
    expect(studyUnit).toContain('data-tour="study-summary"');
    expect(studyUnit).toContain('data-tour="flashcard-preview"');
  });

  it("teaches Study in the same downward order as the rendered preview", () => {
    const studyScenes = PRODUCT_TOUR_STEPS[3].scenes;
    expect(studyScenes.map((scene) => scene.title)).toEqual([
      "Aquí es donde estudias",
      "Fíjate en lo que suele importar",
      "Aprende también qué se parece",
      "Prepárate para donde suelen pillarte",
      "Después, intenta recordarlo",
      "Comprueba lo que recordabas",
    ]);
    expect(studyScenes[0].description).toBe(
      "Cada unidad reúne un resumen, claves y conceptos para que entiendas qué necesitas aprender.",
    );
    expect(studyScenes[4].description).toBe(
      "Las flashcards te piden la respuesta antes de mostrarla para que compruebes qué recuerdas sin mirar.",
    );
    expect(studyUnit).toContain('tourTarget={previewing ? "study-keys" : undefined}');
    expect(studyUnit).toContain('tourTarget={previewing ? "study-confusions" : undefined}');
    expect(studyUnit).toContain('tourTarget={previewing ? "study-traps" : undefined}');
    expect(studyUnit.indexOf('title="No lo confundas"')).toBeLessThan(
      studyUnit.indexOf('data-tour="flashcard-preview"'),
    );
    expect(studyUnit.indexOf('title="Trampas frecuentes"')).toBeLessThan(
      studyUnit.indexOf('data-tour="flashcard-preview"'),
    );
    expect(component).toContain("OPTIONAL_STUDY_TARGETS");
    expect(component).toContain("optionalStudyTarget ? 1_200 : 6_000");
    expect(component).toContain("goNext();");
    expect(component).toContain("setFlashcardAnswerVisible(false)");
    expect(component).toContain("setFlashcardAnswerVisible(true)");
    expect(component).toContain("rotateY(88deg)");
    expect(component).toContain("perspective(900px)");
  });

  it("routes the learning demonstration to a real unit in read-only preview mode", () => {
    expect(productTourPath("study-preview", "unit-123")).toBe("/estudiar/unit-123");
    expect(productTourPath("study-preview", null)).toBeNull();
    expect(productTourPath("/crear", null)).toBe("/crear");
    expect(productTourPath("/progreso", null)).toBe("/progreso");
    expect(component).toContain('route !== "study-preview"');
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
    expect(study).toContain("tourUnit?.id ?? null");
    expect(recallUnit).not.toContain('data-tour="flashcard-card"');
  });

  it("uses a real catalog flashcard without reviewing it", () => {
    expect(studyUnit).toContain("const previewFlashcard = data.flashcards[0] ?? null");
    expect(studyUnit).toContain("{previewFlashcard.prompt}");
    expect(studyUnit).toContain("{previewFlashcard.answer}");
    expect(studyUnit).not.toContain("review_my_v4_flashcard");
  });

  it("explains the three learning stages as a method and Mezcladas as the later combination", () => {
    const practiceScenes = PRODUCT_TOUR_STEPS[4].scenes;
    expect(practiceScenes.map((scene) => scene.title)).toContain("Aprendizaje · entiende la base");
    expect(practiceScenes.map((scene) => scene.title)).toContain(
      "Consolidación · conecta y distingue",
    );
    expect(practiceScenes.map((scene) => scene.title)).toContain("Tribunal · entrena la precisión");
    expect(practiceScenes.map((scene) => scene.title)).toContain(
      "Después, mantén el tema completo",
    );
    expect(practiceDemo).toContain("No es fácil, medio y difícil");
    expect(practiceDemo).toContain("LEARNING_STAGE_DESCRIPTIONS");
    expect(practiceDemo).toContain("practice-level-aprendizaje");
    expect(practiceDemo).toContain("practice-level-consolidacion");
    expect(practiceDemo).toContain("practice-level-tribunal");
    expect(practiceDemo).toContain("practice-level-mezcladas");
  });

  it("shows the simulated option selection before correction", () => {
    expect(productTourSceneCount(4)).toBe(10);
    expect(productTourScene(4, 7).target).toBe("practice-question");
    expect(productTourScene(4, 8).target).toBe("practice-answer");
    expect(productTourScene(4, 9).target).toBe("practice-feedback");
    expect(practiceDemo).toContain("const showingSelection = scene >= 8");
    expect(practiceDemo).toContain("const showingFeedback = scene >= 9");
    expect(practiceDemo).toContain('data-tour={selected ? "practice-answer" : undefined}');
    expect(practiceDemo).toContain('transform: "scale(.965)"');
    expect(practiceDemo).toContain('selected && "bg-primary text-primary-foreground"');
    expect(practiceDemo).toContain('chosenWrong && "bg-destructive text-destructive-foreground"');
  });

  it("simulates test creation with a real question but performs no learning writes", () => {
    expect(practiceDemo).toContain('supabase.rpc("prepare_my_v4_today_context")');
    expect(practiceDemo).toContain('.from("questions")');
    expect(practiceDemo).toContain("respuesta_correcta");
    expect(practiceDemo).toContain("practice-format");
    expect(practiceDemo).toContain("practice-start");
    expect(practiceDemo).toContain("practice-question");
    expect(practiceDemo).toContain("practice-answer");
    expect(practiceDemo).toContain("practice-feedback");
    expect(practiceDemo).toContain("Tu respuesta simulada");
    expect(practiceDemo).toContain("Respuesta correcta");
    expect(practiceDemo).toContain("no crea fallo, duda, test, historial ni cambios de mastery");

    expect(practiceDemo).not.toContain('.from("tests")');
    expect(practiceDemo).not.toContain('.from("test_answers")');
    expect(practiceDemo).not.toContain(".insert(");
    expect(practiceDemo).not.toContain(".update(");
    expect(practiceDemo).not.toContain("complete_test");
    expect(practiceDemo).not.toContain("review_my_v4_flashcard");
  });

  it("makes correction labels stronger than the answer text", () => {
    expect(practiceDemo).toContain(
      '<p className="text-sm font-bold text-foreground">Respuesta correcta</p>',
    );
    expect(practiceDemo).toContain('className="mt-1 font-normal leading-relaxed text-success"');
  });

  it("starts with orientation and closes the loop only after the user understands the product", () => {
    const scenes = PRODUCT_TOUR_STEPS.flatMap<ProductTourScene>((phase) => phase.scenes);
    const todayScenes = scenes.filter((scene) => scene.target === "today-session");
    expect(todayScenes).toHaveLength(2);
    expect(PRODUCT_TOUR_STEPS[0].scenes[0].title).toBe("Este es tu punto de partida");
    expect(PRODUCT_TOUR_STEPS[5].scenes[0].title).toBe(
      "Aquí ves cómo evoluciona tu preparación",
    );
    expect(PRODUCT_TOUR_STEPS[5].scenes[0].route).toBe("/progreso");
    expect(PRODUCT_TOUR_STEPS[5].scenes[1].route).toBe("/inicio");
    expect(PRODUCT_TOUR_STEPS[5].scenes[1].title).toBe(
      "Ahora sí: siempre sabrás qué hacer después",
    );
    expect(PRODUCT_TOUR_STEPS[5].scenes[1].description).toContain(
      "OpoTest te propone el siguiente paso",
    );
  });

  it("uses selective emphasis in every coach mark", () => {
    const scenes = PRODUCT_TOUR_STEPS.flatMap<ProductTourScene>((phase) => phase.scenes);
    for (const scene of scenes) {
      for (const fragment of scene.emphasis) expect(scene.description).toContain(fragment);
    }
    expect(productTourScene(3, 4).emphasis).toEqual(["qué recuerdas sin mirar"]);
    expect(productTourScene(4, 9).emphasis).toContain("aciertos, fallos y dudas");
    expect(component).toContain("EmphasizedDescription");
    expect(component).toContain("font-semibold text-foreground");
  });

  it("shows internal journey progress without inflating the six main steps", () => {
    expect(component).toContain("productTourJourneyLabel");
    expect(component).toContain("{journeyLabel} · {scene + 1} de {sceneCount}");
    expect(component).toContain("{step + 1} de {PRODUCT_TOUR_STEPS.length}");
  });

  it("reserves real popover space and corrects scroll before revealing each target", () => {
    expect(component).toContain("tourContentWindow");
    expect(component).toContain("tourSpotlightRect");
    expect(component).toContain("scrollTourTargetIntoView");
    expect(component).toContain("nearestScrollContainer");
    expect(component).toContain("scrollContainer.scrollBy");
    expect(component).toContain("window.scrollBy");
    expect(component).toContain('targetName.startsWith("nav-")');
    expect(component).toContain('route === "study-preview" ? 84 : 16');
    expect(component).toContain("Math.max(popoverHeight, 300)");
    expect(component).toContain("useState(380)");
    expect(component).toContain("correctionTimer");
    expect(component).toContain("popoverHeight, true");
    expect(component).toContain("setCutout(null)");
    expect(component).toContain("ResizeObserver");
    expect(component).toContain("MutationObserver");
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

  it("uses restrained motion instead of decorative gamification", () => {
    expect(component).toContain('popoverVisible ? "210ms" : "120ms"');
    expect(component).toContain("setRouteTransition(true)");
    expect(component).toContain("targetAccent");
    expect(component).toContain("setTargetAccent(true)");
    expect(component).toContain("}, 240)");
    expect(component).toContain("transition-[top,left,width,height,box-shadow]");
    expect(component).toContain("motion-reduce:transition-none");
    expect(component).not.toContain("animate-pulse");
    expect(practiceDemo).not.toContain("confetti");
  });

  it("keeps Omitir, Anterior and the final return to Today", () => {
    expect(component).toContain("Omitir");
    expect(component).toContain("step > 0 || scene > 0");
    expect(component).toContain("Anterior");
    expect(component).toContain("Empezar mi sesión");
    expect(component).toContain('navigate({ to: "/inicio" })');
  });

  it("persists completion and skip while replay preserves prior state", () => {
    expect(component).toContain('persist("skipped")');
    expect(component).toContain('persist("completed")');
    expect(component).not.toContain("delete()");
    expect(component).toContain("replaying ? closeSafely()");
  });

  it("keeps strict per-user RLS and no local truth source", () => {
    expect(migration).toContain("user_id uuid PRIMARY KEY REFERENCES auth.users(id)");
    expect(migration.match(/user_id = \(SELECT auth\.uid\(\)\)/g)?.length).toBeGreaterThanOrEqual(
      3,
    );
    expect(component).not.toContain("localStorage");
    expect(component).not.toContain("onAuthStateChange");
  });

  it("stores the approved structural and visual contract in the repository", () => {
    expect(contract).toContain("Tutorial como demostración del método");
    expect(contract).toContain("Aprendizaje → Consolidación → Tribunal");
    expect(contract).toContain("no crear tests");
    expect(contract).toContain("Flashcard con flip 3D suave");
    expect(contract).toContain("Sin confetti");
  });
});
