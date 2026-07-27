import type { Database } from "@/integrations/supabase/types";

export type LearningStage = "aprendizaje" | "consolidacion" | "tribunal";
export type LearningStageProgress =
  Database["public"]["Functions"]["get_learning_stage_progress"]["Returns"][number];

export const LEARNING_STAGES: LearningStage[] = ["aprendizaje", "consolidacion", "tribunal"];

export const LEARNING_STAGE_LABELS: Record<LearningStage, string> = {
  aprendizaje: "Aprendizaje",
  consolidacion: "Consolidación",
  tribunal: "Tribunal",
};

export const LEARNING_STAGE_DESCRIPTIONS: Record<LearningStage, string> = {
  aprendizaje: "Base, reglas esenciales y comprensión.",
  consolidacion: "Excepciones, relaciones y aplicación segura.",
  tribunal: "Casos, matices y discriminación exigente.",
};

export function learningStage(value: string | null | undefined): LearningStage {
  return value === "consolidacion" || value === "tribunal" ? value : "aprendizaje";
}

export function isStageUnlocked(row: LearningStageProgress, stage: LearningStage): boolean {
  if (stage === "aprendizaje") return true;
  if (stage === "consolidacion") return row.consolidation_unlocked;
  return row.tribunal_unlocked;
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
