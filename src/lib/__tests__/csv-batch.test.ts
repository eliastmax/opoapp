// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import { analyzeCsvBatch } from "../csv-batch";
import { HEADERS_V2 } from "../csv-parser";

function v2Row(code: string, question: string): string {
  return `${code};M;1;Tema;Ap;Sub;Con;Obj;definicion;aprendizaje;facil;facil;ninguna;${question};A;B;C;D;A;Exp;Doc;;;Ref;no_determinada`;
}

describe("analyzeCsvBatch", () => {
  it("combina varios CSV válidos", () => {
    const header = HEADERS_V2.join(";");
    const result = analyzeCsvBatch([
      { name: "uno.csv", text: `${header}\n${v2Row("T1-001", "¿Pregunta uno?")}\n` },
      { name: "dos.csv", text: `${header}\n${v2Row("T1-002", "¿Pregunta dos?")}\n` },
    ]);

    expect(result.files).toHaveLength(2);
    expect(result.rows).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.rows[1].sourceFile).toBe("dos.csv");
  });

  it("detecta códigos duplicados entre archivos", () => {
    const header = HEADERS_V2.join(";");
    const result = analyzeCsvBatch([
      { name: "uno.csv", text: `${header}\n${v2Row("T1-001", "¿Pregunta uno?")}\n` },
      { name: "dos.csv", text: `${header}\n${v2Row("T1-001", "¿Pregunta dos?")}\n` },
    ]);

    expect(result.errors.some((error) => error.field === "codigo")).toBe(true);
    expect(result.errors[0].reason).toContain("entre archivos");
    expect(result.files.every((file) => file.errors === 1)).toBe(true);
  });

  it("detecta enunciados duplicados entre archivos", () => {
    const header = HEADERS_V2.join(";");
    const result = analyzeCsvBatch([
      { name: "uno.csv", text: `${header}\n${v2Row("T1-001", "¿Misma pregunta?")}\n` },
      { name: "dos.csv", text: `${header}\n${v2Row("T1-002", "¿Misma pregunta?")}\n` },
    ]);

    expect(result.errors.some((error) => error.field === "pregunta")).toBe(true);
  });

  it("conserva el diagnóstico de una cabecera inválida", () => {
    const result = analyzeCsvBatch([
      { name: "bien.csv", text: `${HEADERS_V2.join(";")}\n${v2Row("T1-001", "¿Bien?")}\n` },
      { name: "mal.csv", text: "foo;bar\n1;2\n" },
    ]);

    expect(result.files[1].fatal).not.toBeNull();
    expect(result.errors.some((error) => error.sourceFile === "mal.csv")).toBe(true);
  });
});
