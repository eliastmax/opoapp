import type { V4TodayContextRow } from "./v4-today-plan";

export type StudyUnitStatus = "not_started" | "in_progress" | "needs_attention" | "completed";

export type StudyCenterUnit = {
  id: string;
  code: string;
  title: string;
  topicId: string;
  topicNumber: number;
  topicName: string;
  position: number;
  estimatedMinutes: number;
  concepts: V4TodayContextRow[];
  totalConcepts: number;
  workedConcepts: number;
  activeFlashcards: number;
  progress: number;
  completed: boolean;
  needsAttention: boolean;
  status: StudyUnitStatus;
  lastEvidenceAt: string | null;
};

export type StudyCenterTopic = {
  id: string;
  number: number;
  name: string;
  units: StudyCenterUnit[];
  completedUnits: number;
  workedUnits: number;
  progress: number;
};

export type StudyCenterModel = {
  topics: StudyCenterTopic[];
  units: StudyCenterUnit[];
  continuation: StudyCenterUnit | null;
};

function latestEvidence(concepts: V4TodayContextRow[]) {
  return concepts.reduce<string | null>((latest, concept) => {
    if (!concept.last_evidence_at) return latest;
    if (!latest) return concept.last_evidence_at;
    return concept.last_evidence_at > latest ? concept.last_evidence_at : latest;
  }, null);
}

function toUnit(concepts: V4TodayContextRow[]): StudyCenterUnit {
  const row = concepts[0];
  const uniqueConcepts = [...new Map(concepts.map((concept) => [concept.concept_id, concept])).values()];
  const workedConcepts = uniqueConcepts.filter((concept) => concept.state !== "unseen").length;
  const completed = uniqueConcepts.every((concept) => concept.unit_completed);
  const needsAttention = uniqueConcepts.some((concept) => concept.needs_attention);
  const status: StudyUnitStatus = needsAttention
    ? "needs_attention"
    : completed
      ? "completed"
      : workedConcepts > 0
        ? "in_progress"
        : "not_started";

  return {
    id: row.study_unit_id,
    code: row.study_unit_code,
    title: row.study_unit_title,
    topicId: row.topic_id,
    topicNumber: row.topic_number,
    topicName: row.topic_name,
    position: row.unit_position,
    estimatedMinutes: row.unit_estimated_minutes,
    concepts: uniqueConcepts,
    totalConcepts: uniqueConcepts.length,
    workedConcepts,
    activeFlashcards: Math.max(...uniqueConcepts.map((concept) => concept.active_flashcards ?? 0), 0),
    progress: uniqueConcepts.length > 0 ? (workedConcepts / uniqueConcepts.length) * 100 : 0,
    completed,
    needsAttention,
    status,
    lastEvidenceAt: latestEvidence(uniqueConcepts),
  };
}

function chooseContinuation(units: StudyCenterUnit[]) {
  const partiallyWorked = units
    .filter((unit) => unit.workedConcepts > 0 && !unit.completed)
    .sort((a, b) => (b.lastEvidenceAt ?? "").localeCompare(a.lastEvidenceAt ?? ""));
  if (partiallyWorked[0]) return partiallyWorked[0];

  const attention = units.find((unit) => unit.needsAttention);
  if (attention) return attention;

  return units.find((unit) => !unit.completed) ?? units[0] ?? null;
}

export function buildStudyCenterModel(rows: V4TodayContextRow[]): StudyCenterModel {
  const unitsById = new Map<string, V4TodayContextRow[]>();
  for (const row of rows) {
    const current = unitsById.get(row.study_unit_id) ?? [];
    current.push(row);
    unitsById.set(row.study_unit_id, current);
  }

  const units = [...unitsById.values()]
    .map(toUnit)
    .sort((a, b) => a.topicNumber - b.topicNumber || a.position - b.position);

  const topicsById = new Map<string, StudyCenterTopic>();
  for (const unit of units) {
    const existing = topicsById.get(unit.topicId);
    if (existing) {
      existing.units.push(unit);
      continue;
    }
    topicsById.set(unit.topicId, {
      id: unit.topicId,
      number: unit.topicNumber,
      name: unit.topicName,
      units: [unit],
      completedUnits: 0,
      workedUnits: 0,
      progress: 0,
    });
  }

  const topics = [...topicsById.values()]
    .map((topic) => {
      const completedUnits = topic.units.filter((unit) => unit.completed).length;
      const workedUnits = topic.units.filter((unit) => unit.workedConcepts > 0 || unit.completed).length;
      const totalConcepts = topic.units.reduce((sum, unit) => sum + unit.totalConcepts, 0);
      const workedConcepts = topic.units.reduce((sum, unit) => sum + unit.workedConcepts, 0);
      return {
        ...topic,
        units: [...topic.units].sort((a, b) => a.position - b.position),
        completedUnits,
        workedUnits,
        progress: totalConcepts > 0 ? (workedConcepts / totalConcepts) * 100 : 0,
      };
    })
    .sort((a, b) => a.number - b.number);

  return {
    topics,
    units,
    continuation: chooseContinuation(units),
  };
}

export function studyUnitStatusLabel(status: StudyUnitStatus) {
  return {
    not_started: "Por empezar",
    in_progress: "En curso",
    needs_attention: "Para reforzar",
    completed: "Completada",
  }[status];
}

export function studyUnitActionLabel(status: StudyUnitStatus) {
  return {
    not_started: "Estudiar",
    in_progress: "Continuar",
    needs_attention: "Repasar",
    completed: "Repasar",
  }[status];
}
