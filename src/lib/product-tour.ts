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
  journeyLabel?: string;
};

export const PRODUCT_TOUR_STEPS = [
  {
    scenes: [
      {
        route: "/inicio",
        target: "today-session",
        title: "Este es tu punto de partida",
        description:
          "En Hoy encontrarás tu sesión recomendada. Cuando quieras empezar, entra aquí y OpoTest te lleva directamente a lo que toca.",
        emphasis: ["tu sesión recomendada", "lo que toca"],
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
    journeyLabel: "Dentro de una unidad",
    scenes: [
      {
        route: "study-preview",
        target: "study-summary",
        title: "Aquí es donde estudias",
        description:
          "Cada unidad reúne un resumen, claves y conceptos para que entiendas qué necesitas aprender.",
        emphasis: ["entiendas qué necesitas aprender"],
      },
      {
        route: "study-preview",
        target: "study-keys",
        title: "Fíjate en lo que suele importar",
        description:
          "Las claves destacan los detalles que merece la pena tener especialmente presentes para el examen.",
        emphasis: ["especialmente presentes para el examen"],
      },
      {
        route: "study-preview",
        target: "study-confusions",
        title: "Aprende también qué se parece",
        description:
          "OpoTest te señala conceptos que pueden confundirse para que aprendas a distinguirlos, no solo a reconocer una respuesta.",
        emphasis: ["aprendas a distinguirlos"],
      },
      {
        route: "study-preview",
        target: "study-traps",
        title: "Prepárate para donde suelen pillarte",
        description:
          "Las trampas frecuentes ponen el foco en matices que pueden hacerte fallar incluso cuando conoces el tema.",
        emphasis: ["matices que pueden hacerte fallar"],
      },
      {
        route: "study-preview",
        target: "flashcard-preview",
        title: "Después, intenta recordarlo",
        description:
          "Las flashcards te piden la respuesta antes de mostrarla para que compruebes qué recuerdas sin mirar.",
        emphasis: ["qué recuerdas sin mirar"],
      },
      {
        route: "study-preview",
        target: "flashcard-answer",
        title: "Comprueba lo que recordabas",
        description:
          "La respuesta aparece después del intento para que puedas comparar lo que recordabas con la respuesta real.",
        emphasis: ["después del intento"],
      },
    ],
    final: false,
  },
  {
    journeyLabel: "Crear un test",
    scenes: [
      {
        route: "/crear",
        target: "practice-builder",
        title: "Practica exactamente lo que necesitas",
        description:
          "Puedes elegir qué contenido trabajar y ajustar cómo quieres ponerte a prueba antes de empezar.",
        emphasis: ["qué contenido trabajar"],
      },
      {
        route: "/crear",
        target: "practice-level-aprendizaje",
        title: "Aprendizaje · entiende la base",
        description:
          "Empiezas por reglas esenciales, conceptos principales y comprensión. Primero construyes una base segura.",
        emphasis: ["construyes una base segura"],
      },
      {
        route: "/crear",
        target: "practice-level-consolidacion",
        title: "Consolidación · conecta y distingue",
        description:
          "Cuando la base es estable, trabajas excepciones, relaciones y situaciones donde ya no basta con reconocer la respuesta.",
        emphasis: ["excepciones, relaciones"],
      },
      {
        route: "/crear",
        target: "practice-level-tribunal",
        title: "Tribunal · entrena la precisión",
        description:
          "Casos, matices y distractores próximos te preparan para cuando varias respuestas podrían parecer correctas.",
        emphasis: ["varias respuestas podrían parecer correctas"],
      },
      {
        route: "/crear",
        target: "practice-level-mezcladas",
        title: "Después, mantén el tema completo",
        description:
          "Cuando Tribunal ya está disponible, Mezcladas combina los tres niveles para mantener activo todo el tema.",
        emphasis: ["combina los tres niveles"],
      },
      {
        route: "/crear",
        target: "practice-format",
        title: "OpoTest te ayuda a avanzar por etapas",
        description:
          "La app recomienda qué nivel conviene trabajar según tu práctica; tú sigues teniendo el control del contenido y el formato.",
        emphasis: ["recomienda qué nivel conviene trabajar"],
      },
      {
        route: "/crear",
        target: "practice-start",
        title: "Todo listo para comprobarlo",
        description:
          "La demostración va a abrir una pregunta real, pero no creará ningún test y no contará para tus estadísticas.",
        emphasis: ["no contará para tus estadísticas"],
      },
      {
        route: "/crear",
        target: "practice-question",
        title: "Responde como en un test real",
        description:
          "Primero ves la pregunta y sus opciones exactamente como durante una sesión de práctica.",
        emphasis: ["pregunta y sus opciones"],
      },
      {
        route: "/crear",
        target: "practice-answer",
        title: "Toca una opción para responder",
        description:
          "La respuesta queda seleccionada antes de corregirse. En esta demo verás ese gesto sin guardar nada en tu historial.",
        emphasis: ["queda seleccionada antes de corregirse"],
      },
      {
        route: "/crear",
        target: "practice-feedback",
        title: "Un fallo también sirve para avanzar",
        description:
          "Después ves qué elegiste, cuál era la respuesta correcta y por qué. Cuando practiques de verdad, tus aciertos, fallos y dudas ayudarán a detectar qué necesitas seguir trabajando.",
        emphasis: ["cuál era la respuesta correcta", "aciertos, fallos y dudas"],
      },
    ],
    final: false,
  },
  {
    scenes: [
      {
        route: "/progreso",
        target: "progress-overview",
        title: "Aquí ves cómo evoluciona tu preparación",
        description:
          "Progreso reúne qué conocimientos están en comprobación, cuáles estás consolidando, cuáles ya retienes y qué temas necesitan atención.",
        emphasis: ["qué temas necesitan atención"],
      },
      {
        route: "/inicio",
        target: "today-session",
        title: "Ahora sí: siempre sabrás qué hacer después",
        description:
          "Todo lo que estudias y practicas vuelve a Hoy. Con esa evidencia, OpoTest te propone el siguiente paso para que no tengas que decidir desde cero.",
        emphasis: ["OpoTest te propone el siguiente paso"],
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
    top: Math.max(6, rect.top - padding),
    left: Math.max(6, rect.left - padding),
    right: Math.min(window.innerWidth - 6, rect.right + padding),
    bottom: Math.min(window.innerHeight - 6, rect.bottom + padding),
  };
}
