import type { Database } from "@/integrations/supabase/types";

type GeneratedTopicProgressRow =
  Database["public"]["Functions"]["get_topic_progress_summary"]["Returns"][number];
type NullableTopicProgressFields =
  | "first_activity_at"
  | "last_activity_at"
  | "mastery_percentage";
export type TopicProgressRow = {
  [Key in keyof GeneratedTopicProgressRow]: Key extends NullableTopicProgressFields
    ? GeneratedTopicProgressRow[Key] | null
    : GeneratedTopicProgressRow[Key];
};

export type EvidenceState = "sin_base" | "inicial" | "suficiente" | "robusta";
export type CoverageMilestone = "sin_empezar" | "en_marcha" | "casi_completo" | "completo";

export type CoverageSummary = {
  state: CoverageMilestone;
  title: string;
  message: string;
  remainingQuestions: number;
  remainingConcepts: number;
};

export const EVIDENCE_LABELS: Record<EvidenceState, string> = {
  sin_base: "Sin práctica",
  inicial: "Práctica inicial",
  suficiente: "Práctica suficiente",
  robusta: "Práctica robusta",
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

export function coverageSummary(row: TopicProgressRow): CoverageSummary {
  const remainingQuestions = Math.max(0, row.active_questions - row.unique_questions_seen);
  const remainingConcepts = Math.max(0, row.available_concepts - row.seen_concepts);

  if (row.unique_questions_seen === 0) {
    return {
      state: "sin_empezar",
      title: "Aún no has empezado",
      message: "Tu primera respuesta abrirá el recorrido de este tema.",
      remainingQuestions,
      remainingConcepts,
    };
  }

  if (remainingQuestions === 0) {
    return {
      state: "completo",
      title: "Primera vuelta completada",
      message:
        "Has respondido todas las preguntas de este tema al menos una vez. Ahora el avance consiste en corregir fallos y mantenerlo con repasos separados.",
      remainingQuestions,
      remainingConcepts,
    };
  }

  if (remainingQuestions <= Math.max(2, Math.ceil(row.active_questions * 0.02))) {
    return {
      state: "casi_completo",
      title: "A punto de completar la primera vuelta",
      message: `Te ${remainingQuestions === 1 ? "queda" : "quedan"} ${remainingQuestions} ${
        remainingQuestions === 1 ? "pregunta" : "preguntas"
      } por responder para completar la primera vuelta.`,
      remainingQuestions,
      remainingConcepts,
    };
  }

  return {
    state: "en_marcha",
    title: "Primera vuelta en marcha",
    message: `Has respondido ${row.unique_questions_seen} de ${row.active_questions} preguntas distintas.`,
    remainingQuestions,
    remainingConcepts,
  };
}

export function topicProgressDescription(row: TopicProgressRow): string {
  const coverage = coverageSummary(row);
  if (coverage.state === "completo") {
    return "La cobertura está completa. El siguiente avance se demuestra recuperando fallos y manteniendo el tema con repasos separados.";
  }
  if (coverage.state === "casi_completo") return coverage.message;
  return evidenceDescription(evidenceState(row.evidence_state));
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

  return "Mantén el tema con práctica separada y revisiones programadas.";
}

export function sortProgressByTopicNumber(rows: TopicProgressRow[]): TopicProgressRow[] {
  return [...rows].sort((a, b) => a.topic_number - b.topic_number);
}