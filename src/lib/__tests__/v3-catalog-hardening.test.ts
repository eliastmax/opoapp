// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260802021000_v3_0_catalog_policy_indexes.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("V3.0 catalog policy and index hardening", () => {
  it("replaces the legacy all policies with explicit write policies", () => {
    for (const table of ["subjects", "topics", "subtopics", "questions"]) {
      expect(migration).toContain(`DROP POLICY ${table}_all_own`);
      expect(migration).toContain(`CREATE POLICY ${table}_insert_admin`);
      expect(migration).toContain(`CREATE POLICY ${table}_update_admin`);
      expect(migration).toContain(`CREATE POLICY ${table}_delete_admin`);
    }
  });

  it("covers every new foreign-key access path reported by the advisor", () => {
    expect(migration).toContain("opposition_admins_user_idx");
    expect(migration).toContain("user_oppositions_opposition_idx");
    expect(migration).toContain("profiles_active_opposition_idx");
    expect(migration).toContain("topics_opposition_subject_idx");
    expect(migration).toContain("questions_opposition_subject_idx");
    expect(migration).toContain("questions_opposition_subtopic_idx");
    expect(migration).toContain("tests_opposition_idx");
  });

  it("prevents moving catalog rows or replacing their legacy curator", () => {
    expect(migration).toContain("Catalog rows cannot be moved between oppositions");
    expect(migration).toContain("The legacy catalog curator cannot be changed");
    expect(migration).toContain("BEFORE INSERT OR UPDATE ON public.questions");
  });
});
