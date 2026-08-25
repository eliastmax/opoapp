import { createHash } from "node:crypto";

export const CELADOR_OPPOSITION_ID =
  "00000000-0000-4000-8000-000000000002" as const;
export const CELADOR_T11_TOPIC_ID =
  "1f4a5e28-51c0-47c9-8ef1-1189a62ab152" as const;
export const ELI44_PROBE_PACKAGE_ID =
  "eli44_celador_hardening_probe_v1" as const;
export const ELI44_HARDENING_PACKAGE_ID =
  "eli44_celador_question_hardening_v1" as const;

export const T11_V5_EXPECTED = Object.freeze({
  active_questions: 214,
  mutation_count: 185,
  keep_count: 29,
  edit_count: 184,
  replace_count: 1,
  levels: Object.freeze({ aprendizaje: 83, consolidacion: 72, tribunal: 59 }),
  answers: Object.freeze({ A: 54, B: 54, C: 53, D: 53 }),
  primary_mappings: 214,
  study_units: 8,
  concepts: 38,
  flashcards: 76,
});

export type HardeningDecision = "EDIT" | "REPLACE";
export type Answer = "A" | "B" | "C" | "D";
export type PedagogicalLevel =
  | "aprendizaje"
  | "consolidacion"
  | "tribunal";

export type MutableQuestionFields = Readonly<{
  pregunta: string;
  opcion_a: string;
  opcion_b: string;
  opcion_c: string;
  opcion_d: string;
  respuesta_correcta: Answer;
  explicacion: string;
  nivel_pedagogico: PedagogicalLevel;
  tipo_trampa: string;
}>;

export type PrewriteSnapshotRow = Readonly<{
  question_id: string;
  codigo: string;
  pregunta: string;
  opcion_a: string;
  opcion_b: string;
  opcion_c: string;
  opcion_d: string;
  respuesta_correcta: Answer;
  explicacion: string | null;
  nivel_pedagogico: PedagogicalLevel;
  tipo_trampa: string | null;
}>;

/** @deprecated Internal compatibility alias. Use PrewriteSnapshotRow. */
export type AuditSnapshotRow = PrewriteSnapshotRow;

export type V5AuditRow = Readonly<{
  question_id: string;
  codigo: string;
  nivel_actual: string;
  editorial_decision: string;
  new_level_if_any?: string;
  proposed_stem?: string;
  proposed_a?: string;
  proposed_b?: string;
  proposed_c?: string;
  proposed_d?: string;
  proposed_correct?: string;
  proposed_explanation?: string;
  proposed_tipo_trampa?: string;
}>;

export type ExpectedHardeningState = Readonly<{
  active_questions: number;
  mutation_count: number;
  keep_count: number;
  edit_count: number;
  replace_count: number;
  levels: Readonly<{
    aprendizaje: number;
    consolidacion: number;
    tribunal: number;
  }>;
  answers: Readonly<{ A: number; B: number; C: number; D: number }>;
  primary_mappings: number;
  study_units: number;
  concepts: number;
  flashcards: number;
}>;

export type HardeningMutation = Readonly<{
  question_id: string;
  codigo: string;
  decision: HardeningDecision;
  expected_current_fingerprint: string;
  new_values: MutableQuestionFields;
}>;

export type HardeningKeep = Readonly<{
  question_id: string;
  codigo: string;
  expected_current_fingerprint: string;
}>;

export type CeladorHardeningPackage = Readonly<{
  package_id: typeof ELI44_HARDENING_PACKAGE_ID;
  mode: "preflight" | "execute";
  opposition_id: typeof CELADOR_OPPOSITION_ID;
  topic_id: string;
  package_fingerprint: string;
  confirmation?: string;
  expected: ExpectedHardeningState;
  mutations: readonly HardeningMutation[];
  keeps: readonly HardeningKeep[];
}>;

const FORBIDDEN_CREDENTIAL_ARG =
  /(?:^|--)(?:jwt|token|password|service[-_]?role|secret)(?:=|$)/i;
