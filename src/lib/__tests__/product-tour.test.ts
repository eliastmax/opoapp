// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { PRODUCT_TOUR_STEPS, shouldOpenProductTour } from "../product-tour";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260822190000_first_run_product_tour.sql",
    import.meta.url,
  ),
  "utf8",
);
const component = readFileSync(
  new URL("../../components/product-tour.tsx", import.meta.url),
  "utf8",
);

describe("first-run product tour", () => {
  it("opens only after a successful unresolved state read", () => {
    expect(
      shouldOpenProductTour({
        loading: false,
        error: false,
        completedAt: null,
        dismissedForSession: false,
      }),
    ).toBe(true);
    expect(
      shouldOpenProductTour({
        loading: true,
        error: false,
        completedAt: null,
        dismissedForSession: false,
      }),
    ).toBe(false);
    expect(
      shouldOpenProductTour({
        loading: false,
        error: true,
        completedAt: null,
        dismissedForSession: false,
      }),
    ).toBe(false);
    expect(
      shouldOpenProductTour({
        loading: false,
        error: false,
        completedAt: "2026-08-22",
        dismissedForSession: false,
      }),
    ).toBe(false);
  });

  it("uses five short, truthful steps", () => {
    expect(PRODUCT_TOUR_STEPS).toHaveLength(5);
    expect(PRODUCT_TOUR_STEPS.map((step) => step.eyebrow)).toEqual([
      "Hoy",
      "Estudio",
      "Practicar",
      "Refuerzo",
      "Todo listo",
    ]);
  });

  it("persists completion and skip while replay keeps prior state", () => {
    expect(component).toContain('persist("skipped")');
    expect(component).toContain('persist("completed")');
    expect(component).not.toContain("delete()");
    expect(component).toContain("replaying ? closeSafely()");
    expect(component).toContain('navigate({ to: "/inicio" })');
  });

  it("fails closed and dismisses safely when persistence fails", () => {
    expect(component).toContain("closeSafely();");
    expect(component).toContain("state.isError");
    expect(component).toContain("Puedes seguir usando OpoTest");
  });

  it("isolates state by auth uid with restrictive RLS", () => {
    expect(migration).toContain("user_id uuid PRIMARY KEY REFERENCES auth.users(id)");
    expect(migration.match(/user_id = \(SELECT auth\.uid\(\)\)/g)?.length).toBeGreaterThanOrEqual(
      3,
    );
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("REVOKE ALL ON TABLE public.product_tour_states");
  });

  it("keeps product education separate from preparation profiles and auth", () => {
    expect(migration).not.toContain("preparation_profiles");
    expect(component).not.toContain("onAuthStateChange");
    expect(component).not.toContain("localStorage");
  });
});
