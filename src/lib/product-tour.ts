export const PRODUCT_TOUR_STEPS = [
  {
    route: "/inicio" as const,
    target: "today-session",
    title: "Empieza aquí",
    description:
      "Esta tarjeta es tu punto de partida cada día. Reúne lo que más te conviene hacer ahora —estudiar, practicar o repasar— para que no tengas que decidirlo tú. Si dudas por dónde seguir, vuelve siempre a Hoy.",
    final: false,
  },
  {
    route: "/inicio" as const,
    target: "nav-study",
    title: "Todo tu temario está aquí",
    description:
      "En Estudio tienes el temario completo organizado por temas. Aquí puedes ver qué has trabajado, qué está en progreso y entrar en el tema que quieras reforzar. Es tu mapa general de preparación.",
    final: false,
  },
  {
    route: "/estudio" as const,
    target: "study-topic",
    title: "Avanza tema a tema",
    description:
      "Dentro de cada tema, OpoTest lo divide en unidades y conceptos para que avances por partes manejables. No se trata solo de leer: cada concepto se va comprobando con práctica y repaso hasta quedar asentado.",
    final: false,
  },
  {
    route: "/estudio" as const,
    target: "nav-practice",
    title: "Practica lo aprendido",
    description:
      "Los tests sirven para comprobar si realmente recuerdas lo estudiado. Cada respuesta aporta información sobre lo que dominas y lo que necesita refuerzo, así que practicar también ayuda a OpoTest a ajustar qué conviene hacer después.",
    final: false,
  },
  {
    route: "/estudio" as const,
    target: "study-progress",
    title: "Lo importante vuelve",
    description:
      "Tu progreso no depende solo de completar temas. OpoTest tiene en cuenta lo que fallas, dudas o todavía no está asentado y lo vuelve a poner delante cuando toca, para que no se quede atrás.",
    final: false,
  },
  {
    route: "/inicio" as const,
    target: "today-session",
    title: "Ya está",
    description:
      "El ciclo es sencillo: estudias, practicas y refuerzas lo que lo necesita. Tú no tienes que organizar todo ese proceso cada día. Vuelve a Hoy y empieza por la sesión recomendada.",
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
