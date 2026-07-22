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
    return [
      row.learning_mastery === null || row.learning_mastery < 90
        ? `Dominio de Aprendizaje: ${row.learning_mastery ?? 0}% de 90%`
        : null,
      row.learning_question_coverage < 80
        ? `Preguntas distintas: ${row.learning_question_coverage}% de 80%`
        : null,
      row.learning_perspective_coverage < 85
        ? `Perspectivas: ${row.learning_perspective_coverage}% de 85%`
        : null,
      row.learning_sessions < 3 ? `Sesiones: ${row.learning_sessions} de 3` : null,
      row.learning_critical_concepts > 0
        ? `${row.learning_critical_concepts} conceptos críticos por reforzar`
        : null,
    ].filter((value): value is string => Boolean(value));
  }

  return [
    !row.consolidation_unlocked ? "Completar primero Aprendizaje" : null,
    row.global_mastery === null || row.global_mastery < 92
      ? `Dominio global: ${row.global_mastery ?? 0}% de 92%`
      : null,
    row.robustness_percentage === null || row.robustness_percentage < 80
      ? `Robustez: ${row.robustness_percentage ?? 0}% de 80%`
      : null,
    row.consolidation_question_coverage < 90
      ? `Cobertura de Consolidación: ${row.consolidation_question_coverage}% de 90%`
      : null,
    row.retention_evidence < 2 ? `Retenciones separadas: ${row.retention_evidence} de 2` : null,
    row.critical_concepts > 0 ? `${row.critical_concepts} conceptos críticos por reforzar` : null,
  ].filter((value): value is string => Boolean(value));
}
