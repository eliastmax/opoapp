export type ResultImpactAnswer = {
  question_id: string;
  respuesta_usuario: string | null;
  correcta: boolean | null;
  marked_doubt: boolean;
};

export type ResultImpactSelection = {
  question_id: string;
  selection_group: string;
};

export type ResultImpactKind =
  | "new"
  | "recovered"
  | "retained"
  | "reinforced"
  | "worked"
  | "secure";

export type ResultImpactItem = {
  kind: ResultImpactKind;
  value: number;
  label: string;
  description: string;
};

const RECOVERY_GROUPS = new Set(["fallo", "fallo_duda"]);

export function resultImpact(
  answers: ResultImpactAnswer[],
  selections: ResultImpactSelection[],
): ResultImpactItem[] {
  const answerByQuestion = new Map(answers.map((answer) => [answer.question_id, answer] as const));
  const isSecureCorrect = (questionId: string) => {
    const answer = answerByQuestion.get(questionId);
    return answer?.correcta === true && !answer.marked_doubt;
  };

  const newQuestions = selections.filter(
    (row) =>
      row.selection_group === "nueva" &&
      answerByQuestion.get(row.question_id)?.respuesta_usuario != null,
  ).length;
  const recovered = selections.filter(
    (row) => RECOVERY_GROUPS.has(row.selection_group) && isSecureCorrect(row.question_id),
  ).length;
  const retained = selections.filter(
    (row) => row.selection_group === "repaso_programado" && isSecureCorrect(row.question_id),
  ).length;
  const reinforced = selections.filter(
    (row) => row.selection_group === "rendimiento_bajo" && isSecureCorrect(row.question_id),
  ).length;

  const facts: ResultImpactItem[] = [
    newQuestions > 0
      ? {
          kind: "new",
          value: newQuestions,
          label: newQuestions === 1 ? "pregunta nueva trabajada" : "preguntas nuevas trabajadas",
          description: "Amplían tu primera vuelta con contenido que aún no habías respondido.",
        }
      : null,
    recovered > 0
      ? {
          kind: "recovered",
          value: recovered,
          label: recovered === 1 ? "fallo acertado esta vez" : "fallos acertados esta vez",
          description: "Eran fallos activos y ahora los has respondido correctamente y sin duda.",
        }
      : null,
    retained > 0
      ? {
          kind: "retained",
          value: retained,
          label: retained === 1 ? "repaso confirmado" : "repasos confirmados",
          description: "Los has recordado cuando el sistema volvió a comprobarlos.",
        }
      : null,
    reinforced > 0
      ? {
          kind: "reinforced",
          value: reinforced,
          label: reinforced === 1 ? "punto débil reforzado" : "puntos débiles reforzados",
          description: "Has acertado preguntas seleccionadas por un rendimiento previo más bajo.",
        }
      : null,
  ].filter((item): item is ResultImpactItem => item !== null);

  if (facts.length > 0) return facts.slice(0, 3);

  const worked = answers.filter((answer) => answer.respuesta_usuario !== null).length;
  const secure = answers.filter(
    (answer) =>
      answer.respuesta_usuario !== null && answer.correcta === true && !answer.marked_doubt,
  ).length;

  return [
    {
      kind: "worked",
      value: worked,
      label: worked === 1 ? "pregunta trabajada" : "preguntas trabajadas",
      description: "La sesión añade práctica real a tu historial.",
    },
    secure > 0
      ? {
          kind: "secure",
          value: secure,
          label: secure === 1 ? "respuesta segura" : "respuestas seguras",
          description: "Correctas y sin marcar como duda en esta sesión.",
        }
      : null,
  ].filter((item): item is ResultImpactItem => item !== null);
}
