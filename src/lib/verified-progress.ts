import type { Database } from "@/integrations/supabase/types";

export type VerifiedProgressRow =
  Database["public"]["Functions"]["get_verified_progress_summary"]["Returns"][number];

export type ComparisonState =
  | "insuficiente"
  | "mejora_verificada"
  | "estable"
  | "descenso_observado";

export function comparisonState(value: string): ComparisonState {
  if (value === "mejora_verificada" || value === "estable" || value === "descenso_observado") {
    return value;
  }
  return "insuficiente";
}

export function comparisonMessage(row: VerifiedProgressRow): string {
  const state = comparisonState(row.comparison_state);

  if (state === "insuficiente") {
    return "Aún no hay dos bloques comparables: hacen falta 10 preguntas iguales, separadas al menos 7 días y repartidas en 2 tests por bloque.";
  }

  const change = Math.abs(row.accuracy_change ?? 0).toLocaleString("es-ES", {
    maximumFractionDigits: 1,
  });

  if (state === "mejora_verificada") {
    return `Mejora verificada: +${change} puntos en ${row.comparable_question_count} preguntas comparables.`;
  }

  if (state === "descenso_observado") {
    return `El bloque reciente está ${change} puntos por debajo en ${row.comparable_question_count} preguntas comparables.`;
  }

  return `Rendimiento estable en ${row.comparable_question_count} preguntas comparables.`;
}

export function verifiedProgressTotals(rows: VerifiedProgressRow[]) {
  return rows.reduce(
    (totals, row) => ({
      corrected: totals.corrected + row.corrected_failures_30d,
      retained: totals.retained + row.retained_questions_30d,
      improvedTopics:
        totals.improvedTopics +
        (comparisonState(row.comparison_state) === "mejora_verificada" ? 1 : 0),
    }),
    { corrected: 0, retained: 0, improvedTopics: 0 },
  );
}
