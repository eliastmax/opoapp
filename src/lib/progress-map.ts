import { learningRouteSummary, type LearningStageProgress } from "@/lib/learning-stages";
import type { TopicProgressRow } from "@/lib/progress-evidence";

export type ProgressMapPhase =
  | "sin_empezar"
  | "aprendizaje"
  | "consolidacion"
  | "tribunal"
  | "completada";

export type ProgressMapFilter = "todos" | "en_curso" | "atencion" | "completada";

export type ProgressMapTopic = {
  topic: TopicProgressRow;
  stages?: LearningStageProgress;
  dueCount: number;
};

export const PROGRESS_MAP_PHASE_LABELS: Record<ProgressMapPhase, string> = {
  sin_empezar: "Sin empezar",
  aprendizaje: "Aprendizaje",
  consolidacion: "Consolidación",
  tribunal: "Tribunal",
  completada: "Ruta completada",
};

export function progressMapPhase(
  topic: TopicProgressRow,
  stages?: LearningStageProgress,
): ProgressMapPhase {
  if (topic.unique_questions_seen === 0) return "sin_empezar";
  if (!stages) return "aprendizaje";

  const route = learningRouteSummary(stages);
  return route.completed ? "completada" : route.recommendedStage;
}

export function needsProgressAttention(entry: ProgressMapTopic): boolean {
  return entry.topic.active_failures > 0 || entry.topic.active_doubts > 0 || entry.dueCount > 0;
}

export function filterProgressMapTopics(
  entries: ProgressMapTopic[],
  filter: ProgressMapFilter,
): ProgressMapTopic[] {
  if (filter === "todos") return entries;

  return entries.filter((entry) => {
    const phase = progressMapPhase(entry.topic, entry.stages);
    if (filter === "atencion") return needsProgressAttention(entry);
    if (filter === "completada") return phase === "completada";
    return phase !== "sin_empezar" && phase !== "completada";
  });
}

export function progressMapTotals(entries: ProgressMapTopic[]): Record<ProgressMapPhase, number> {
  return entries.reduce<Record<ProgressMapPhase, number>>(
    (totals, entry) => {
      totals[progressMapPhase(entry.topic, entry.stages)] += 1;
      return totals;
    },
    {
      sin_empezar: 0,
      aprendizaje: 0,
      consolidacion: 0,
      tribunal: 0,
      completada: 0,
    },
  );
}
