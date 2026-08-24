// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260824024500_eli_34_learner_study_persistence.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("ELI-34 learner-facing Study persistence migration", () => {
  it("creates the scoped one-row-per-concept learner table without secondary indexes", () => {
    expect(migration).toContain("create table public.concept_study_content");
    expect(migration).toContain("concept_id uuid primary key");
    expect(migration).toContain(
      "foreign key (opposition_id, topic_id, concept_id)",
    );
    expect(migration).toContain(
      "references public.concepts (opposition_id, topic_id, id)",
    );
    expect(migration).not.toContain("create index");
  });

  it("closes direct Data API access and leaves RLS without learner policies", () => {
    expect(migration).toContain(
      "alter table public.concept_study_content enable row level security",
    );
    expect(migration).toContain(
      "revoke all on table public.concept_study_content from public, anon, authenticated",
    );
    expect(migration).not.toMatch(/create\s+policy/i);
  });

  it("uses a dedicated security-definer admin RPC with two-pass concurrency protection", () => {
    expect(migration).toContain(
      "create or replace function public.import_concept_study_content(p_package jsonb)",
    );
    expect(migration).toContain("security definer\nset search_path = ''");
    expect(migration).toContain("-- PASS 1:");
    expect(migration).toContain("-- PASS 2:");
    expect(migration).toContain("for update;");
    expect(migration).toContain(
      "where concept_id = v_concept_id and content_version = v_expected_version",
    );
    expect(migration).toContain("exception when unique_violation");
    expect(migration).not.toContain("on conflict (concept_id)");
  });

  it("enforces explicit approval and restricted Markdown", () => {
    expect(migration).toContain("private.is_safe_learner_markdown");
    expect(migration).toContain("Changed approved content requires explicit approval");
    expect(migration).toContain("Initial approval requires approvalAction=approve");
    expect(migration).toContain("approved_at is not null and approved_by is not null");
    expect(migration).toContain("approved_at is null and approved_by is null");
  });

  it("only exposes approved learner content through the public Study wrapper", () => {
    expect(migration).toContain("content.editorial_status = 'approved'");
    expect(migration).toContain("'learnerContent', case");
    expect(migration).toContain("'learnerTitle', content.learner_title");
    expect(migration).toContain("'learnerSourceRefs', content.learner_source_refs");
    expect(migration).toContain(
      "revoke all on function private.open_my_v4_study_unit(uuid) from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant execute on function public.open_my_v4_study_unit(uuid) to authenticated",
    );
  });

  it("never serializes internal source evidence into the learner read object", () => {
    const readModel = migration.slice(
      migration.indexOf("-- Extend the existing V4 read model"),
    );
    expect(readModel).not.toContain("source_evidence");
    expect(readModel).not.toContain("sourceEvidence");
    expect(readModel).not.toContain("row_to_json");
    expect(readModel).not.toContain("to_jsonb(");
    expect(readModel).not.toContain("select *");
  });

  it("contains no academic backfill or direct invocation of the new importer", () => {
    expect(migration).not.toMatch(/insert\s+into\s+public\.concept_study_content[\s\S]*select\s+/i);
    expect(migration).not.toMatch(/select\s+public\.import_concept_study_content/i);
  });
});
