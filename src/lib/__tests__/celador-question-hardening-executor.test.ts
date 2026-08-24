import { describe, expect, test } from "bun:test";
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
  packageFingerprint,
  validateHardeningPackage,
  type AuditSnapshotRow,
  type V5AuditRow,
} from "../celador-question-hardening-executor";

function id(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}
function levelFor(index: number) {
  if (index < 83) return "aprendizaje" as const;
  if (index < 155) return "consolidacion" as const;
  return "tribunal" as const;
}
function answerFor(index: number) {
  if (index < 54) return "A" as const;
  if (index < 108) return "B" as const;
  if (index < 161) return "C" as const;
  return "D" as const;
}

function fixture() {
  const snapshot: AuditSnapshotRow[] = [];
  const audit: V5AuditRow[] = [];
  for (let i = 0; i < 214; i++) {
    const codigo = `SMS-CEL-E-T05-${String(i + 1).padStart(4, "0")}`;
    const questionId = id(i + 1);
    const level = levelFor(i);
    const answer = answerFor(i);
    snapshot.push({
      question_id: questionId, codigo, pregunta: `old question ${i}`, opcion_a: `old a ${i}`, opcion_b: `old b ${i}`,
      opcion_c: `old c ${i}`, opcion_d: `old d ${i}`, respuesta_correcta: answer, explicacion: `old explanation ${i}`,
      nivel_pedagogico: level, tipo_trampa: "ninguna",
    });
    const decision = i < 29 ? "KEEP" : i === 213 ? "REPLACE" : "EDIT";
    audit.push({
      question_id: questionId, codigo, nivel_actual: level, editorial_decision: decision,
      new_level_if_any: "",
      ...(decision === "KEEP" ? {} : {
        proposed_stem: `new question ${i}`, proposed_a: `new a ${i}`, proposed_b: `new b ${i}`,
        proposed_c: `new c ${i}`, proposed_d: `new d ${i}`, proposed_correct: answer,
        proposed_explanation: `new explanation ${i}`, proposed_tipo_trampa: "concepto_proximo",
      }),
    });
  }
  return { audit, snapshot };
}

function validPackage() {
  const { audit, snapshot } = fixture();
  return buildT11V5Package(audit, snapshot, "preflight");
}

function mutableCopy<T>(value: T): any {
  return JSON.parse(JSON.stringify(value));
}

describe("ELI-44 package contract", () => {
  test("builds the approved T11 V5 shape deterministically", () => {
    const { audit, snapshot } = fixture();
    const first = buildT11V5Package(audit, snapshot, "preflight");
    const second = buildT11V5Package([...audit].reverse(), [...snapshot].reverse(), "preflight");
    expect(first.mutations).toHaveLength(185);
    expect(first.keeps).toHaveLength(29);
    expect(first.mutations.filter((row) => row.decision === "EDIT")).toHaveLength(184);
    expect(first.mutations.filter((row) => row.decision === "REPLACE")).toHaveLength(1);
    expect(first.expected).toEqual(T11_V5_EXPECTED);
    expect(first.package_fingerprint).toBe(second.package_fingerprint);
    expect(validateHardeningPackage(first).package_fingerprint).toBe(first.package_fingerprint);
  });

  test("requires a frozen audit-time snapshot instead of blessing fresh state implicitly", () => {
    const { audit } = fixture();
    expect(() => buildT11V5Package(audit, [], "preflight")).toThrow("audit-time snapshot");
  });

  test("current fingerprint covers identity and all nine mutable current fields", () => {
    const { snapshot } = fixture();
    const baseline = currentQuestionFingerprint(snapshot[0]);
    for (const key of ["codigo","pregunta","opcion_a","opcion_b","opcion_c","opcion_d","respuesta_correcta","explicacion","nivel_pedagogico","tipo_trampa"] as const) {
      const changed = { ...snapshot[0], [key]: `${String((snapshot[0] as any)[key])}-changed` } as AuditSnapshotRow;
      expect(currentQuestionFingerprint(changed)).not.toBe(baseline);
    }
    expect(currentQuestionFingerprint({ ...snapshot[0], question_id: id(999) })).not.toBe(baseline);
  });

  test("package fingerprint is order-independent but content-bound", () => {
    const pkg = validPackage();
    const base = { package_id: pkg.package_id, opposition_id: pkg.opposition_id, topic_id: pkg.topic_id, expected: pkg.expected, mutations: pkg.mutations, keeps: pkg.keeps };
    expect(packageFingerprint(base)).toBe(pkg.package_fingerprint);
    expect(packageFingerprint({ ...base, mutations: [...pkg.mutations].reverse(), keeps: [...pkg.keeps].reverse() })).toBe(pkg.package_fingerprint);
    const changed = mutableCopy(base);
    changed.mutations[0].new_values.pregunta += " x";
    expect(packageFingerprint(changed)).not.toBe(pkg.package_fingerprint);
  });

  test("rejects credential and privileged-key CLI flags", () => {
    for (const args of [["--password=x"],["--jwt=x"],["--token=x"],["--service-role=x"],["--secret=x"]]) {
      expect(() => assertSafeCliArgs(args)).toThrow("Credentials");
    }
  });

  test("rejects unsupported mutation fields including identity/source/topic attempts", () => {
    for (const forbidden of ["codigo","topic_id","opposition_id","subject_id","user_id","activa","referencia_fuente","documento_referencia","pagina_inicio","question_concepts"]) {
      const pkg = mutableCopy(validPackage());
      pkg.mutations[0].new_values[forbidden] = "forbidden";
      expect(() => validateHardeningPackage(pkg)).toThrow("unsupported keys");
    }
  });

  test("rejects duplicate IDs and duplicate codes", () => {
    const duplicateId = mutableCopy(validPackage());
    duplicateId.mutations[1].question_id = duplicateId.mutations[0].question_id;
    expect(() => validateHardeningPackage(duplicateId)).toThrow("Duplicate question_id");
    const duplicateCode = mutableCopy(validPackage());
    duplicateCode.mutations[1].codigo = duplicateCode.mutations[0].codigo;
    expect(() => validateHardeningPackage(duplicateCode)).toThrow("Duplicate codigo");
  });

  test("rejects 185→184 and 185→186 mutation cardinality drift", () => {
    const short = mutableCopy(validPackage());
    short.mutations.pop();
    expect(() => validateHardeningPackage(short)).toThrow("row counts");
    const long = mutableCopy(validPackage());
    const extra = mutableCopy(long.mutations[0]);
    extra.question_id = id(999);
    extra.codigo = "SMS-CEL-E-T05-0999";
    long.mutations.push(extra);
    expect(() => validateHardeningPackage(long)).toThrow("row counts");
  });

  test("rejects wrong opposition, package fingerprint and execute confirmation", () => {
    const opposition = mutableCopy(validPackage());
    opposition.opposition_id = "00000000-0000-4000-8000-000000000001";
    expect(() => validateHardeningPackage(opposition)).toThrow("restricted to Celador");
    const fingerprint = mutableCopy(validPackage());
    fingerprint.mutations[0].new_values.pregunta += " tampered";
    expect(() => validateHardeningPackage(fingerprint)).toThrow("PACKAGE_FINGERPRINT_MISMATCH");
    const execute = mutableCopy(validPackage());
    execute.mode = "execute";
    execute.confirmation = "execute=true";
    expect(() => validateHardeningPackage(execute)).toThrow("confirmation");
    execute.confirmation = executionConfirmation(execute.package_fingerprint);
    expect(validateHardeningPackage(execute).mode).toBe("execute");
  });

  test("T11 builder binds exact opposition/topic and package identifier", () => {
    const pkg = validPackage();
    expect(pkg.package_id).toBe(ELI44_HARDENING_PACKAGE_ID);
    expect(pkg.opposition_id).toBe(CELADOR_OPPOSITION_ID);
    expect(pkg.topic_id).toBe(CELADOR_T11_TOPIC_ID);
  });
});

