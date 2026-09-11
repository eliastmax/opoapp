import type { Database } from "@/integrations/supabase/types";

export type TestsFirstState =
  | "not_evaluated"
  | "needs_reinforcement"
  | "consolidating"
  | "mastered";

export type TestsFirstProgressRow = Omit<
  Database["public"]["Functions"]["get_my_tests_first_concept_progress"]["Returns"][number],
  "learner_state"
> & { learner_state: TestsFirstState };

export const TESTS_FIRST_STATE_LABELS: Record<TestsFirstState, string> = {
  not_evaluated: "No evaluado",
  needs_reinforcement: "Por reforzar",
  consolidating: "Consolidando",
  mastered: "Dominado",
};

export const TESTS_FIRST_STATE_STYLES: Record<TestsFirstState, string> = {
  not_evaluated: "border-muted-foreground/30 bg-muted text-muted-foreground",
  needs_reinforcement: "border-destructive/30 bg-destructive/10 text-destructive",
  consolidating: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  mastered: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

export function testsFirstStateTotals(rows: TestsFirstProgressRow[]) {
  return rows.reduce(
    (totals, row) => {
      totals[row.learner_state] += 1;
      return totals;
    },
    { not_evaluated: 0, needs_reinforcement: 0, consolidating: 0, mastered: 0 },
  );
}

export function groupTestsFirstProgressByTopic(rows: TestsFirstProgressRow[]) {
  const topics = new Map<
    string,
    Pick<TestsFirstProgressRow, "topic_id" | "topic_number" | "topic_name"> & {
      rows: TestsFirstProgressRow[];
    }
  >();
  for (const row of rows) {
    const topic = topics.get(row.topic_id) ?? {
      topic_id: row.topic_id,
      topic_number: row.topic_number,
      topic_name: row.topic_name,
      rows: [],
    };
    topic.rows.push(row);
    topics.set(row.topic_id, topic);
  }
  return [...topics.values()]
    .sort((left, right) => left.topic_number - right.topic_number)
    .map((topic) => ({
      ...topic,
      rows: topic.rows.sort((left, right) =>
        left.concept_title.localeCompare(right.concept_title, "es"),
      ),
    }));
}

export function evidenceDescription(row: TestsFirstProgressRow) {
  switch (row.evidence_reason) {
    case "insufficient_test_evidence":
      return "Aún faltan preguntas o sesiones distintas para clasificarlo con seguridad.";
    case "safe_accuracy_below_70":
      return "La muestra ya es segura y el acierto está por debajo del 70 %.";
    case "diverse_high_accuracy_test_evidence":
      return "Evidencia diversa: al menos 6 preguntas, 3 sesiones, 85 % y sin dudas.";
    case "limited_active_primary_capacity":
      return "La capacidad de preguntas PRIMARY limita cuánto puede comprobarse.";
    case "confirmed_doubt_requires_attention":
      return "Hay respuestas marcadas con duda dentro de la evidencia disponible.";
    default:
      return "La evidencia de tests está creciendo, pero todavía no alcanza Dominado.";
  }
}
