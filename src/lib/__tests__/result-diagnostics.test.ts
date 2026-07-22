// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import {
  answerWithText,
  buildDiagnosticGroups,
  buildTestExport,
  questionReference,
  type DiagnosticQuestion,
} from "../result-diagnostics";

const question: DiagnosticQuestion = {
  codigo: "SMS-CEL-T06-0001",
  pregunta: "¿Cómo debe realizarse el traslado?",
  concepto: "Movilización de pacientes",
  objetivo_aprendizaje: "Aplicar un traslado seguro",
  perspectiva: "caso_practico",
  nivel_pedagogico: "consolidacion",
  dificultad_examen: "medio",
  apartado: "Funciones del celador",
  documento_referencia: "Temario Celador.pdf",
  pagina_inicio: 12,
  pagina_fin: 14,
  referencia_fuente: "Tema 6",
  opcion_a: "Avisar y esperar instrucciones.",
  opcion_b: "Aplicar la técnica indicada con seguridad.",
  opcion_c: "Delegar siempre la actuación.",
  opcion_d: "Actuar sin comprobar el entorno.",
  respuesta_correcta: "B",
  explicacion: "Debe aplicarse la técnica indicada con seguridad.",
  subtopics: { nombre: "Traslado seguro" },
};

describe("result diagnostics", () => {
  it("shows the answer letter together with its complete text", () => {
    expect(answerWithText(question, "B")).toBe("B. Aplicar la técnica indicada con seguridad.");
    expect(answerWithText(question, null)).toBeNull();
  });

  it("builds an exact structured study reference", () => {
    expect(questionReference(question)).toBe(
      "Temario Celador.pdf · Funciones del celador · Traslado seguro · págs. 12-14",
    );
  });

  it("groups failures and doubts by concept without duplicating references", () => {
    const groups = buildDiagnosticGroups([
      { correcta: false, marked_doubt: true, questions: question },
      { correcta: true, marked_doubt: true, questions: question },
      { correcta: true, marked_doubt: false, questions: question },
    ]);

    expect(groups).toEqual([
      {
        concept: "Movilización de pacientes",
        failures: 1,
        doubts: 2,
        perspectives: ["caso_practico"],
        references: ["Temario Celador.pdf · Funciones del celador · Traslado seguro · págs. 12-14"],
      },
    ]);
  });

  it("exports facts, references and an evidence warning", () => {
    const report = buildTestExport({
      percentage: 80,
      correct: 8,
      failures: 2,
      unanswered: 0,
      questionCount: 10,
      groups: buildDiagnosticGroups([
        { correcta: false, marked_doubt: false, questions: question },
      ]),
      answers: [
        {
          orden: 1,
          respuesta_usuario: "A",
          correcta: false,
          marked_doubt: false,
          questions: question,
        },
      ],
    });

    expect(report).toContain("Resultado: 80%");
    expect(report).toContain("no constituye por sí solo un diagnóstico robusto");
    expect(report).toContain("Movilización de pacientes");
    expect(report).toContain("Temario Celador.pdf");
    expect(report).toContain("BANCO COMPLETO REALIZADO");
    expect(report).toContain("A. Avisar y esperar instrucciones.");
    expect(report).toContain("Respuesta elegida: A. Avisar y esperar instrucciones.");
    expect(report).toContain("Respuesta correcta: B. Aplicar la técnica indicada con seguridad.");
    expect(report).toContain("Explicación: Debe aplicarse la técnica indicada con seguridad.");
  });
});
