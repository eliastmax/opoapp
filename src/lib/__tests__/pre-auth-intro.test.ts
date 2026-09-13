// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { PRE_AUTH_ENTRY, PRE_AUTH_INTRO_STEPS } from "../pre-auth-intro";

const component = readFileSync(new URL("../../components/pre-auth-intro.tsx", import.meta.url), "utf8");
const auth = readFileSync(new URL("../../routes/auth.tsx", import.meta.url), "utf8");
const root = readFileSync(new URL("../../routes/__root.tsx", import.meta.url), "utf8");

describe("ELI-99 tests-first pre-auth", () => {
  it("teaches exactly the four governed tests-first beats", () => {
    expect(PRE_AUTH_INTRO_STEPS).toHaveLength(4);
    expect(PRE_AUTH_INTRO_STEPS.map((step) => step.title)).toEqual([
      "Estudiar el temario\nes solo la mitad",
      "Una misma regla.\nDistintas preguntas.",
      "Tus respuestas dicen\ndónde insistir",
      "Ahora comprueba\nsi de verdad lo sabes",
    ]);
    const copy = JSON.stringify(PRE_AUTH_INTRO_STEPS);
    expect(copy).toContain("varios ángulos");
    expect(copy).toContain("generan evidencia");
    expect(copy).toContain("necesita atención");
    expect(copy).toContain("siguiente entrenamiento");
  });

  it("does not promise a study roadmap or Study-first product", () => {
    const copy = `${JSON.stringify(PRE_AUTH_INTRO_STEPS)} ${JSON.stringify(PRE_AUTH_ENTRY)}`;
    for (const forbidden of ["calendario", "hoja de ruta", "qué estudiar cada día", "academia", "OpoTest Study", "plan de preparación"]) {
      expect(copy.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });

  it("keeps the mobile controls, safe areas and reduced motion contract", () => {
    for (const label of ["Continuar", "Atrás", "Omitir", "Crear cuenta", "Iniciar sesión"]) expect(component).toContain(label);
    expect(component).toContain("min-[390px]:px-6");
    expect(component).toContain("min-[430px]:text-[34px]");
    expect(component).toContain("env(safe-area-inset-top,0px)");
    expect(component).toContain("env(safe-area-inset-bottom,0px)");
    expect(component).toContain("prefers-reduced-motion: reduce");
    expect(component).toContain("motion-reduce:transition-none");
  });

  it("exposes only the OpoTest learner brand in pre-auth and metadata", () => {
    expect(component).toContain("OpoTest");
    expect(auth).toContain('>OpoTest</h1>');
    expect(root).toContain("OpoTest — Entrena lo que de verdad sabes");
    expect(component).not.toContain("OpoTest Study");
    expect(auth).not.toContain("OpoTest Study");
    expect(root).not.toContain("OpoTest SMS");
  });
});
