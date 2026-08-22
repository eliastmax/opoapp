// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260822103000_shared_catalog_v2_rpc_fix.sql",
    import.meta.url,
  ),
  "utf8",
);

const practiceFunctions = [
  "create_level_test",
  "create_smart_test",
  "create_multi_topic_test",
  "create_mixed_stage_test",
  "create_exam_simulation",
];

describe("fresh learner shared-catalog V2 remediation", () => {
  it("replaces every affected public practice RPC without changing its name", () => {
    for (const functionName of practiceFunctions) {
      expect(migration).toContain(`CREATE OR REPLACE FUNCTION public.${functionName}(`);
    }
  });

  it("scopes published catalog rows by the active opposition", () => {
    expect(migration.match(/v_opposition_id := public\.current_active_opposition_id\(\)/g)).toHaveLength(5);
    expect(migration).toContain("question.opposition_id = v_opposition_id");
    expect(migration).toContain("topic.opposition_id = v_opposition_id");
    expect(migration).toContain("subtopic.opposition_id = v_opposition_id");
    expect(migration).not.toContain("question.user_id = v_user_id");
    expect(migration).not.toContain("topic.user_id = v_user_id");
    expect(migration).not.toContain("subtopic.user_id = v_user_id");
  });

  it("keeps learner signals scoped to the authenticated learner", () => {
    expect(migration).toContain("statistics.user_id = v_user_id");
    expect(migration).toContain("failure.user_id = v_user_id");
    expect(migration).toContain("doubt.user_id = v_user_id");
    expect(migration).toContain("previous_answer.user_id = v_user_id");
    expect(migration).toContain("selection.user_id = v_user_id");
  });

  it("rejects requests without an active opposition", () => {
    expect(migration.match(/An active opposition is required/g)).toHaveLength(5);
  });

  it("keeps covered-topic joins inside the active opposition", () => {
    expect(migration).not.toContain("question.user_id = selection.user_id");
    expect(migration).toContain("question.id = selection.question_id");
    expect(migration).toContain("question.opposition_id = v_opposition_id");
  });
});
