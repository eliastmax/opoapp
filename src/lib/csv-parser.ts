import Papa from "papaparse";

export type Dificultad = "facil" | "medio" | "dificil";
export type Respuesta = "A" | "B" | "C" | "D";

export interface ParsedRow {
  rowNumber: number;
  codigo: string | null;
  materia: string;
  numero_tema: number;
  tema: string;
  subapartado: string;
  dificultad: Dificultad;
  concepto: string | null;
  objetivo_aprendizaje: string | null;
  pregunta: string;
  opcion_a: string;
  opcion_b: string;
  opcion_c: string;
  opcion_d: string;
  respuesta_correcta: Respuesta;
  explicacion: string;
  referencia_fuente: string;
}

export interface RowError {
  row: number;
  reason: string;
}

export interface ParseResult {
  mode: "basic" | "enriched";
  valid: ParsedRow[];
  errors: RowError[];
}

const HEADERS_BASIC = [
  "materia","numero_tema","tema","subapartado","dificultad","pregunta",
  "opcion_a","opcion_b","opcion_c","opcion_d","respuesta_correcta","explicacion","referencia_fuente",
];
const HEADERS_ENRICHED = [
  "codigo","materia","numero_tema","tema","subapartado","dificultad","concepto","objetivo_aprendizaje",
  "pregunta","opcion_a","opcion_b","opcion_c","opcion_d","respuesta_correcta","explicacion","referencia_fuente",
];

const DIFICULTAD_MAP: Record<string, Dificultad> = {
  facil: "facil", fácil: "facil",
  medio: "medio", media: "medio",
  dificil: "dificil", difícil: "dificil",
};

function normHeader(h: string): string {
  return h.replace(/^\uFEFF/, "").trim().toLowerCase();
}

export function parseCsv(text: string): ParseResult | { fatal: string } {
  const result = Papa.parse<Record<string, string>>(text, {
    delimiter: ";",
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: normHeader,
  });

  const fields = (result.meta.fields ?? []).map(normHeader);
  let mode: "basic" | "enriched";
  if (fields.length === HEADERS_BASIC.length && HEADERS_BASIC.every((h, i) => fields[i] === h)) {
    mode = "basic";
  } else if (fields.length === HEADERS_ENRICHED.length && HEADERS_ENRICHED.every((h, i) => fields[i] === h)) {
    mode = "enriched";
  } else {
    return { fatal: `Cabeceras inválidas. Se esperan 13 o 16 columnas exactas. Recibidas: ${fields.join(";")}` };
  }

  const valid: ParsedRow[] = [];
  const errors: RowError[] = [];
  result.data.forEach((raw, idx) => {
    const rowNum = idx + 2; // +1 header, +1 base-1
    try {
      const parsed = validateRow(raw, mode, rowNum);
      valid.push(parsed);
    } catch (e) {
      errors.push({ row: rowNum, reason: (e as Error).message });
    }
  });
  return { mode, valid, errors };
}

function req(v: string | undefined, name: string): string {
  const s = (v ?? "").trim();
  if (!s) throw new Error(`Campo obligatorio vacío: ${name}`);
  return s;
}

function validateRow(raw: Record<string, string>, mode: "basic" | "enriched", rowNum: number): ParsedRow {
  const materia = req(raw.materia, "materia");
  const numTemaStr = req(raw.numero_tema, "numero_tema");
  const numero_tema = parseInt(numTemaStr, 10);
  if (!Number.isFinite(numero_tema) || numero_tema < 0) throw new Error("numero_tema debe ser numérico");
  const tema = req(raw.tema, "tema");
  const subapartado = (raw.subapartado ?? "").trim();
  const difRaw = req(raw.dificultad, "dificultad").toLowerCase();
  const dificultad = DIFICULTAD_MAP[difRaw];
  if (!dificultad) throw new Error(`dificultad inválida (${difRaw})`);
  const pregunta = req(raw.pregunta, "pregunta");
  const opcion_a = req(raw.opcion_a, "opcion_a");
  const opcion_b = req(raw.opcion_b, "opcion_b");
  const opcion_c = req(raw.opcion_c, "opcion_c");
  const opcion_d = req(raw.opcion_d, "opcion_d");
  const respRaw = req(raw.respuesta_correcta, "respuesta_correcta").toUpperCase();
  if (!["A","B","C","D"].includes(respRaw)) throw new Error(`respuesta_correcta inválida (${respRaw})`);
  const respuesta_correcta = respRaw as Respuesta;
  const explicacion = (raw.explicacion ?? "").trim();
  const referencia_fuente = (raw.referencia_fuente ?? "").trim();
  const codigo = mode === "enriched" ? (raw.codigo ?? "").trim() || null : null;
  const concepto = mode === "enriched" ? ((raw.concepto ?? "").trim() || null) : null;
  const objetivo_aprendizaje = mode === "enriched" ? ((raw.objetivo_aprendizaje ?? "").trim() || null) : null;
  return {
    rowNumber: rowNum, codigo, materia, numero_tema, tema, subapartado, dificultad,
    concepto, objetivo_aprendizaje, pregunta,
    opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, explicacion, referencia_fuente,
  };
}

export function generateCode(numeroTema: number, correlativo: number): string {
  const t = String(numeroTema).padStart(2, "0");
  const n = String(correlativo).padStart(3, "0");
  return `SMS-T${t}-${n}`;
}
