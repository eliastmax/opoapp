import Papa from "papaparse";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { stdout } from "node:process";
import {
  CELADOR_OPPOSITION_ID,
  CELADOR_T11_TOPIC_ID,
  T11_V5_EXPECTED,
  assertSafeCliArgs,
  buildT11V5Package,
  type PrewriteSnapshotRow,
  type V5AuditRow,
} from "../lib/celador-question-hardening-executor";

type PrewriteSnapshotFile = Readonly<{
  checkpoint_type: "PREWRITE_CURRENT";
  semantics: string;
  opposition_id: string;
  topic_id: string;
  questions: readonly PrewriteSnapshotRow[];
  primary_mappings: readonly Readonly<{
    question_id: string;
    codigo: string;
    concept_id: string;
    role: string;
  }>[];
  structural_counts: Readonly<{
    active_questions: number;
    primary_mappings: number;
    study_units: number;
    concepts: number;
    flashcards: number;
  }>;
}>;

function parseArgs(args: readonly string[]): {
  auditPath: string;
  snapshotPath: string;
  outPath: string;
} {
  assertSafeCliArgs(args);
  const allowed = new Set(["--audit-v5", "--prewrite-snapshot", "--out"]);
  const values = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    if (!allowed.has(key) || !value) {
      throw new Error(
        "Usage: bun run maintenance:celador-hardening:build -- --audit-v5 <V5.csv> --prewrite-snapshot <ELI44_T11_PREWRITE_SNAPSHOT.json> --out <ELI44_T11_HARDENING_PACKAGE_V5.json>.",
      );
    }
    if (values.has(key)) throw new Error(`Duplicate argument: ${key}`);
    values.set(key, value);
  }
  const auditPath = values.get("--audit-v5");
  const snapshotPath = values.get("--prewrite-snapshot");
  const outPath = values.get("--out");
  if (!auditPath || !snapshotPath || !outPath || values.size !== 3) {
    throw new Error("All three file arguments are required.");
  }
  return { auditPath, snapshotPath, outPath };
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function validatePrewriteSnapshot(value: unknown): PrewriteSnapshotFile {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("PRE-WRITE snapshot must be a JSON object.");
  }
  const snapshot = value as Partial<PrewriteSnapshotFile>;
  if (snapshot.checkpoint_type !== "PREWRITE_CURRENT") {
    throw new Error("Snapshot must declare checkpoint_type=PREWRITE_CURRENT.");
  }
  if (
    snapshot.opposition_id !== CELADOR_OPPOSITION_ID ||
    snapshot.topic_id !== CELADOR_T11_TOPIC_ID
  ) {
    throw new Error("PRE-WRITE snapshot scope does not match Celador T11.");
  }
  if (
    !Array.isArray(snapshot.questions) ||
    snapshot.questions.length !== T11_V5_EXPECTED.active_questions
  ) {
    throw new Error("PRE-WRITE snapshot must contain exactly 214 current T11 questions.");
  }
  if (
    !Array.isArray(snapshot.primary_mappings) ||
    snapshot.primary_mappings.length !== T11_V5_EXPECTED.primary_mappings
  ) {
    throw new Error("PRE-WRITE snapshot must contain exactly 214 PRIMARY mappings.");
  }
  const counts = snapshot.structural_counts;
  if (
    !counts ||
    counts.active_questions !== 214 ||
    counts.primary_mappings !== 214 ||
    counts.study_units !== 8 ||
    counts.concepts !== 38 ||
    counts.flashcards !== 76
  ) {
    throw new Error("PRE-WRITE structural counts must be 214/214/8/38/76.");
  }
  return snapshot as PrewriteSnapshotFile;
}

async function main(): Promise<void> {
  const { auditPath, snapshotPath, outPath } = parseArgs(process.argv.slice(2));
  const auditText = await readFile(auditPath, "utf8");
  const parsed = Papa.parse<Record<string, string>>(auditText, {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length) {
    throw new Error(
      `Could not parse V5 CSV: ${parsed.errors[0]?.message ?? "unknown CSV error"}`,
    );
  }
  const auditRows = parsed.data.map(
    (row): V5AuditRow => ({
      question_id: row.question_id ?? "",
      codigo: row.codigo ?? "",
      nivel_actual: row.nivel_actual ?? "",
      editorial_decision: row.editorial_decision ?? "",
      new_level_if_any: row.new_level_if_any ?? "",
      proposed_stem: row.proposed_stem ?? "",
      proposed_a: row.proposed_a ?? "",
      proposed_b: row.proposed_b ?? "",
      proposed_c: row.proposed_c ?? "",
      proposed_d: row.proposed_d ?? "",
      proposed_correct: row.proposed_correct ?? "",
      proposed_explanation: row.proposed_explanation ?? "",
      proposed_tipo_trampa: row.proposed_tipo_trampa ?? "",
    }),
  );

  const snapshotText = await readFile(snapshotPath, "utf8");
  const snapshotFile = validatePrewriteSnapshot(JSON.parse(snapshotText) as unknown);
  const pkg = buildT11V5Package(auditRows, snapshotFile.questions, "preflight");
  const packageText = `${JSON.stringify(pkg, null, 2)}\n`;
  await writeFile(outPath, packageText, { encoding: "utf8", flag: "wx" });

  stdout.write(`V5 CSV SHA-256: ${sha256(auditText)}\n`);
  stdout.write(`PRE-WRITE snapshot SHA-256: ${sha256(snapshotText)}\n`);
  stdout.write(`ELI-44 package file SHA-256: ${sha256(packageText)}\n`);
  stdout.write(`ELI-44 package fingerprint: ${pkg.package_fingerprint}\n`);
  stdout.write(`Wrote preflight package: ${outPath}\n`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown package build failure.");
  process.exitCode = 1;
});
