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
  Sparkles,
} from "lucide-react";
import { WeeklyRoadmapSummary } from "@/components/weekly-roadmap";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  remainingSessionMinutes,
  todayExperienceState,
  todayPlanReason,
  todayPlanTitle,
} from "@/lib/today-experience";
import { dailySessionPlanFromTodayPlan } from "@/lib/v4-daily-session";
import { composeV4TodayPlan, type V4TodayContextRow } from "@/lib/v4-today-plan";
import { BLOCK_COPY, formatDueDate, localDate, type V4DailySession } from "@/lib/v4-experience";
import { displayName } from "@/lib/user-greeting";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inicio")({ component: InicioPage });
const DEFAULT_AVAILABLE_MINUTES = 25;

function InicioPage() {
  const navigate = useNavigate();
  const today = localDate();
  const [starting, setStarting] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["today-experience", today],
    queryFn: async () => {
      const userResult = await supabase.auth.getUser();
      if (userResult.error || !userResult.data.user)
        throw userResult.error ?? new Error("Sesión no válida");
      const user = userResult.data.user;
      const profile = await supabase
        .from("profiles")
        .select("nombre, active_opposition_id")
        .eq("id", user.id)
        .maybeSingle();
      if (profile.error) throw profile.error;

      const oppositionId = profile.data?.active_opposition_id ?? null;
      const [preparation, session, unfinished] = await Promise.all([
        oppositionId
          ? supabase
              .from("preparation_profiles")
              .select("status")
              .eq("user_id", user.id)
              .eq("opposition_id", oppositionId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        oppositionId
          ? supabase.rpc("get_my_v4_daily_session", { p_local_date: today })
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from("tests")
          .select("id, numero_preguntas")
          .eq("user_id", user.id)
          .eq("completado", false)
          .neq("tipo", "v4_concept_check")
          .order("fecha_inicio", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (preparation.error) throw preparation.error;
      if (session.error) throw session.error;
      if (unfinished.error) throw unfinished.error;

      const preparationConfigured = preparation.data?.status === "completed";
      const context = preparationConfigured
        ? await supabase.rpc("prepare_my_v4_today_context")
        : { data: [], error: null };
      if (context.error) throw context.error;
      const answerResult = unfinished.data
        ? await supabase
            .from("test_answers")
            .select("respuesta_usuario")
            .eq("test_id", unfinished.data.id)
        : { data: [], error: null };
      if (answerResult.error) throw answerResult.error;

      return {
        userName: displayName({
          profileName: profile.data?.nombre,
          metadataName: user.user_metadata?.nombre,
          email: user.email,
        }),
        preparationConfigured,
        rows: (context.data ?? []) as V4TodayContextRow[],
        session: session.data as V4DailySession | null,
        unfinished: unfinished.data
          ? {
              id: unfinished.data.id,
              total: unfinished.data.numero_preguntas,
              answered: (answerResult.data ?? []).filter(
                (answer) => answer.respuesta_usuario !== null,
              ).length,
            }
          : null,
      };
    },
  });

  const plan = useMemo(
    () =>
      composeV4TodayPlan({
        availableMinutes: DEFAULT_AVAILABLE_MINUTES,
        today,
        rows: data?.rows ?? [],
      }),
    [data?.rows, today],
  );
  const state = todayExperienceState({
    preparationConfigured: data?.preparationConfigured ?? false,
    rows: data?.rows ?? [],
    session: data?.session ?? null,
    plan,
  });

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

  return (
    <div className="space-y-4">
      <header className="pt-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Hoy</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {isLoading ? "Preparando tu siguiente paso…" : `Hola, ${data?.userName ?? ""}`}
        </h1>
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
      ) : (
        <TodayPrimary
          state={state}
          session={data?.session ?? null}
          plan={plan}
          starting={starting}
          onStart={startToday}
          onNavigate={(to) => navigate({ to })}
        />
      )}

      {!isLoading && !error && data?.unfinished && <UnfinishedTestCard test={data.unfinished} />}
      {!isLoading && !error && data?.preparationConfigured && <WeeklyRoadmapSummary />}
      {!isLoading && !error && data?.preparationConfigured && (
        <Link to="/estudio" className="block">
          <Card className="flex items-center gap-3 border-border/70 bg-card/70 p-3.5 transition-colors hover:bg-accent/40">
            <span className="rounded-xl bg-primary/10 p-2 text-primary">
              <BookOpen className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Centro de estudio</p>
              <p className="text-xs text-muted-foreground">
                Consulta unidades y puntos de atención
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Card>
        </Link>
      )}
    </div>
  );
}

