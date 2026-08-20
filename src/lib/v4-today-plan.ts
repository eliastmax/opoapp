import type { ConceptMasteryState } from "./concept-mastery";

export type V4TodayContextRow = {
  concept_id: string;
  concept_code: string;
  concept_title: string;
  source_capacity_status?: "source_limited" | null;
  source_supported_ceiling?: number | null;
  source_capacity_reason?: string | null;
  topic_id: string;
  topic_number: number;
  topic_name: string;
  study_unit_id: string;
  study_unit_code: string;
  study_unit_title: string;
  unit_position: number;
  unit_estimated_minutes: number;
  unit_completed: boolean;
  state: ConceptMasteryState;
  needs_attention: boolean;
  next_review_on: string | null;
  reason_code: string;
  distinct_questions: number;
  safe_correct_questions: number;
  safe_accuracy: number | string | null;
  distinct_sessions: number;
  retention_checks_passed: number;
  active_primary_questions: number;
  active_flashcards: number;
  last_evidence_at: string | null;
  roadmap_slot: number | null;
  roadmap_scheduled_date: string | null;
};

export type V4TodayBlockKind = "review" | "repair" | "advance" | "verify";

export type V4TodayPlanBlock = {
  kind: V4TodayBlockKind;
  label: "Repasar" | "Corregir" | "Avanzar" | "Comprobar";
  minutes: number;
  topicId: string;
  topicNumber: number;
  topicName: string;
  studyUnitId: string;
  studyUnitCode: string;
  studyUnitTitle: string;
  conceptId: string | null;
  conceptCode: string | null;
  conceptTitle: string | null;
  targetQuestions: number;
  retentionCheckpointDays: number | null;
  reasonCode: string;
  reason: string;
};

export type V4TodayPlan = {
  status: "ready" | "nothing_due" | "no_content" | "no_time";
  availableMinutes: number;
  plannedMinutes: number;
  unusedMinutes: number;
  nextDueOn: string | null;
  blocks: V4TodayPlanBlock[];
};

type Candidate = {
  kind: V4TodayBlockKind;
  score: number;
  desiredMinutes: number;
  minimumMinutes: number;
  row: V4TodayContextRow;
  conceptId: string | null;
  targetQuestions: number;
  retentionCheckpointDays: number | null;
  reasonCode: string;
  reason: string;
};

const KIND_LABEL: Record<V4TodayBlockKind, V4TodayPlanBlock["label"]> = {
  review: "Repasar",
  repair: "Corregir",
  advance: "Avanzar",
  verify: "Comprobar",
};