const SHA256_HEX = /^[0-9a-f]{64}$/;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LEVELS = new Set<PedagogicalLevel>([
  "aprendizaje",
  "consolidacion",
  "tribunal",
]);
const ANSWERS = new Set<Answer>(["A", "B", "C", "D"]);
const MUTABLE_KEYS = [
  "pregunta",
  "opcion_a",
  "opcion_b",
  "opcion_c",
  "opcion_d",
  "respuesta_correcta",
  "explicacion",
  "nivel_pedagogico",
  "tipo_trampa",
] as const;
const TOP_LEVEL_KEYS = new Set([
  "package_id",
  "mode",
  "opposition_id",
  "topic_id",
  "package_fingerprint",
  "confirmation",
  "expected",
  "mutations",
  "keeps",
]);
const MUTATION_KEYS = new Set([
  "question_id",
  "codigo",
  "decision",
  "expected_current_fingerprint",
  "new_values",
]);
const KEEP_KEYS = new Set([
  "question_id",
  "codigo",
  "expected_current_fingerprint",
]);
const EXPECTED_KEYS = new Set([
  "active_questions",
  "mutation_count",
  "keep_count",
  "edit_count",
  "replace_count",
  "levels",
  "answers",
  "primary_mappings",
  "study_units",
  "concepts",
  "flashcards",
]);

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function exactKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  label: string,
): void {
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length) {
    throw new Error(
      `${label} contains unsupported keys: ${unknown.sort().join(", ")}`,
    );
  }
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function requireString(
  value: unknown,
  label: string,
  allowEmpty = false,
): string {
  if (
    typeof value !== "string" ||
    (!allowEmpty && value.length === 0)
  ) {
    throw new Error(
      `${label} must be a string${allowEmpty ? "" : " and not empty"}.`,
    );
  }
  return value;
}

function requireInteger(value: unknown, label: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
  return value as number;
}

export function assertSafeCliArgs(args: readonly string[]): void {
  const credentialArg = args.find((arg) => FORBIDDEN_CREDENTIAL_ARG.test(arg));
  if (credentialArg) {
    throw new Error(
      "Credentials, JWTs and privileged keys are not accepted as CLI arguments.",
    );
  }
}

export function redactSensitiveText(value: string): string {
  return value
    .replace(
      /sb_(?:secret|publishable)_[A-Za-z0-9._-]+/g,
      "[REDACTED_API_KEY]",
    )
    .replace(
      /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
      "[REDACTED_JWT]",
    )
    .replace(
      /(password|passwd|token|authorization|apikey)\s*[:=]\s*[^\s,;]+/gi,
      "$1=[REDACTED]",
    );
}

export function currentQuestionFingerprint(row: PrewriteSnapshotRow): string {
  return sha256(
    JSON.stringify([
      row.question_id,
      row.codigo,
      row.pregunta,
      row.opcion_a,
      row.opcion_b,
      row.opcion_c,
      row.opcion_d,
      row.respuesta_correcta,
      row.explicacion,
      row.nivel_pedagogico,
      row.tipo_trampa,
    ]),
  );
}

function mutationCommitment(row: HardeningMutation): string {
  return sha256(
    JSON.stringify([
      row.question_id,
      row.codigo,
      row.decision,
      row.expected_current_fingerprint,
      row.new_values.pregunta,
      row.new_values.opcion_a,
      row.new_values.opcion_b,
      row.new_values.opcion_c,
      row.new_values.opcion_d,
      row.new_values.respuesta_correcta,
      row.new_values.explicacion,
      row.new_values.nivel_pedagogico,
      row.new_values.tipo_trampa,
    ]),
  );
}

function keepCommitment(row: HardeningKeep): string {
  return sha256(
    JSON.stringify([
      row.question_id,
      row.codigo,
      "KEEP",
      row.expected_current_fingerprint,
    ]),
  );
}

