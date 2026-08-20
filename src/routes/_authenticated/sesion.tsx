import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Loader2,
  Play,
  RotateCcw,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import {
  BLOCK_COPY,
  formatDueDate,
  localDate,
  type V4DailyDebrief,
  type V4DailySession,
} from "@/lib/v4-experience";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sesion")({ component: SessionPage });

function SessionPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [working, setWorking] = useState<string | null>(null);
  const today = localDate();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["v4-daily-session", today],
    queryFn: async () => {
      const sessionResult = await supabase.rpc("get_my_v4_daily_session", { p_local_date: today });
      if (sessionResult.error) throw sessionResult.error;
      const session = sessionResult.data as V4DailySession | null;
      if (!session) return { session: null, debrief: null, titles: new Map<string, string>() };
      const contextResult = await supabase.rpc("prepare_my_v4_today_context");
      if (contextResult.error) throw contextResult.error;
      const titles = new Map<string, string>();
      for (const row of contextResult.data ?? []) {
        titles.set(row.study_unit_id, row.study_unit_title);
        titles.set(row.concept_id, row.concept_title);
      }
      let debrief: V4DailyDebrief | null = null;
      if (session.status !== "active") {
        const result = await supabase.rpc("get_my_v4_daily_debrief", { p_session_id: session.id });
        if (result.error) throw result.error;
        debrief = result.data as V4DailyDebrief;
      }
      return { session, debrief, titles };
    },
  });

  async function startBlock(block: V4DailySession["blocks"][number]) {
    setWorking(block.id);
    try {
      if (block.status === "planned") {
        const started = await supabase.rpc("start_my_v4_daily_block", { p_block_id: block.id });
        if (started.error) throw started.error;
      }
      if (block.kind === "advance") {
        navigate({
          to: "/estudiar/$unitId",
          params: { unitId: block.studyUnitId },
          search: { block: block.id, session: data!.session!.id },
        });
        return;
      }
      if (block.linkedTestId) {
        navigate({
          to: "/resultados/$id",
          params: { id: block.linkedTestId },
          search: { block: block.id, session: data!.session!.id },
        });
        return;
      }
      if (block.status === "in_progress" && block.startedAt) {
        const existingTest = await findConceptCheck(block.conceptId!, block.startedAt);
        if (existingTest) {
          navigate({
            to: existingTest.completed ? "/resultados/$id" : "/test/$id",
            params: { id: existingTest.id },
            search: { block: block.id, session: data!.session!.id },
          });
          return;
        }
      }
      const check = await supabase.rpc("create_v4_concept_check", {
        p_concept_id: block.conceptId!,
        p_mode: block.kind,
        p_question_count: block.targetQuestions,
      });
      if (check.error) throw check.error;
      const created = check.data?.[0];
      if (!created) throw new Error("No se pudo preparar la comprobación");
      navigate({
        to: "/test/$id",
        params: { id: created.test_id },
        search: { block: block.id, session: data!.session!.id },
      });
    } catch (caught) {
      toast.error((caught as Error).message);
      setWorking(null);
      void refetch();
    }
  }

  async function skipBlock(blockId: string) {
    setWorking(blockId);
    const result = await supabase.rpc("skip_my_v4_daily_block", { p_block_id: blockId });
    if (result.error) toast.error(result.error.message);
    else await qc.invalidateQueries({ queryKey: ["v4-daily-session", today] });
    setWorking(null);
  }

  async function closeEarly() {
    if (!data?.session) return;
    setWorking("close");
    const result = await supabase.rpc("close_my_v4_daily_session_early", {
      p_session_id: data.session.id,
    });
    if (result.error) toast.error(result.error.message);
    else await qc.invalidateQueries({ queryKey: ["v4-daily-session", today] });
    setWorking(null);
  }

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState onRetry={() => void refetch()} />;
  if (!data?.session) return <EmptyState />;
  if (data.session.status !== "active" && data.debrief) return <Debrief debrief={data.debrief} />;

  const session = data.session;
  const completed = session.blocks.filter((block) => block.status === "completed").length;
  const closed = session.blocks.filter(
    (block) => block.status === "completed" || block.status === "skipped",
  ).length;
  const current =
    session.blocks.find((block) => block.status === "in_progress") ??
    session.blocks.find((block) => block.status === "planned");
  const next = current
    ? session.blocks.find(
        (block) => block.position > current.position && block.status === "planned",
      )
    : null;
  const currentTitle = current
    ? (data.titles.get(current.conceptId ?? current.studyUnitId) ?? current.label)
    : "";

  return (
    <div className="space-y-5 pb-5">
      <header className="sticky top-0 z-20 -mx-4 -mt-4 border-b bg-background/92 px-4 pb-3 pt-4 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              Sesión de hoy
            </p>
            <h1 className="mt-0.5 text-xl font-bold">
              {completed} de {session.blocks.length} bloques
            </h1>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" /> {session.plannedMinutes} min
          </span>
        </div>
        <Progress value={(closed / session.blocks.length) * 100} className="mt-3 h-1.5" />
      </header>

      {current && (
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card to-primary/7 p-5 shadow-[0_20px_44px_-32px_oklch(0.3_0.12_250/0.75)]">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Play className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
                Bloque {current.position} · Ahora
              </p>
              <h2 className="mt-1 text-lg font-bold">
                {BLOCK_COPY[current.kind].action}: {currentTitle}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {BLOCK_COPY[current.kind].purpose}
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-muted/60 p-3 text-sm">
            <span className="font-semibold">Por qué toca:</span>{" "}
            <span className="text-muted-foreground">{current.reason}</span>
          </div>
          <Button
            className="mt-4 h-12 w-full"
            disabled={working !== null}
            onClick={() => void startBlock(current)}
          >
            {working === current.id ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : current.status === "in_progress" ? (
              <RotateCcw className="mr-2 h-4 w-4" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {current.status === "in_progress"
              ? "Continuar bloque"
              : `Empezar · ${current.plannedMinutes} min`}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          {current.status === "planned" && (
            <button
              type="button"
              onClick={() => void skipBlock(current.id)}
              disabled={working !== null}
              className="mt-3 w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Omitir este bloque
            </button>
          )}
        </Card>
      )}

      <section aria-labelledby="route-heading">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="route-heading" className="text-sm font-bold">
            Tu recorrido
          </h2>
          {next && (
            <span className="text-xs text-muted-foreground">
              Después: {BLOCK_COPY[next.kind].action}
            </span>
          )}
        </div>
        <div className="space-y-2">
          {session.blocks.map((block) => (
            <BlockRow
              key={block.id}
              block={block}
              title={data.titles.get(block.conceptId ?? block.studyUnitId) ?? block.label}
              active={block.id === current?.id}
            />
          ))}
        </div>
      </section>

      <Card className="border-0 bg-muted/55 p-4">
        <p className="text-sm font-semibold">Qué viene después</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {next
            ? `${BLOCK_COPY[next.kind].action}: ${data.titles.get(next.conceptId ?? next.studyUnitId) ?? next.label}.`
            : "Al terminar, OpoTest resumirá qué cambió y preparará el siguiente paso."}
        </p>
      </Card>
      {!session.blocks.some((block) => block.status === "in_progress") && (
        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          disabled={working !== null}
          onClick={() => void closeEarly()}
        >
          {working === "close" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <X className="mr-2 h-4 w-4" />
          )}
          Terminar por hoy
        </Button>
      )}
    </div>
  );
}

