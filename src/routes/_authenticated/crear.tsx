import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Dificultad } from "@/lib/csv-parser";

export const Route = createFileRoute("/_authenticated/crear")({
  component: CrearPage,
});

type Modalidad = "mezcladas" | "nuevas" | "falladas";
const DIFICULTADES: Dificultad[] = ["facil", "medio", "dificil"];
const CANTIDADES = [5, 10, 20, 30, 50] as const;

function CrearPage() {
  const navigate = useNavigate();
  const [subjectId, setSubjectId] = useState<string>("");
  const [topicId, setTopicId] = useState<string>("");
  const [subtopicIds, setSubtopicIds] = useState<string[]>([]);
  const [difs, setDifs] = useState<Dificultad[]>([...DIFICULTADES]);
  const [cantidad, setCantidad] = useState<number>(10);
  const [modalidad, setModalidad] = useState<Modalidad>("mezcladas");
  const [starting, setStarting] = useState(false);

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("id, nombre").order("nombre")).data ?? [],
  });
  const { data: topics } = useQuery({
    queryKey: ["topics", subjectId],
    enabled: !!subjectId,
    queryFn: async () => (await supabase.from("topics").select("id, numero, nombre").eq("subject_id", subjectId).order("numero")).data ?? [],
  });
  const { data: subtopics } = useQuery({
    queryKey: ["subtopics", topicId],
    enabled: !!topicId,
    queryFn: async () => (await supabase.from("subtopics").select("id, nombre").eq("topic_id", topicId).order("nombre")).data ?? [],
  });

  const canStart = useMemo(() => subjectId && topicId && difs.length > 0, [subjectId, topicId, difs]);

  // Auto-select when only one option exists
  useEffect(() => {
    if (subjects && subjects.length === 1 && !subjectId) {
      setSubjectId(subjects[0].id);
      setTopicId("");
      setSubtopicIds([]);
    }
  }, [subjects, subjectId]);

  useEffect(() => {
    if (subjectId && topics && topics.length === 1 && !topicId) {
      setTopicId(topics[0].id);
      setSubtopicIds([]);
    }
  }, [subjectId, topics, topicId]);

  useEffect(() => {
    if (topicId && subtopics && subtopics.length === 1 && subtopicIds.length === 0) {
      setSubtopicIds([subtopics[0].id]);
    }
  }, [topicId, subtopics, subtopicIds.length]);

  const hideSubject = !!subjects && subjects.length === 1;
  const hideTopic = !!topics && topics.length === 1;
  const hideSubtopic = !!subtopics && subtopics.length <= 1;

  async function iniciar() {
    if (!canStart) return;
    setStarting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user!.id;

      // Query pool
      let q = supabase.from("questions").select("id").eq("activa", true).eq("topic_id", topicId).in("dificultad", difs);
      if (subtopicIds.length > 0) q = q.in("subtopic_id", subtopicIds);
      const { data: pool, error: e1 } = await q;
      if (e1) throw e1;
      let ids = (pool ?? []).map((p) => p.id);

      if (modalidad !== "mezcladas") {
        const { data: answered } = await supabase.from("test_answers").select("question_id, correcta");
        if (modalidad === "nuevas") {
          const seen = new Set((answered ?? []).map((a) => a.question_id));
          ids = ids.filter((id) => !seen.has(id));
        } else {
          const falladas = new Set((answered ?? []).filter((a) => a.correcta === false).map((a) => a.question_id));
          ids = ids.filter((id) => falladas.has(id));
        }
      }

      if (ids.length === 0) { toast.error("No hay preguntas con esos filtros"); setStarting(false); return; }
      if (ids.length < cantidad) toast.warning(`Solo hay ${ids.length} preguntas disponibles`);

      // shuffle
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      const chosen = ids.slice(0, Math.min(cantidad, ids.length));

      const { data: test, error: eTest } = await supabase.from("tests").insert({
        user_id: userId, tipo: modalidad, numero_preguntas: chosen.length, sin_responder: chosen.length,
      }).select().single();
      if (eTest) throw eTest;

      const answers = chosen.map((qid, i) => ({ user_id: userId, test_id: test.id, question_id: qid, orden: i + 1 }));
      const { error: eAns } = await supabase.from("test_answers").insert(answers);
      if (eAns) throw eAns;

      navigate({ to: "/test/$id", params: { id: test.id } });
    } catch (e) {
      toast.error((e as Error).message);
      setStarting(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="pt-2">
        <h1 className="text-2xl font-bold">Crear test</h1>
        <p className="text-sm text-muted-foreground">Configura tu test personalizado</p>
      </header>

      <Card className="p-4 space-y-4">
        {!hideSubject && (
          <div className="space-y-1.5">
            <Label>Materia</Label>
            <Select value={subjectId} onValueChange={(v) => { setSubjectId(v); setTopicId(""); setSubtopicIds([]); }}>
              <SelectTrigger className="h-12"><SelectValue placeholder="Selecciona materia" /></SelectTrigger>
              <SelectContent>
                {(subjects ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
            {subjects && subjects.length === 0 && <p className="text-xs text-muted-foreground">Aún no tienes materias. Importa un CSV primero.</p>}
          </div>
        )}

        {subjectId && !hideTopic && (
          <div className="space-y-1.5">
            <Label>Tema</Label>
            <Select value={topicId} onValueChange={(v) => { setTopicId(v); setSubtopicIds([]); }}>
              <SelectTrigger className="h-12"><SelectValue placeholder="Selecciona tema" /></SelectTrigger>
              <SelectContent>
                {(topics ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.numero}. {t.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {topicId && subtopics && subtopics.length > 0 && !hideSubtopic && (
          <div className="space-y-1.5">
            <Label>Subapartados (opcional)</Label>
            <div className="space-y-2 rounded-md border p-3">
              {subtopics.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={subtopicIds.includes(s.id)}
                    onCheckedChange={(c) => setSubtopicIds((prev) => c ? [...prev, s.id] : prev.filter((x) => x !== s.id))}
                  />
                  {s.nombre}
                </label>
              ))}
            </div>
          </div>
        )}


        <div className="space-y-1.5">
          <Label>Dificultad</Label>
          <div className="flex gap-2">
            {DIFICULTADES.map((d) => {
              const active = difs.includes(d);
              return (
                <button
                  type="button"
                  key={d}
                  onClick={() => setDifs((prev) => active ? prev.filter((x) => x !== d) : [...prev, d])}
                  className={`flex-1 h-11 rounded-md border text-sm font-medium capitalize ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}
                >{d}</button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Nº de preguntas</Label>
          <div className="grid grid-cols-5 gap-2">
            {CANTIDADES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCantidad(n)}
                className={`h-11 rounded-md border text-sm font-semibold ${cantidad === n ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}
              >{n}</button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Modalidad</Label>
          <Select value={modalidad} onValueChange={(v) => setModalidad(v as Modalidad)}>
            <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mezcladas">Mezcladas</SelectItem>
              <SelectItem value="nuevas">Nunca realizadas</SelectItem>
              <SelectItem value="falladas">Falladas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-xs uppercase text-muted-foreground font-medium mb-2">Resumen</div>
        <ul className="text-sm space-y-1">
          <li>Materia: <span className="font-medium">{subjects?.find((s) => s.id === subjectId)?.nombre ?? "—"}</span></li>
          <li>Tema: <span className="font-medium">{topics?.find((t) => t.id === topicId)?.nombre ?? "—"}</span></li>
          <li>Subapartados: <span className="font-medium">{subtopicIds.length === 0 ? "Todos" : subtopicIds.length}</span></li>
          <li>Dificultad: <span className="font-medium capitalize">{difs.join(", ") || "—"}</span></li>
          <li>Preguntas: <span className="font-medium">{cantidad}</span></li>
          <li>Modalidad: <span className="font-medium capitalize">{modalidad}</span></li>
        </ul>
      </Card>

      <Button onClick={iniciar} disabled={!canStart || starting} className="w-full h-14 text-base font-semibold">
        {starting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Iniciar test"}
      </Button>
    </div>
  );
}
