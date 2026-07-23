export type HistoryFilter = "todos" | "completados" | "pendientes" | "simulacros";

export type HistoryTestSummary = {
  tipo: string;
  completado: boolean;
  numero_preguntas: number;
  aciertos: number;
  sin_responder: number;
};

export function historyTestLabel(type: string) {
  const labels: Record<string, string> = {
    mezcladas: "Test personalizado",
    nuevas: "Preguntas nuevas",
    falladas: "Repaso de fallos",
    dudas: "Repaso de dudas",
    simulacro: "Simulacro de examen",
    multitema_mezcladas: "Test multitema",
    multitema_nuevas: "Multitema · preguntas nuevas",
    multitema_falladas: "Multitema · repaso de fallos",
    multitema_dudas: "Multitema · repaso de dudas",
  };

  return labels[type] ?? "Test personalizado";
}

export function matchesHistoryFilter(test: HistoryTestSummary, filter: HistoryFilter) {
  if (filter === "completados") return test.completado;
  if (filter === "pendientes") return !test.completado;
  if (filter === "simulacros") return test.tipo === "simulacro";
  return true;
}

export function historyOverview(tests: HistoryTestSummary[]) {
  const completed = tests.filter((test) => test.completado);
  const answered = completed.reduce(
    (total, test) => total + Math.max(0, test.numero_preguntas - test.sin_responder),
    0,
  );
  const correct = completed.reduce((total, test) => total + test.aciertos, 0);

  return {
    completed: completed.length,
    pending: tests.length - completed.length,
    answered,
    accuracy: answered > 0 ? Math.round((correct / answered) * 100) : 0,
  };
}
