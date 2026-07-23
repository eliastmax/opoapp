import {
  parseCsv,
  type FormatMode,
  type HeaderInfo,
  type ParsedRow,
  type RowError,
} from "./csv-parser.ts";

export interface CsvTextFile {
  name: string;
  text: string;
}

export interface SourcedRow extends ParsedRow {
  sourceFile: string;
}

export interface BatchRowError extends RowError {
  sourceFile: string;
}

export interface CsvFileSummary {
  name: string;
  mode: FormatMode | null;
  delimiter: string;
  headers: string[];
  validRows: number;
  errors: number;
  fatal: string | null;
  header: HeaderInfo;
}

export interface CsvBatchAnalysis {
  files: CsvFileSummary[];
  rows: SourcedRow[];
  errors: BatchRowError[];
}

function normalizeQuestion(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function analyzeCsvBatch(inputs: CsvTextFile[]): CsvBatchAnalysis {
  const files: CsvFileSummary[] = [];
  const rows: SourcedRow[] = [];
  const errors: BatchRowError[] = [];

  for (const input of inputs) {
    const parsed = parseCsv(input.text);
    if ("fatal" in parsed) {
      files.push({
        name: input.name,
        mode: null,
        delimiter: parsed.header.delimiter,
        headers: parsed.header.headers,
        validRows: 0,
        errors: 1,
        fatal: parsed.fatal,
        header: parsed.header,
      });
      errors.push({ sourceFile: input.name, row: 1, reason: parsed.fatal });
      continue;
    }

    const sourcedRows = parsed.valid.map((row) => ({ ...row, sourceFile: input.name }));
    rows.push(...sourcedRows);
    errors.push(...parsed.errors.map((error) => ({ ...error, sourceFile: input.name })));
    files.push({
      name: input.name,
      mode: parsed.mode,
      delimiter: parsed.delimiter,
      headers: parsed.headers,
      validRows: parsed.valid.length,
      errors: parsed.errors.length,
      fatal: null,
      header: {
        delimiter: parsed.delimiter,
        columnCount: parsed.headers.length,
        headers: parsed.headers,
      },
    });
  }

  const codeOccurrences = new Map<string, SourcedRow[]>();
  const questionOccurrences = new Map<string, SourcedRow[]>();
  for (const row of rows) {
    if (row.codigo) {
      const matches = codeOccurrences.get(row.codigo) ?? [];
      matches.push(row);
      codeOccurrences.set(row.codigo, matches);
    }
    const key = normalizeQuestion(row.pregunta);
    const matches = questionOccurrences.get(key) ?? [];
    matches.push(row);
    questionOccurrences.set(key, matches);
  }

  for (const [code, matches] of codeOccurrences) {
    const sourceFiles = new Set(matches.map((row) => row.sourceFile));
    if (matches.length > 1 && sourceFiles.size > 1) {
      const locations = matches
        .map((row) => `${row.sourceFile}, fila ${row.rowNumber}`)
        .join(" · ");
      errors.push({
        sourceFile: matches[0].sourceFile,
        row: matches[0].rowNumber,
        field: "codigo",
        reason: `Código duplicado entre archivos (${code}): ${locations}`,
      });
      for (const sourceFile of sourceFiles) {
        const summary = files.find((file) => file.name === sourceFile);
        if (summary) summary.errors += 1;
      }
    }
  }

  for (const matches of questionOccurrences.values()) {
    const sourceFiles = new Set(matches.map((row) => row.sourceFile));
    if (matches.length > 1 && sourceFiles.size > 1) {
      const locations = matches
        .map((row) => `${row.sourceFile}, fila ${row.rowNumber}`)
        .join(" · ");
      errors.push({
        sourceFile: matches[0].sourceFile,
        row: matches[0].rowNumber,
        field: "pregunta",
        reason: `Enunciado duplicado entre archivos: ${locations}`,
      });
      for (const sourceFile of sourceFiles) {
        const summary = files.find((file) => file.name === sourceFile);
        if (summary) summary.errors += 1;
      }
    }
  }

  return { files, rows, errors };
}
