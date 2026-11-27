// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const route = (name: string) =>
  readFileSync(new URL(`../../routes/_authenticated/${name}.tsx`, import.meta.url), "utf8");

describe("Learner acceptance regressions", () => {
  test("Hoy only offers to resume a test from the active opposition", () => {
    const today = route("inicio");
    expect(today).toContain("if (!activeOppositionId) return");
    expect(today).toMatch(/\.from\("tests"\)[\s\S]*?\.eq\("opposition_id", activeOppositionId\)[\s\S]*?\.eq\("completado", false\)/);
  });

  test("Historial scopes its query and cache to the active opposition", () => {
    const history = route("historial");
    expect(history).toContain('queryKey: ["tests-history", oppositionId]');
    expect(history).toMatch(/\.from\("tests"\)[\s\S]*?\.eq\("opposition_id", oppositionId\)/);
  });

  test("Entrenar links to the existing exam simulation", () => {
    expect(route("crear")).toContain('<Link to="/simulacro">');
  });
});
