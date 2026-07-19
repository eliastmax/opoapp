export type AnswerLetter = "A" | "B" | "C" | "D";

export type DiagnosticQuestion = {
  concepto: string | null;
  perspectiva: string | null;
  apartado: string | null;
  documento_referencia: string | null;
  pagina_inicio: number | null;
  pagina_fin: number | null;
  referencia_fuente: string | null;
  opcion_a: string;
  opcion_b: string;
  opcion_c: string;
  opcion_d: string;
  subtopics: { nombre: string } | null;
};

export type DiagnosticAnswer = {
  correcta: boolean | null;
  marked_doubt: boolean;
  questions: DiagnosticQuestion | null;
};

export type DiagnosticGroup = {
  concept: string;
  failures: number;
  doubts: number;
  perspectives: string[];
  references: string[];
};

const OPTION_KEYS: Record<AnswerLetter, keyof DiagnosticQuestion> = {
  A: "opcion_a",
  B: "opcion_b",
  C: "opcion_c",
  D: "opcion_d",
};

export function answerWithText(question: DiagnosticQuestion, answer: string | null): string | null {
  if (!answer || !(answer in OPTION_KEYS)) return null;
  const letter = answer as AnswerLetter;
  return `${letter}. ${question[OPTION_KEYS[letter]]}`;
}

export function questionReference(question: DiagnosticQuestion): string | null {
  const structuredParts = [
    question.documento_referencia,
    question.apartado,
    question.subtopics?.nombre,
  ].filter((value): value is string => Boolean(value?.trim()));

  if (question.pagina_inicio !== null || question.pagina_fin !== null) {
    const start = question.pagina_inicio;
    const end = question.pagina_fin;
    if (start !== null && end !== null) {
      structuredParts.push(start === end ? `pág. ${start}` : `págs. ${start}-${end}`);
    } else {
      structuredParts.push(`pág. ${start ?? end}`);
    }
  }

  if (structuredParts.length > 0) return structuredParts.join(" · ");
  return question.referencia_fuente?.trim() || null;
}

export function buildDiagnosticGroups(answers: DiagnosticAnswer[]): DiagnosticGroup[] {
  const groups = new Map<
    string,
    DiagnosticGroup & { perspectiveSet: Set<string>; referenceSet: Set<string> }
  >();

  for (const answer of answers) {
    if (answer.correcta !== false && !answer.marked_doubt) continue;
    const question = answer.questions;
    if (!question) continue;

    const concept =
      question.concepto?.trim() ||
      question.subtopics?.nombre?.trim() ||
      "Contenido sin concepto clasificado";
    const key = concept.toLocaleLowerCase("es");
    const group = groups.get(key) ?? {
      concept,
      failures: 0,
      doubts: 0,
      perspectives: [],
      references: [],
      perspectiveSet: new Set<string>(),
      referenceSet: new Set<string>(),
    };

    if (answer.correcta === false) group.failures += 1;
    if (answer.marked_doubt) group.doubts += 1;

    const perspective = question.perspectiva?.trim();
    if (perspective) group.perspectiveSet.add(perspective);
    const reference = questionReference(question);
    if (reference) group.referenceSet.add(reference);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map(({ perspectiveSet, referenceSet, ...group }) => ({
      ...group,
      perspectives: [...perspectiveSet],
      references: [...referenceSet],
    }))
    .sort((a, b) => b.failures + b.doubts - (a.failures + a.doubts));
}

export function buildTestExport(input: {
  percentage: number;
  correct: number;
  failures: number;
  unanswered: number;
  questionCount: number;
  groups: DiagnosticGroup[];
}): string {
  const lines = [
    "INFORME OPOTEST STUDY — RESULTADO DE UN TEST",
    "",
    `Resultado: ${input.percentage}%`,
    `Aciertos: ${input.correct}/${input.questionCount}`,
    `Fallos: ${input.failures}`,
    `Sin responder: ${input.unanswered}`,
    "",
    "Nota de evidencia: este informe resume un único test y no constituye por sí solo un diagnóstico robusto.",
  ];

  if (input.groups.length === 0) {
    lines.push("", "No se registraron fallos ni dudas en este test.");
    return lines.join("\n");
  }

  lines.push("", "CONTENIDOS A REPASAR");
  input.groups.forEach((group, index) => {
    lines.push(
      "",
      `${index + 1}. ${group.concept}`,
      `Fallos: ${group.failures} · Dudas: ${group.doubts}`,
    );
    if (group.perspectives.length > 0) {
      lines.push(`Perspectivas: ${group.perspectives.join(", ")}`);
    }
    group.references.forEach((reference) => lines.push(`Referencia: ${reference}`));
  });

  return lines.join("\n");
}
