// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260802150000_v3_3_weekly_roadmap.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("V3.3 weekly roadmap", () => {
  it("derives the route from source data instead of persisting a mutable plan", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.get_weekly_roadmap()");
    expect(migration).toContain("preparation_profiles");
    expect(migration).toContain("test.fecha_finalizacion");
    expect(migration).not.toContain("CREATE TABLE public.weekly");
  });

  it("does not accumulate missed days or promote stages from the profile", () => {
    expect(migration).toContain("least(slots.outstanding_sessions, cardinality(slots.remaining_dates))");
    expect(migration).toContain("current_date");
    expect(migration).not.toContain("UPDATE public.preparation_profiles");
    expect(migration).not.toContain("consolidation_unlocked");
    expect(migration).not.toContain("tribunal_unlocked");
    expect(migration).toContain("no_days_remaining");
    expect(migration).toContain("week_complete");
  });

  it("keeps V3.2 priorities explainable and invoker-scoped", () => {
    expect(migration).toContain("active_failures");
    expect(migration).toContain("active_doubts");
    expect(migration).toContain("assessment_weight");
    expect(migration).toContain("SECURITY INVOKER");
    expect(migration).not.toContain("SECURITY DEFINER");
  });
});
