import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import { parseCsv, generateCode, type ParsedRow, type RowError, type FormatMode, type HeaderInfo } from "@/lib/csv-parser";
import { jaccard, normalizeText } from "@/lib/similarity";

export const Route = createFileRoute("/_authenticated/importar")({
  component: ImportarPage,
});

interface Conflict {
  row: ParsedRow;
  codigo: string;
  causa: string;
}

interface SimilarWarning {
  row: ParsedRow;
  matchCodigo: string;
  score: number;
}

interface Preview {
  mode: FormatMode;
  delimiter: string;
  headers: string[];
  rowsAll: ParsedRow[];
  errors: RowError[];
  nuevas: ParsedRow[];
  paraEnriquecer: ParsedRow[];
  sinCambios: ParsedRow[];
  conflictos: Conflict[];
  similares: SimilarWarning[];
  materias: string[];
  temas: string[];
}

interface ImportResult {
  inserted: number;
  enriched: number;
  omitted: number;
  conflictos: number;
  errores: number;
}


const DELIM_LABEL: Record<string, string> = { ";": "punto y coma (;)", ",": "coma (,)" };

type ExistingQuestion = {
  id: string; codigo: string; pregunta: string;
  opcion_a: string; opcion_b: string; opcion_c: string; opcion_d: string;
  respuesta_correcta: string; explicacion: string | null;
  concepto: string | null; objetivo_aprendizaje: string | null;
  apartado: string | null; perspectiva: string | null;
  nivel_pedagogico: string | null; tipo_trampa: string | null;
  dificultad_conceptual: string | null; dificultad_examen: string | null;
  documento_referencia: string | null; pagina_inicio: number | null;
  pagina_fin: number | null; frecuencia_historica: string | null;
  referencia_fuente: string | null;
};

