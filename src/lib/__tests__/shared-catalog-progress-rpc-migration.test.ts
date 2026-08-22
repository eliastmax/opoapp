// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260822121500_shared_catalog_progress_rpc_hardening.sql",
    import.meta.url,
  ),
  "utf8",
);

const hardenedFunctions = [
  "get_retention_review_summary",
  "get_topic_progress_summary",
  "get_verified_progress_summary",
  "get_question_bank_quality_report",
];

describe("shared catalog progress RPC hardening", () => {
  it("overrides every remaining catalog-ownership dependent summary RPC", () => {
    for (const functionName of hardenedFunctions) {
      expect(migration).toContain(`p.proname = '${functionName}'`);
    }
  });

  it("moves question and topic catalog identity to the active opposition", () => {
    expect(migration).toContain(
      "question.opposition_id = public.current_active_opposition_id()",
    );
    expect(migration).toContain(
      "topic.opposition_id = public.current_active_opposition_id()",
    );
    expect(migration).toContain(
      "profile.active_opposition_id = question.opposition_id",
    );
    expect(migration).toContain(
      "profile.active_opposition_id = topic.opposition_id",
    );
  });

  it("joins learner answers to shared questions through the test opposition", () => {
    expect(migration).toContain("question.opposition_id = test.opposition_id");
  });

  it("fails closed if the expected legacy definitions drift before migration", () => {
    expect(migration.match(/Expected legacy /g)).toHaveLength(4);
  });
});
