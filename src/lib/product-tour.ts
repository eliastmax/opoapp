export type ProductTourRoute = "/inicio" | "/estudio" | "/crear" | "/progreso" | "study-preview";

export type ProductTourScene = {
  route: ProductTourRoute;
  target: string;
  title: string;
  description: string;
  emphasis: readonly string[];
};

type ProductTourStep = {
  scenes: readonly ProductTourScene[];
  final: boolean;
  journeyLabel: string;
};

export const PRODUCT_TOUR_STEPS = [
  {
    journeyLabel: "Estudia",
    scenes: [
      {
        route: "/estudio",
        target: "study-unit",
        title: "Avanza sin tragarte un tema entero",
        description: "Tu temario se divide en unidades claras. Entras, estudias y sigues.",
        emphasis: ["unidades claras"],
      },
      {
        route: "study-preview",
        target: "tour-study-understand",
        title: "Entiende lo importante",
        description: "Resumen y claves. Sin perderte entre páginas.",
        emphasis: ["Resumen y claves"],
      },
      {
        route: "study-preview",
        target: "tour-study-traps",
        title: "No caigas en las trampas",
        description: "Compara conceptos parecidos antes de que te los mezclen en el examen.",
        emphasis: ["antes de que te los mezclen"],
      },
      {
        route: "study-preview",
        target: "tour-study-flashcard-question",
        title: "¿Lo recuerdas sin mirar?",
        description: "Primero intenta recuperar la respuesta. Verla y reconocerla no basta.",
        emphasis: ["no basta"],
      },
      {
        route: "study-preview",
        target: "tour-study-flashcard-answer",
        title: "Ahora comprueba la respuesta",
        description: "Después de intentarlo, compara lo que recordabas con la respuesta real.",
        emphasis: ["Después de intentarlo"],
      },
    ],
    final: false,
  },
  {
    journeyLabel: "Practica",
    scenes: [
      {
        route: "/crear",
        target: "practice-builder",
        title: "Practica lo que necesitas",
        description: "Elige contenido y cantidad. Sin tests al azar.",
        emphasis: ["Sin tests al azar"],
      },
      {
        route: "/crear",
        target: "tour-study-practice-aprendizaje",
        title: "Aprendizaje · Construye la base",
        description: "Entiende reglas y conceptos clave. Así respondes con criterio, no por memoria.",
        emphasis: ["con criterio"],
      },
      {
        route: "/crear",
        target: "tour-study-practice-consolidacion",
        title: "Consolidación · Domina lo que confunde",
        description: "Trabaja relaciones y excepciones: donde empiezan muchos fallos de examen.",
        emphasis: ["fallos de examen"],
      },
      {
        route: "/crear",
        target: "tour-study-practice-tribunal",
        title: "Tribunal · Prepárate para el examen",
        description: "Preguntas complejas basadas en exámenes oficiales para entrenar al nivel real.",
        emphasis: ["exámenes oficiales"],
      },
      {
        route: "/crear",
        target: "tour-study-practice-question",
        title: "Ahora compruébalo",
        description: "Una pregunta real. Mira cómo eliges una respuesta antes de corregir.",
        emphasis: ["antes de corregir"],
      },
      {
        route: "/crear",
        target: "tour-study-practice-feedback",
        title: "Un fallo también enseña",
        description: "Ves qué elegiste, cuál era la correcta y por qué, sin guardar esta demo.",
        emphasis: ["sin guardar esta demo"],
      },
    ],
    final: false,
  },
  {
    journeyLabel: "Progreso",
    scenes: [
      {
        route: "/progreso",
        target: "progress-overview",
        title: "Tus fallos sirven para algo",
        description: "OpoTest detecta qué necesita más trabajo. Así sabes dónde apretar.",
        emphasis: ["qué necesita más trabajo"],
      },
    ],
    final: false,
  },
  {
    journeyLabel: "“Hoy”",
    scenes: [
      {
        route: "/inicio",
        target: "today-session",
        title: "No vuelvas a pensar «¿qué hago hoy?»",
        description: "OpoTest usa tu progreso para proponerte el siguiente paso.",
        emphasis: ["proponerte el siguiente paso"],
      },
    ],
    final: true,
  },
] as const satisfies readonly ProductTourStep[];

export type ProductTourCompletionKind = "completed" | "skipped";

export function productTourScene(step: number, scene = 0): ProductTourScene {
  const phase: ProductTourStep = PRODUCT_TOUR_STEPS[step] ?? PRODUCT_TOUR_STEPS[0];
  return phase.scenes[scene] ?? phase.scenes[0];
}

export function productTourSceneCount(step: number) {
  const phase: ProductTourStep | undefined = PRODUCT_TOUR_STEPS[step];
  return phase?.scenes.length ?? 1;
}

export function productTourJourneyLabel(step: number) {
  const phase: ProductTourStep | undefined = PRODUCT_TOUR_STEPS[step];
  return phase?.journeyLabel ?? null;
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
    top: Math.max(8, rect.top - padding),
    left: Math.max(8, rect.left - padding),
    right: Math.min(window.innerWidth - 8, rect.right + padding),
    bottom: Math.min((window.visualViewport?.height ?? window.innerHeight) - 8, rect.bottom + padding),
  };
}
