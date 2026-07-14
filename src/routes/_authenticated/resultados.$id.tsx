import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/resultados/$id")({
  component: ResultadosPage,
});

function ResultadosPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["resultados", id],
    queryFn: async () => {
      const { data: test } = await supabase.from("tests").select("*").eq("id", id).single();
      const { data: answers } = await supabase
        .from("test_answers")
        .select("*, questions(*, topics(nombre), subtopics(nombre))")
        .eq("test_id", id)
        .order("orden");
      return { test, answers: answers ?? [] };
    },
  });

  if (isLoading) return <div className="flex items-center justify-center pt-20"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!data?.test) return <p className="p-4">Test no encontrado</p>;

  const t = data.test;
  const falladas = data.answers.filter((a) => a.correcta === false);

  const byDif: Record<string, { ok: number; tot: number }> = {};
  const byTopic: Record<string, { ok: number; tot: number }> = {};
  data.answers.forEach((a) => {
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

  return (
    <div className="space-y-4">
      <header className="pt-2">
        <h1 className="text-2xl font-bold">Resultados</h1>
        <p className="text-sm text-muted-foreground capitalize">{t.tipo}</p>
      </header>

      <Card className="p-4 text-center">
        <div className="text-5xl font-bold text-primary">{Number(t.porcentaje)}%</div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <div><CheckCircle2 className="w-4 h-4 mx-auto text-success" /><div className="font-semibold">{t.aciertos}</div><div className="text-xs text-muted-foreground">Aciertos</div></div>
          <div><XCircle className="w-4 h-4 mx-auto text-destructive" /><div className="font-semibold">{t.fallos}</div><div className="text-xs text-muted-foreground">Fallos</div></div>
          <div><MinusCircle className="w-4 h-4 mx-auto text-muted-foreground" /><div className="font-semibold">{t.sin_responder}</div><div className="text-xs text-muted-foreground">En blanco</div></div>
        </div>
      </Card>

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

      {falladas.length > 0 && (
        <>
          <Button onClick={repetirFalladas} className="w-full h-12">Repetir falladas ({falladas.length})</Button>
          <div>
            <h2 className="font-semibold mb-2">Revisión de falladas</h2>
            <div className="space-y-3">
              {falladas.map((a) => {
                const q = a.questions!;
                return (
                  <Card key={a.id} className="p-4 space-y-2">
                    <div className="text-xs text-muted-foreground">{q.codigo} · {q.dificultad}</div>
                    <p className="text-sm font-medium">{q.pregunta}</p>
                    <div className="text-sm space-y-1">
                      <div>Tu respuesta: <span className="text-destructive font-medium">{a.respuesta_usuario ?? "—"}</span></div>
                      <div>Correcta: <span className="text-success font-medium">{q.respuesta_correcta}</span></div>
                    </div>
                    {q.explicacion && <p className="text-xs text-muted-foreground border-t pt-2">{q.explicacion}</p>}
                    {q.referencia_fuente && <p className="text-xs text-muted-foreground">Fuente: {q.referencia_fuente}</p>}
                    {q.concepto && <p className="text-xs text-muted-foreground">Concepto: {q.concepto}</p>}
                    {q.objetivo_aprendizaje && <p className="text-xs text-muted-foreground">Objetivo: {q.objetivo_aprendizaje}</p>}
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      )}

      <Link to="/historial"><Button variant="outline" className="w-full h-12">Volver al historial</Button></Link>
    </div>
  );
}
