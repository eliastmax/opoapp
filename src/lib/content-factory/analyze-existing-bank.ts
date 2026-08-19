import { normalizeText } from "../similarity";
import { stableConceptCode, stableUnitCode } from "./codes";
import type {
  ContentFactoryJob,
  ExistingBankCluster,
  FactoryQuestionAssignment,
  FactoryQuestionMetadata,
  ProposedConcept,
  ProposedStudyUnit,
} from "./types";

function cleaned(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function sortedUnique(values: Array<string | null | undefined>) {
  return [...new Set(values.map(cleaned).filter((value): value is string => value !== null))].sort(
    (a, b) => a.localeCompare(b),
  );
}

function clusterKey(question: FactoryQuestionMetadata) {
  const apartado = cleaned(question.apartado) ?? "sin-apartado";
  const subapartado = cleaned(question.subapartado) ?? "sin-subapartado";
  return `${normalizeText(apartado)}::${normalizeText(subapartado)}`;
}

/**
 * Deterministic first pass over an existing bank. It deliberately does not try
 * to perform semantic merges: textual metadata is evidence for Gate 1, not the
 * canonical V4 concept map itself.
 */
export function clusterExistingBankQuestions(
  questions: FactoryQuestionMetadata[],
): ExistingBankCluster[] {
  const groups = new Map<string, FactoryQuestionMetadata[]>();
  for (const question of questions.filter((entry) => entry.active !== false)) {
    const key = clusterKey(question);
    const bucket = groups.get(key) ?? [];
    bucket.push(question);
    groups.set(key, bucket);
  }

  return [...groups.entries()]
    .map(([key, rows]) => ({
      key,
      apartado: cleaned(rows[0]?.apartado),
      subapartado: cleaned(rows[0]?.subapartado),
      conceptLabels: sortedUnique(rows.map((row) => row.conceptLabel)),
      learningObjectives: sortedUnique(rows.map((row) => row.learningObjective)),
      questionCodes: rows.map((row) => row.code).sort(),
      sourceReferences: sortedUnique(rows.map((row) => row.sourceReference)),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export type PreliminaryConceptMap = {
  units: ProposedStudyUnit[];
  concepts: ProposedConcept[];
  assignments: FactoryQuestionAssignment[];
  clusters: ExistingBankCluster[];
  warnings: string[];
};

/**
 * Produces a reviewable structural proposal from V2 metadata. One unit is seeded
 * per apartado and concept seeds come from existing concept labels. This is a
 * starting point only: Gate 1 must split/merge boundaries before generation.
 */
export function proposePreliminaryConceptMap(job: ContentFactoryJob): PreliminaryConceptMap {
  if (job.mode !== "existing_bank") {
    return { units: [], concepts: [], assignments: [], clusters: [], warnings: [] };
  }

  const questions = job.existingQuestions ?? [];
  const clusters = clusterExistingBankQuestions(questions);
  const unitTitles = sortedUnique(
    questions.map((question) => cleaned(question.apartado) ?? cleaned(question.subapartado)),
  );
  const fallbackUnitTitle = job.topicTitle?.trim() || `Tema ${job.topicNumber}`;
  if (unitTitles.length === 0 && questions.length > 0) unitTitles.push(fallbackUnitTitle);

  const units = unitTitles.map((title, index): ProposedStudyUnit => ({
    code: stableUnitCode(job.codePrefix, index + 1),
    title,
    position: index + 1,
    sourceRefs: job.source,
    observations: ["Propuesta estructural automática: revisar fronteras en Gate 1."],
  }));
  const unitByTitle = new Map(units.map((unit) => [normalizeText(unit.title), unit.code]));

  const conceptSeeds = new Map<string, { title: string; unitCode: string; count: number }>();
  for (const question of questions.filter((entry) => entry.active !== false)) {
    const title = cleaned(question.conceptLabel) ?? cleaned(question.learningObjective);
    if (!title) continue;
    const unitTitle = cleaned(question.apartado) ?? cleaned(question.subapartado) ?? fallbackUnitTitle;
    const unitCode = unitByTitle.get(normalizeText(unitTitle)) ?? units[0]?.code;
    if (!unitCode) continue;
    const key = `${unitCode}::${normalizeText(title)}`;
    const current = conceptSeeds.get(key);
    conceptSeeds.set(key, { title, unitCode, count: (current?.count ?? 0) + 1 });
  }

  const sortedConceptSeeds = [...conceptSeeds.entries()]
    .sort(([, a], [, b]) => a.unitCode.localeCompare(b.unitCode) || a.title.localeCompare(b.title));
  const conceptCodeBySeedKey = new Map<string, string>();
  const concepts = sortedConceptSeeds.map(([key, seed], index): ProposedConcept => {
    const code = stableConceptCode(job.codePrefix, index + 1);
    conceptCodeBySeedKey.set(key, code);
    return {
      code,
      unitCode: seed.unitCode,
      title: seed.title,
      description: `Semilla derivada de metadatos V2 (${seed.count} pregunta${seed.count === 1 ? "" : "s"}).`,
      position: index + 1,
      observations: ["No canónico hasta aprobación de Gate 1."],
    };
  });

  const assignments: FactoryQuestionAssignment[] = [];
  for (const question of questions.filter((entry) => entry.active !== false)) {
    const title = cleaned(question.conceptLabel) ?? cleaned(question.learningObjective);
    if (!title) continue;
    const unitTitle = cleaned(question.apartado) ?? cleaned(question.subapartado) ?? fallbackUnitTitle;
    const unitCode = unitByTitle.get(normalizeText(unitTitle)) ?? units[0]?.code;
    if (!unitCode) continue;
    const code = conceptCodeBySeedKey.get(`${unitCode}::${normalizeText(title)}`);
    if (!code) continue;
    assignments.push({
      questionCode: question.code,
      primaryConceptCode: code,
      confidence: "low",
      rationale: "Preasignación derivada de concepto/objetivo V2; revisar en Gate 1.",
    });
  }

  const warnings: string[] = [];
  if (questions.length > 0 && concepts.length / questions.length > 0.6) {
    warnings.push(
      "Alta fragmentación de etiquetas V2: no convertir automáticamente cada etiqueta textual en concepto canónico.",
    );
  }
  if (questions.some((question) => !cleaned(question.conceptLabel))) {
    warnings.push("Hay preguntas sin etiqueta conceptual textual; requieren revisión de clustering.");
  }

  return { units, concepts, assignments, clusters, warnings };
}
