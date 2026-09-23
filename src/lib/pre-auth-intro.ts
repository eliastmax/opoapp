export type PreAuthIntroVisual = "half" | "angles" | "evidence" | "check";

export type PreAuthIntroStep = {
  title: string;
  description: string;
  emphasis: readonly string[];
  visual: PreAuthIntroVisual;
};

export const PRE_AUTH_INTRO_STEPS: readonly PreAuthIntroStep[] = [
  {
    title: "Estudiar el temario\nes solo la mitad",
    description:
      "La otra mitad es comprobar si puedes reconocer la regla cuando una pregunta cambia el enfoque.",
    emphasis: ["comprobar si puedes reconocer la regla"],
    visual: "half",
  },
  {
    title: "Una misma regla.\nDistintas preguntas.",
    description:
      "OpoTest trabaja un mismo concepto desde varios ángulos con preguntas cuidadas y distractores plausibles.",
    emphasis: ["un mismo concepto desde varios ángulos"],
    visual: "angles",
  },
  {
    title: "Tus respuestas dicen\ndónde insistir",
    description:
      "Aciertos, fallos y dudas generan evidencia. Así puedes ver qué dominas y qué todavía necesita atención.",
    emphasis: ["generan evidencia", "todavía necesita atención"],
    visual: "evidence",
  },
  {
    title: "Ahora comprueba\nsi de verdad lo sabes",
    description:
      "Entrena con preguntas reales de tu oposición y usa esa evidencia para dirigir mejor el siguiente entrenamiento.",
    emphasis: ["dirigir mejor el siguiente entrenamiento"],
    visual: "check",
  },
] as const;

export const PRE_AUTH_ENTRY = {
  title: "Prepárate para\nresponder de verdad",
  description:
    "OpoTest convierte tus respuestas en evidencia para que entrenes con más criterio, no a ciegas.",
  emphasis: ["tus respuestas en evidencia"],
} as const;