export function packageFingerprint(
  input: Omit<
    CeladorHardeningPackage,
    "mode" | "confirmation" | "package_fingerprint"
  >,
): string {
  const mutationAggregate = [...input.mutations]
    .sort((a, b) =>
      a.question_id < b.question_id
        ? -1
        : a.question_id > b.question_id
          ? 1
          : a.codigo < b.codigo
            ? -1
            : a.codigo > b.codigo
              ? 1
              : 0,
    )
    .map(mutationCommitment)
    .join(",");
  const keepAggregate = [...input.keeps]
    .sort((a, b) =>
      a.question_id < b.question_id
        ? -1
        : a.question_id > b.question_id
          ? 1
          : a.codigo < b.codigo
            ? -1
            : a.codigo > b.codigo
              ? 1
              : 0,
    )
    .map(keepCommitment)
    .join(",");
  const e = input.expected;
  return sha256(
    JSON.stringify([
      input.package_id,
      input.opposition_id,
      input.topic_id,
      String(e.active_questions),
      String(e.mutation_count),
      String(e.keep_count),
      String(e.edit_count),
      String(e.replace_count),
      String(e.levels.aprendizaje),
      String(e.levels.consolidacion),
      String(e.levels.tribunal),
      String(e.answers.A),
      String(e.answers.B),
      String(e.answers.C),
      String(e.answers.D),
      String(e.primary_mappings),
      String(e.study_units),
      String(e.concepts),
      String(e.flashcards),
      mutationAggregate,
      keepAggregate,
    ]),
  );
}

export function executionConfirmation(fingerprint: string): string {
  if (!SHA256_HEX.test(fingerprint)) {
    throw new Error("Invalid package fingerprint.");
  }
  return `APPLY_CELADOR_QUESTION_HARDENING:${fingerprint}`;
}

