// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260802105546_v3_1_preparation_profile.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("V3.1 preparation profile migration", () => {
  it("stores resumable settings and subjective topic estimates separately", () => {
    expect(migration).toContain("CREATE TABLE public.preparation_profiles");
    expect(migration).toContain("CREATE TABLE public.topic_self_assessments");
    expect(migration).toContain("current_step text");
    expect(migration).toContain("current_topic_id uuid");
    expect(migration).not.toContain("UPDATE public.question_statistics");
    expect(migration).not.toContain("UPDATE public.test_answers");
  });

  it("accepts only the agreed session sizes and assessment values", () => {
    expect(migration).toContain("questions_per_session IN (5, 10, 20)");
    expect(migration).toContain("estimated_percentage IN (0, 25, 50, 75, 100)");
    expect(migration).toContain("including unknown");
  });

  it("isolates every row by user and keeps writes invoker-scoped", () => {
    expect(migration).toContain("preparation_profiles_read_own");
    expect(migration).toContain("topic_self_assessments_read_own");
    expect(migration).toContain("user_id = (select auth.uid())");
    expect(migration).toContain("SECURITY INVOKER");
    expect(migration).not.toContain("SECURITY DEFINER");
  });

  it("saves the draft and final assessments in one transaction", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.save_preparation_profile");
    expect(migration).toContain("ON CONFLICT (user_id, opposition_id) DO UPDATE");
    expect(migration).toContain("ON CONFLICT (user_id, opposition_id, topic_id) DO UPDATE");
    expect(migration).toContain("preparation_profiles_guard_completion");
  });
});