function ImportarPage() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [fatalHeader, setFatalHeader] = useState<{ msg: string; header: HeaderInfo } | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function onFile(f: File) {
    setLoading(true); setResult(null); setPreview(null); setFatalHeader(null);
    try {
      const text = await f.text();
      const parsed = parseCsv(text);
      if ("fatal" in parsed) { setFatalHeader({ msg: parsed.fatal, header: parsed.header }); setLoading(false); return; }

      const { data: existing, error: existingError } = await supabase.from("questions")
        .select("id, codigo, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, explicacion, concepto, objetivo_aprendizaje, apartado, perspectiva, nivel_pedagogico, tipo_trampa, dificultad_conceptual, dificultad_examen, documento_referencia, pagina_inicio, pagina_fin, frecuencia_historica, referencia_fuente");
      if (existingError) throw existingError;
      const existingList = (existing ?? []) as ExistingQuestion[];
      const byCode = new Map(existingList.map((q) => [q.codigo, q]));
      const byEnunciado = new Map<string, ExistingQuestion>();
      for (const q of existingList) byEnunciado.set(normalizeText(q.pregunta), q);


      // Generate SMS codes for V1 basic rows before classification
      const codeSet = new Set(existingList.map((q) => q.codigo));
      const rowsWithCodes: ParsedRow[] = [];
      const usedByTema = new Map<number, number>();
      for (const [c] of byCode) {
        const m = c.match(/^SMS-T(\d+)-(\d+)$/);
        if (m) {
          const t = parseInt(m[1], 10);
          const n = parseInt(m[2], 10);
          usedByTema.set(t, Math.max(usedByTema.get(t) ?? 0, n));
        }
      }
      for (const r of parsed.valid) {
        if (r.codigo) { rowsWithCodes.push(r); continue; }
        // basic V1 → generate
        let n = (usedByTema.get(r.numero_tema) ?? 0) + 1;
        while (codeSet.has(generateCode(r.numero_tema, n))) n++;
        const code = generateCode(r.numero_tema, n);
        usedByTema.set(r.numero_tema, n);
        codeSet.add(code);
        rowsWithCodes.push({ ...r, codigo: code });
      }

      const nuevas: ParsedRow[] = [];
      const compatibles: ParsedRow[] = [];
      const conflictos: Conflict[] = [];
      const similares: SimilarWarning[] = [];

      for (const row of rowsWithCodes) {
        const code = row.codigo!;
        const existente = byCode.get(code);
        if (existente) {
          const match =
            existente.pregunta === row.pregunta &&
            existente.opcion_a === row.opcion_a &&
            existente.opcion_b === row.opcion_b &&
            existente.opcion_c === row.opcion_c &&
            existente.opcion_d === row.opcion_d &&
            existente.respuesta_correcta === row.respuesta_correcta &&
            (existente.explicacion ?? "") === (row.explicacion ?? "");
          if (match) compatibles.push(row);
          else conflictos.push({ row, codigo: code, causa: "Código existente con contenido diferente" });
          continue;
        }
        // Same enunciado under different code → conflict
        const other = byEnunciado.get(normalizeText(row.pregunta));
        if (other && other.codigo !== code) {
          conflictos.push({ row, codigo: code, causa: `Enunciado ya existe con otro código (${other.codigo})` });
          continue;
        }
        // Similarity warning (non-blocking)
        let bestSim: { codigo: string; score: number } | null = null;
        for (const q of existingList) {
          const s = jaccard(row.pregunta, q.pregunta);
          if (s > 0.85 && (!bestSim || s > bestSim.score)) bestSim = { codigo: q.codigo, score: s };
        }
        if (bestSim) similares.push({ row, matchCodigo: bestSim.codigo, score: bestSim.score });
        nuevas.push(row);
      }

      const materias = Array.from(new Set(parsed.valid.map((r) => r.materia)));
      const temas = Array.from(new Set(parsed.valid.map((r) => `${r.numero_tema}. ${r.tema.slice(0, 60)}`)));

      setPreview({
        mode: parsed.mode, delimiter: parsed.delimiter, headers: parsed.headers,
        rowsAll: rowsWithCodes, errors: parsed.errors,
        nuevas, compatibles, conflictos, similares, materias, temas,
      });
    } catch (e) {
      toast.error((e as Error).message);
    }
    setLoading(false);
  }

  function rowToPayload(row: ParsedRow): Record<string, unknown> {
    return {
      codigo: row.codigo,
      materia: row.materia,
      numero_tema: row.numero_tema,
      tema: row.tema,
      apartado: row.apartado,
      subapartado: row.subapartado,
      concepto: row.concepto,
      objetivo_aprendizaje: row.objetivo_aprendizaje,
      perspectiva: row.perspectiva,
      nivel_pedagogico: row.nivel_pedagogico,
      dificultad: row.dificultad,
      dificultad_conceptual: row.dificultad_conceptual,
      dificultad_examen: row.dificultad_examen,
      tipo_trampa: row.tipo_trampa,
      pregunta: row.pregunta,
      opcion_a: row.opcion_a,
      opcion_b: row.opcion_b,
      opcion_c: row.opcion_c,
      opcion_d: row.opcion_d,
      respuesta_correcta: row.respuesta_correcta,
      explicacion: row.explicacion,
      documento_referencia: row.documento_referencia,
      pagina_inicio: row.pagina_inicio,
      pagina_fin: row.pagina_fin,
      referencia_fuente: row.referencia_fuente,
      frecuencia_historica: row.frecuencia_historica,
    };
  }

  async function confirmImport() {
    if (!preview) return;
    if (preview.errors.length > 0) return;
    setImporting(true);
    try {
      const payload = [...preview.nuevas, ...preview.compatibles].map(rowToPayload);
      // Cast payload to Json for supabase-generated types (Record<string,unknown> is structurally Json-compatible).
      const { data, error } = await supabase.rpc("import_questions_batch", { payload: payload as unknown as never });
      if (error) throw error;
      const res = (data ?? {}) as { inserted?: number; enriched?: number; omitted?: number };
      setResult({
        inserted: res.inserted ?? 0,
        enriched: res.enriched ?? 0,
        omitted: res.omitted ?? 0,
        conflictos: preview.conflictos.length,
        errores: preview.errors.length,
      });
      setPreview(null);
      toast.success(`Importadas ${res.inserted ?? 0}, enriquecidas ${res.enriched ?? 0}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
    setImporting(false);
  }

  const canConfirm = !!preview && preview.errors.length === 0 && (preview.nuevas.length + preview.compatibles.length) > 0;

  return (
    <div className="space-y-4">
      <header className="pt-2">
        <h1 className="text-2xl font-bold">Importar CSV</h1>
        <p className="text-sm text-muted-foreground">Proyecto: <span className="font-medium">OpoTest Study</span></p>
      </header>

      <Card className="p-4">
        <label className="flex flex-col items-center gap-3 py-6 cursor-pointer">
          <Upload className="w-8 h-8 text-primary" />
          <span className="text-sm font-medium">Selecciona archivo CSV</span>
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
      </Card>

      {loading && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>}

      {fatalHeader && (
        <Card className="p-4 border-destructive">
          <div className="flex items-center gap-2 font-medium text-destructive mb-2">
            <AlertTriangle className="w-5 h-5" /> Cabecera no reconocida
          </div>
          <p className="text-sm mb-2">{fatalHeader.msg}</p>
          <ul className="text-xs space-y-1 text-muted-foreground">
            <li>Delimitador detectado: <span className="font-medium">{DELIM_LABEL[fatalHeader.header.delimiter] ?? fatalHeader.header.delimiter}</span></li>
            <li>Columnas: <span className="font-medium">{fatalHeader.header.columnCount}</span></li>
            <li>Formatos admitidos: V1 básico (13), V1 enriquecido (16), V2 (25)</li>
          </ul>
          <div className="mt-2 text-xs">
            <div className="font-medium mb-1">Cabeceras recibidas:</div>
            <ol className="list-decimal list-inside space-y-0.5 max-h-40 overflow-y-auto">
              {fatalHeader.header.headers.map((h, i) => <li key={i}>{h}</li>)}
            </ol>
          </div>
        </Card>
      )}

      {result && (
        <Card className="p-4 bg-success/10 border-success">
          <div className="flex items-center gap-2 font-medium"><CheckCircle2 className="w-5 h-5 text-success" /> Importación completa</div>
          <ul className="text-sm mt-2 space-y-1">
            <li>Insertadas: <span className="font-medium">{result.inserted}</span></li>
            <li>Enriquecidas: <span className="font-medium">{result.enriched}</span></li>
            <li>Omitidas: <span className="font-medium">{result.omitted}</span></li>
            <li>Conflictos: <span className="font-medium">{result.conflictos}</span></li>
            <li>Errores: <span className="font-medium">{result.errores}</span></li>
          </ul>
        </Card>
      )}

      {preview && (
        <>
          <Card className="p-4 space-y-2">
            <div className="text-xs uppercase text-muted-foreground font-medium">Vista previa</div>
            <ul className="text-sm space-y-1">
              <li>Proyecto objetivo: <span className="font-medium">OpoTest Study</span></li>
              <li>Formato: <span className="font-medium">{preview.mode === "basic" ? "V1 13" : preview.mode === "enriched" ? "V1 16" : "V2 25"}</span></li>
              <li>Delimitador: <span className="font-medium">{DELIM_LABEL[preview.delimiter] ?? preview.delimiter}</span></li>
              <li>Válidas: <span className="font-medium">{preview.rowsAll.length}</span></li>
              <li>Nuevas: <span className="font-medium text-success">{preview.nuevas.length}</span></li>
              <li>Compatibles (enriquecer): <span className="font-medium">{preview.compatibles.length}</span></li>
              <li>Conflictos: <span className="font-medium text-warning">{preview.conflictos.length}</span></li>
              <li>Errores: <span className="font-medium text-destructive">{preview.errors.length}</span></li>
            </ul>
            <div className="text-xs text-muted-foreground pt-2 border-t">
              <div>Materia(s): {preview.materias.join(" · ")}</div>
              <div>Tema(s): {preview.temas.join(" · ")}</div>
            </div>
          </Card>

          {preview.errors.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm font-medium mb-2"><AlertTriangle className="w-4 h-4 text-destructive" />Errores</div>
              <ul className="text-xs space-y-1 max-h-56 overflow-y-auto">
                {preview.errors.map((e, i) => (
                  <li key={i}>Fila {e.row}{e.field ? ` · ${e.field}` : ""}: {e.reason}</li>
                ))}
              </ul>
            </Card>
          )}

          {preview.conflictos.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm font-medium mb-2"><AlertTriangle className="w-4 h-4 text-warning" />Conflictos (se omiten)</div>
              <ul className="text-xs space-y-1 max-h-56 overflow-y-auto">
                {preview.conflictos.map((c, i) => (
                  <li key={i}>{c.codigo}: {c.causa} (fila {c.row.rowNumber})</li>
                ))}
              </ul>
            </Card>
          )}

          {preview.similares.length > 0 && (
            <Card className="p-4">
              <div className="text-sm font-medium mb-2">Advertencias de similitud</div>
              <ul className="text-xs space-y-1 max-h-40 overflow-y-auto text-muted-foreground">
                {preview.similares.slice(0, 20).map((s, i) => (
                  <li key={i}>Fila {s.row.rowNumber} parecida a {s.matchCodigo} ({Math.round(s.score * 100)}%)</li>
                ))}
              </ul>
            </Card>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-12" onClick={() => setPreview(null)}>Cancelar</Button>
            <Button className="flex-1 h-12" onClick={confirmImport} disabled={!canConfirm || importing}>
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar importación"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
