import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Flag, Loader2, LogOut } from "lucide-react";
import type { Respuesta } from "@/lib/csv-parser";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/test/$id")({
  component: TestPage,
});

function TestPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [current, setCurrent] = useState(0);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["test", id],
    queryFn: async () => {
      const { data: test, error: e1 } = await supabase
        .from("tests")
        .select("*")
        .eq("id", id)
        .single();
      if (e1) throw e1;
      const { data: answers, error: e2 } = await supabase
        .from("test_answers")
        .select("*, questions!test_answers_question_id_fkey(*)")
        .eq("test_id", id)
        .order("orden");
      if (e2) throw e2;
      return { test, answers: answers ?? [] };
    },
  });

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (data && !data.test.completado) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [data]);

  const total = data?.answers.length ?? 0;
  const answered = useMemo(
    () => data?.answers.filter((a) => a.respuesta_usuario !== null).length ?? 0,
    [data],
  );
  const doubts = useMemo(() => data?.answers.filter((a) => a.marked_doubt).length ?? 0, [data]);
  const remaining = total - answered;

  if (isLoading)
    return (
      <div className="flex items-center justify-center pt-20">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
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
    const { error } = await supabase
      .from("test_answers")
      .update({ respuesta_usuario: opt })
      .eq("id", item.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.setQueryData<typeof data>(["test", id], (prev) => {
      if (!prev) return prev;
      const answers = [...prev.answers];
      answers[current] = { ...answers[current], respuesta_usuario: opt };
      return { ...prev, answers };
    });
  }

  async function toggleDoubt() {
    const markedDoubt = !item.marked_doubt;
    const { error } = await supabase
      .from("test_answers")
      .update({ marked_doubt: markedDoubt })
      .eq("id", item.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.setQueryData<typeof data>(["test", id], (prev) => {
      if (!prev) return prev;
      const answers = [...prev.answers];
      answers[current] = { ...answers[current], marked_doubt: markedDoubt };
      return { ...prev, answers };
    });
  }

  async function finish() {
    if (finishing) return;
    setFinishing(true);
    try {
      const { error } = await supabase.rpc("complete_test", { p_test_id: id });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
      navigate({ to: "/resultados/$id", params: { id }, replace: true });
    } catch (e) {
      toast.error((e as Error).message);
      setFinishing(false);
    }
  }

  function revisarRespuestas() {
    setConfirmFinish(false);
    const idx = data!.answers.findIndex((a) => a.respuesta_usuario === null);
    const doubtIdx = data!.answers.findIndex((a) => a.marked_doubt);
    setCurrent(idx >= 0 ? idx : doubtIdx >= 0 ? doubtIdx : 0);
  }

  function handleNext() {
    if (current < total - 1) setCurrent((c) => c + 1);
    else setConfirmFinish(true);
  }

  const options: Array<[Respuesta, string]> = [
    ["A", question.opcion_a],
    ["B", question.opcion_b],
    ["C", question.opcion_c],
    ["D", question.opcion_d],
  ];

  return (
    <div className="space-y-3 pb-20">
      <header className="sticky top-0 z-20 -mx-4 -mt-4 border-b border-border/60 bg-background/90 px-4 pb-3 pt-4 backdrop-blur-xl">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-foreground">{current + 1}</span>
            <span className="font-medium text-muted-foreground">de {total}</span>
          </div>
          <button
            type="button"
            onClick={() => setConfirmExit(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LogOut className="h-3.5 w-3.5" /> Salir
          </button>
        </div>
        <div className="mt-1.5 flex items-center gap-3">
          <Progress value={((current + 1) / total) * 100} className="h-1.5 flex-1" />
          <span
            className="shrink-0 text-[11px] font-medium text-muted-foreground"
            aria-live="polite"
          >
            {remaining === 0 ? "Todo respondido" : `${remaining} pendientes`}
          </span>
        </div>
      </header>

      <Card className="border-primary/15 bg-gradient-to-br from-card to-primary/5 p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            Pregunta
          </span>
          <button
            type="button"
            onClick={toggleDoubt}
            aria-pressed={item.marked_doubt}
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              item.marked_doubt
                ? "border-warning/40 bg-warning/15 text-warning-foreground"
                : "border-border bg-background/80 text-muted-foreground hover:bg-muted"
            }`}
          >
            <Flag className={`h-3.5 w-3.5 ${item.marked_doubt ? "fill-current" : ""}`} />
            {item.marked_doubt ? "Con duda" : "Marcar duda"}
          </button>
        </div>
        <h1 className="text-[1.05rem] font-semibold leading-relaxed tracking-[-0.01em]">
          {question.pregunta}
        </h1>
      </Card>

      <div className="space-y-2" role="radiogroup" aria-label="Opciones de respuesta">
        {options.map(([letter, text]) => {
          const active = item.respuesta_usuario === letter;
          return (
            <button
              key={letter}
              type="button"
              onClick={() => selectOption(letter)}
              role="radio"
              aria-checked={active}
              className={`min-h-14 w-full rounded-2xl border px-3 py-2.5 text-left shadow-[0_8px_24px_-22px_oklch(0.28_0.08_250/0.5)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active
                  ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                  : "border-border/90 bg-card/90 hover:border-primary/30 hover:bg-accent/30"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl text-sm font-bold transition-colors ${active ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-foreground"}`}
                >
                  {letter}
                </span>
                <span className="flex-1 text-[0.94rem] leading-relaxed">{text}</span>
              </div>
            </button>
          );
        })}
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/90 shadow-[0_-12px_32px_-24px_oklch(0.28_0.08_250/0.55)] backdrop-blur-xl">
        <div className="safe-bottom mx-auto grid max-w-md grid-cols-[0.8fr_1.2fr] gap-2 px-4 py-3">
          <Button
            variant="outline"
            className="h-12 bg-card/90"
            disabled={current === 0}
            onClick={() => setCurrent((c) => c - 1)}
          >
            <ArrowLeft className="h-4 w-4" /> Anterior
          </Button>
          <Button className="h-12" onClick={handleNext}>
            {current === total - 1 ? "Finalizar" : "Siguiente"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </footer>

      <AlertDialog open={confirmFinish} onOpenChange={setConfirmFinish}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar test</AlertDialogTitle>
            <AlertDialogDescription>
              Has llegado al final del test. ¿Quieres finalizar y corregir?
              {remaining > 0 ? ` Te quedan ${remaining} sin responder.` : ""}
              {doubts > 0
                ? ` Has marcado ${doubts} ${doubts === 1 ? "pregunta" : "preguntas"} como duda.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={revisarRespuestas}>Revisar respuestas</AlertDialogCancel>
            <AlertDialogAction onClick={finish} disabled={finishing}>
              {finishing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Finalizar y corregir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmExit} onOpenChange={setConfirmExit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Salir del test?</AlertDialogTitle>
            <AlertDialogDescription>
              El test no se corregirá y las respuestas dadas no afectarán a tus fallos activos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar test</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => navigate({ to: "/inicio", replace: true })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Salir del test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
