import Papa from "papaparse";

export type Dificultad = "facil" | "medio" | "dificil";
export type Respuesta = "A" | "B" | "C" | "D";
export type FormatMode = "basic" | "enriched" | "v2";

export const HEADERS_V1_BASIC = [
  "materia","numero_tema","tema","subapartado","dificultad","pregunta",
  "opcion_a","opcion_b","opcion_c","opcion_d","respuesta_correcta","explicacion","referencia_fuente",
] as const;

export const HEADERS_V1_ENRICHED = [
  "codigo","materia","numero_tema","tema","subapartado","dificultad","concepto","objetivo_aprendizaje",
  "pregunta","opcion_a","opcion_b","opcion_c","opcion_d","respuesta_correcta","explicacion","referencia_fuente",
] as const;

export const HEADERS_V2 = [
  "codigo","materia","numero_tema","tema","apartado","subapartado","concepto","objetivo_aprendizaje",
  "perspectiva","nivel_pedagogico","dificultad_conceptual","dificultad_examen","tipo_trampa",
  "pregunta","opcion_a","opcion_b","opcion_c","opcion_d","respuesta_correcta","explicacion",
  "documento_referencia","pagina_inicio","pagina_fin","referencia_fuente","frecuencia_historica",
] as const;

export const NIVEL_PEDAGOGICO_VALUES = ["aprendizaje","consolidacion","tribunal"] as const;
export const PERSPECTIVA_VALUES = [
  "reconocimiento_directo","definicion","clasificacion","requisitos","excepcion",
  "diferenciacion","comparacion","relacion_normativa","cronologia","orden_temporal",
  "plazo","competencia","efectos","consecuencia_juridica","caso_practico",
  "afirmacion_correcta","afirmacion_incorrecta","aplicacion","error_frecuente",
  "combinacion_requisitos","cambio_condicion",
] as const;
export const TIPO_TRAMPA_VALUES = [
  "ninguna","concepto_proximo","excepcion","plazo","competencia","requisito",
  "omision","inversion","negacion","absolutismo","efecto","orden_temporal",
  "cambio_condicion","combinada",
] as const;
export const FRECUENCIA_HISTORICA_VALUES = ["alta","media","baja","no_determinada"] as const;

export interface ParsedRow {
  rowNumber: number;
  codigo: string | null;
  materia: string;
  numero_tema: number;
  tema: string;
  apartado: string | null;
  subapartado: string;
  dificultad: Dificultad;                 // legacy / V1
  dificultad_conceptual: Dificultad | null;
  dificultad_examen: Dificultad | null;
  concepto: string | null;
  objetivo_aprendizaje: string | null;
  perspectiva: string | null;
  nivel_pedagogico: string | null;
  tipo_trampa: string | null;
  pregunta: string;
  opcion_a: string;
  opcion_b: string;
  opcion_c: string;
  opcion_d: string;
  respuesta_correcta: Respuesta;
  explicacion: string;
  documento_referencia: string | null;
  pagina_inicio: number | null;
  pagina_fin: number | null;
  referencia_fuente: string;
  frecuencia_historica: string | null;
}

export interface RowError {
  row: number;
  field?: string;
  reason: string;
}

export interface HeaderInfo {
  delimiter: string;
  columnCount: number;
  headers: string[];
}

export interface ParseFatal {
  fatal: string;
  header: HeaderInfo;
}

export interface ParseResult {
  mode: FormatMode;
  delimiter: string;
  headers: string[];
  valid: ParsedRow[];
  errors: RowError[];
}

const DIFICULTAD_V1_MAP: Record<string, Dificultad> = {
  facil: "facil", "fácil": "facil",
  medio: "medio", media: "medio",
  dificil: "dificil", "difícil": "dificil",
};

function stripBom(h: string): string {
  return h.replace(/^\uFEFF/, "");
}

function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function detectMode(fields: string[]): FormatMode | null {
  if (arraysEqual(fields, HEADERS_V1_BASIC)) return "basic";
  if (arraysEqual(fields, HEADERS_V1_ENRICHED)) return "enriched";
  if (arraysEqual(fields, HEADERS_V2)) return "v2";
  return null;
}

function acceptedFormatsHint(): string {
  return "Formatos admitidos: V1 básico (13 columnas), V1 enriquecido (16), V2 (25). Se requiere coincidencia exacta de nombres.";
}