describe("ELI-44 SQL hardening surface", () => {
  const migration = readFileSync(new URL("../../../supabase/migrations/20260824223841_eli44_celador_question_hardening.sql", import.meta.url), "utf8");

  test("is SECURITY INVOKER and authenticated-only, including service_role denial", () => {
    expect(migration).toContain("security invoker");
    expect(migration).toContain("current_user <> 'authenticated'");
    expect(migration).toContain("auth.uid()");
    expect(migration).toContain("current_active_opposition_id()");
    expect(migration).toContain("opposition_admins");
    expect(migration).toContain("revoke all on function public.execute_celador_question_hardening(jsonb) from service_role");
    expect(migration).toContain("grant execute on function public.execute_celador_question_hardening(jsonb) to authenticated");
  });

  test("guards wrong active opposition, cross-topic/opposition, id/code mismatch and nonexistent rows", () => {
    expect(migration).toContain("requires Celador as the active opposition");
    expect(migration).toContain("question_id/codigo mismatch");
    expect(migration).toContain("cross-opposition question rejected");
    expect(migration).toContain("cross-topic question rejected");
    expect(migration).toContain("question does not exist");
    expect(migration).toContain("topic_id is not a Celador topic");
  });

  test("implements package-bound stale guard and exact confirmation", () => {
    expect(migration).toContain("STALE_PACKAGE: current fingerprint mismatch");
    expect(migration).toContain("for update");
    expect(migration).toContain("STALE_PACKAGE: locked current fingerprint mismatch");
    expect(migration).toContain("PACKAGE_FINGERPRINT_MISMATCH");
    expect(migration).toContain("APPLY_CELADOR_QUESTION_HARDENING:");
    expect(migration).not.toContain("execute=true");
  });

  test("updates only the nine authorized fields and never inserts/deletes academic rows", () => {
    const updateBlock = migration.slice(migration.indexOf("update public.questions q set"), migration.indexOf("get diagnostics v_affected"));
    for (const field of ["pregunta","opcion_a","opcion_b","opcion_c","opcion_d","respuesta_correcta","explicacion","nivel_pedagogico","tipo_trampa"]) {
      expect(updateBlock).toContain(`${field} =`);
    }
    for (const forbidden of ["codigo =","topic_id =","opposition_id =","subject_id =","user_id =","activa =","referencia_fuente =","documento_referencia ="]) {
      expect(updateBlock).not.toContain(forbidden);
    }
    expect(migration).not.toMatch(/insert\s+into\s+public\.questions/i);
    expect(migration).not.toMatch(/delete\s+from\s+public\.questions/i);
  });

  test("has atomic postconditions and preservation hashes for graph/provenance surfaces", () => {
    expect(migration).toContain("postcondition target mismatch");
    expect(migration).toContain("postcondition count/distribution mismatch");
    expect(migration).toContain("preservation hash mismatch; rolling back");
    expect(migration).not.toMatch(/\bcommit\b/i);
    expect(migration).toContain("question_concepts");
    expect(migration).toContain("study_units");
    expect(migration).toContain("concepts");
    expect(migration).toContain("flashcards");
    expect(migration).toContain("referencia_fuente");
    expect(migration).toContain("documento_referencia");
  });
});
