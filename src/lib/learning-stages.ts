import type { Database } from "@/integrations/supabase/types";

export type LearningStage = "aprendizaje" | "consolidacion" | "tribunal";
export type PracticeStage = LearningStage | "mezcladas";
type GeneratedLearningStageProgress =
  Database["public"]["Functions"]["get_learning_stage_progress"]["Returns"][number];
export type LearningStageProgress = Omit<
  GeneratedLearningStageProgress,
  "learning_mastery" | "consolidation_mastery" | "global_mastery" | "robustness_percentage"
> & {
  learning_mastery: number | null;
  consolidation_mastery: number | null;
  global_mastery: number | null;
  robustness_percentage: number | null;
};
export type LearningRouteSummary = {
  completed: boolean;
  badge: string;
  message: string;
  recommendedStage: LearningStage;
};

export const LEARNING_STAGES: LearningStage[] = ["aprendizaje", "consolidacion", "tribunal"];
export const PRACTICE_STAGES: PracticeStage[] = [
  "aprendizaje",
  "consolidacion",
  "tribunal",
  "mezcladas",
];

export const LEARNING_STAGE_LABELS: Record<PracticeStage, string> = {
  aprendizaje: "Aprendizaje",
  consolidacion: "Consolidación",
  tribunal: "Tribunal",
  mezcladas: "Mezcladas",
};

export const LEARNING_STAGE_DESCRIPTIONS: Record<PracticeStage, string> = {
  aprendizaje: "Base, reglas esenciales y comprensión.",
  consolidacion: "Excepciones, relaciones y aplicación segura.",
  tribunal: "Casos, matices y discriminación exigente.",
  mezcladas: "Combina los tres niveles para mantener el tema completo.",
};

export function learningStage(value: string | null | undefined): LearningStage {
  return value === "consolidacion" || value === "tribunal" ? value : "aprendizaje";
}

export function isStageUnlocked(row: LearningStageProgress, stage: LearningStage): boolean {
  if (stage === "aprendizaje") return true;
  if (stage === "consolidacion") return row.consolidation_unlocked;
  return row.tribunal_unlocked;
}

export function mixedPracticeUnlocked(rows: LearningStageProgress[]): boolean {
  return rows.length > 0 && rows.every((row) => row.tribunal_unlocked);
}

export function recommendedPracticeStage(
  rows: LearningStageProgress[],
  fallback: LearningStage,
): PracticeStage {
  return mixedPracticeUnlocked(rows) ? "mezcladas" : fallback;
}

export function learningRouteSummary(row: LearningStageProgress): LearningRouteSummary {
  const recommendedStage = learningStage(row.recommended_stage);

  if (row.tribunal_unlocked) {
    return {
      completed: true,
      badge: "Ruta completada",
      message:
        "Has terminado la ruta de preparación del tema. Ahora alterna práctica, fallos y repasos para afianzarlo.",
      recommendedStage,
    };
  }

  return {
    completed: false,
    badge: `Recomendado: ${LEARNING_STAGE_LABELS[recommendedStage]}`,
    message: row.stage_message,
    recommendedStage,
  };
}

export function stageRequirements(row: LearningStageProgress, stage: LearningStage): string[] {
  if (stage === "aprendizaje") return [];

  if (stage === "consolidacion") {
    const requiredQuestions = Math.min(20, row.learning_questions);
    return [
      row.learning_seen < requiredQuestions
        ? `Preguntas distintas: ${row.learning_seen} de ${requiredQuestions}`
        : null,
      row.learning_mastery === null || row.learning_mastery < 70
        ? `Acierto seguro: ${row.learning_mastery ?? 0}% de 70%`
        : null,
      row.learning_sessions < 2 ? `Sesiones: ${row.learning_sessions} de 2` : null,
    ].filter((value): value is string => Boolean(value));
  }

  const requiredQuestions = Math.min(30, row.consolidation_questions);
  return [
    !row.consolidation_unlocked ? "Completar primero Aprendizaje" : null,
    row.consolidation_seen < requiredQuestions
      ? `Preguntas distintas de Consolidación: ${row.consolidation_seen} de ${requiredQuestions}`
      : null,
    row.consolidation_mastery === null || row.consolidation_mastery < 80
      ? `Acierto seguro en Consolidación: ${row.consolidation_mastery ?? 0}% de 80%`
      : null,
    row.consolidation_sessions < 3
      ? `Sesiones de Consolidación: ${row.consolidation_sessions} de 3`
      : null,
    row.critical_concepts > 3
      ? `Fallos activos o conceptos críticos: ${row.critical_concepts}; reduce hasta 3`
      : null,
    row.tribunal_questions === 0 ? "Este tema todavía no tiene preguntas de Tribunal" : null,
  ].filter((value): value is string => Boolean(value));
}
