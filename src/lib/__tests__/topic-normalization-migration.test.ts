// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260729224023_normalize_topic_identity.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("topic identity migration", () => {
  it("preserves question ids while redirecting hierarchy", () => {
    expect(migration).toContain("UPDATE public.questions AS question");
    expect(migration).toContain("subject_id = topic_map.target_subject_id");
    expect(migration).toContain("topic_id = topic_map.target_topic_id");
    expect(migration).not.toContain("DELETE FROM public.questions");
  });

  it("merges equivalent subtopics before deleting duplicate topics", () => {
    const updateQuestions = migration.indexOf("SET subtopic_id = subtopic_map.target_subtopic_id");
    const deleteTopics = migration.indexOf("DELETE FROM public.topics AS topic");

    expect(updateQuestions).toBeGreaterThan(-1);
    expect(deleteTopics).toBeGreaterThan(updateQuestions);
  });

  it("enforces stable topic identity independently from materia", () => {
    expect(migration).toContain("CREATE UNIQUE INDEX topics_user_number_normalized_name_key");
    expect(migration).toContain("topic.numero = v_numero_tema");
    expect(migration).toContain("lower(regexp_replace(btrim(topic.nombre), '\\s+', ' ', 'g'))");
  });

  it("keeps the import RPC private and invoker-secured", () => {
    expect(migration).toContain("SECURITY INVOKER");
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.import_questions_batch(jsonb) FROM PUBLIC",
    );
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.import_questions_batch(jsonb) FROM anon",
    );
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.import_questions_batch(jsonb) TO authenticated",
    );
  });

  it("aborts if hierarchy integrity is not restored", () => {
    expect(migration).toContain("Topic normalization left duplicate topic identities");
    expect(migration).toContain("Topic normalization left question/subject mismatches");
    expect(migration).toContain("Topic normalization left question/subtopic mismatches");
  });
});
