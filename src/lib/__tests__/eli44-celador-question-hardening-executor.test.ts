// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import {
  CELADOR_OPPOSITION_ID,
  CELADOR_T11_TOPIC_ID,
  ELI44_HARDENING_PACKAGE_ID,
  T11_V5_EXPECTED,
  assertSafeCliArgs,
  buildT11V5Package,
  currentQuestionFingerprint,
  executionConfirmation,
  redactSensitiveText,
  validateHardeningPackage,
  type Answer,
  type AuditSnapshotRow,
  type PedagogicalLevel,
  type V5AuditRow,
} from "../celador-question-hardening-executor";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260825004500_eli44_celador_question_hardening.sql", import.meta.url),
  "utf8",
);
const cli = readFileSync(new URL("../../cli/eli44-celador-hardening.ts", import.meta.url), "utf8");
const builder = readFileSync(new URL("../../cli/eli44-build-celador-hardening-package.ts", import.meta.url), "utf8");

function uuidAt(index: number): string {
  return `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
}

function levelAt(index: number): PedagogicalLevel {
  if (index < 83) return "aprendizaje";
  if (index < 155) return "consolidacion";
  return "tribunal";
}

function answerAt(index: number): Answer {
  if (index < 54) return "A";
  if (index < 108) return "B";
  if (index < 161) return "C";
  return "D";
}

function fixture(): { audit: V5AuditRow[]; snapshot: AuditSnapshotRow[] } {
  const snapshot: AuditSnapshotRow[] = [];
  const audit: V5AuditRow[] = [];
  for (let i = 0; i < 214; i++) {
    const codigo = `SMS-CEL-E-T05-${String(i + 1).padStart(4, "0")}`;
    const level = levelAt(i);
    const answer = answerAt(i);
    const base: AuditSnapshotRow = {
      question_id: uuidAt(i + 1),
      codigo,
      pregunta: `Pregunta ${i + 1}`,
      opcion_a: `A ${i + 1}`,
      opcion_b: `B ${i + 1}`,
      opcion_c: `C ${i + 1}`,
      opcion_d: `D ${i + 1}`,
      respuesta_correcta: answer,
      explicacion: `Explicación ${i + 1}`,
      nivel_pedagogico: level,
      tipo_trampa: "ninguna",
    };
    snapshot.push(base);
    const decision = i < 185 ? (i === 173 ? "REPLACE" : "EDIT") : "KEEP";
    audit.push({
      question_id: base.question_id,
      codigo,
      nivel_actual: level,
      editorial_decision: decision,
      new_level_if_any: "",
      ...(decision === "KEEP" ? {} : {
        proposed_stem: base.pregunta,
        proposed_a: base.opcion_a,
        proposed_b: base.opcion_b,
        proposed_c: base.opcion_c,
        proposed_d: base.opcion_d,
        proposed_correct: base.respuesta_correcta,
        proposed_explanation: base.explicacion ?? "",
        proposed_tipo_trampa: base.tipo_trampa ?? "ninguna",
      }),
    });
  }
  return { audit, snapshot };
}

describe("ELI-44 Celador question hardening executor", () => {
  it("builds the exact governed 214-row T11 V5 shape from a frozen audit-time snapshot", () => {
    const { audit, snapshot } = fixture();
    const pkg = buildT11V5Package(audit, snapshot, "preflight");
    expect(pkg.package_id).toBe(ELI44_HARDENING_PACKAGE_ID);
    expect(pkg.opposition_id).toBe(CELADOR_OPPOSITION_ID);
    expect(pkg.topic_id).toBe(CELADOR_T11_TOPIC_ID);
    expect(pkg.mutations).toHaveLength(185);
    expect(pkg.keeps).toHaveLength(29);
    expect(pkg.mutations.filter((row) => row.decision === "EDIT")).toHaveLength(184);
    expect(pkg.mutations.filter((row) => row.decision === "REPLACE")).toHaveLength(1);
    expect(pkg.mutations.find((row) => row.decision === "REPLACE")?.codigo).toBe("SMS-CEL-E-T05-0174");
    expect(pkg.expected).toEqual(T11_V5_EXPECTED);
    expect(pkg.package_fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(validateHardeningPackage(pkg).package_fingerprint).toBe(pkg.package_fingerprint);
  });

  it("requires a frozen 214-row audit-time snapshot instead of blessing a fresh runtime snapshot implicitly", () => {
    const { audit, snapshot } = fixture();
    expect(() => buildT11V5Package(audit, snapshot.slice(0, 213))).toThrow("frozen 214-row audit-time snapshot");
  });

  it("fingerprints every stale-guard field deterministically", () => {
    const { snapshot } = fixture();
    const first = snapshot[0]!;
    const fp = currentQuestionFingerprint(first);
    expect(fp).toMatch(/^[0-9a-f]{64}$/);
    expect(currentQuestionFingerprint(first)).toBe(fp);
    expect(currentQuestionFingerprint({ ...first, tipo_trampa: "cambio" })).not.toBe(fp);
    expect(currentQuestionFingerprint({ ...first, nivel_pedagogico: "tribunal" })).not.toBe(fp);
    expect(currentQuestionFingerprint({ ...first, pregunta: `${first.pregunta}?` })).not.toBe(fp);
  });

  it("rejects duplicate identities, wrong row counts and non-allowlisted package fields", () => {
    const { audit, snapshot } = fixture();
    const duplicate = audit.map((row) => ({ ...row }));
    duplicate[1] = { ...duplicate[1]!, question_id: duplicate[0]!.question_id };
    expect(() => buildT11V5Package(duplicate, snapshot)).toThrow("duplicate identities");
    expect(() => buildT11V5Package(audit.slice(0, 213), snapshot)).toThrow("exactly 214 audited rows");

    const pkg = buildT11V5Package(audit, snapshot);
    expect(() => validateHardeningPackage({ ...pkg, codigo: "MUST_NOT_BE_MUTABLE" })).toThrow("unsupported keys");
    const badMutation = structuredClone(pkg) as any;
    badMutation.mutations[0].new_values.topic_id = CELADOR_T11_TOPIC_ID;
    expect(() => validateHardeningPackage(badMutation)).toThrow("unsupported keys");
  });

  it("binds execute confirmation to the exact package fingerprint", () => {
    const { audit, snapshot } = fixture();
    const pkg = buildT11V5Package(audit, snapshot);
    const exact = executionConfirmation(pkg.package_fingerprint);
    expect(exact).toBe(`APPLY_CELADOR_QUESTION_HARDENING:${pkg.package_fingerprint}`);
    expect(() => validateHardeningPackage({ ...pkg, mode: "execute", confirmation: "execute=true" })).toThrow();
    expect(validateHardeningPackage({ ...pkg, mode: "execute", confirmation: exact }).mode).toBe("execute");
  });

  it("refuses credential/JWT/privileged-key CLI arguments and redacts sensitive log shapes", () => {
    for (const arg of ["--password=x", "--jwt=x", "--token=x", "--service-role=x", "--secret=x"]) {
      expect(() => assertSafeCliArgs(["probe", arg])).toThrow();
    }
    expect(() => assertSafeCliArgs(["probe"])).not.toThrow();
    const redacted = redactSensitiveText("password=hunter2 eyJabc.def.ghi sb_secret_abcdefghijklmnopqrstuvwxyz");
    expect(redacted).not.toContain("hunter2");
    expect(redacted).not.toContain("eyJabc.def.ghi");
    expect(redacted).not.toContain("sb_secret_");
  });

  it("uses real Supabase Auth with runtime-only password and no session persistence", () => {
    expect(cli).toContain("signInWithPassword");
    expect(cli).toContain("persistSession: false");
    expect(cli).toContain("readHidden");
    expect(cli).toContain("SUPABASE_PUBLISHABLE_KEY");
    expect(cli).not.toContain("service_role");
    expect(cli).not.toMatch(/--password|--jwt|--token/);
    expect(builder).toContain("--audit-snapshot");
    expect(builder).toContain("flag: \"wx\"");
  });

  it("deploys a SECURITY INVOKER RPC closed to anon/service_role and guarded by real Celador admin auth", () => {
    expect(migration.toLowerCase()).toContain("security invoker");
    expect(migration).toContain("v_user_id uuid := (select auth.uid())");
    expect(migration).toContain("current_user <> 'authenticated'");
    expect(migration).toContain("public.current_active_opposition_id()");
    expect(migration).toContain("administrator.user_id = v_user_id");
    expect(migration).toContain(CELADOR_OPPOSITION_ID);
    expect(migration).toContain(CELADOR_T11_TOPIC_ID);
    expect(migration).toContain("revoke all on function public.execute_celador_question_hardening(jsonb) from public, anon, service_role");
    expect(migration).toContain("grant execute on function public.execute_celador_question_hardening(jsonb) to authenticated");
    expect(migration.toLowerCase()).not.toContain("security definer");
    expect(migration.toLowerCase()).not.toContain("set role");
    expect(migration.toLowerCase()).not.toContain("session_replication_role");
  });

  it("server contract rejects stale/identity/scope/package/count/postcondition drift and updates only allowlisted fields", () => {
    for (const marker of [
      "STALE_PACKAGE",
      "PACKAGE_FINGERPRINT_MISMATCH",
      "question_id/codigo identity",
      "restricted to Celador T11",
      "overlapping mutation/KEEP identities",
      "185 mutations (184 EDIT/1 REPLACE) + 29 KEEP",
      "projected V5 distribution mismatch",
      "structural preflight mismatch",
      "preservation hash mismatch",
      "cross-scope contamination detected",
    ]) expect(migration).toContain(marker);

    const updateBlock = migration.slice(migration.indexOf("update public.questions q"), migration.indexOf("get diagnostics v_rows"));
    for (const field of ["pregunta","opcion_a","opcion_b","opcion_c","opcion_d","respuesta_correcta","explicacion","nivel_pedagogico","tipo_trampa"]) {
      expect(updateBlock).toContain(field);
    }
    for (const forbidden of ["codigo=","topic_id=","opposition_id=","subject_id=","subtopic_id=","user_id=","activa="]) {
      expect(updateBlock.replace(/\s/g, "")).not.toContain(forbidden);
    }
  });
});
