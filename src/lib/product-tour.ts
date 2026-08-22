export const PRODUCT_TOUR_STEPS = [
  {
    route: "/inicio" as const,
    target: "today-session",
    title: "Empieza por aquí",
    description: "OpoTest te propone qué hacer ahora: estudiar, practicar o repasar.",
    emphasis: ["estudiar, practicar o repasar"],
    final: false,
  },
  {
    route: "/inicio" as const,
    target: "nav-study",
    title: "Aquí está todo tu temario",
    description:
      "Entra en cualquier tema, estudia sus unidades y ve qué has avanzado y qué te queda.",
    emphasis: ["qué has avanzado", "qué te queda"],
    final: false,
  },
  {
    route: "/estudio" as const,
    target: "study-topic",
    title: "Estudia cada tema por partes",
    description:
      "Cada tema se divide en unidades para que puedas avanzar poco a poco sin perderte.",
    emphasis: ["poco a poco"],
    final: false,
  },
  {
    route: "/estudio" as const,
    target: "nav-practice",
    title: "Comprueba qué sabes de verdad",
    description:
      "Haz tests para descubrir qué dominas, dónde fallas y qué necesitas reforzar.",
    emphasis: ["qué dominas", "dónde fallas"],
    final: false,
  },
  {
    route: "/estudio" as const,
    target: "study-progress",
    title: "Vuelve a lo que todavía falla",
    description:
      "Tus fallos, dudas y puntos débiles vuelven para que puedas trabajarlos otra vez.",
    emphasis: ["fallos, dudas y puntos débiles"],
    final: false,
  },
  {
    route: "/inicio" as const,
    target: "today-session",
    title: "Siempre sabrás qué hacer después",
    description:
      "Estudias, practicas y refuerzas. Con tu progreso, OpoTest te propone el siguiente paso.",
    emphasis: ["el siguiente paso"],
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
