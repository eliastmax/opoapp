// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const identityMigration = readFileSync(
  new URL("../../../supabase/migrations/20260822115000_v4_content_importer_subject_identity.sql", import.meta.url),
  "utf8",
);

describe("V4 repeated official topic numbering", () => {
  test("keeps legacy unique-number imports and fails closed on ambiguous numbers", () => {
    expect(identityMigration).toContain("p_package->>'subjectName'");
    expect(identityMigration).toContain("subject.nombre = v_subject_name");
    expect(identityMigration).toContain("topic.opposition_id = v_opposition_id");
    expect(identityMigration).toContain("Topic % is ambiguous in opposition %; subjectName is required");
    expect(identityMigration).not.toContain("ORDER BY topic.numero LIMIT 1");
  });
});
