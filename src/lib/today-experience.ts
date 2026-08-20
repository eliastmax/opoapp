import type { V4DailySession } from "./v4-experience";
import type { V4TodayContextRow, V4TodayPlan } from "./v4-today-plan";

export type TodayExperienceState =
  | "unconfigured"
  | "first_session"
  | "habitual"
  | "session_active"
  | "session_complete"
  | "nothing_due";

export function hasLearningHistory(rows: V4TodayContextRow[]) {
  return rows.some(
    (row) =>
      row.unit_completed ||
      row.state !== "unseen" ||
      row.last_evidence_at !== null ||
      row.distinct_questions > 0,
  );
}

export function todayExperienceState(args: {
  preparationConfigured: boolean;
  rows: V4TodayContextRow[];
  session: V4DailySession | null;
  plan: V4TodayPlan;
}): TodayExperienceState {
  if (args.session?.status === "active") return "session_active";
  if (args.session) return "session_complete";
  if (!args.preparationConfigured) return "unconfigured";
  if (args.plan.status !== "ready") return "nothing_due";
  return hasLearningHistory(args.rows) ? "habitual" : "first_session";
}

export function todayPlanTitle(plan: V4TodayPlan) {
  const advance = plan.blocks.find((block) => block.kind === "advance");
  const hasRepair = plan.blocks.some((block) => block.kind === "repair");
  const hasReview = plan.blocks.some((block) => block.kind === "review");
  const first = plan.blocks[0];

  if (advance && hasRepair) return "Corrige lo pendiente y avanza";
  if (advance && hasReview) return "Recupera lo importante y avanza";
  if (advance) return `Avanza en ${advance.studyUnitTitle}`;
  if (!first) return "Tu siguiente paso está preparado";
  return `${first.label} · ${first.studyUnitTitle}`;
}

export function todayPlanReason(plan: V4TodayPlan) {
  const kinds = new Set(plan.blocks.map((block) => block.kind));
  const advance = plan.blocks.find((block) => block.kind === "advance");
  if (kinds.has("repair") || kinds.has("review")) {
    const focus = advance ? `En ${advance.studyUnitTitle}. ` : "";
    return `${focus}Incluye tus repasos prioritarios para que puedas avanzar sin dejar puntos débiles atrás.`;
  }
  if (kinds.has("advance")) {
    return "Es el siguiente contenido que encaja con tu ruta de estudio.";
  }
  return "Toca comprobar lo aprendido para decidir el siguiente paso con evidencia real.";
}

export function remainingSessionMinutes(session: V4DailySession) {
  return session.blocks
    .filter((block) => block.status === "planned" || block.status === "in_progress")
    .reduce((total, block) => total + block.plannedMinutes, 0);
}
