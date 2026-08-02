// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260802013000_question_incidents_and_quality_guard.sql",
    import.meta.url,
  ),
  "utf8",
);

const privilegeMigration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260802005747_tighten_question_incident_privileges.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("question incidents and bank quality guard migration", () => {
  it("keeps incidents private and bound to an owned question", () => {
    expect(migration).toContain("ALTER TABLE public.question_incidents ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("REFERENCES public.questions(user_id, id)");
    expect(migration).toContain("TO authenticated");
    expect(migration).toContain("(select auth.uid()) = user_id");
  });

  it("does not alter a question automatically and prevents future literal duplicates", () => {
    expect(migration).toContain("CREATE TRIGGER questions_guard_statement_uniqueness");
    expect(migration).toContain("A question with the same statement already exists");
    expect(migration).not.toContain("DELETE FROM public.questions");
    expect(migration).not.toContain("UPDATE public.questions SET activa = false");
  });

  it("exposes the quality report only to authenticated owners", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.get_question_bank_quality_report()",
    );
    expect(migration).toContain("SECURITY INVOKER");
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.get_question_bank_quality_report() FROM PUBLIC",
    );
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.get_question_bank_quality_report() TO authenticated",
    );
  });

  it("limits the incident table to authenticated reads and inserts", () => {
    expect(privilegeMigration).toContain(
      "REVOKE ALL ON TABLE public.question_incidents FROM anon, authenticated",
    );
    expect(privilegeMigration).toContain(
      "GRANT SELECT, INSERT ON TABLE public.question_incidents TO authenticated",
    );
    expect(privilegeMigration).not.toContain("GRANT UPDATE");
    expect(privilegeMigration).not.toContain("GRANT DELETE");
  });
});
