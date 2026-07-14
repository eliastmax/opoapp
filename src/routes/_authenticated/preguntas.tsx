import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import type { Dificultad } from "@/lib/csv-parser";

export const Route = createFileRoute("/_authenticated/preguntas")({
  component: PreguntasPage,
});

type QuestionRow = {
  id: string; codigo: string; pregunta: string; dificultad: Dificultad; activa: boolean;
  concepto: string | null; objetivo_aprendizaje: string | null;
  opcion_a: string; opcion_b: string; opcion_c: string; opcion_d: string;
  respuesta_correcta: "A"|"B"|"C"|"D"; explicacion: string; referencia_fuente: string;
  subject_id: string; topic_id: string; subtopic_id: string | null;
};

function PreguntasPage() {
  const [search, setSearch] = useState("");
  const [dif, setDif] = useState<string>("all");
  const [editing, setEditing] = useState<QuestionRow | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["questions-admin", search, dif],
    queryFn: async () => {
      let q = supabase.from("questions").select("*").order("codigo").limit(200);
      if (dif !== "all") q = q.eq("dificultad", dif as Dificultad);
      if (search.trim()) q = q.or(`codigo.ilike.%${search}%,pregunta.ilike.%${search}%`);
      const { data } = await q;
      return (data ?? []) as QuestionRow[];
    },
  });

  async function toggleActiva(row: QuestionRow) {
    const { error } = await supabase.from("questions").update({ activa: !row.activa }).eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["questions-admin"] });
  }

  async function saveEdit() {
    if (!editing) return;
    const { id, codigo: _c, subject_id: _s, topic_id: _t, subtopic_id: _st, ...rest } = editing;
    void _c; void _s; void _t; void _st;
    const { error } = await supabase.from("questions").update(rest).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Guardado");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["questions-admin"] });
  }

  return (
    <div className="space-y-4">
      <header className="pt-2">
        <h1 className="text-2xl font-bold">Preguntas</h1>
        <p className="text-sm text-muted-foreground">Administra tu banco de preguntas</p>
      </header>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3.5 text-muted-foreground" />
          <Input placeholder="Buscar código o texto" className="pl-9 h-11" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={dif} onValueChange={setDif}>
          <SelectTrigger className="w-32 h-11"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="facil">Fácil</SelectItem>
            <SelectItem value="medio">Medio</SelectItem>
            <SelectItem value="dificil">Difícil</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (data ?? []).length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No hay preguntas</Card>
      ) : (
        <div className="space-y-2">
          {data!.map((q) => (
            <Card key={q.id} className="p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground">{q.codigo} · {q.dificultad}</div>
                  <p className="text-sm mt-0.5 line-clamp-2">{q.pregunta}</p>
                </div>
                <Switch checked={q.activa} onCheckedChange={() => toggleActiva(q)} />
              </div>
              <button onClick={() => setEditing(q)} className="text-xs text-primary font-medium mt-2">Editar</button>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar pregunta</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">Código: {editing.codigo} (no editable)</div>
              <div><Label>Pregunta</Label><Textarea value={editing.pregunta} onChange={(e) => setEditing({ ...editing, pregunta: e.target.value })} /></div>
              {(["a","b","c","d"] as const).map((k) => (
                <div key={k}><Label>Opción {k.toUpperCase()}</Label><Input value={editing[`opcion_${k}` as const]} onChange={(e) => setEditing({ ...editing, [`opcion_${k}`]: e.target.value })} /></div>
              ))}
              <div>
                <Label>Respuesta correcta</Label>
                <Select value={editing.respuesta_correcta} onValueChange={(v) => setEditing({ ...editing, respuesta_correcta: v as "A"|"B"|"C"|"D" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["A","B","C","D"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Dificultad</Label>
                <Select value={editing.dificultad} onValueChange={(v) => setEditing({ ...editing, dificultad: v as Dificultad })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(["facil","medio","dificil"] as const).map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Explicación</Label><Textarea value={editing.explicacion} onChange={(e) => setEditing({ ...editing, explicacion: e.target.value })} /></div>
              <div><Label>Fuente</Label><Input value={editing.referencia_fuente} onChange={(e) => setEditing({ ...editing, referencia_fuente: e.target.value })} /></div>
              <div><Label>Concepto</Label><Input value={editing.concepto ?? ""} onChange={(e) => setEditing({ ...editing, concepto: e.target.value || null })} /></div>
              <div><Label>Objetivo aprendizaje</Label><Input value={editing.objetivo_aprendizaje ?? ""} onChange={(e) => setEditing({ ...editing, objetivo_aprendizaje: e.target.value || null })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveEdit}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
