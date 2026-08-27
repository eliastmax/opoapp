// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260827192100_eli46_tipo_trampa_contract_alignment.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("ELI-46 tipo_trampa schema contract alignment", () => {
  it("keeps the constraint and aligns it to the governed metadata slug contract", () => {
    expect(migration).toContain("drop constraint questions_tipo_trampa_check");
    expect(migration).toContain("add constraint questions_tipo_trampa_check");
    expect(migration).toContain("tipo_trampa is null");
    expect(migration).toContain("char_length(tipo_trampa) between 1 and 64");
    expect(migration).toContain("tipo_trampa ~ '^[a-z0-9_]+$'");
    expect(migration).toContain("validate constraint questions_tipo_trampa_check");
  });

  it("fails closed if existing rows do not already satisfy the new contract", () => {
    expect(migration).toContain("existing questions_tipo_trampa_check constraint");
    expect(migration).toContain("tipo_trampa lexical preflight failed");
    expect(migration).toContain("q.tipo_trampa !~ '^[a-z0-9_]+$'");
    expect(migration).toContain("char_length(q.tipo_trampa) not between 1 and 64");
  });

  it("does not preserve the historical fixed-label enumeration", () => {
    expect(migration).not.toContain("tipo_trampa = ANY");
    expect(migration).not.toContain("ARRAY['ninguna'");
  });

  it("performs no academic row DML", () => {
    expect(migration).not.toMatch(/update\s+public\.questions/i);
    expect(migration).not.toMatch(/insert\s+into\s+public\.questions/i);
    expect(migration).not.toMatch(/delete\s+from\s+public\.questions/i);
  });
});
