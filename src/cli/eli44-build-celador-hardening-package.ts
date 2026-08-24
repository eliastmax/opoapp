import Papa from "papaparse";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { stdout } from "node:process";
import {
  assertSafeCliArgs,
  buildT11V5Package,
  type AuditSnapshotRow,
  type V5AuditRow,
} from "../lib/celador-question-hardening-executor";

function parseArgs(args: readonly string[]): { auditPath: string; snapshotPath: string; outPath: string } {
  assertSafeCliArgs(args);
  const allowed = new Set(["--audit-v5", "--audit-snapshot", "--out"]);
  const values = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    if (!allowed.has(key) || !value) {
      throw new Error("Usage: bun run maintenance:celador-hardening:build -- --audit-v5 <V5.csv> --audit-snapshot <frozen-audit-snapshot.json> --out <package.json>.");
    }
    if (values.has(key)) throw new Error(`Duplicate argument: ${key}`);
    values.set(key, value);
  }
  const auditPath = values.get("--audit-v5");
  const snapshotPath = values.get("--audit-snapshot");
  const outPath = values.get("--out");
  if (!auditPath || !snapshotPath || !outPath || values.size !== 3) throw new Error("All three file arguments are required.");
  return { auditPath, snapshotPath, outPath };
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function main(): Promise<void> {
  const { auditPath, snapshotPath, outPath } = parseArgs(process.argv.slice(2));
  const auditText = await readFile(auditPath, "utf8");
  const parsed = Papa.parse<Record<string, string>>(auditText, { header: true, skipEmptyLines: true });
  if (parsed.errors.length) throw new Error(`Could not parse V5 CSV: ${parsed.errors[0]?.message ?? "unknown CSV error"}`);
  const auditRows = parsed.data.map((row): V5AuditRow => ({
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
  }));

  const snapshotRaw = JSON.parse(await readFile(snapshotPath, "utf8")) as unknown;
  if (!Array.isArray(snapshotRaw)) throw new Error("Audit snapshot must be a JSON array.");
  const snapshot = snapshotRaw as AuditSnapshotRow[];
  const pkg = buildT11V5Package(auditRows, snapshot, "preflight");
  await writeFile(outPath, `${JSON.stringify(pkg, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  stdout.write(`V5 CSV SHA-256: ${sha256(auditText)}\n`);
  stdout.write(`ELI-44 package fingerprint: ${pkg.package_fingerprint}\n`);
  stdout.write(`Wrote preflight package: ${outPath}\n`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown package build failure.");
  process.exitCode = 1;
});