export function validateHardeningPackage(
  value: unknown,
): CeladorHardeningPackage {
  const pkg = requireObject(value, "ELI-44 package");
  exactKeys(pkg, TOP_LEVEL_KEYS, "ELI-44 package");
  if (pkg.package_id !== ELI44_HARDENING_PACKAGE_ID) {
    throw new Error("ELI-44 package_id is not allowlisted.");
  }
  if (pkg.mode !== "preflight" && pkg.mode !== "execute") {
    throw new Error("ELI-44 mode must be preflight or execute.");
  }
  if (pkg.opposition_id !== CELADOR_OPPOSITION_ID) {
    throw new Error("ELI-44 is restricted to Celador SMS.");
  }
  const topicId = requireString(pkg.topic_id, "topic_id");
  if (!UUID.test(topicId)) throw new Error("topic_id must be a UUID.");
  const fingerprint = requireString(
    pkg.package_fingerprint,
    "package_fingerprint",
  );
  if (!SHA256_HEX.test(fingerprint)) {
    throw new Error("package_fingerprint must be lowercase SHA-256 hex.");
  }
  if (pkg.mode === "preflight" && pkg.confirmation !== undefined) {
    throw new Error("Preflight must not include confirmation.");
  }
  if (
    pkg.mode === "execute" &&
    pkg.confirmation !== executionConfirmation(fingerprint)
  ) {
    throw new Error(
      "Execute confirmation does not match the package fingerprint.",
    );
  }

  const expected = requireObject(pkg.expected, "expected");
  exactKeys(expected, EXPECTED_KEYS, "expected");
  const levels = requireObject(expected.levels, "expected.levels");
  exactKeys(
    levels,
    new Set(["aprendizaje", "consolidacion", "tribunal"]),
    "expected.levels",
  );
  const answers = requireObject(expected.answers, "expected.answers");
  exactKeys(answers, new Set(["A", "B", "C", "D"]), "expected.answers");
  const typedExpected = {
    active_questions: requireInteger(
      expected.active_questions,
      "expected.active_questions",
    ),
    mutation_count: requireInteger(
      expected.mutation_count,
      "expected.mutation_count",
    ),
    keep_count: requireInteger(expected.keep_count, "expected.keep_count"),
    edit_count: requireInteger(expected.edit_count, "expected.edit_count"),
    replace_count: requireInteger(
      expected.replace_count,
      "expected.replace_count",
    ),
    levels: {
      aprendizaje: requireInteger(
        levels.aprendizaje,
        "expected.levels.aprendizaje",
      ),
      consolidacion: requireInteger(
        levels.consolidacion,
        "expected.levels.consolidacion",
      ),
      tribunal: requireInteger(levels.tribunal, "expected.levels.tribunal"),
    },
    answers: {
      A: requireInteger(answers.A, "expected.answers.A"),
      B: requireInteger(answers.B, "expected.answers.B"),
      C: requireInteger(answers.C, "expected.answers.C"),
      D: requireInteger(answers.D, "expected.answers.D"),
    },
    primary_mappings: requireInteger(
      expected.primary_mappings,
      "expected.primary_mappings",
    ),
    study_units: requireInteger(expected.study_units, "expected.study_units"),
    concepts: requireInteger(expected.concepts, "expected.concepts"),
    flashcards: requireInteger(expected.flashcards, "expected.flashcards"),
  } as ExpectedHardeningState;

  if (!Array.isArray(pkg.mutations) || !Array.isArray(pkg.keeps)) {
    throw new Error("mutations and keeps must be arrays.");
  }
  const ids = new Set<string>();
  const codes = new Set<string>();
  let editCount = 0;
  let replaceCount = 0;
  const mutations: HardeningMutation[] = pkg.mutations.map((raw, index) => {
    const row = requireObject(raw, `mutations[${index}]`);
    exactKeys(row, MUTATION_KEYS, `mutations[${index}]`);
    const questionId = requireString(
      row.question_id,
      `mutations[${index}].question_id`,
    );
    if (!UUID.test(questionId)) {
      throw new Error(`mutations[${index}].question_id must be a UUID.`);
    }
    const codigo = requireString(row.codigo, `mutations[${index}].codigo`);
    const decision = row.decision;
    if (decision !== "EDIT" && decision !== "REPLACE") {
      throw new Error(`mutations[${index}].decision must be EDIT or REPLACE.`);
    }
    if (decision === "EDIT") editCount++;
    else replaceCount++;
    const currentFp = requireString(
      row.expected_current_fingerprint,
      `mutations[${index}].expected_current_fingerprint`,
    );
    if (!SHA256_HEX.test(currentFp)) {
      throw new Error(`mutations[${index}] has an invalid current fingerprint.`);
    }
    if (ids.has(questionId)) throw new Error(`Duplicate question_id: ${questionId}`);
    if (codes.has(codigo)) throw new Error(`Duplicate codigo: ${codigo}`);
    ids.add(questionId);
    codes.add(codigo);

    const newValues = requireObject(
      row.new_values,
      `mutations[${index}].new_values`,
    );
    exactKeys(
      newValues,
      new Set(MUTABLE_KEYS),
      `mutations[${index}].new_values`,
    );
    for (const key of MUTABLE_KEYS) {
      if (!(key in newValues)) {
        throw new Error(`mutations[${index}].new_values is missing ${key}.`);
      }
    }
    const answer = requireString(
      newValues.respuesta_correcta,
      `mutations[${index}].new_values.respuesta_correcta`,
    ) as Answer;
    if (!ANSWERS.has(answer)) {
      throw new Error(`mutations[${index}] has invalid respuesta_correcta.`);
    }
    const level = requireString(
      newValues.nivel_pedagogico,
      `mutations[${index}].new_values.nivel_pedagogico`,
    ) as PedagogicalLevel;
    if (!LEVELS.has(level)) {
      throw new Error(`mutations[${index}] has invalid nivel_pedagogico.`);
    }
    const typedNewValues: MutableQuestionFields = {
      pregunta: requireString(
        newValues.pregunta,
        `mutations[${index}].new_values.pregunta`,
      ),
      opcion_a: requireString(
        newValues.opcion_a,
        `mutations[${index}].new_values.opcion_a`,
      ),
      opcion_b: requireString(
        newValues.opcion_b,
        `mutations[${index}].new_values.opcion_b`,
      ),
      opcion_c: requireString(
        newValues.opcion_c,
        `mutations[${index}].new_values.opcion_c`,
      ),
      opcion_d: requireString(
        newValues.opcion_d,
        `mutations[${index}].new_values.opcion_d`,
      ),
      respuesta_correcta: answer,
      explicacion: requireString(
        newValues.explicacion,
        `mutations[${index}].new_values.explicacion`,
        true,
      ),
      nivel_pedagogico: level,
      tipo_trampa: requireString(
        newValues.tipo_trampa,
        `mutations[${index}].new_values.tipo_trampa`,
      ),
    };
    return {
      question_id: questionId,
      codigo,
      decision,
      expected_current_fingerprint: currentFp,
      new_values: typedNewValues,
    };
  });

  const keeps: HardeningKeep[] = pkg.keeps.map((raw, index) => {
    const row = requireObject(raw, `keeps[${index}]`);
    exactKeys(row, KEEP_KEYS, `keeps[${index}]`);
    const questionId = requireString(
      row.question_id,
      `keeps[${index}].question_id`,
    );
    if (!UUID.test(questionId)) {
      throw new Error(`keeps[${index}].question_id must be a UUID.`);
    }
    const codigo = requireString(row.codigo, `keeps[${index}].codigo`);
    const currentFp = requireString(
      row.expected_current_fingerprint,
      `keeps[${index}].expected_current_fingerprint`,
    );
    if (!SHA256_HEX.test(currentFp)) {
      throw new Error(`keeps[${index}] has an invalid current fingerprint.`);
    }
    if (ids.has(questionId)) {
      throw new Error(`Duplicate/overlapping question_id: ${questionId}`);
    }
    if (codes.has(codigo)) {
      throw new Error(`Duplicate/overlapping codigo: ${codigo}`);
    }
    ids.add(questionId);
    codes.add(codigo);
    return {
      question_id: questionId,
      codigo,
      expected_current_fingerprint: currentFp,
    };
  });

  if (
    mutations.length !== typedExpected.mutation_count ||
    keeps.length !== typedExpected.keep_count
  ) {
    throw new Error("Package row counts do not match expected counts.");
  }
  if (
    editCount !== typedExpected.edit_count ||
    replaceCount !== typedExpected.replace_count
  ) {
    throw new Error("EDIT/REPLACE counts do not match expected counts.");
  }
  if (mutations.length + keeps.length !== typedExpected.active_questions) {
    throw new Error("Package does not cover the expected active topic bank.");
  }

  const normalizedBase = {
    package_id: ELI44_HARDENING_PACKAGE_ID,
    opposition_id: CELADOR_OPPOSITION_ID,
    topic_id: topicId,
    expected: typedExpected,
    mutations,
    keeps,
  } as const;
  const recomputed = packageFingerprint(normalizedBase);
  if (recomputed !== fingerprint) {
    throw new Error("PACKAGE_FINGERPRINT_MISMATCH");
  }

  return {
    ...normalizedBase,
    mode: pkg.mode,
    package_fingerprint: fingerprint,
    ...(pkg.confirmation === undefined
      ? {}
      : { confirmation: requireString(pkg.confirmation, "confirmation") }),
  };
}

