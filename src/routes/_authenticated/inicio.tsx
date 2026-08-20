import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock3,
  Loader2,
  Play,
  Route as RouteIcon,
  Sparkles,
} from "lucide-react";
import { ActiveOppositionContext } from "@/components/active-opposition-context";
import { WeeklyRoadmap } from "@/components/weekly-roadmap";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { dailySessionPlanFromTodayPlan } from "@/lib/v4-daily-session";
import { composeV4TodayPlan, type V4TodayContextRow } from "@/lib/v4-today-plan";
import { BLOCK_COPY, formatDueDate, localDate, type V4DailySession } from "@/lib/v4-experience";
import { displayName } from "@/lib/user-greeting";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inicio")({ component: InicioPage });
const TIME_OPTIONS = [15, 25, 40] as const;

function InicioPage() {
  const navigate = useNavigate();
  const today = localDate();
  const [availableMinutes, setAvailableMinutes] = useState<number>(25);
  const [starting, setStarting] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["today-experience", today],
    queryFn: async () => {
      const userResult = await supabase.auth.getUser();
      if (userResult.error || !userResult.data.user)
        throw userResult.error ?? new Error("Sesión no válida");
      const user = userResult.data.user;
      const [profile, context, session, unfinished] = await Promise.all([
        supabase.from("profiles").select("nombre").eq("id", user.id).maybeSingle(),
        supabase.rpc("prepare_my_v4_today_context"),
        supabase.rpc("get_my_v4_daily_session", { p_local_date: today }),
        supabase
          .from("tests")
          .select("id, numero_preguntas")
          .eq("user_id", user.id)
          .eq("completado", false)
          .order("fecha_inicio", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (context.error) throw context.error;
      if (session.error) throw session.error;
      if (unfinished.error) throw unfinished.error;
      const answerResult = unfinished.data
        ? await supabase
            .from("test_answers")
            .select("respuesta_usuario")
            .eq("test_id", unfinished.data.id)
        : { data: [], error: null };
      if (answerResult.error) throw answerResult.error;
      const answers = answerResult.data ?? [];
      return {
        userName: displayName({
          profileName: profile.data?.nombre,
          metadataName: user.user_metadata?.nombre,
          email: user.email,
        }),
        rows: (context.data ?? []) as V4TodayContextRow[],
        session: session.data as V4DailySession | null,
        unfinished: unfinished.data
          ? {
              id: unfinished.data.id,
              total: unfinished.data.numero_preguntas,
              answered: answers.filter((answer) => answer.respuesta_usuario !== null).length,
            }
          : null,
      };
    },
  });
  const plan = useMemo(
    () => composeV4TodayPlan({ availableMinutes, today, rows: data?.rows ?? [] }),
    [availableMinutes, data?.rows, today],
  );
  const primaryBlock = plan.blocks[0];

  async function startToday() {
    if (data?.session) return void navigate({ to: "/sesion" });
    if (plan.status !== "ready") return;
    setStarting(true);
    try {
      const input = dailySessionPlanFromTodayPlan({ localDate: today, plan });
      const result = await supabase.rpc("create_or_replace_my_v4_daily_session", {
        p_local_date: input.localDate,
        p_available_minutes: input.availableMinutes,
        p_blocks: input.blocks,
      });
      if (result.error) throw result.error;
      navigate({ to: "/sesion" });
    } catch (caught) {
      toast.error((caught as Error).message);
      setStarting(false);
    }
  }

  const completed =
    data?.session?.blocks.filter((block) => block.status === "completed").length ?? 0;
  return (
    <div className="space-y-5">
      <header className="pt-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Hoy</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {isLoading ? "Preparando tu sesión…" : `Hola, ${data?.userName ?? ""}`}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tu siguiente paso, sin tener que decidirlo.
        </p>
        <ActiveOppositionContext />
      </header>

      {isLoading ? (
        <TodaySkeleton />
      ) : error ? (
        <Card className="border-destructive/20 p-5 text-center">
          <p className="font-semibold">No hemos podido preparar Hoy</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tu progreso está intacto. Inténtalo de nuevo.
          </p>
          <Button className="mt-4 w-full" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </Card>
      ) : data?.session ? (
        <PrimaryCard
          icon={Play}
          eyebrow={data.session.status === "active" ? "Sesión en curso" : "Sesión terminada"}
          title={
            data.session.status === "active"
              ? "Continúa donde lo dejaste"
              : "Revisa el cierre de hoy"
          }
          description={`${completed} de ${data.session.blocks.length} bloques completados · ${data.session.plannedMinutes} min`}
          action={data.session.status === "active" ? "Continuar sesión" : "Ver debrief"}
          onAction={() => navigate({ to: "/sesion" })}
        />
      ) : data?.unfinished ? (
        <Card className="overflow-hidden border-primary/20 bg-card p-5 shadow-[0_20px_46px_-30px_oklch(0.3_0.12_250/0.75)]">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <Play className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                Primero, termina lo empezado
              </p>
              <h2 className="mt-1 text-lg font-bold">Continúa tu test</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.unfinished.answered} de {data.unfinished.total} respondidas
              </p>
            </div>
          </div>
          <Button
            className="mt-4 h-12 w-full"
            onClick={() =>
              navigate({
                to: "/test/$id",
                params: { id: data.unfinished!.id },
                search: { block: undefined, session: undefined },
              })
            }
          >
            Continuar test <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Card>
      ) : plan.status === "ready" && primaryBlock ? (
        <PrimaryCard
          icon={Sparkles}
          eyebrow="Toca ahora"
          title={`${BLOCK_COPY[primaryBlock.kind].action}: ${primaryBlock.studyUnitTitle}`}
          description={primaryBlock.reason}
          meta={
            <>
              <span>
                <Clock3 className="h-3.5 w-3.5" /> {plan.plannedMinutes} min
              </span>
              <span>
                <RouteIcon className="h-3.5 w-3.5" /> {plan.blocks.length}{" "}
                {plan.blocks.length === 1 ? "bloque" : "bloques"}
              </span>
            </>
          }
          action="Comenzar sesión"
          loading={starting}
          onAction={startToday}
        />
      ) : (
        <Card className="p-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-success/10 text-success">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <h2 className="mt-3 text-lg font-bold">No hay nada urgente ahora</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {plan.status === "no_content"
              ? "Todavía no hay contenido V4 disponible para esta oposición. Puedes seguir practicando con tus tests."
              : plan.nextDueOn
                ? `El próximo repaso está previsto para el ${formatDueDate(plan.nextDueOn)}.`
                : "OpoTest volverá a ordenar tu trabajo cuando aparezca nueva evidencia."}
          </p>
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link to="/crear">Practicar por mi cuenta</Link>
          </Button>
        </Card>
      )}

      {!data?.session && !data?.unfinished && plan.status === "ready" && (
        <section aria-labelledby="time-heading">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 id="time-heading" className="text-sm font-bold">
              Tiempo disponible
            </h2>
            <span className="text-right text-xs text-muted-foreground">
              Ajusta antes de empezar
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {TIME_OPTIONS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => setAvailableMinutes(minutes)}
                aria-pressed={availableMinutes === minutes}
                className={cn(
                  "h-11 rounded-xl border text-sm font-bold transition-colors",
                  availableMinutes === minutes
                    ? "border-primary bg-primary/10 text-primary"
                    : "bg-card text-muted-foreground hover:border-primary/40",
                )}
              >
                {minutes} min
              </button>
            ))}
          </div>
        </section>
      )}

      <Link to="/estudio" className="block">
        <Card className="flex items-center gap-3 border-primary/15 bg-card/90 p-4 transition-colors hover:bg-accent/40">
          <span className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <BookOpen className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Centro de estudio</p>
            <p className="text-xs text-muted-foreground">
              Unidades, conocimiento y puntos de atención
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Card>
      </Link>
      <details className="group rounded-2xl border bg-card/80">
        <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
          <span className="rounded-xl bg-muted p-2 text-muted-foreground">
            <Brain className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">Tu semana</span>
            <span className="block text-xs text-muted-foreground">
              Consulta la hoja de ruta cuando la necesites
            </span>
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
        </summary>
        <div className="border-t p-3">
          <WeeklyRoadmap />
        </div>
      </details>
    </div>
  );
}

function PrimaryCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  meta,
  action,
  loading,
  onAction,
}: {
  icon: React.ElementType;
  eyebrow: string;
  title: string;
  description: string;
  meta?: React.ReactNode;
  action: string;
  loading?: boolean;
  onAction: () => void;
}) {
  return (
    <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary via-primary to-[oklch(0.47_0.12_225)] text-primary-foreground shadow-[0_24px_52px_-28px_oklch(0.3_0.14_250/0.9)]">
      <div className="p-5">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-white/15 p-2.5 ring-1 ring-white/20">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/70">{eyebrow}</p>
            <h2 className="mt-1 text-xl font-bold">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/85">{description}</p>
          </div>
        </div>
        {meta && (
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-white/85 [&>span]:inline-flex [&>span]:items-center [&>span]:gap-1.5 [&>span]:rounded-full [&>span]:bg-white/12 [&>span]:px-3 [&>span]:py-1.5 [&>span]:ring-1 [&>span]:ring-white/15">
            {meta}
          </div>
        )}
        <Button
          onClick={onAction}
          disabled={loading}
          className="mt-5 h-12 w-full bg-white text-primary hover:bg-white/90"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          {action}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

function TodaySkeleton() {
  return (
    <Card className="space-y-4 p-5">
      <div className="flex gap-3">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
    </Card>
  );
}
