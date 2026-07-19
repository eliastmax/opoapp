export type SelectionTraceRow = {
  selection_group: string;
  selection_reason: string;
  was_in_previous_test: boolean;
  overlap_exception: boolean;
};

export const SELECTION_LABELS: Record<string, string> = {
  fallo_duda: "Fallos con duda",
  fallo: "Fallos pendientes",
  duda: "Dudas activas",
  nueva: "Preguntas nuevas",
  rendimiento_bajo: "Preguntas a reforzar",
  retencion: "Repaso por retención",
  poco_vista: "Preguntas poco vistas",
  variedad: "Variedad del tema",
};

export function summarizeSelection(rows: SelectionTraceRow[]) {
  const counts = rows.reduce<Record<string, number>>((result, row) => {
    result[row.selection_group] = (result[row.selection_group] ?? 0) + 1;
    return result;
  }, {});

  return {
    counts,
    previousOverlap: rows.filter((row) => row.was_in_previous_test).length,
    overlapException: rows.some((row) => row.overlap_exception),
  };
}
