// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(__dirname, "../../../supabase/migrations/20260729232311_mixed_stage_practice.sql"),
  "utf8",
);

describe("mixed-stage practice migration", () => {
  it("keeps the RPC private, invoker-scoped and restricted to owned unlocked topics", () => {
    expect(migration).toContain("SECURITY INVOKER");
    expect(migration).toContain("topic.user_id = v_user_id");
    expect(migration).toContain("progress.tribunal_unlocked");
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.create_mixed_stage_test(uuid[], text, integer, uuid[]) FROM PUBLIC",
    );
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.create_mixed_stage_test(uuid[], text, integer, uuid[]) FROM anon",
    );
  });

  it("treats a shown but unanswered question as new", () => {
    expect(migration).toContain("WHEN 'nuevas' THEN COALESCE(statistics.answered_count, 0) = 0");
    expect(migration).toContain("WHEN pool.answered_count = 0 THEN 'nueva'");
  });

  it("balances the selection by topic and pedagogical stage", () => {
    expect(migration).toContain("PARTITION BY sampled.topic_id");
    expect(migration).toContain("PARTITION BY sampled.topic_id, sampled.question_stage");
    expect(migration).toContain("'mixed-stages-v1.0'");
  });
});
