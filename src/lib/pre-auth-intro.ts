export type PreAuthIntroVisual = "clarity" | "progress" | "priority";

export type PreAuthIntroStep = {
  title: string;
  description: string;
  emphasis: readonly string[];
  visual: PreAuthIntroVisual;
};

export const PRE_AUTH_INTRO_STEPS: readonly PreAuthIntroStep[] = [
  {
    title: "Estudiar mucho\nno siempre es avanzar",
    description:
      "Entre temas, tests, fallos y repasos es fácil perder el foco. OpoTest te ayuda a convertir todo eso en una preparación con rumbo.",
    emphasis: ["una preparación con rumbo"],
    visual: "clarity",
  },
  {
    title: "Tu progreso\ncuenta una historia",
    description:
      "No importa solo cuánto has estudiado. Importa qué recuerdas, dónde dudas y qué sigue necesitando trabajo.",
    emphasis: ["qué recuerdas", "dónde dudas", "qué sigue necesitando trabajo"],
    visual: "progress",
  },
  {
    title: "Menos dudas\nsobre qué hacer",
    description:
      "A medida que avanzas, tu preparación empieza a mostrarte dónde merece la pena poner tu tiempo.",
    emphasis: ["dónde merece la pena poner tu tiempo"],
    visual: "priority",
  },
] as const;

export const PRE_AUTH_ENTRY = {
  title: "Prepárate\ncon intención",
  description:
    "Construye una preparación que recuerde lo que haces y te ayude a seguir avanzando sin estudiar a ciegas.",
  emphasis: ["seguir avanzando sin estudiar a ciegas"],
} as const;
