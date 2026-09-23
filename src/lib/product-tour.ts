export type ProductTourRoute = "/inicio" | "/crear" | "/progreso";

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
    journeyLabel: "Comprueba",
    scenes: [
      {
        route: "/inicio",
        target: "today-session",
        title: "Una pregunta no basta",
        description: "Un acierto aislado no demuestra dominio. OpoTest necesita evidencia de varias preguntas y sesiones.",
        emphasis: ["no demuestra dominio", "varias preguntas y sesiones"],
      },
    ],
    final: false,
  },
  {
    journeyLabel: "Ángulos",
    scenes: [
      {
        route: "/crear",
        target: "practice-builder",
        title: "Mismo concepto, distintos ángulos",
        description: "Literalidad, excepciones y aplicación pueden comprobar la misma regla sin repetir la misma pregunta.",
        emphasis: ["la misma regla", "sin repetir la misma pregunta"],
      },
    ],
    final: false,
  },
  {
    journeyLabel: "Evidencia",
    scenes: [
      {
        route: "/inicio",
        target: "today-session",
        title: "Tus respuestas generan evidencia",
        description: "Aciertos, fallos y dudas permiten detectar qué necesita atención y qué ya está más asentado.",
        emphasis: ["Aciertos, fallos y dudas", "qué necesita atención"],
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
        title: "Progreso muestra dominio real",
        description: "El estado de cada concepto depende de evidencia suficiente, no de actividad ni de un único resultado.",
        emphasis: ["evidencia suficiente", "no de actividad"],
      },
    ],
    final: false,
  },
  {
    journeyLabel: "Siguiente",
    scenes: [
      {
        route: "/inicio",
        target: "today-session",
        title: "Tu siguiente entrenamiento ya está preparado",
        description: "Usa tus resultados y puntos débiles para volver a comprobar lo que más necesita evidencia.",
        emphasis: ["puntos débiles", "más necesita evidencia"],
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
  return PRODUCT_TOUR_STEPS[step]?.scenes.length ?? 1;
}

export function productTourJourneyLabel(step: number) {
  return PRODUCT_TOUR_STEPS[step]?.journeyLabel ?? null;
}

export function productTourPath(route: ProductTourRoute) {
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
  oppositionSelected: boolean;
  pathname: string;
}) {
  return (
    !args.loading &&
    !args.error &&
    !args.completedAt &&
    !args.dismissedForSession &&
    args.oppositionSelected &&
    args.pathname === "/inicio"
  );
}