function TodayPrimary({
  state,
  session,
  plan,
  starting,
  onStart,
  onNavigate,
}: {
  state: ReturnType<typeof todayExperienceState>;
  session: V4DailySession | null;
  plan: ReturnType<typeof composeV4TodayPlan>;
  starting: boolean;
  onStart: () => void;
  onNavigate: (to: "/sesion" | "/preparacion" | "/crear" | "/estudio") => void;
}) {
  if (state === "unconfigured")
    return (
      <PrimaryCard
        icon={Sparkles}
        eyebrow="Vamos a preparar tu oposición"
        title="Empieza con un plan hecho para ti"
        description="Tú nos cuentas cómo te preparas. OpoTest organizará qué estudiar cada día."
        action="Preparar mi plan"
        onAction={() => onNavigate("/preparacion")}
      />
    );

  if (state === "session_active" && session) {
    const current =
      session.blocks.find((block) => block.status === "in_progress") ??
      session.blocks.find((block) => block.status === "planned");
    return (
      <PrimaryCard
        icon={Play}
        eyebrow="Continúa tu sesión"
        title={
          current
            ? `Ahora toca ${BLOCK_COPY[current.kind].action.toLowerCase()}`
            : "Sigue donde lo dejaste"
        }
        description={
          current
            ? `${BLOCK_COPY[current.kind].purpose} Te quedan aproximadamente ${remainingSessionMinutes(session)} min.`
            : "Tu siguiente paso está preparado."
        }
        action="Continuar sesión"
        onAction={() => onNavigate("/sesion")}
      />
    );
  }

  if (state === "session_complete" && session)
    return (
      <PrimaryCard
        icon={CheckCircle2}
        eyebrow="Sesión terminada"
        title="Cierra el trabajo de hoy"
        description="Revisa qué cambió y qué organizará OpoTest a continuación."
        action="Ver debrief"
        onAction={() => onNavigate("/sesion")}
      />
    );

  if ((state === "first_session" || state === "habitual") && plan.blocks[0]) {
    const first = plan.blocks[0];
    return (
      <PrimaryCard
        icon={state === "first_session" ? BookOpen : Sparkles}
        eyebrow={state === "first_session" ? "Tu primera sesión" : "Tu sesión de hoy"}
        title={
          state === "first_session" ? `Empieza por ${first.studyUnitTitle}` : todayPlanTitle(plan)
        }
        description={
          state === "first_session"
            ? "Vamos a empezar a conocerte mientras estudias. Después adaptaremos tus siguientes sesiones."
            : todayPlanReason(plan)
        }
        meta={
          <>
            <span>
              <Clock3 className="h-3.5 w-3.5" /> ≈ {plan.plannedMinutes} min
            </span>
            {state === "first_session" && <span>Tema {first.topicNumber}</span>}
          </>
        }
        method={state === "first_session"}
        action="Empezar sesión"
        loading={starting}
        onAction={onStart}
      />
    );
  }

  return (
    <Card className="p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
        <CheckCircle2 className="h-5 w-5" />
      </span>
      <h2 className="mt-3 text-lg font-bold">Tu trabajo está al día</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {plan.status === "no_content"
          ? "Todavía no hay contenido guiado disponible. Puedes seguir practicando con tus tests."
          : plan.nextDueOn
            ? `Tu próximo repaso está previsto para el ${formatDueDate(plan.nextDueOn)}.`
            : "OpoTest preparará el siguiente paso cuando haya nueva evidencia."}
      </p>
      <Button
        className="mt-4 w-full"
        onClick={() => onNavigate(plan.status === "no_content" ? "/crear" : "/estudio")}
      >
        {plan.status === "no_content" ? "Ir a practicar" : "Abrir Centro de estudio"}
      </Button>
    </Card>
  );
}

function UnfinishedTestCard({ test }: { test: { id: string; total: number; answered: number } }) {
  return (
    <Card className="border-border/70 bg-card/70 p-3.5">
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-muted p-2 text-muted-foreground">
          <Brain className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Tienes un test sin terminar</p>
          <p className="text-xs text-muted-foreground">
            {test.answered} de {test.total} respondidas
          </p>
        </div>
        <Button asChild variant="ghost" size="sm" className="shrink-0 text-primary">
          <Link
            to="/test/$id"
            params={{ id: test.id }}
            search={{ block: undefined, session: undefined }}
          >
            Continuar
          </Link>
        </Button>
      </div>
    </Card>
  );
}

function PrimaryCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  meta,
  method,
  action,
  loading,
  onAction,
}: {
  icon: React.ElementType;
  eyebrow: string;
  title: string;
  description: string;
  meta?: React.ReactNode;
  method?: boolean;
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
            <h2 className="mt-1 text-xl font-bold leading-tight">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/85">{description}</p>
          </div>
        </div>
        {method && (
          <div className="mt-4 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-white/85">
            <span>Estudiar</span>
            <ArrowRight className="h-3 w-3" />
            <span>Recordar</span>
            <ArrowRight className="h-3 w-3" />
            <span>Comprobar</span>
          </div>
        )}
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
    <Card className="space-y-4 p-5" aria-label="Preparando tu sesión de hoy">
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
