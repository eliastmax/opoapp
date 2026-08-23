export type ProductTourRoute = "/inicio" | "/estudio" | "/crear" | "/progreso" | "study-preview";

export type ProductTourScene = {
  route: ProductTourRoute;
  target: string;
  title: string;
  description: string;
  emphasis: readonly string[];
};

export const PRODUCT_TOUR_STEPS = [
  {
    scenes: [
      {
        route: "/inicio",
        target: "today-session",
        title: "Empieza por aquí",
        description: "OpoTest te propone qué hacer ahora: estudiar, practicar o repasar.",
        emphasis: ["estudiar, practicar o repasar"],
      },
    ],
    final: false,
  },
  {
    scenes: [
      {
        route: "/inicio",
        target: "nav-study",
        title: "Aquí está todo tu temario",
        description:
          "Entra en cualquier tema, estudia sus unidades y ve qué has avanzado y qué te queda.",
        emphasis: ["qué has avanzado", "qué te queda"],
      },
    ],
    final: false,
  },
  {
    scenes: [
      {
        route: "/estudio",
        target: "study-unit",
        title: "Estudia cada tema por partes",
        description:
          "Cada tema se divide en unidades para que puedas avanzar poco a poco sin perderte.",
        emphasis: ["poco a poco"],
      },
    ],
    final: false,
  },
  {
    scenes: [
      {
        route: "study-preview",
        target: "study-summary",
        title: "Aquí es donde estudias",
        description:
          "Cada unidad reúne un resumen, claves y conceptos para que entiendas qué necesitas aprender.",
        emphasis: ["resumen, claves y conceptos"],
      },
      {
        route: "study-preview",
        target: "flashcard-preview",
        title: "Después, intenta recordarlo",
        description:
          "Las flashcards te piden la respuesta antes de mostrarla para que compruebes qué recuerdas sin mirar.",
        emphasis: ["qué recuerdas sin mirar"],
      },
    ],
    final: false,
  },
  {
    scenes: [
      {
        route: "/crear",
        target: "practice-builder",
        title: "Crea el test que necesitas",
        description:
          "Elige qué quieres practicar y ajusta cantidad, nivel y tipo de preguntas antes de empezar.",
        emphasis: ["cantidad, nivel y tipo de preguntas"],
      },
    ],
    final: false,
  },
  {
    scenes: [
      {
        route: "/progreso",
        target: "progress-overview",
        title: "Mira cómo evoluciona tu preparación",
        description:
          "Aquí ves qué temas avanzan, cuáles necesitan atención y qué necesitas seguir trabajando.",
        emphasis: ["qué temas avanzan", "cuáles necesitan atención"],
      },
    ],
    final: true,
  },
] as const satisfies readonly { scenes: readonly ProductTourScene[]; final: boolean }[];

export type ProductTourCompletionKind = "completed" | "skipped";

export function productTourScene(step: number, scene = 0): ProductTourScene {
  const phase = PRODUCT_TOUR_STEPS[step] ?? PRODUCT_TOUR_STEPS[0];
  return phase.scenes[scene] ?? phase.scenes[0];
}

export function productTourSceneCount(step: number) {
  return PRODUCT_TOUR_STEPS[step]?.scenes.length ?? 1;
}

export function productTourPath(route: ProductTourRoute, unitId: string | null) {
  if (route === "study-preview") return unitId ? `/estudiar/${unitId}` : null;
  return route;
}

export function maintainTourSession(current: boolean, eligibleToStart: boolean) {
  return current || eligibleToStart;
}

export function shouldOpenProductTour(args: {
  loading: boolean;
  error: boolean;
  completedAt: string | null | undefined;
  dismissedForSession: boolean;
  preparationCompleted: boolean;
  pathname: string;
}) {
  return (
    !args.loading &&
    !args.error &&
    !args.completedAt &&
    !args.dismissedForSession &&
    args.preparationCompleted &&
    args.pathname === "/inicio"
  );
}

export function spotlightRect(
  rect: Pick<DOMRect, "top" | "left" | "right" | "bottom">,
  padding = 8,
) {
  return {
    top: Math.max(6, rect.top - padding),
    left: Math.max(6, rect.left - padding),
    right: Math.min(window.innerWidth - 6, rect.right + padding),
    bottom: Math.min(window.innerHeight - 6, rect.bottom + padding),
  };
}