function finalLevel(row: V5AuditRow): PedagogicalLevel {
  const candidate = (row.new_level_if_any ?? "").trim() || row.nivel_actual.trim();
  if (!LEVELS.has(candidate as PedagogicalLevel)) {
    throw new Error(`Invalid final level for ${row.codigo}.`);
  }
  return candidate as PedagogicalLevel;
}

function requireProposed(row: V5AuditRow, key: keyof V5AuditRow): string {
  const value = row[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(
      `V5 mutation ${row.codigo} is missing ${String(key)}.`,
    );
  }
  return value;
}

export function buildT11V5Package(
  auditRows: readonly V5AuditRow[],
  prewriteSnapshot: readonly PrewriteSnapshotRow[],
  mode: "preflight" | "execute" = "preflight",
): CeladorHardeningPackage {
  if (auditRows.length !== T11_V5_EXPECTED.active_questions) {
    throw new Error("V5 must contain exactly 214 audited rows.");
  }
  if (prewriteSnapshot.length !== T11_V5_EXPECTED.active_questions) {
    throw new Error(
      "A 214-row PRE-WRITE CURRENT snapshot is required for the stale-package guard.",
    );
  }
  const snapshotById = new Map(
    prewriteSnapshot.map((row) => [row.question_id, row]),
  );
  if (snapshotById.size !== prewriteSnapshot.length) {
    throw new Error("PRE-WRITE snapshot has duplicate question_id values.");
  }
  const auditIds = new Set<string>();
  const auditCodes = new Set<string>();
  const mutations: HardeningMutation[] = [];
  const keeps: HardeningKeep[] = [];
  let edits = 0;
  let replacements = 0;

  for (const row of auditRows) {
    if (!row.question_id || !row.codigo) {
      throw new Error("Every V5 row must contain question_id and codigo.");
    }
    if (auditIds.has(row.question_id) || auditCodes.has(row.codigo)) {
      throw new Error("V5 contains duplicate identities.");
    }
    auditIds.add(row.question_id);
    auditCodes.add(row.codigo);
    const snapshot = snapshotById.get(row.question_id);
    if (!snapshot || snapshot.codigo !== row.codigo) {
      throw new Error(`PRE-WRITE snapshot identity mismatch for ${row.codigo}.`);
    }
    if (snapshot.nivel_pedagogico !== row.nivel_actual) {
      throw new Error(`PRE-WRITE snapshot level mismatch for ${row.codigo}.`);
    }
    const fp = currentQuestionFingerprint(snapshot);
    if (row.editorial_decision === "KEEP") {
      keeps.push({
        question_id: row.question_id,
        codigo: row.codigo,
        expected_current_fingerprint: fp,
      });
      continue;
    }
    if (
      row.editorial_decision !== "EDIT" &&
      row.editorial_decision !== "REPLACE"
    ) {
      throw new Error(`Unsupported V5 decision for ${row.codigo}.`);
    }
    if (row.editorial_decision === "EDIT") edits++;
    else replacements++;
    const proposedCorrect = requireProposed(row, "proposed_correct") as Answer;
    if (!ANSWERS.has(proposedCorrect)) {
      throw new Error(`Invalid proposed_correct for ${row.codigo}.`);
    }
    mutations.push({
      question_id: row.question_id,
      codigo: row.codigo,
      decision: row.editorial_decision,
      expected_current_fingerprint: fp,
      new_values: {
        pregunta: requireProposed(row, "proposed_stem"),
        opcion_a: requireProposed(row, "proposed_a"),
        opcion_b: requireProposed(row, "proposed_b"),
        opcion_c: requireProposed(row, "proposed_c"),
        opcion_d: requireProposed(row, "proposed_d"),
        respuesta_correcta: proposedCorrect,
        explicacion: requireProposed(row, "proposed_explanation"),
        nivel_pedagogico: finalLevel(row),
        tipo_trampa: requireProposed(row, "proposed_tipo_trampa"),
      },
    });
  }

  if (
    keeps.length !== 29 ||
    edits !== 184 ||
    replacements !== 1 ||
    mutations.length !== 185
  ) {
    throw new Error("V5 decision counts must be 29 KEEP / 184 EDIT / 1 REPLACE.");
  }

  const projected = new Map(
    prewriteSnapshot.map((row) => [row.question_id, { ...row }]),
  );
  for (const mutation of mutations) {
    projected.set(mutation.question_id, {
      question_id: mutation.question_id,
      codigo: mutation.codigo,
      ...mutation.new_values,
    });
  }
  const levelCounts = { aprendizaje: 0, consolidacion: 0, tribunal: 0 };
  const answerCounts = { A: 0, B: 0, C: 0, D: 0 };
  for (const row of projected.values()) {
    levelCounts[row.nivel_pedagogico]++;
    answerCounts[row.respuesta_correcta]++;
  }
  if (JSON.stringify(levelCounts) !== JSON.stringify(T11_V5_EXPECTED.levels)) {
    throw new Error(
      "Projected V5 level distribution does not match 83/72/59.",
    );
  }
  if (JSON.stringify(answerCounts) !== JSON.stringify(T11_V5_EXPECTED.answers)) {
    throw new Error(
      "Projected V5 A/B/C/D distribution does not match 54/54/53/53.",
    );
  }

  const base = {
    package_id: ELI44_HARDENING_PACKAGE_ID,
    opposition_id: CELADOR_OPPOSITION_ID,
    topic_id: CELADOR_T11_TOPIC_ID,
    expected: T11_V5_EXPECTED,
    mutations,
    keeps,
  } as const;
  const fingerprint = packageFingerprint(base);
  return {
    ...base,
    mode,
    package_fingerprint: fingerprint,
    ...(mode === "execute"
      ? { confirmation: executionConfirmation(fingerprint) }
      : {}),
  };
}
