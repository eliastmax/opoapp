// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { PRE_AUTH_ENTRY, PRE_AUTH_INTRO_STEPS } from "../pre-auth-intro";

const component = readFileSync(
  new URL("../../components/pre-auth-intro.tsx", import.meta.url),
  "utf8",
);
const auth = readFileSync(new URL("../../routes/auth.tsx", import.meta.url), "utf8");
const index = readFileSync(new URL("../../routes/index.tsx", import.meta.url), "utf8");
const authenticatedLayout = readFileSync(
  new URL("../../routes/_authenticated/route.tsx", import.meta.url),
  "utf8",
);

describe("pre-auth premium intro", () => {
  it("keeps exactly three value screens and one final entry screen", () => {
    expect(PRE_AUTH_INTRO_STEPS).toHaveLength(3);
    expect(PRE_AUTH_INTRO_STEPS.map(({ title, description, emphasis }) => ({
      title,
      description,
      emphasis: [...emphasis],
    }))).toEqual([
      {
        title: "Estudiar mucho\nno siempre es avanzar",
        description:
          "Entre temas, tests, fallos y repasos es fácil perder el foco. OpoTest te ayuda a convertir todo eso en una preparación con rumbo.",
        emphasis: ["una preparación con rumbo"],
      },
      {
        title: "Tu progreso\ncuenta una historia",
        description:
          "No importa solo cuánto has estudiado. Importa qué recuerdas, dónde dudas y qué sigue necesitando trabajo.",
        emphasis: ["qué recuerdas", "dónde dudas", "qué sigue necesitando trabajo"],
      },
      {
        title: "Menos dudas\nsobre qué hacer",
        description:
          "A medida que avanzas, tu preparación empieza a mostrarte dónde merece la pena poner tu tiempo.",
        emphasis: ["dónde merece la pena poner tu tiempo"],
      },
    ]);
    expect(PRE_AUTH_ENTRY).toEqual({
      title: "Prepárate\ncon intención",
      description:
        "Construye una preparación que recuerde lo que haces y te ayude a seguir avanzando sin estudiar a ciegas.",
      emphasis: ["seguir avanzando sin estudiar a ciegas"],
    });
  });

  it("keeps every emphasis fragment grounded in its own short copy", () => {
    for (const screen of [...PRE_AUTH_INTRO_STEPS, PRE_AUTH_ENTRY]) {
      for (const fragment of screen.emphasis) expect(screen.description).toContain(fragment);
    }
    expect(component).toContain("font-semibold text-muted-foreground");
  });

  it("is editorial rather than a spotlight, feature grid or premium ad", () => {
    expect(component).not.toContain("data-tour");
    expect(component).not.toContain("coach");
    expect(component).not.toContain("Dialog");
    expect(component).not.toContain("Crown");
    expect(component).not.toContain("PREMIUM");
    expect(component).not.toContain("€");
    expect(component).not.toContain("Tu sesión de hoy");
    expect(component).not.toContain("Centro de estudio");
    expect(component).not.toContain("mastery");
    expect(component).not.toContain("IA");
  });

  it("uses one dominant visual composition for each value proposition", () => {
    expect(component).toContain("ClarityVisual");
    expect(component).toContain("ProgressVisual");
    expect(component).toContain("PriorityVisual");
    expect(component).toContain("EntryVisual");
    expect(component).toContain("Preparación con rumbo");
    expect(component).toContain("Contenido asentado");
    expect(component).toContain("Merece atención");
  });

  it("keeps headline, copy, spacing and safe areas mobile-first at 360, 390 and 430 px", () => {
    expect(component).toContain("max-w-md");
    expect(component).toContain("px-5");
    expect(component).toContain("min-[390px]:px-6");
    expect(component).toContain("text-[30px]");
    expect(component).toContain("min-[390px]:text-[32px]");
    expect(component).toContain("min-[430px]:text-[34px]");
    expect(component).toContain("text-[16px] leading-[1.5]");
    expect(component).toContain("min-[390px]:text-[17px]");
    expect(component).toContain("env(safe-area-inset-top,0px)");
    expect(component).toContain("env(safe-area-inset-bottom,0px)");
    expect(component).toContain("min-h-[100svh]");
  });

  it("keeps controls simple and lets users continue, go back or skip to entry", () => {
    expect(component).toContain("Continuar");
    expect(component).toContain("Anterior");
    expect(component).toContain("Omitir");
    expect(component).toContain("moveTo(ENTRY_STEP)");
    expect(component).toContain("Crear mi cuenta");
    expect(component).toContain("Ya tengo cuenta · Iniciar sesión");
  });

  it("uses a short premium-feeling transition and respects reduced motion", () => {
    expect(component).toContain("prefers-reduced-motion: reduce");
    expect(component).toContain("}, 120)");
    expect(component).toContain("duration-200");
    expect(component).toContain("motion-reduce:transition-none");
    expect(component).not.toContain("bounce");
    expect(component).not.toContain("scale-");
  });

  it("keeps intro before forms while preserving direct login and signup entry", () => {
    expect(auth).toContain('type View = "intro" | "forms" | "verify" | "forgot"');
    expect(auth).toContain('mode: search.mode === "login" || search.mode === "signup" ? search.mode : "intro"');
    expect(auth).toContain('if (view === "intro") return <PreAuthIntro');
    expect(auth).toContain('openForms("signup")');
    expect(auth).toContain('openForms("login")');
    expect(auth).toContain('<Tabs value={authTab}');
    expect(auth).toContain("/auth/recovery");
    expect(auth).toContain("postAuthRoute");
  });

  it("uses root as the intro entry but sends protected deep links straight to login", () => {
    expect(index).toContain('redirect({ to: "/auth", search: { mode: "intro" } })');
    expect(authenticatedLayout).toContain('redirect({ to: "/auth", search: { mode: "login" } })');
    expect(authenticatedLayout).toContain("ProductTourProvider");
  });
});