async function findConceptCheck(conceptId: string, startedAt: string) {
  const result = await supabase
    .from("tests")
    .select("id, completado, test_question_selection!inner(selection_concept_id)")
    .eq("test_question_selection.selection_concept_id", conceptId)
    .gte("fecha_inicio", startedAt)
    .order("fecha_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) throw result.error;
  return result.data ? { id: result.data.id, completed: result.data.completado } : null;
}

function BlockRow({
  block,
  title,
  active,
}: {
  block: V4DailySession["blocks"][number];
  title: string;
  active: boolean;
}) {
  const Icon = block.status === "completed" ? Check : block.status === "skipped" ? X : Circle;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border bg-card/85 p-3.5",
        active && "border-primary/35 bg-primary/5",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          block.status === "completed"
            ? "bg-success/12 text-success"
            : block.status === "skipped"
              ? "bg-muted text-muted-foreground"
              : active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {block.position}. {BLOCK_COPY[block.kind].action}
        </p>
        <p
          className={cn(
            "truncate text-sm font-semibold",
            block.status === "skipped" && "text-muted-foreground line-through",
          )}
        >
          {title}
        </p>
      </div>
      <span className="text-xs text-muted-foreground">{block.plannedMinutes} min</span>
    </div>
  );
}

function Debrief({ debrief }: { debrief: V4DailyDebrief }) {
  const complete = debrief.status === "completed";
  return (
    <div className="space-y-5 pb-5">
      <header className="pt-2">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Sesión cerrada</p>
        <h1 className="mt-1 text-2xl font-bold">
          {complete ? "Buen trabajo por hoy" : "Has avanzado lo que podías"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          OpoTest ya ha actualizado tu siguiente paso con la evidencia real.
        </p>
      </header>
      <Card className="border-primary/15 bg-gradient-to-br from-card to-primary/7 p-5">
        <div className="flex gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-success/12 text-success">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Esto has hecho</p>
            <p className="mt-1 text-lg font-bold">
              {debrief.completedBlocks} de {debrief.totalBlocks} bloques completados
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {debrief.questionsAnswered} preguntas y {debrief.flashcardsReviewed} tarjetas
              trabajadas.
            </p>
          </div>
        </div>
      </Card>
      <DebriefRow
        icon={BookOpen}
        title="Esto ha cambiado"
        text={
          debrief.improvedConcepts > 0
            ? `${debrief.improvedConcepts} ${debrief.improvedConcepts === 1 ? "conocimiento avanzó" : "conocimientos avanzaron"} de estado${debrief.newlyRetainedConcepts ? `; ${debrief.newlyRetainedConcepts} llegó a Retenido` : ""}.`
            : "La sesión añadió evidencia útil, aunque todavía no bastó para cambiar de estado."
        }
      />
      <DebriefRow
        icon={AlertCircle}
        title="Necesita atención"
        text={
          debrief.attentionRemaining > 0
            ? `${debrief.attentionRemaining} ${debrief.attentionRemaining === 1 ? "punto sigue" : "puntos siguen"} necesitando refuerzo. OpoTest lo priorizará.`
            : debrief.attentionResolved > 0
              ? `Has resuelto ${debrief.attentionResolved} ${debrief.attentionResolved === 1 ? "punto de atención" : "puntos de atención"}.`
              : "No queda ninguna alerta nueva de esta sesión."
        }
      />
      <DebriefRow
        icon={ShieldCheck}
        title="Qué hará OpoTest después"
        text={
          debrief.nextDueOn
            ? `Volverá a comprobar tu conocimiento el ${formatDueDate(debrief.nextDueOn)}.`
            : "Recalculará Hoy con tu evidencia real cuando vuelvas."
        }
      />
      <Button asChild className="h-12 w-full">
        <Link to="/inicio">
          Volver a Hoy <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
function DebriefRow({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ElementType;
  title: string;
  text: string;
}) {
  return (
    <Card className="flex gap-3 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-sm font-bold">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
      </div>
    </Card>
  );
}
function LoadingState() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Preparando tu recorrido…</p>
    </div>
  );
}
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="mt-10 p-6 text-center">
      <AlertCircle className="mx-auto h-7 w-7 text-destructive" />
      <h1 className="mt-3 font-bold">No se pudo cargar la sesión</h1>
      <p className="mt-1 text-sm text-muted-foreground">Tu progreso está guardado.</p>
      <Button className="mt-4 w-full" onClick={onRetry}>
        Reintentar
      </Button>
    </Card>
  );
}
function EmptyState() {
  return (
    <Card className="mt-10 p-6 text-center">
      <CheckCircle2 className="mx-auto h-7 w-7 text-primary" />
      <h1 className="mt-3 font-bold">Aún no has preparado la sesión de hoy</h1>
      <Button asChild className="mt-4 w-full">
        <Link to="/inicio">Ir a Hoy</Link>
      </Button>
    </Card>
  );
}
