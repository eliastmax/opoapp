import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, CircleAlert, Clock3, HelpCircle, Target, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { testsFirstStateTotals, type TestsFirstProgressRow } from "@/lib/tests-first-progress";

const ROLLING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type CompletedTest = {
  id: string;
  aciertos: number;
  fallos: number;
  fecha_finalizacion: string | null;
};

type PeriodAnswer = {
  respuesta_usuario: string | null;
  correcta: boolean | null;
  marked_doubt: boolean;
};

export function WeeklyTestsFirstRecap({ oppositionId }: { oppositionId: string }) {
  const navigate = useNavigate();
  const recap = useQuery({
    queryKey: ["tests-first-weekly-recap", oppositionId],
    queryFn: async () => {
      const userResult = await supabase.auth.getUser();
      if (userResult.error || !userResult.data.user) {
        throw userResult.error ?? new Error("Sesión no válida");
      }
      const userId = userResult.data.user.id;
      const since = new Date(Date.now() - ROLLING_WINDOW_MS).toISOString();

      const testsResult = await supabase
        .from("tests")
        .select("id, aciertos, fallos, fecha_finalizacion")
        .eq("user_id", userId)
        .eq("opposition_id", oppositionId)
        .eq("completado", true)
        .gte("fecha_finalizacion", since)
        .order("fecha_finalizacion", { ascending: false });
      if (testsResult.error) throw testsResult.error;
      const tests = (testsResult.data ?? []) as CompletedTest[];
      const testIds = tests.map((test) => test.id);

      let answers: PeriodAnswer[] = [];
      if (testIds.length > 0) {
        const answersResult = await supabase
          .from("test_answers")
          .select("respuesta_usuario, correcta, marked_doubt")
          .eq("user_id", userId)
          .in("test_id", testIds);
        if (answersResult.error) throw answersResult.error;
        answers = (answersResult.data ?? []) as PeriodAnswer[];
      }

      const progressResult = await supabase.rpc("get_my_tests_first_concept_progress");
      if (progressResult.error) throw progressResult.error;
      const progress = (progressResult.data ?? []) as TestsFirstProgressRow[];
      const states = testsFirstStateTotals(progress);
      const answered = answers.filter((answer) => answer.respuesta_usuario !== null).length;
      const correct = tests.reduce((sum, test) => sum + test.aciertos, 0);
      const wrong = tests.reduce((sum, test) => sum + test.fallos, 0);
      const doubts = answers.filter((answer) => answer.marked_doubt).length;
      const accuracyDenominator = correct + wrong;

      return {
        completedTests: tests.length,
        answered,
        correct,
        wrong,
        doubts,
        accuracy: accuracyDenominator > 0 ? Math.round((correct / accuracyDenominator) * 100) : null,
        currentStates: states,
        attention: progress.filter((row) => row.attention_required).length,
        evaluatedConcepts: progress.filter((row) => row.learner_state !== "not_evaluated").length,
      };
    },
    staleTime: 30_000,
  });

  if (recap.isLoading) return <WeeklyRecapSkeleton />;
  if (recap.isError || !recap.data) return null;
  const data = recap.data;
  const hasPeriodActivity = data.completedTests > 0;

  return (
    <Card className="overflow-hidden border-border/70 bg-card/80 p-4 shadow-sm" data-testid="weekly-tests-first-recap">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" /> Últimos 7 días
          </p>
          <h2 className="mt-1 text-base font-bold">Tu actividad reciente</h2>
        </div>
        {data.accuracy !== null ? <span className="rounded-full bg-primary/8 px-2.5 py-1 text-xs font-bold text-primary">{data.accuracy}% acierto</span> : null}
      </div>

      {hasPeriodActivity ? (
        <div className="mt-4 grid grid-cols-2 gap-2 min-[390px]:grid-cols-4">
          <Metric icon={Target} value={data.completedTests} label="Tests" />
          <Metric icon={CheckCircle2} value={data.correct} label="Aciertos" />
          <Metric icon={XCircle} value={data.wrong} label="Fallos" />
          <Metric icon={HelpCircle} value={data.doubts} label="Dudas" />
        </div>
      ) : (
        <div className="mt-4 rounded-2xl bg-muted/45 p-3.5">
          <p className="text-sm font-semibold">Aún no hay tests completados en este periodo</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Cuando completes un test, aquí verás actividad real de los últimos siete días.</p>
        </div>
      )}

      {hasPeriodActivity ? <p className="mt-2 text-xs text-muted-foreground">{data.answered} preguntas respondidas/corregidas en tests completados.</p> : null}

      <div className="mt-4 border-t border-border/70 pt-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-muted-foreground">Estado actual</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <StatePill label="Dominado" value={data.currentStates.mastered} />
          <StatePill label="Consolidando" value={data.currentStates.consolidating} />
          <StatePill label="Por reforzar" value={data.currentStates.needs_reinforcement} alert={data.currentStates.needs_reinforcement > 0} />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {data.attention > 0
            ? `${data.attention} conceptos requieren atención ahora. Este dato describe tu estado actual, no un cambio durante el periodo.`
            : data.evaluatedConcepts > 0
              ? "No hay conceptos marcados para atención inmediata en tu estado actual."
              : "Todavía falta evidencia de tests para clasificar tus conceptos."}
        </p>
      </div>

      <button
        type="button"
        onClick={() => navigate({ to: data.attention > 0 ? "/progreso" : "/crear" })}
        className="mt-3 flex min-h-10 w-full items-center justify-between rounded-xl px-1 text-left text-sm font-semibold text-primary hover:underline"
      >
        <span>{data.attention > 0 ? "Ver puntos que requieren atención" : "Añadir evidencia con otro test"}</span>
        <ArrowRight className="h-4 w-4 shrink-0" />
      </button>
    </Card>
  );
}

function Metric({ icon: Icon, value, label }: { icon: typeof Target; value: number; label: string }) {
  return <div className="rounded-xl border border-border/65 bg-background/70 p-2.5"><Icon className="h-4 w-4 text-primary" /><p className="mt-1 text-lg font-bold leading-none">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{label}</p></div>;
}

function StatePill({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${alert ? "border-destructive/20 bg-destructive/5" : "border-border bg-muted/40"}`}>{alert ? <CircleAlert className="h-3 w-3 text-destructive" /> : null}<strong>{value}</strong> {label}</span>;
}

function WeeklyRecapSkeleton() {
  return <Card className="space-y-3 p-4" aria-label="Cargando resumen de los últimos 7 días"><Skeleton className="h-3 w-28" /><Skeleton className="h-5 w-40" /><div className="grid grid-cols-4 gap-2"><Skeleton className="h-16 rounded-xl" /><Skeleton className="h-16 rounded-xl" /><Skeleton className="h-16 rounded-xl" /><Skeleton className="h-16 rounded-xl" /></div></Card>;
}