export function parseCsv(text: string): ParseResult | ParseFatal {
  // Strict header comparison: only BOM is stripped from the first header cell.
  // No case-folding, no trimming, no diacritic normalization.
  const detect = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    delimitersToGuess: [";", ","],
    transformHeader: (h, i) => (i === 0 ? stripBom(h) : h),
  });

  const delimiter = detect.meta.delimiter || ";";
  const rawFields = detect.meta.fields ?? [];
  const fields = rawFields.map((h, i) => (i === 0 ? stripBom(h) : h));
  const headerInfo: HeaderInfo = { delimiter, columnCount: fields.length, headers: fields };

  const mode = detectMode(fields);
  if (!mode) {
    return {
      fatal: `Cabeceras no reconocidas. ${acceptedFormatsHint()}`,
      header: headerInfo,
    };
  }


  const valid: ParsedRow[] = [];
  const errors: RowError[] = [];

  // Papa parse errors → surface
  for (const err of detect.errors ?? []) {
    // row is 0-based data row; +2 for header + 1-based
    const r = typeof err.row === "number" ? err.row + 2 : 0;
    errors.push({ row: r, reason: `${err.type}: ${err.message}` });
  }

  const expectedCols = fields.length;
  const codeCounts = new Map<string, number[]>();
  const enunciadoCounts = new Map<string, number[]>();

  detect.data.forEach((raw, idx) => {
    const rowNum = idx + 2;
    // Column count check: Papa collates trailing empties; verify all headers present
    const receivedKeys = Object.keys(raw);
    if (receivedKeys.length !== expectedCols) {
      errors.push({ row: rowNum, reason: `Número de columnas inesperado (${receivedKeys.length} vs ${expectedCols})` });
      return;
    }
    try {
      const parsed = validateRow(raw, mode, rowNum);
      valid.push(parsed);
      if (parsed.codigo) {
        const arr = codeCounts.get(parsed.codigo) ?? [];
        arr.push(rowNum);
        codeCounts.set(parsed.codigo, arr);
      }
      const enKey = normalizeEnunciado(parsed.pregunta);
      const arr2 = enunciadoCounts.get(enKey) ?? [];
      arr2.push(rowNum);
      enunciadoCounts.set(enKey, arr2);
    } catch (e) {
      const err = e as RowError;
      errors.push(err);
    }
  });

  for (const [codigo, rows] of codeCounts) {
    if (rows.length > 1) {
      errors.push({ row: rows[0], field: "codigo", reason: `Código duplicado dentro del CSV (${codigo}) en filas ${rows.join(", ")}` });
    }
  }
  for (const [_, rows] of enunciadoCounts) {
    if (rows.length > 1) {
      errors.push({ row: rows[0], field: "pregunta", reason: `Enunciado duplicado dentro del CSV en filas ${rows.join(", ")}` });
    }
  }

  return { mode, delimiter, headers: fields, valid, errors };
}

function normalizeEnunciado(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function req(v: string | undefined, name: string, rowNum: number): string {
  const s = (v ?? "").trim();
  if (!s) {
    const err: RowError = { row: rowNum, field: name, reason: `Campo obligatorio vacío: ${name}` };
    throw err;
  }
  return s;
}

function parseIntStrict(v: string | undefined, name: string, rowNum: number): number | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  if (!/^-?\d+$/.test(s)) {
    const err: RowError = { row: rowNum, field: name, reason: `${name} debe ser entero o vacío (recibido "${s}")` };
    throw err;
  }
  return parseInt(s, 10);
}

