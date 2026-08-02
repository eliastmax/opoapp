// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260802020000_v3_0_multi_opposition_catalog.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("V3.0 multi-opposition catalog migration", () => {
  it("creates shared catalog roots and private enrollments", () => {
    expect(migration).toContain("CREATE TABLE public.oppositions");
    expect(migration).toContain("CREATE TABLE public.user_oppositions");
    expect(migration).toContain("CREATE TABLE public.opposition_admins");
    expect(migration).toContain("ALTER TABLE public.user_oppositions ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("user_id = (select auth.uid())");
  });

  it("migrates both known catalogs without merging their questions", () => {
    expect(migration).toContain("'auxiliar-administrativo-sms'");
    expect(migration).toContain("'celador-sms'");
    expect(migration).toContain("ADD COLUMN opposition_id uuid");
    expect(migration).not.toContain("DELETE FROM public.questions");
    expect(migration).not.toContain("UPDATE public.test_answers");
    expect(migration).not.toContain("UPDATE public.question_statistics");
  });

  it("keeps hierarchy and test history bound to one opposition", () => {
    expect(migration).toContain("questions_opposition_subject_fk");
    expect(migration).toContain("questions_opposition_topic_fk");
    expect(migration).toContain("questions_opposition_subtopic_fk");
    expect(migration).toContain("tests_opposition_id_fkey");
    expect(migration).toContain("topics_opposition_number_normalized_name_key");
    expect(migration).toContain("subtopics_opposition_topic_normalized_name_key");
  });

  it("restricts catalog mutations to administrators", () => {
    expect(migration).toContain("Only catalog administrators can change catalog content");
    expect(migration).toContain("SECURITY INVOKER");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.assign_catalog_opposition()");
  });

  it("switches active opposition only for enrolled users", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.set_active_opposition");
    expect(migration).toContain("The user is not enrolled in this opposition");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.set_active_opposition(uuid)");
    expect(migration).toContain("CREATE TRIGGER profiles_guard_active_opposition");
    expect(migration).toContain("The active opposition must be a published enrolled opposition");
    expect(migration).toContain("CREATE TRIGGER tests_assign_opposition");
  });
});
