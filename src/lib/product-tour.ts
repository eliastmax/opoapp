export const PRODUCT_TOUR_STEPS = [
  {
    eyebrow: "Hoy",
    title: "Abre la app y empieza",
    description:
      "Hoy te propone qué conviene estudiar, practicar o repasar. No tienes que organizarlo todo cada vez.",
  },
  {
    eyebrow: "Estudio",
    title: "Avanza tema a tema",
    description:
      "En Estudio tienes el temario organizado. Entra en un tema y trabaja sus unidades y conceptos.",
  },
  {
    eyebrow: "Practicar",
    title: "Practica para saber qué dominas",
    description: "Cada respuesta ayuda a comprobar qué recuerdas y qué necesitas reforzar.",
  },
  {
    eyebrow: "Refuerzo",
    title: "Lo importante vuelve",
    description:
      "Los fallos, dudas y conceptos que necesitan refuerzo vuelven a aparecer para que no se queden atrás.",
  },
  {
    eyebrow: "Todo listo",
    title: "Ya sabes todo lo necesario",
    description: "Empieza por Hoy. OpoTest irá guiando el resto del camino.",
  },
] as const;

export type ProductTourCompletionKind = "completed" | "skipped";

export function shouldOpenProductTour(args: {
  loading: boolean;
  error: boolean;
  completedAt: string | null | undefined;
  dismissedForSession: boolean;
}) {
  return !args.loading && !args.error && !args.completedAt && !args.dismissedForSession;
}