function validateRow(raw: Record<string, string>, mode: FormatMode, rowNum: number): ParsedRow {
  const materia = req(raw.materia, "materia", rowNum);
  const numTemaStr = req(raw.numero_tema, "numero_tema", rowNum);
  const numero_tema = parseInt(numTemaStr, 10);
  if (!Number.isFinite(numero_tema) || numero_tema < 0) {
    const err: RowError = { row: rowNum, field: "numero_tema", reason: "numero_tema debe ser numérico" };
    throw err;
  }
  const tema = req(raw.tema, "tema", rowNum);
  const subapartado = (raw.subapartado ?? "").trim();
  const pregunta = req(raw.pregunta, "pregunta", rowNum);
  const opcion_a = req(raw.opcion_a, "opcion_a", rowNum);
  const opcion_b = req(raw.opcion_b, "opcion_b", rowNum);
  const opcion_c = req(raw.opcion_c, "opcion_c", rowNum);
  const opcion_d = req(raw.opcion_d, "opcion_d", rowNum);

  // Options must be distinct (after trim + casefold)
  const opts = [opcion_a, opcion_b, opcion_c, opcion_d].map((s) => s.trim().toLowerCase());
  const seen = new Set<string>();
  for (const o of opts) {
    if (seen.has(o)) {
      const err: RowError = { row: rowNum, field: "opciones", reason: "Las cuatro opciones deben ser distintas" };
      throw err;
    }
    seen.add(o);
  }

  const respRaw = req(raw.respuesta_correcta, "respuesta_correcta", rowNum).toUpperCase();
  if (!["A","B","C","D"].includes(respRaw)) {
    const err: RowError = { row: rowNum, field: "respuesta_correcta", reason: `respuesta_correcta inválida (${respRaw})` };
    throw err;
  }
  const respuesta_correcta = respRaw as Respuesta;
  const explicacion = (raw.explicacion ?? "").trim();
  const referencia_fuente = (raw.referencia_fuente ?? "").trim();

  let codigo: string | null = null;
  let concepto: string | null = null;
  let objetivo_aprendizaje: string | null = null;
  let apartado: string | null = null;
  let perspectiva: string | null = null;
  let nivel_pedagogico: string | null = null;
  let tipo_trampa: string | null = null;
  let documento_referencia: string | null = null;
  let pagina_inicio: number | null = null;
  let pagina_fin: number | null = null;
  let frecuencia_historica: string | null = null;
  let dificultad_conceptual: Dificultad | null = null;
  let dificultad_examen: Dificultad | null = null;
  let dificultad: Dificultad;

  if (mode === "basic") {
    const difRaw = req(raw.dificultad, "dificultad", rowNum).toLowerCase();
    const d = DIFICULTAD_V1_MAP[difRaw];
    if (!d) {
      const err: RowError = { row: rowNum, field: "dificultad", reason: `dificultad inválida (${difRaw})` };
      throw err;
    }
    dificultad = d;
  } else if (mode === "enriched") {
    codigo = req(raw.codigo, "codigo", rowNum);
    concepto = (raw.concepto ?? "").trim() || null;
    objetivo_aprendizaje = (raw.objetivo_aprendizaje ?? "").trim() || null;
    const difRaw = req(raw.dificultad, "dificultad", rowNum).toLowerCase();
    const d = DIFICULTAD_V1_MAP[difRaw];
    if (!d) {
      const err: RowError = { row: rowNum, field: "dificultad", reason: `dificultad inválida (${difRaw})` };
      throw err;
    }
    dificultad = d;
  } else {
    // v2
    codigo = req(raw.codigo, "codigo", rowNum);
    concepto = (raw.concepto ?? "").trim() || null;
    objetivo_aprendizaje = (raw.objetivo_aprendizaje ?? "").trim() || null;
    apartado = (raw.apartado ?? "").trim() || null;

    const persRaw = (raw.perspectiva ?? "").trim();
    if (persRaw && !(PERSPECTIVA_VALUES as readonly string[]).includes(persRaw)) {
      const err: RowError = { row: rowNum, field: "perspectiva", reason: `perspectiva inválida (${persRaw})` };
      throw err;
    }
    perspectiva = persRaw || null;

    const nivRaw = (raw.nivel_pedagogico ?? "").trim();
    if (nivRaw && !(NIVEL_PEDAGOGICO_VALUES as readonly string[]).includes(nivRaw)) {
      const err: RowError = { row: rowNum, field: "nivel_pedagogico", reason: `nivel_pedagogico inválido (${nivRaw})` };
      throw err;
    }
    nivel_pedagogico = nivRaw || null;

    const tramRaw = (raw.tipo_trampa ?? "").trim();
    if (tramRaw && !(TIPO_TRAMPA_VALUES as readonly string[]).includes(tramRaw)) {
      const err: RowError = { row: rowNum, field: "tipo_trampa", reason: `tipo_trampa inválido (${tramRaw})` };
      throw err;
    }
    tipo_trampa = tramRaw || null;

    const dcRaw = req(raw.dificultad_conceptual, "dificultad_conceptual", rowNum).toLowerCase();
    const dc = DIFICULTAD_V1_MAP[dcRaw];
    if (!dc) {
      const err: RowError = { row: rowNum, field: "dificultad_conceptual", reason: `dificultad_conceptual inválida (${dcRaw})` };
      throw err;
    }
    dificultad_conceptual = dc;

    const deRaw = req(raw.dificultad_examen, "dificultad_examen", rowNum).toLowerCase();
    const de = DIFICULTAD_V1_MAP[deRaw];
    if (!de) {
      const err: RowError = { row: rowNum, field: "dificultad_examen", reason: `dificultad_examen inválida (${deRaw})` };
      throw err;
    }
    dificultad_examen = de;
    dificultad = de; // legacy = examen

    documento_referencia = (raw.documento_referencia ?? "").trim() || null;
    pagina_inicio = parseIntStrict(raw.pagina_inicio, "pagina_inicio", rowNum);
    pagina_fin = parseIntStrict(raw.pagina_fin, "pagina_fin", rowNum);
    if (pagina_inicio !== null && pagina_fin !== null && pagina_fin < pagina_inicio) {
      const err: RowError = { row: rowNum, field: "pagina_fin", reason: "pagina_fin no puede ser menor que pagina_inicio" };
      throw err;
    }

    const frecRaw = (raw.frecuencia_historica ?? "").trim();
    if (frecRaw && !(FRECUENCIA_HISTORICA_VALUES as readonly string[]).includes(frecRaw)) {
      const err: RowError = { row: rowNum, field: "frecuencia_historica", reason: `frecuencia_historica inválida (${frecRaw})` };
      throw err;
    }
    frecuencia_historica = frecRaw || null;
  }

  return {
    rowNumber: rowNum, codigo, materia, numero_tema, tema, apartado, subapartado,
    dificultad, dificultad_conceptual, dificultad_examen,
    concepto, objetivo_aprendizaje, perspectiva, nivel_pedagogico, tipo_trampa,
    pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta,
    explicacion, documento_referencia, pagina_inicio, pagina_fin,
    referencia_fuente, frecuencia_historica,
  };
}

export function generateCode(numeroTema: number, correlativo: number): string {
  const t = String(numeroTema).padStart(2, "0");
  const n = String(correlativo).padStart(3, "0");
  return `SMS-T${t}-${n}`;
}
