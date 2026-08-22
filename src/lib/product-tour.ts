export const PRODUCT_TOUR_STEPS = [
  {
    route: "/inicio" as const,
    target: "today-session",
    title: "Empieza aquí",
    description:
      "Esta es tu mejor siguiente acción. OpoTest te indica qué estudiar, practicar o repasar hoy.",
    final: false,
  },
  {
    route: "/inicio" as const,
    target: "nav-study",
    title: "Todo tu temario está aquí",
    description: "Desde Estudio puedes entrar en cada tema y ver cómo avanza tu preparación.",
    final: false,
  },
  {
    route: "/estudio" as const,
    target: "study-topic",
    title: "Avanza tema a tema",
    description: "Abre un tema para trabajar sus unidades y conceptos con el contenido real.",
    final: false,
  },
  {
    route: "/estudio" as const,
    target: "nav-practice",
    title: "Practica lo aprendido",
    description:
      "Crea tests para comprobar qué recuerdas. Tus respuestas orientan el siguiente paso.",
    final: false,
  },
  {
    route: "/estudio" as const,
    target: "study-progress",
    title: "Lo importante vuelve",
    description: "Aquí ves lo trabajado y lo que necesita atención. Hoy lo ordena para reforzarlo.",
    final: false,
  },
  {
    route: "/inicio" as const,
    target: "today-session",
    title: "Ya está",
    description: "No necesitas organizar nada más. Empieza por Hoy y OpoTest irá guiando el resto.",
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
