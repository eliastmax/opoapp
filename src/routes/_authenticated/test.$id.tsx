import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Respuesta } from "@/lib/csv-parser";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/test/$id")({
  component: TestPage,
});

function TestPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [current, setCurrent] = useState(0);
  const [confirmFinish, setConfirmFinish] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["test", id],
    queryFn: async () => {
      const { data: test, error: e1 } = await supabase.from("tests").select("*").eq("id", id).single();
      if (e1) throw e1;
      const { data: answers, error: e2 } = await supabase
        .from("test_answers")
        .select("*, questions(*)")
        .eq("test_id", id)
        .order("orden");
      if (e2) throw e2;
      return { test, answers: answers ?? [] };
    },
  });

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (data && !data.test.completado) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [data]);

  const total = data?.answers.length ?? 0;
  const answered = useMemo(() => (data?.answers.filter((a) => a.respuesta_usuario !== null).length ?? 0), [data]);

  if (isLoading) return <div className="flex items-center justify-center pt-20"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (error) return <p className="text-destructive p-4">{(error as Error).message}</p>;
  if (!data) return null;

  if (data.test.completado) {
    navigate({ to: "/resultados/$id", params: { id }, replace: true });
    return null;
  }

  const item = data.answers[current];
  const question = item.questions;
  if (!question) return null;

  async function selectOption(opt: Respuesta) {
    const { error } = await supabase.from("test_answers").update({ respuesta_usuario: opt }).eq("id", item.id);
    if (error) { toast.error(error.message); return; }
    qc.setQueryData<typeof data>(["test", id], (prev) => {
      if (!prev) return prev;
      const answers = [...prev.answers];
      answers[current] = { ...answers[current], respuesta_usuario: opt };
      return { ...prev, answers };
    });
  }

  async function finish() {
    let aciertos = 0, fallos = 0, sin = 0;
    const updates = data!.answers.map(async (a) => {
      const q = a.questions;
      if (!q) return;
      if (!a.respuesta_usuario) { sin++; return; }
      const correcta = a.respuesta_usuario === q.respuesta_correcta;
      if (correcta) aciertos++; else fallos++;
      await supabase.from("test_answers").update({ correcta }).eq("id", a.id);
    });
    await Promise.all(updates);
    const pct = data!.answers.length > 0 ? (aciertos / data!.answers.length) * 100 : 0;
    const { error } = await supabase.from("tests").update({
      completado: true,
      fecha_finalizacion: new Date().toISOString(),
      aciertos, fallos, sin_responder: sin, porcentaje: Number(pct.toFixed(2)),
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    navigate({ to: "/resultados/$id", params: { id }, replace: true });
  }

  const options: Array<[Respuesta, string]> = [
    ["A", question.opcion_a], ["B", question.opcion_b], ["C", question.opcion_c], ["D", question.opcion_d],
  ];

  return (
    <div className="space-y-4">
      <div className="pt-1">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
          <span>Pregunta {current + 1} de {total}</span>
          <span>{answered}/{total} contestadas</span>
        </div>
        <Progress value={((current + 1) / total) * 100} />
      </div>

      <Card className="p-4">
        <div className="text-xs text-muted-foreground mb-1">{question.codigo} · {question.dificultad}</div>
        <p className="text-base font-medium leading-relaxed">{question.pregunta}</p>
      </Card>

      <div className="space-y-2">
        {options.map(([letter, text]) => {
          const active = item.respuesta_usuario === letter;
          return (
            <button
              key={letter}
              onClick={() => selectOption(letter)}
              className={`w-full text-left p-3 rounded-lg border transition-colors min-h-14 ${active ? "border-primary bg-primary/10" : "bg-card"}`}
            >
              <div className="flex gap-3">
                <span className={`flex-none w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${active ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{letter}</span>
                <span className="flex-1 text-sm leading-relaxed pt-1">{text}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 h-12" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>Anterior</Button>
        {current < total - 1 ? (
          <Button className="flex-1 h-12" onClick={() => setCurrent((c) => c + 1)}>Siguiente</Button>
        ) : (
          <Button className="flex-1 h-12" onClick={() => setConfirmFinish(true)}>Finalizar</Button>
        )}
      </div>

      <AlertDialog open={confirmFinish} onOpenChange={setConfirmFinish}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar test</AlertDialogTitle>
            <AlertDialogDescription>
              {answered < total ? `Tienes ${total - answered} preguntas sin responder. ` : ""}
              ¿Seguro que quieres corregir y finalizar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={finish}>Finalizar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