function numeric(value: number | string | null) {
  if (value === null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateValue(value: string | null) {
  if (!value) return null;
  const parsed = Date.parse(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(parsed) ? parsed : null;
}

function overdueDays(nextReviewOn: string | null, today: string) {
  const due = dateValue(nextReviewOn);
  const now = dateValue(today);
  if (due === null || now === null || due > now) return 0;
  return Math.floor((now - due) / 86_400_000);
}

function roadmapBonus(row: V4TodayContextRow) {
  if (row.roadmap_slot === null) return 0;
  return Math.max(0, 20 - Math.min(row.roadmap_slot, 20));
}

function sourceCeiling(row: V4TodayContextRow) {
  if (
    row.source_capacity_status === "source_limited" &&
    Number.isInteger(row.source_supported_ceiling) &&
    (row.source_supported_ceiling ?? 0) >= 1 &&
    (row.source_supported_ceiling ?? 0) <= 3
  ) {
    return row.source_supported_ceiling as number;
  }
  return null;
}

function retentionCheckpoint(row: V4TodayContextRow) {
  if (row.state === "consolidating") return row.retention_checks_passed >= 1 ? 7 : 3;
  if (row.state === "retained") return row.retention_checks_passed >= 3 ? 30 : 14;
  return null;
}

function sortCandidates(candidates: Candidate[]) {
  return candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if ((a.row.roadmap_slot ?? Number.MAX_SAFE_INTEGER) !== (b.row.roadmap_slot ?? Number.MAX_SAFE_INTEGER)) {
      return (a.row.roadmap_slot ?? Number.MAX_SAFE_INTEGER) - (b.row.roadmap_slot ?? Number.MAX_SAFE_INTEGER);
    }
    if (a.row.topic_number !== b.row.topic_number) return a.row.topic_number - b.row.topic_number;
    if (a.row.unit_position !== b.row.unit_position) return a.row.unit_position - b.row.unit_position;
    return a.row.concept_code.localeCompare(b.row.concept_code);
  });
}

function conceptCandidate(row: V4TodayContextRow, kind: V4TodayBlockKind): Candidate | null {
  const accuracy = numeric(row.safe_accuracy);
  const due = row.next_review_on !== null;
  const ceiling = sourceCeiling(row);

  if (kind === "review" && !row.needs_attention && due && (row.state === "consolidating" || row.state === "retained")) {
    return {
      kind,
      score: 100,
      desiredMinutes: 6,
      minimumMinutes: 4,
      row,
      conceptId: row.concept_id,
      targetQuestions: ceiling === null
        ? Math.min(2, Math.max(1, row.active_primary_questions))
        : Math.min(2, ceiling),
      retentionCheckpointDays: retentionCheckpoint(row),
      reasonCode: "retention_due",
      reason: "Toca comprobar si este conocimiento se mantiene sin apoyo.",
    };
  }

  if (kind === "repair" && row.needs_attention) {
    return {
      kind,
      score: 95 + (accuracy === null ? 0 : (1 - accuracy) * 10) + roadmapBonus(row),
      desiredMinutes: 7,
      minimumMinutes: 5,
      row,
      conceptId: row.concept_id,
      targetQuestions: ceiling === null
        ? Math.min(3, Math.max(1, row.active_primary_questions))
        : Math.min(3, ceiling),
      retentionCheckpointDays: null,
      reasonCode: "recent_instability",
      reason: "Hay un fallo o una duda reciente que conviene corregir antes de seguir acumulando evidencia.",
    };
  }

  const standardVerifiable = ceiling === null && row.active_primary_questions >= 4;
  const sourceLimitedVerifiable = ceiling !== null && row.active_primary_questions >= ceiling;
  if (
    kind === "verify" &&
    !row.needs_attention &&
    (row.state === "seen" || row.state === "verifying") &&
    (standardVerifiable || sourceLimitedVerifiable)
  ) {
    const requiredDistinct = ceiling ?? 4;
    const missingDistinct = Math.max(0, requiredDistinct - row.distinct_questions);
    const targetQuestions = ceiling === null
      ? Math.min(4, Math.max(2, missingDistinct))
      : Math.min(ceiling, Math.max(1, missingDistinct));
    return {
      kind,
      score: 70 + roadmapBonus(row) + missingDistinct * 2,
      desiredMinutes: 8,
      minimumMinutes: 5,
      row,
      conceptId: row.concept_id,
      targetQuestions,
      retentionCheckpointDays: null,
      reasonCode: row.state === "seen" ? "start_verification" : "complete_verification",
      reason: ceiling === null
        ? "Necesitamos preguntas distintas para medirlo con evidencia suficiente, no repetir la misma formulación."
        : "La fuente ya aporta todas las preguntas independientes posibles; comprobamos su recuerdo en otra sesión sin fabricar diversidad.",
    };
  }

  return null;
}

function advanceCandidates(rows: V4TodayContextRow[]) {
  const unitRows = new Map<string, V4TodayContextRow>();
  for (const row of rows) {
    if (row.unit_completed) continue;
    const current = unitRows.get(row.study_unit_id);
    if (!current) {
      unitRows.set(row.study_unit_id, row);
      continue;
    }
    const currentSlot = current.roadmap_slot ?? Number.MAX_SAFE_INTEGER;
    const nextSlot = row.roadmap_slot ?? Number.MAX_SAFE_INTEGER;
    if (nextSlot < currentSlot) unitRows.set(row.study_unit_id, row);
  }

  return sortCandidates([...unitRows.values()].map((row) => ({
    kind: "advance" as const,
    score: 60 + roadmapBonus(row) - row.unit_position / 1_000,
    desiredMinutes: Math.max(3, Math.min(row.unit_estimated_minutes, 15)),
    minimumMinutes: Math.max(3, Math.min(row.unit_estimated_minutes, 15)),
    row,
    conceptId: null,
    targetQuestions: 0,
    retentionCheckpointDays: null,
    reasonCode: row.roadmap_slot === null ? "next_study_unit" : "roadmap_study_unit",
    reason: row.roadmap_slot === null
      ? "Es la siguiente unidad disponible para ampliar cobertura de estudio."
      : "Encaja con la hoja de ruta y permite avanzar sin crear deuda artificial.",
  })));
}

function buildBlock(candidate: Candidate, minutes: number): V4TodayPlanBlock {
  const row = candidate.row;
  return {
    kind: candidate.kind,
    label: KIND_LABEL[candidate.kind],
    minutes,
    topicId: row.topic_id,
    topicNumber: row.topic_number,
    topicName: row.topic_name,
    studyUnitId: row.study_unit_id,
    studyUnitCode: row.study_unit_code,
    studyUnitTitle: row.study_unit_title,
    conceptId: candidate.conceptId,
    conceptCode: candidate.conceptId ? row.concept_code : null,
    conceptTitle: candidate.conceptId ? row.concept_title : null,
    targetQuestions: candidate.targetQuestions,
    retentionCheckpointDays: candidate.retentionCheckpointDays,
    reasonCode: candidate.reasonCode,
    reason: candidate.reason,
  };
}

export function composeV4TodayPlan(args: {
  availableMinutes: number;
  today: string;
  rows: V4TodayContextRow[];
}): V4TodayPlan {
  const availableMinutes = Number.isFinite(args.availableMinutes)
    ? Math.max(0, Math.min(120, Math.floor(args.availableMinutes)))
    : 0;

  if (availableMinutes === 0) {
    return { status: "no_time", availableMinutes, plannedMinutes: 0, unusedMinutes: 0, nextDueOn: null, blocks: [] };
  }
  if (args.rows.length === 0) {
    return { status: "no_content", availableMinutes, plannedMinutes: 0, unusedMinutes: availableMinutes, nextDueOn: null, blocks: [] };
  }

  const today = args.today.slice(0, 10);
  const review = sortCandidates(
    args.rows.filter((row) => row.next_review_on !== null && row.next_review_on <= today)
      .map((row) => conceptCandidate(row, "review"))
      .filter((candidate): candidate is Candidate => candidate !== null)
      .map((candidate) => ({ ...candidate, score: candidate.score + overdueDays(candidate.row.next_review_on, today) * 2 })),
  );
  const repair = sortCandidates(args.rows.map((row) => conceptCandidate(row, "repair")).filter((candidate): candidate is Candidate => candidate !== null));
  const advance = advanceCandidates(args.rows);
  const verify = sortCandidates(args.rows.map((row) => conceptCandidate(row, "verify")).filter((candidate): candidate is Candidate => candidate !== null));

  const blocks: V4TodayPlanBlock[] = [];
  const usedConcepts = new Set<string>();
  const usedUnits = new Set<string>();
  let remaining = availableMinutes;
  const compact = availableMinutes < 20;

  const addFrom = (candidates: Candidate[]) => {
    for (const candidate of candidates) {
      if (candidate.conceptId && usedConcepts.has(candidate.conceptId)) continue;
      if (candidate.kind === "advance" && usedUnits.has(candidate.row.study_unit_id)) continue;
      const requested = compact ? candidate.minimumMinutes : candidate.desiredMinutes;
      const minutes = remaining >= requested ? requested : remaining >= candidate.minimumMinutes ? candidate.minimumMinutes : 0;
      if (minutes === 0) continue;
      blocks.push(buildBlock(candidate, minutes));
      remaining -= minutes;
      usedUnits.add(candidate.row.study_unit_id);
      if (candidate.conceptId) usedConcepts.add(candidate.conceptId);
      return true;
    }
    return false;
  };

  addFrom(review);
  addFrom(repair);
  addFrom(advance);
  addFrom(verify);

  const futureDue = args.rows.map((row) => row.next_review_on)
    .filter((value): value is string => value !== null && value > today).sort()[0] ?? null;
  const plannedMinutes = availableMinutes - remaining;
  return {
    status: blocks.length > 0 ? "ready" : "nothing_due",
    availableMinutes,
    plannedMinutes,
    unusedMinutes: remaining,
    nextDueOn: blocks.length > 0 ? null : futureDue,
    blocks,
  };
}
