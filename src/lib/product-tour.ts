export const PRODUCT_TOUR_STEPS = [
  {
    route: "/inicio" as const,
    target: "today-session",
    title: "Empieza por aquí",
    description:
      "Cada día, OpoTest te propone el siguiente paso: estudiar, practicar o repasar. Así no tienes que decidir desde cero qué toca ahora; abres la app y puedes empezar.",
    emphasis: "el siguiente paso",
    final: false,
  },
  {
    route: "/inicio" as const,
    target: "nav-study",
    title: "Tu mapa de estudio",
    description:
      "Hoy te dice qué toca ahora. En Estudio tienes todo tu temario, puedes entrar en cualquier tema y ver qué has trabajado y qué te queda por delante.",
    emphasis: "todo tu temario",
    final: false,
  },
  {
    route: "/estudio" as const,
    target: "study-topic",
    title: "Un tema, por partes",
    description:
      "No tienes que abarcar un tema entero de golpe. Cada tema se divide en partes más manejables para que puedas trabajar una concreta y ver cómo avanzas.",
    emphasis: "partes más manejables",
    final: false,
  },
  {
    route: "/estudio" as const,
    target: "nav-practice",
    title: "Practica para comprobar",
    description:
      "Los tests no son solo una nota. Tus respuestas ayudan a comprobar qué tienes asentado, dónde dudas y qué conviene volver a trabajar.",
    emphasis: "comprobar qué tienes asentado",
    final: false,
  },
  {
    route: "/estudio" as const,
    target: "study-progress",
    title: "Lo importante vuelve",
    description:
      "Ver algo una vez no significa tenerlo asentado. Si fallas, dudas o algo necesita más trabajo, volverá a tus repasos para que puedas reforzarlo.",
    emphasis: "volverá a tus repasos",
    final: false,
  },
  {
    route: "/inicio" as const,
    target: "today-session",
    title: "Ya sabes por dónde seguir",
    description:
      "Estudias, practicas y refuerzas lo que lo necesita. Después, Hoy vuelve a proponerte el siguiente paso para que siempre tengas claro por dónde continuar.",
    emphasis: "el siguiente paso",
    final: true,
  },
] as const;

export type ProductTourCompletionKind = "completed" | "skipped";

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
