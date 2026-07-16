import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/resultados/$id")({
  component: ResultadosPage,
});

type AnswerRow = {
  id: string;
  respuesta_usuario: string | null;
  correcta: boolean | null;
  orden: number;
  question_id: string;
  questions: {
    dificultad: string;
    pregunta: string;
    opcion_a: string;
    opcion_b: string;
    opcion_c: string;
    opcion_d: string;
    respuesta_correcta: string;
    explicacion: string | null;
    referencia_fuente: string | null;
    concepto: string | null;
    objetivo_aprendizaje: string | null;
    topics: { nombre: string } | null;
    subtopics: { nombre: string } | null;
  } | null;
};

function ResultadosPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const reviewRef = useRef<HTMLDivElement | null>(null);
  const [tab, setTab] = useState<"fallos" | "todas">("fallos");

  const { data, isLoading } = useQuery({
    queryKey: ["resultados", id],
    queryFn: async () => {
      const { data: test } = await supabase.from("tests").select("*").eq("id", id).single();
      const { data: answers } = await supabase
        .from("test_answers")
        .select("*, questions!test_answers_question_id_fkey(*, topics!questions_topic_id_fkey(nombre), subtopics!questions_subtopic_id_fkey(nombre))")
        .eq("test_id", id)
        .order("orden");
      return { test, answers: (answers ?? []) as unknown as AnswerRow[] };
    },
  });

  if (isLoading) return <div className="flex items-center justify-center pt-20"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!data?.test) return <p className="p-4">Test no encontrado</p>;

  const t = data.test;
  const answers = data.answers;
  const falladas = answers.filter((a) => a.correcta === false);
  const perfecto = t.fallos === 0 && t.sin_responder === 0;

  const byDif: Record<string, { ok: number; tot: number }> = {};
  const byTopic: Record<string, { ok: number; tot: number }> = {};
  answers.forEach((a) => {
    const q = a.questions;
    if (!q) return;
    byDif[q.dificultad] ??= { ok: 0, tot: 0 };
    byDif[q.dificultad].tot++;
    if (a.correcta) byDif[q.dificultad].ok++;
    const topicName = q.topics?.nombre ?? "—";
    byTopic[topicName] ??= { ok: 0, tot: 0 };
    byTopic[topicName].tot++;
    if (a.correcta) byTopic[topicName].ok++;
  });

  async function repetirFalladas() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user!.id;
    const qids = falladas.map((f) => f.question_id);
    if (qids.length === 0) { toast.error("No hay falladas"); return; }
    const { data: newTest, error } = await supabase.from("tests").insert({
      user_id: userId, tipo: "falladas", numero_preguntas: qids.length, sin_responder: qids.length,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    const rows = qids.map((qid, i) => ({ user_id: userId, test_id: newTest.id, question_id: qid, orden: i + 1 }));
    await supabase.from("test_answers").insert(rows);
    navigate({ to: "/test/$id", params: { id: newTest.id } });
  }

  function scrollToReview() {
    setTimeout(() => reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function goReview(target: "fallos" | "todas") {
    setTab(target);
    scrollToReview();
  }

  const renderAnswer = (a: AnswerRow) => {
    const q = a.questions;
    if (!q) return null;
    const estado = a.respuesta_usuario === null
      ? { label: "Sin responder", cls: "text-muted-foreground", Icon: MinusCircle }
      : a.correcta
        ? { label: "Correcta", cls: "text-success", Icon: CheckCircle2 }
        : { label: "Fallada", cls: "text-destructive", Icon: XCircle };
    const EstIcon = estado.Icon;
    return (
      <Card key={a.id} className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground capitalize">{q.dificultad}</div>
          <div className={`inline-flex items-center gap-1 text-xs font-medium ${estado.cls}`}>
            <EstIcon className="w-3.5 h-3.5" /> {estado.label}
          </div>
        </div>
        <p className="text-sm font-medium">{q.pregunta}</p>
        <div className="text-sm space-y-1">
          <div>Tu respuesta: <span className={`font-medium ${a.correcta ? "text-success" : a.respuesta_usuario === null ? "text-muted-foreground" : "text-destructive"}`}>{a.respuesta_usuario ?? "—"}</span></div>
          <div>Correcta: <span className="text-success font-medium">{q.respuesta_correcta}</span></div>
        </div>
        {q.explicacion && <p className="text-xs text-muted-foreground border-t pt-2">{q.explicacion}</p>}
        {q.referencia_fuente && <p className="text-xs text-muted-foreground">Fuente: {q.referencia_fuente}</p>}
        {q.concepto && <p className="text-xs text-muted-foreground">Concepto: {q.concepto}</p>}
        {q.objetivo_aprendizaje && <p className="text-xs text-muted-foreground">Objetivo: {q.objetivo_aprendizaje}</p>}
      </Card>
    );
  };

  const sinFallosDuros = t.fallos === 0;

  return (
    <div className="space-y-4">
      <header className="pt-2">
        <h1 className="text-2xl font-bold">{perfecto ? "Test completado" : "Resultados"}</h1>
        <p className="text-sm text-muted-foreground capitalize">{t.tipo}</p>
      </header>

      <Card className="p-4 text-center">
        <div className="text-5xl font-bold text-primary">{Number(t.porcentaje)}%</div>
        {sinFallosDuros ? (
          <div className="mt-3 space-y-1">
            <div className="text-sm">{t.aciertos} de {t.numero_preguntas} respuestas correctas</div>
            {t.sin_responder === 0
              ? <div className="text-sm font-medium text-success">Sin fallos</div>
              : <div className="text-sm text-muted-foreground">{t.sin_responder} sin responder</div>}
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
            <div><CheckCircle2 className="w-4 h-4 mx-auto text-success" /><div className="font-semibold">{t.aciertos}</div><div className="text-xs text-muted-foreground">Aciertos</div></div>
            <div><XCircle className="w-4 h-4 mx-auto text-destructive" /><div className="font-semibold">{t.fallos}</div><div className="text-xs text-muted-foreground">Fallos</div></div>
            <div><MinusCircle className="w-4 h-4 mx-auto text-muted-foreground" /><div className="font-semibold">{t.sin_responder}</div><div className="text-xs text-muted-foreground">Sin responder</div></div>
          </div>
        )}
      </Card>

      {sinFallosDuros ? (
        <div className="space-y-2">
          <Link to="/crear"><Button className="w-full h-12">Hacer otro test</Button></Link>
          <Button variant="outline" className="w-full h-12" onClick={() => goReview("todas")}>Revisar respuestas</Button>
          <Link to="/inicio"><Button variant="outline" className="w-full h-12">Volver al inicio</Button></Link>
          <Link to="/historial"><Button variant="ghost" className="w-full h-12">Ver historial</Button></Link>
        </div>
      ) : (
        <div className="space-y-2">
          <Button className="w-full h-12" onClick={repetirFalladas}>Repetir falladas</Button>
          <Button variant="outline" className="w-full h-12" onClick={() => goReview("fallos")}>Ver corrección</Button>
          <Button variant="outline" className="w-full h-12" onClick={() => goReview("todas")}>Revisar todas</Button>
          <Link to="/inicio"><Button variant="ghost" className="w-full h-12">Volver al inicio</Button></Link>
        </div>
      )}

      <Card className="p-4">
        <div className="text-xs uppercase text-muted-foreground font-medium mb-2">Por dificultad</div>
        <div className="space-y-1 text-sm">
          {Object.entries(byDif).map(([k, v]) => (
            <div key={k} className="flex justify-between"><span className="capitalize">{k}</span><span>{v.ok}/{v.tot}</span></div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-xs uppercase text-muted-foreground font-medium mb-2">Por tema</div>
        <div className="space-y-1 text-sm">
          {Object.entries(byTopic).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2"><span className="truncate">{k}</span><span className="flex-none">{v.ok}/{v.tot}</span></div>
          ))}
        </div>
      </Card>

      <div ref={reviewRef}>
        <h2 className="font-semibold mb-2">Revisión</h2>
        {sinFallosDuros ? (
          <div className="space-y-3">{answers.map(renderAnswer)}</div>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as "fallos" | "todas")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="fallos">Fallos ({falladas.length})</TabsTrigger>
              <TabsTrigger value="todas">Todas ({answers.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="fallos" className="space-y-3 mt-3">
              {falladas.map(renderAnswer)}
            </TabsContent>
            <TabsContent value="todas" className="space-y-3 mt-3">
              {answers.map(renderAnswer)}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
