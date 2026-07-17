// @ts-expect-error bun:test provided by bun runtime
import { describe, it, expect } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";
import { parseCsv, HEADERS_V1_BASIC, HEADERS_V1_ENRICHED, HEADERS_V2 } from "../csv-parser";

const V1_BASIC = HEADERS_V1_BASIC.join(";") + "\n" +
  'Materia X;20;Tema Y;Sub A;facil;¿Pregunta?;A1;B1;C1;D1;A;Expl;Ref\n';

const V1_ENRICHED_COMMA = HEADERS_V1_ENRICHED.join(",") + "\n" +
  'SMS-T20-0001,Materia X,20,Tema Y,Sub A,medio,Concepto,Objetivo,¿Pregunta?,A1,B1,C1,D1,B,Expl,Ref\n';

import type { ParseResult, ParseFatal } from "../csv-parser";
function assertOk(res: ParseResult | ParseFatal): asserts res is ParseResult {
  if ("fatal" in res) throw new Error("fatal: " + res.fatal);
}

describe("parseCsv", () => {
  it("V1 básico con ;", () => {
    const r = parseCsv(V1_BASIC);
    assertOk(r);
    expect(r.mode).toBe("basic");
    expect(r.delimiter).toBe(";");
    expect(r.valid).toHaveLength(1);
    expect(r.errors).toHaveLength(0);
    expect(r.valid[0].dificultad).toBe("facil");
  });

  it("V1 enriquecido con ,", () => {
    const r = parseCsv(V1_ENRICHED_COMMA);
    assertOk(r);
    expect(r.mode).toBe("enriched");
    expect(r.delimiter).toBe(",");
    expect(r.valid[0].codigo).toBe("SMS-T20-0001");
  });

  it("V2 adjunto: 50 filas válidas, 25 campos", () => {
    const text = readFileSync(join(__dirname, "fixture_v2.csv"), "utf8");
    const r = parseCsv(text);
    assertOk(r);
    expect(r.mode).toBe("v2");
    expect(r.headers).toHaveLength(25);
    expect(r.valid).toHaveLength(50);
    expect(r.errors).toHaveLength(0);
    const first = r.valid[0];
    expect(first.codigo).toBe("SMS-T20-0001");
    expect(first.dificultad_conceptual).toBe("medio");
    expect(first.dificultad_examen).toBe("facil");
    expect(first.dificultad).toBe("facil"); // legacy = examen
    expect(first.pagina_inicio).toBe(44);
    expect(first.pagina_fin).toBe(44);
    expect(first.frecuencia_historica).toBe("baja");
    expect(first.perspectiva).toBe("combinacion_requisitos");
  });

  it("acepta perspectiva relacion_normativa", () => {
    const row = HEADERS_V2.join(";") + "\n" +
      'C1;M;1;T;Ap;Sub;Con;Obj;relacion_normativa;aprendizaje;facil;facil;ninguna;¿?;A;B;C;D;A;E;Doc;;;Ref;alta\n';
    const r = parseCsv(row);
    assertOk(r);
    expect(r.valid[0].perspectiva).toBe("relacion_normativa");
    expect(r.valid[0].pagina_inicio).toBeNull();
  });

  it("rechaza enum inválido", () => {
    const row = HEADERS_V2.join(";") + "\n" +
      'C1;M;1;T;Ap;Sub;Con;Obj;NOPE;aprendizaje;facil;facil;ninguna;¿?;A;B;C;D;A;E;Doc;;;Ref;alta\n';
    const r = parseCsv(row);
    assertOk(r);
    expect(r.valid).toHaveLength(0);
    expect(r.errors.some((e) => e.field === "perspectiva")).toBe(true);
  });

  it("rechaza opciones duplicadas", () => {
    const row = HEADERS_V1_BASIC.join(";") + "\n" +
      'M;1;T;Sub;facil;¿?;same;same;C;D;A;E;R\n';
    const r = parseCsv(row);
    assertOk(r);
    expect(r.valid).toHaveLength(0);
    expect(r.errors[0].reason).toMatch(/distintas/);
  });

  it("detecta códigos duplicados dentro del CSV", () => {
    const rows = HEADERS_V1_ENRICHED.join(";") + "\n" +
      'X1;M;1;T;S;facil;C;O;¿?;A;B;C;D;A;E;R\n' +
      'X1;M;1;T;S;facil;C;O;¿otra?;A;B;C;D;A;E;R\n';
    const r = parseCsv(rows);
    assertOk(r);
    expect(r.errors.some((e) => e.field === "codigo")).toBe(true);
  });

  it("cabecera errónea → fatal con diagnóstico", () => {
    const bad = "foo;bar;baz\n1;2;3\n";
    const r = parseCsv(bad);
    expect("fatal" in r).toBe(true);
    if ("fatal" in r) {
      expect(r.header.delimiter).toBe(";");
      expect(r.header.headers).toEqual(["foo","bar","baz"]);
      expect(r.header.columnCount).toBe(3);
    }
  });

  it("soporta comillas con delimitador dentro y CRLF/BOM", () => {
    const text = "\uFEFF" + HEADERS_V1_BASIC.join(";") + "\r\n" +
      'Mat;1;"Tema; con ;";Sub;facil;"Pregunta ""quoted""";A;B;C;D;A;Expl;Ref\r\n';
    const r = parseCsv(text);
    assertOk(r);
    expect(r.valid).toHaveLength(1);
    expect(r.valid[0].tema).toBe("Tema; con ;");
    expect(r.valid[0].pregunta).toBe('Pregunta "quoted"');
  });

  it("pagina_fin < pagina_inicio → error", () => {
    const row = HEADERS_V2.join(";") + "\n" +
      'C1;M;1;T;Ap;Sub;Con;Obj;definicion;aprendizaje;facil;facil;ninguna;¿?;A;B;C;D;A;E;Doc;10;5;Ref;alta\n';
    const r = parseCsv(row);
    assertOk(r);
    expect(r.valid).toHaveLength(0);
    expect(r.errors.some((e) => e.field === "pagina_fin")).toBe(true);
  });
});
