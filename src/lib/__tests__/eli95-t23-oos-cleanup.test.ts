// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260903201500_eli95_t23_oos_cleanup.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("ELI-95 internal T23 OOS cleanup", () => {
  it("is private, exact-ledger and not a generic SQL/auth bypass surface", () => {
    expect(migration).toContain("current_user <> 'postgres'");
    expect(migration).toContain(
      "revoke all on function catalog_maintenance_private.execute_eli95_t23_oos_cleanup(text,text)",
    );
    expect(migration).toContain(
      "grant execute on function catalog_maintenance_private.execute_eli95_t23_oos_cleanup(text,text) to postgres",
    );
    expect(migration).toContain("from public, anon, authenticated, service_role");
    expect(migration).not.toMatch(/p_sql|sql_text|query_text|execute\s+immediate/i);
    expect(migration).not.toMatch(
      /create\s+role|alter\s+role|bypassrls|set\s+role|request\.jwt|disable\s+trigger/i,
    );
  });

  it("hard-locks Auxiliar T23 and all nine UUID/code pairs", () => {
    expect(migration).toContain("00000000-0000-4000-8000-000000000001");
    expect(migration).toContain("a3cb5108-c2d3-44c6-adb6-717588d66a63");
    const ledgers = [
      ["SMS-T23-0121", "dc5657c6-5605-4398-a810-10190fc00156"],
      ["SMS-T23-0122", "2cf10b92-70fa-478e-b065-e05218c2ec87"],
      ["SMS-T23-0123", "57bc5a2c-3465-47f3-83eb-8903df580e9b"],
      ["SMS-T23-0124", "22dfa515-ced8-46c9-a7e5-7fa612a0a1b6"],
      ["SMS-T23-0125", "833994a0-f6ba-41fb-adb1-68c9650f845c"],
      ["SMS-T23-0126", "ad99f4dd-8f2e-463d-aacb-22052317e9f4"],
      ["SMS-T23-0127", "eb860ac7-a304-43a4-8a12-3e1c4bf949cc"],
      ["SMS-T23-0128", "9f9e667a-d05f-4f76-8524-859203743f6d"],
      ["SMS-T23-0129", "43ceb09e-51b1-4fcc-9252-763de353dc3d"],
    ];
    for (const [code, id] of ledgers) {
      expect(migration).toContain(code);
      expect(migration).toContain(id);
    }
    expect(migration).toContain("ELI95_T23_OOS_CLEANUP_V1");
    expect(migration).toContain("exact OOS UUID/code ledger mismatch");
  });

  it("permits only activa true to false and preserves every other row field", () => {
    expect(migration).toContain("(to_jsonb(new)-'activa'-'updated_at')");
    expect(migration).toContain("(to_jsonb(old)-'activa'-'updated_at')");
    expect(migration).toContain("old.activa is distinct from true");
    expect(migration).toContain("new.activa is distinct from false");
    expect(migration).toContain("set activa=false");
  });

  it("preserves ELI-45, ELI-42, authenticated and Celador trigger paths", () => {
    expect(migration).toContain(
      "in ('question_hardening','eli42_scope_cleanup','eli95_t23_oos_cleanup')",
    );
    expect(migration).toContain("if v_operation='question_hardening' then");
    expect(migration).toContain("if v_operation='eli42_scope_cleanup' then");
    expect(migration).toContain("current_user='factory_catalog_executor'");
    expect(migration).toContain("v_user_id:=(select auth.uid())");
  });

  it("does not touch mappings, taxonomy, Study, mastery or flashcards", () => {
    expect(migration).not.toMatch(/delete\s+from\s+public\.question_concepts/i);
    expect(migration).not.toMatch(/update\s+public\.question_concepts/i);
    expect(migration).not.toMatch(/update\s+public\.concepts/i);
    expect(migration).not.toMatch(/update\s+public\.study_units/i);
    expect(migration).not.toMatch(/update\s+public\.flashcards/i);
    expect(migration).toContain("'planned_mapping_changes',0");
    expect(migration).toContain("'mapping_writes',0");
  });

  it("has exact pre-state fingerprints and post-state gates", () => {
    expect(migration).toContain("b82ef5f14f52bd5db609bf8855eede94");
    expect(migration).toContain("b2c649aef4b02cfd17445f6bfd946efd");
    expect(migration).toContain("b7d429992995d7320a7c0b84fc35574b");
    expect(migration).toContain("548474ae95bc9dcf15711674e265c59d");
    expect(migration).toContain("v_active<>129");
    expect(migration).toContain("v_oos_active<>9");
    expect(migration).toContain("v_inscope_active<>120");
    expect(migration).toContain("v_active<>120");
    expect(migration).toContain("v_oos_active<>0");
    expect(migration).toContain("v_oos_inactive<>9");
    expect(migration).toContain("v_level_a<>40");
    expect(migration).toContain("v_level_c<>40");
    expect(migration).toContain("v_level_t<>40");
    expect(migration).toContain("v_answer_a<>30");
    expect(migration).toContain("v_answer_d<>30");
    expect(migration).toContain("postcondition count mismatch; transaction rolled back");
    expect(migration).toContain("isolation postcondition mismatch; transaction rolled back");
  });
});