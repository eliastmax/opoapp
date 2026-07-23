export type ResultFeedbackTone = "perfect" | "excellent" | "solid" | "building" | "diagnostic";

export type ResultFeedback = {
  title: string;
  message: string;
  tone: ResultFeedbackTone;
};

type ResultFeedbackInput = {
  percentage: number;
  correct: number;
  failures: number;
  unanswered: number;
  doubts: number;
  questionCount: number;
};

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function reviewSummary(failures: number, unanswered: number, doubts: number) {
  const parts: string[] = [];
  if (failures > 0) parts.push(countLabel(failures, "fallo", "fallos"));
  if (unanswered > 0)
    parts.push(countLabel(unanswered, "respuesta pendiente", "respuestas pendientes"));
  if (doubts > 0) parts.push(countLabel(doubts, "duda", "dudas"));
  return parts.join(", ");
}

export function resultFeedback({
  percentage,
  correct,
  failures,
  unanswered,
  doubts,
  questionCount,
}: ResultFeedbackInput): ResultFeedback {
  if (percentage === 100 && doubts === 0) {
    return {
      title: "Test perfecto",
      message: `Has acertado las ${questionCount} preguntas. Es una señal excelente; la app volverá a comprobar estos contenidos para confirmar que se mantienen.`,
      tone: "perfect",
    };
  }

  if (percentage === 100) {
    return {
      title: "Resultado perfecto, todavía con dudas",
      message: `Has acertado todo, aunque marcaste ${countLabel(doubts, "respuesta como duda", "respuestas como duda")}. Ahora toca convertir ese acierto en seguridad.`,
      tone: "perfect",
    };
  }

  const review = reviewSummary(failures, unanswered, doubts);

  if (percentage >= 90) {
    return {
      title: "Excelente resultado",
      message: `Has acertado ${correct} de ${questionCount}. Solo quedan ${review || "unos pocos matices"} por afianzar.`,
      tone: "excellent",
    };
  }

  if (percentage >= 75) {
    return {
      title: "Buena base",
      message: `Has acertado ${correct} de ${questionCount} y localizado ${review || "los puntos que conviene revisar"}. Un repaso dirigido puede convertirlos en aciertos estables.`,
      tone: "solid",
    };
  }

  if (percentage >= 60) {
    return {
      title: "Vas construyendo una base útil",
      message: `Ya tienes ${correct} de ${questionCount} respuestas correctas. Revisa ${review || "los contenidos menos seguros"} y vuelve a probarlos más adelante.`,
      tone: "building",
    };
  }

  return {
    title: "Ahora sabemos qué reforzar",
    message: `Este resultado no es una sentencia: ha señalado ${review || "los contenidos que necesitan más práctica"}. Empieza por los fallos explicados debajo y avanza paso a paso.`,
    tone: "diagnostic",
  };
}
