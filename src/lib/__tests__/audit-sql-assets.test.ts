// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

function auditSql(name: string): string {
  return readFileSync(join(__dirname, "../../../supabase/audits", name), "utf8");
}

describe("V2.5 audit SQL assets", () => {
  it("keeps the bank health report read-only", () => {
    const sql = auditSql("v25_bank_health.sql").toLowerCase();

    expect(sql).not.toContain("insert into public.");
    expect(sql).not.toContain("update public.");
    expect(sql).not.toContain("delete from public.");
    expect(sql).not.toContain("create table public.");
    expect(sql).not.toContain("alter table public.");
    expect(sql).not.toContain("drop table public.");
  });

  it("always rolls back the selection stress test", () => {
    const sql = auditSql("v25_selection_stress.sql").trim();

    expect(sql).toMatch(/^--[\s\S]*\nBEGIN;/);
    expect(sql).not.toMatch(/\nCOMMIT;\s*$/);
    expect(sql).toMatch(/ROLLBACK;$/);
  });
});
