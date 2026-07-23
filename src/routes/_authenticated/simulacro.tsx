import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Clock3, FileCheck2, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { SIMULATION_DURATIONS, SIMULATION_QUESTION_COUNTS } from "@/lib/exam-simulation";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/simulacro")({
  component: SimulacroPage,
});

function SimulacroPage() {
  const navigate = useNavigate();
  const [questionCount, setQuestionCount] = useState<number>(50);
  const [duration, setDuration] = useState<number>(60);
  const [confirmStart, setConfirmStart] = useState(false);
  const [starting, setStarting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["simulation-availability"],
    queryFn: async () => {
      const [questions, topics] = await Promise.all([
        supabase.from("questions").select("id", { count: "exact", head: true }).eq("activa", true),
        supabase.from("topics").select("id", { count: "exact", head: true }),
      ]);
      if (questions.error) throw questions.error;
      if (topics.error) throw topics.error;
      return {
        questions: questions.count ?? 0,
        topics: topics.count ?? 0,
      };
    },
  });

  async function startSimulation() {
    if (starting) return;
    setStarting(true);
    try {
      const { data: rows, error } = await supabase.rpc("create_exam_simulation", {
        p_question_count: questionCount,
        p_duration_minutes: duration,
      });
      if (error) throw error;
      const simulation = rows?.[0];
      if (!simulation) throw new Error("No se pudo preparar el simulacro");

      if (simulation.selected_count < questionCount) {
        toast.warning(`El banco solo permite usar ${simulation.selected_count} preguntas`);
      }
      navigate({ to: "/test/$id", params: { id: simulation.test_id } });
    } catch (error) {
      toast.error((error as Error).message);
      setStarting(false);
      setConfirmStart(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="pt-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Condiciones de examen
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Simulacro</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Una medición neutral y con tiempo de todo el temario que tienes disponible.
        </p>
      </header>

      <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/10 via-card to-card p-0">
        <div className="flex items-start gap-3 p-4">
          <span className="rounded-xl bg-primary p-2.5 text-primary-foreground">
            <FileCheck2 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-bold">Cobertura actual</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLoading
                ? "Comprobando el banco…"
                : `${data?.topics ?? 0} temas · ${data?.questions ?? 0} preguntas disponibles`}
            </p>
          </div>
        </div>
        <div className="border-t border-border/70 bg-background/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          El resultado representa únicamente los temas que ya tienes cargados. Será un simulacro
          completo cuando el banco incluya todo el programa.
        </div>
      </Card>

      <Card className="space-y-4 bg-card/90 p-4">
        <div>
          <div className="text-sm font-bold">Número de preguntas</div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            El motor las distribuirá proporcionalmente entre los temas.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {SIMULATION_QUESTION_COUNTS.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => setQuestionCount(count)}
              className={`h-12 rounded-xl border text-sm font-bold transition-colors ${
                questionCount === count
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted"
              }`}
            >
              {count}
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-4 bg-card/90 p-4">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-primary/10 p-2 text-primary">
            <Clock3 className="h-5 w-5" />
          </span>
          <div>
            <div className="text-sm font-bold">Tiempo disponible</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              El reloj comienza al entrar y continúa aunque cierres la app.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {SIMULATION_DURATIONS.map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => setDuration(minutes)}
              className={`h-11 rounded-xl border text-sm font-bold transition-colors ${
                duration === minutes
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted"
              }`}
            >
              {minutes}
            </button>
          ))}
        </div>
        <p className="text-center text-[11px] text-muted-foreground">minutos</p>
      </Card>

      <Card className="flex items-start gap-3 bg-card/90 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        <div className="text-xs leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Selección neutral:</strong> no se adaptará a tus
          fallos ni te mostrará explicaciones hasta terminar. Los contenidos frecuentes tendrán más
          presencia, sin excluir el resto.
        </div>
      </Card>

      <Button
        type="button"
        className="h-13 w-full text-base"
        disabled={isLoading || (data?.questions ?? 0) < 5}
        onClick={() => setConfirmStart(true)}
      >
        Empezar simulacro
      </Button>

      <AlertDialog open={confirmStart} onOpenChange={setConfirmStart}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Preparado para empezar?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-left">
              <span className="block">
                Tendrás {duration} minutos para responder {questionCount} preguntas.
              </span>
              <span className="block">
                Si sales, podrás volver, pero el cronómetro no se detendrá. Al agotarse se corregirá
                lo que hayas respondido.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={starting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={starting}
              onClick={(event) => {
                event.preventDefault();
                void startSimulation();
              }}
            >
              {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Comenzar ahora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
