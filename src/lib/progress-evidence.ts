import type { Database } from "@/integrations/supabase/types";

export type TopicProgressRow =
  Database["public"]["Functions"]["get_topic_progress_summary"]["Returns"][number];

export type EvidenceState = "sin_base" | "inicial" | "suficiente" | "robusta";

export const EVIDENCE_LABELS: Record<EvidenceState, string> = {
  sin_base: "Sin base todavía",
  inicial: "Evidencia inicial",
  suficiente: "Base suficiente",
  robusta: "Base robusta",
};

export function evidenceState(value: string): EvidenceState {
  return value === "inicial" || value === "suficiente" || value === "robusta" ? value : "sin_base";
}

export function evidenceDescription(state: EvidenceState): string {
  switch (state) {
    case "sin_base":
      return "Aún no has respondido preguntas de este tema.";
    case "inicial":
      return "La app está reuniendo datos. El porcentaje actual todavía puede cambiar mucho.";
    case "suficiente":
      return "Ya existe una base útil, aunque todavía conviene ampliar y separar la práctica.";
    case "robusta":
      return "Hay práctica variada y distribuida en el tiempo para interpretar el resultado con más confianza.";
  }
}

export function nextProgressAction(row: TopicProgressRow): string {
  const state = evidenceState(row.evidence_state);

  if (state === "sin_base") return "Haz un primer test de este tema para empezar a medirlo.";

  if (row.active_failures > 0 || row.active_doubts > 0) {
    return "Prioriza los fallos y dudas activos antes de ampliar el tema.";
  }

  if (state === "inicial") {
    return "Sigue respondiendo preguntas distintas y reparte la práctica entre varios tests.";
  }

  if (row.coverage_percentage < 60) {
    return "Amplía la cobertura con preguntas que todavía no hayas visto.";
  }

  return "Mantén el tema con repasos separados y vigila si reaparecen fallos o dudas.";
}

export function groupProgressBySubject(rows: TopicProgressRow[]) {
  const groups = new Map<string, { id: string; name: string; topics: TopicProgressRow[] }>();

  for (const row of rows) {
    const existing = groups.get(row.subject_id);
    if (existing) existing.topics.push(row);
    else groups.set(row.subject_id, { id: row.subject_id, name: row.subject_name, topics: [row] });
  }

  return Array.from(groups.values());
}
