// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const preparation = readFileSync(new URL("../../routes/_authenticated/preparacion.tsx", import.meta.url), "utf8");
const settings = readFileSync(new URL("../../routes/_authenticated/ajustes.tsx", import.meta.url), "utf8");
const recap = readFileSync(new URL("../../components/weekly-tests-first-recap.tsx", import.meta.url), "utf8");
const today = readFileSync(new URL("../../routes/_authenticated/inicio.tsx", import.meta.url), "utf8");
const tour = readFileSync(new URL("../../components/product-tour.tsx", import.meta.url), "utf8");
const oppositionMigration = readFileSync(new URL("../../../supabase/migrations/20260802020000_v3_0_multi_opposition_catalog.sql", import.meta.url), "utf8");

describe("ELI-99 onboarding and weekly recap", () => {
  it("makes onboarding opposition-only and leaves preparation profiles dormant", () => {
    expect(preparation).toContain("Elige tu oposición");
    expect(preparation).toContain('.from("user_oppositions")');
    expect(preparation).toContain('rpc("set_active_opposition"');
    for (const forbidden of ["PreparationProfileFlow", "usePreparationProfile", "preparation_profiles", "save_preparation_profile", "exam", "practiceDays", "selfAssessment", "tema actual", "plan inicial"]) {
      expect(preparation).not.toContain(forbidden);
    }
  });

  it("reuses the governed invoker active-opposition contract", () => {
    expect(oppositionMigration).toContain("CREATE OR REPLACE FUNCTION public.set_active_opposition");
    expect(oppositionMigration).toContain("SECURITY INVOKER");
    expect(oppositionMigration).toContain("auth.uid()");
    expect(oppositionMigration).toContain("o.published = true");
    expect(oppositionMigration).toContain("REVOKE ALL ON FUNCTION public.set_active_opposition(uuid) FROM PUBLIC, anon;");
    expect(oppositionMigration).not.toContain("GRANT EXECUTE ON FUNCTION public.set_active_opposition(uuid) TO PUBLIC");
    expect(oppositionMigration).not.toContain("GRANT EXECUTE ON FUNCTION public.set_active_opposition(uuid) TO anon");
    expect(oppositionMigration).toContain("GRANT EXECUTE ON FUNCTION public.set_active_opposition(uuid) TO authenticated;");
  });

  it("keeps Settings focused on account, opposition, replay, reset and logout", () => {
    for (const expected of ["Cuenta", "Oposición activa", "Cambiar oposición", "Ver tutorial de OpoTest", "Datos de entrenamiento", "Cerrar sesión"]) {
      expect(settings).toContain(expected);
    }
    expect(settings).not.toContain("Perfil de preparación");
    expect(settings).not.toContain("Fecha, ritmo y valoración inicial");
  });

  it("uses a deterministic rolling seven-day activity window and completed real tests", () => {
    expect(recap).toContain("ROLLING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000");
    expect(recap).toContain("Últimos 7 días");
    expect(recap).toContain('.from("tests")');
    expect(recap).toContain('.eq("completado", true)');
    expect(recap).toContain('.eq("opposition_id", oppositionId)');
    expect(recap).toContain('.gte("fecha_finalizacion", since)');
    expect(recap).toContain('.from("test_answers")');
    expect(recap).toContain('rpc("get_my_tests_first_concept_progress")');
    expect(recap).toContain("estado actual, no un cambio durante el periodo");
    for (const forbidden of ["Has mejorado", "subieron", "pasaron a Dominado", "Has empeorado"]) expect(recap).not.toContain(forbidden);
  });

  it("keeps the recap secondary to Today and never writes learner state", () => {
    expect(today.indexOf("PrimaryCard")).toBeLessThan(today.indexOf("WeeklyTestsFirstRecap"));
    for (const forbidden of [".insert(", ".update(", ".upsert(", ".delete("]) expect(recap).not.toContain(forbidden);
  });

  it("keeps tutorial persistence isolated from learner training tables", () => {
    expect(tour).toContain('.from("product_tour_states")');
    for (const table of ["tests", "test_answers", "question_statistics", "questions", "flashcards"]) expect(tour).not.toContain(`.from(\"${table}\")`);
  });
});
