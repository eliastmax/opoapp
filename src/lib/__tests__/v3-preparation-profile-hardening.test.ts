// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260802111447_v3_1_profile_write_guards.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("V3.1 preparation profile write guards", () => {
  it("keeps profile identity and completion timestamps server-owned", () => {
    expect(migration).toContain("Preparation profile identity cannot be changed");
    expect(migration).toContain("NEW.completed_at := now()");
    expect(migration).toContain("NEW.created_at := OLD.created_at");
  });

  it("validates calendar values and duplicate weekdays outside the RPC", () => {
    expect(migration).toContain("PERFORM NEW.exam_value::date");
    expect(migration).toContain("Practice days cannot contain duplicates");
  });

  it("keeps assessment identity and dates controlled by the database", () => {
    expect(migration).toContain("Topic self-assessment identity cannot be changed");
    expect(migration).toContain("NEW.assessed_at := now()");
    expect(migration).toContain("SECURITY INVOKER");
    expect(migration).not.toContain("SECURITY DEFINER");
  });
});
