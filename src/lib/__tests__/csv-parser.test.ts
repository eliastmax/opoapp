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

  it("cabeceras exactas: rechaza mayúsculas/espacios (sin normalizar)", () => {
    const bad = "Materia;numero_tema;tema;subapartado;dificultad;pregunta;opcion_a;opcion_b;opcion_c;opcion_d;respuesta_correcta;explicacion;referencia_fuente\n" +
      "M;1;T;S;facil;¿?;A;B;C;D;A;E;R\n";
    const r = parseCsv(bad);
    expect("fatal" in r).toBe(true);
  });

  it("V1-16 con código vacío se acepta (codigo=null)", () => {
    const rows = HEADERS_V1_ENRICHED.join(";") + "\n" +
      ';M;1;T;S;facil;C;O;¿?;A;B;C;D;A;E;R\n';
    const r = parseCsv(rows);
    assertOk(r);
    expect(r.valid).toHaveLength(1);
    expect(r.valid[0].codigo).toBeNull();
  });

  it("numero_tema no entero → error estricto", () => {
    const rows = HEADERS_V1_BASIC.join(";") + "\n" +
      'M;20abc;T;S;facil;¿?;A;B;C;D;A;E;R\n';
    const r = parseCsv(rows);
    assertOk(r);
    expect(r.valid).toHaveLength(0);
    expect(r.errors.some((e) => e.field === "numero_tema")).toBe(true);
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

  it("opción vacía explícita → error", () => {
    const rows = HEADERS_V1_BASIC.join(";") + "\n" +
      'M;1;T;S;facil;¿?;;B;C;D;A;E;R\n';
    const r = parseCsv(rows);
    assertOk(r);
    expect(r.valid).toHaveLength(0);
    expect(r.errors.some((e) => e.field === "opcion_a")).toBe(true);
  });

  it("cabecera con espacio final → fatal (sin trim)", () => {
    const bad = "materia ;numero_tema;tema;subapartado;dificultad;pregunta;opcion_a;opcion_b;opcion_c;opcion_d;respuesta_correcta;explicacion;referencia_fuente\n" +
      "M;1;T;S;facil;¿?;A;B;C;D;A;E;R\n";
    const r = parseCsv(bad);
    expect("fatal" in r).toBe(true);
    if ("fatal" in r) {
      expect(r.header.headers[0]).toBe("materia ");
    }
  });

  it("V2 preserva los 25 campos de una fila", () => {
    const row = HEADERS_V2.join(";") + "\n" +
      'SMS-T02-0007;Materia;2;Tema T;Apart;Sub;Concep;Obj;definicion;aprendizaje;medio;facil;plazo;¿Enunciado?;OA;OB;OC;OD;C;Expl;Doc.pdf;12;18;Ref bibliográfica;media\n';
    const r = parseCsv(row);
    assertOk(r);
    expect(r.valid).toHaveLength(1);
    const v = r.valid[0];
    expect(v.codigo).toBe("SMS-T02-0007");
    expect(v.materia).toBe("Materia");
    expect(v.numero_tema).toBe(2);
    expect(v.tema).toBe("Tema T");
    expect(v.apartado).toBe("Apart");
    expect(v.subapartado).toBe("Sub");
    expect(v.concepto).toBe("Concep");
    expect(v.objetivo_aprendizaje).toBe("Obj");
    expect(v.perspectiva).toBe("definicion");
    expect(v.nivel_pedagogico).toBe("aprendizaje");
    expect(v.dificultad_conceptual).toBe("medio");
    expect(v.dificultad_examen).toBe("facil");
    expect(v.dificultad).toBe("facil");
    expect(v.tipo_trampa).toBe("plazo");
    expect(v.pregunta).toBe("¿Enunciado?");
    expect(v.opcion_a).toBe("OA");
    expect(v.opcion_b).toBe("OB");
    expect(v.opcion_c).toBe("OC");
    expect(v.opcion_d).toBe("OD");
    expect(v.respuesta_correcta).toBe("C");
    expect(v.explicacion).toBe("Expl");
    expect(v.documento_referencia).toBe("Doc.pdf");
    expect(v.pagina_inicio).toBe(12);
    expect(v.pagina_fin).toBe(18);
    expect(v.referencia_fuente).toBe("Ref bibliográfica");
    expect(v.frecuencia_historica).toBe("media");
  });

  it("V2 páginas: entero + null son válidos", () => {
    const rows = HEADERS_V2.join(";") + "\n" +
      'C1;M;1;T;Ap;Sub;C;O;definicion;aprendizaje;facil;facil;ninguna;¿?;A;B;C;D;A;E;Doc;;42;Ref;alta\n' +
      'C2;M;1;T;Ap;Sub;C;O;definicion;aprendizaje;facil;facil;ninguna;¿otra?;A;B;C;D;A;E;Doc;7;;Ref;alta\n';
    const r = parseCsv(rows);
    assertOk(r);
    expect(r.valid).toHaveLength(2);
    expect(r.valid[0].pagina_inicio).toBeNull();
    expect(r.valid[0].pagina_fin).toBe(42);
    expect(r.valid[1].pagina_inicio).toBe(7);
    expect(r.valid[1].pagina_fin).toBeNull();
  });
});


