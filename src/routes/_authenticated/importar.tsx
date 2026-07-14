import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import { parseCsv, generateCode, type ParsedRow, type RowError } from "@/lib/csv-parser";
import { jaccard, normalizeText } from "@/lib/similarity";

export const Route = createFileRoute("/_authenticated/importar")({
  component: ImportarPage,
});

interface Preview {
  mode: "basic" | "enriched";
  valid: ParsedRow[];
  errors: RowError[];
  dupCodigo: ParsedRow[];
  dupExacto: ParsedRow[];
  similar: Array<{ row: ParsedRow; matchCodigo: string; score: number }>;
  fresh: ParsedRow[];
}

function ImportarPage() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSimilar, setImportSimilar] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);

  async function onFile(f: File) {
    setLoading(true);
    setResult(null);
    try {
      const text = await f.text();
      const parsed = parseCsv(text);
      if ("fatal" in parsed) { toast.error(parsed.fatal); setLoading(false); return; }

      const { data: existing } = await supabase.from("questions")
        .select("id, codigo, pregunta, topic_id, subtopic_id, topics(nombre, numero, subjects(nombre)), subtopics(nombre)");
      const codeSet = new Set((existing ?? []).map((q) => q.codigo));
      const existingList = existing ?? [];

      const dupCodigo: ParsedRow[] = [];
      const dupExacto: ParsedRow[] = [];
      const similar: Array<{ row: ParsedRow; matchCodigo: string; score: number }> = [];
      const fresh: ParsedRow[] = [];

      for (const row of parsed.valid) {
        if (row.codigo && codeSet.has(row.codigo)) { dupCodigo.push(row); continue; }
        // Same tema+subapartado matches
        const normP = normalizeText(row.pregunta);
        const sameCtx = existingList.filter((e) => {
          const topicName = e.topics?.nombre ?? "";
          const topicNum = e.topics?.numero;
          const sub = e.subtopics?.nombre ?? "";
          return topicName === row.tema && topicNum === row.numero_tema && sub === row.subapartado;
        });
        let exacto = false;
        let bestSim: { codigo: string; score: number } | null = null;
        for (const e of sameCtx) {
          const nE = normalizeText(e.pregunta);
          if (nE === normP) { exacto = true; break; }
          const s = jaccard(row.pregunta, e.pregunta);
          if (s > 0.85 && (!bestSim || s > bestSim.score)) bestSim = { codigo: e.codigo, score: s };
        }
        if (exacto) { dupExacto.push(row); continue; }
        if (bestSim) { similar.push({ row, matchCodigo: bestSim.codigo, score: bestSim.score }); continue; }
        fresh.push(row);
      }

      setPreview({ mode: parsed.mode, valid: parsed.valid, errors: parsed.errors, dupCodigo, dupExacto, similar, fresh });
    } catch (e) {
      toast.error((e as Error).message);
    }
    setLoading(false);
  }

  async function confirmImport() {
    if (!preview) return;
    setImporting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user!.id;

      const toInsert = importSimilar
        ? [...preview.fresh, ...preview.similar.map((s) => s.row)]
        : preview.fresh;

      // Ensure subjects/topics/subtopics exist
      const subjectMap = new Map<string, string>();
      const topicMap = new Map<string, string>();
      const subtopicMap = new Map<string, string>();

      async function getSubject(nombre: string): Promise<string> {
        if (subjectMap.has(nombre)) return subjectMap.get(nombre)!;
        const { data: found } = await supabase.from("subjects").select("id").eq("nombre", nombre).maybeSingle();
        if (found) { subjectMap.set(nombre, found.id); return found.id; }
        const { data: created, error } = await supabase.from("subjects").insert({ user_id: userId, nombre }).select("id").single();
        if (error) throw error;
        subjectMap.set(nombre, created.id);
        return created.id;
      }
      async function getTopic(subjectId: string, numero: number, nombre: string): Promise<string> {
        const key = `${subjectId}|${numero}`;
        if (topicMap.has(key)) return topicMap.get(key)!;
        const { data: found } = await supabase.from("topics").select("id").eq("subject_id", subjectId).eq("numero", numero).maybeSingle();
        if (found) { topicMap.set(key, found.id); return found.id; }
        const { data: created, error } = await supabase.from("topics").insert({ user_id: userId, subject_id: subjectId, numero, nombre }).select("id").single();
        if (error) throw error;
        topicMap.set(key, created.id);
        return created.id;
      }
      async function getSubtopic(topicId: string, nombre: string): Promise<string | null> {
        if (!nombre) return null;
        const key = `${topicId}|${nombre}`;
        if (subtopicMap.has(key)) return subtopicMap.get(key)!;
        const { data: found } = await supabase.from("subtopics").select("id").eq("topic_id", topicId).eq("nombre", nombre).maybeSingle();
        if (found) { subtopicMap.set(key, found.id); return found.id; }
        const { data: created, error } = await supabase.from("subtopics").insert({ user_id: userId, topic_id: topicId, nombre }).select("id").single();
        if (error) throw error;
        subtopicMap.set(key, created.id);
        return created.id;
      }

      // Get existing codes to compute correlativos
      const { data: existingCodes } = await supabase.from("questions").select("codigo");
      const codeSet = new Set((existingCodes ?? []).map((r) => r.codigo));

      let inserted = 0;
      for (const row of toInsert) {
        let codigo = row.codigo;
        if (!codigo) {
          // Generate SMS-TXX-NNN, incrementing until unique
          let corr = 1;
          const pref = `SMS-T${String(row.numero_tema).padStart(2, "0")}-`;
          const usedForTema = [...codeSet].filter((c) => c.startsWith(pref)).map((c) => parseInt(c.slice(pref.length), 10)).filter(Number.isFinite);
          corr = usedForTema.length > 0 ? Math.max(...usedForTema) + 1 : 1;
          while (codeSet.has(generateCode(row.numero_tema, corr))) corr++;
          codigo = generateCode(row.numero_tema, corr);
        }
        if (codeSet.has(codigo)) continue; // safeguard
        const subjectId = await getSubject(row.materia);
        const topicId = await getTopic(subjectId, row.numero_tema, row.tema);
        const subtopicId = await getSubtopic(topicId, row.subapartado);
        const { error } = await supabase.from("questions").insert({
          user_id: userId, codigo, subject_id: subjectId, topic_id: topicId, subtopic_id: subtopicId,
          dificultad: row.dificultad, concepto: row.concepto, objetivo_aprendizaje: row.objetivo_aprendizaje,
          pregunta: row.pregunta, opcion_a: row.opcion_a, opcion_b: row.opcion_b, opcion_c: row.opcion_c, opcion_d: row.opcion_d,
          respuesta_correcta: row.respuesta_correcta, explicacion: row.explicacion, referencia_fuente: row.referencia_fuente,
        });
        if (error) { console.error(error); continue; }
        codeSet.add(codigo);
        inserted++;
      }
      setResult({ inserted, skipped: toInsert.length - inserted });
      setPreview(null);
      toast.success(`Importadas ${inserted} preguntas`);
    } catch (e) {
      toast.error((e as Error).message);
    }
    setImporting(false);
  }

  return (
    <div className="space-y-4">
      <header className="pt-2">
        <h1 className="text-2xl font-bold">Importar CSV</h1>
        <p className="text-sm text-muted-foreground">Sube un archivo CSV UTF-8 con separador ;</p>
      </header>

      <Card className="p-4">
        <label className="flex flex-col items-center gap-3 py-6 cursor-pointer">
          <Upload className="w-8 h-8 text-primary" />
          <span className="text-sm font-medium">Selecciona archivo CSV</span>
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
      </Card>

      {loading && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>}

      {result && (
        <Card className="p-4 bg-success/10 border-success">
          <div className="flex items-center gap-2 font-medium"><CheckCircle2 className="w-5 h-5 text-success" /> Importación completa</div>
          <p className="text-sm mt-1">Añadidas {result.inserted}, omitidas {result.skipped}.</p>
        </Card>
      )}

      {preview && (
        <>
          <Card className="p-4 space-y-2">
            <div className="text-xs uppercase text-muted-foreground font-medium">Vista previa ({preview.mode === "basic" ? "13 col." : "16 col."})</div>
            <ul className="text-sm space-y-1">
              <li><span className="font-medium text-success">{preview.fresh.length}</span> nuevas</li>
              <li><span className="font-medium text-warning">{preview.similar.length}</span> similares (misma tema/subapartado)</li>
              <li><span className="font-medium text-muted-foreground">{preview.dupCodigo.length}</span> duplicadas por código</li>
              <li><span className="font-medium text-muted-foreground">{preview.dupExacto.length}</span> duplicadas por enunciado exacto</li>
              <li><span className="font-medium text-destructive">{preview.errors.length}</span> con errores</li>
            </ul>
          </Card>

          {preview.errors.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm font-medium mb-2"><AlertTriangle className="w-4 h-4 text-destructive" />Errores</div>
              <ul className="text-xs space-y-1 max-h-48 overflow-y-auto">
                {preview.errors.map((e) => <li key={e.row}>Fila {e.row}: {e.reason}</li>)}
              </ul>
            </Card>
          )}

          {preview.similar.length > 0 && (
            <Card className="p-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={importSimilar} onChange={(e) => setImportSimilar(e.target.checked)} />
                Importar también las {preview.similar.length} similares
              </label>
              <ul className="text-xs mt-2 space-y-1 max-h-40 overflow-y-auto text-muted-foreground">
                {preview.similar.slice(0, 20).map((s, i) => <li key={i}>Fila {s.row.rowNumber}: parecida a {s.matchCodigo} ({Math.round(s.score * 100)}%)</li>)}
              </ul>
            </Card>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-12" onClick={() => setPreview(null)}>Cancelar</Button>
            <Button className="flex-1 h-12" onClick={confirmImport} disabled={importing}>
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar importación"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
