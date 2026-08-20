import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  AlertCircle,
  BookOpenCheck,
  ChevronRight,
  CircleAlert,
  Flag,
  History,
  Loader2,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  CheckCircle2,
  LockKeyhole,
  XCircle,
  Clock3,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  coverageSummary,
  evidenceState,
  nextProgressAction,
  sortProgressByTopicNumber,
  type CoverageMilestone,
  type EvidenceState,
} from "@/lib/progress-evidence";
import {
  comparisonMessage,
  comparisonState,
  verifiedProgressTotals,
  type VerifiedProgressRow,
} from "@/lib/verified-progress";
import {
  LEARNING_STAGE_LABELS,
  LEARNING_STAGES,
  isStageUnlocked,
  learningRouteSummary,
  stageRequirements,
  type LearningStageProgress,
} from "@/lib/learning-stages";
import {
  PROGRESS_MAP_PHASE_LABELS,
  filterProgressMapTopics,
  needsProgressAttention,
  progressDetailSummary,
  progressMapPhase,
  progressMapTotals,
  progressPercentage,
  type ProgressMapFilter,
  type ProgressMapPhase,
  type ProgressMapTopic,
} from "@/lib/progress-map";
import { cn } from "@/lib/utils";
import { formatDueDate } from "@/lib/v4-experience";
import type { V4TodayContextRow } from "@/lib/v4-today-plan";

export const Route = createFileRoute("/_authenticated/progreso")({
  component: ProgresoPage,
});

const EVIDENCE_STYLES: Record<EvidenceState, string> = {
  sin_base: "border-muted-foreground/30 bg-muted text-muted-foreground",
  inicial: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  suficiente: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  robusta: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

const EVIDENCE_SHORT_LABELS: Record<EvidenceState, string> = {
  sin_base: "Sin base",
  inicial: "Inicial",
  suficiente: "Suficiente",
  robusta: "Robusta",
};

const COVERAGE_STYLES: Record<CoverageMilestone, string> = {
  sin_empezar: "border-muted-foreground/20 bg-muted/40",
  en_marcha: "border-sky-500/20 bg-sky-500/5",
  casi_completo: "border-primary/25 bg-primary/5",
  completo: "border-emerald-500/30 bg-emerald-500/10",
};

const MAP_PHASE_STYLES: Record<ProgressMapPhase, string> = {
  sin_empezar: "border-border bg-card text-muted-foreground hover:border-muted-foreground/50",
  aprendizaje:
    "border-[#a76532]/50 bg-[#a76532]/10 text-[#7c461f] hover:border-[#a76532] dark:text-[#e7b487]",
  consolidacion:
    "border-slate-400/60 bg-slate-400/10 text-slate-700 hover:border-slate-500 dark:text-slate-200",
  tribunal:
    "border-amber-400/60 bg-amber-400/10 text-amber-800 hover:border-amber-500 dark:text-amber-200",
  completada:
    "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 hover:border-emerald-500 dark:text-emerald-200",
};

const MAP_PHASE_DOT_STYLES: Record<ProgressMapPhase, string> = {
  sin_empezar: "bg-muted-foreground/35",
  aprendizaje: "bg-[#a76532]",
  consolidacion: "bg-slate-400",
  tribunal: "bg-amber-400",
  completada: "bg-emerald-500",
};

const FILTER_LABELS: Record<ProgressMapFilter, string> = {
  todos: "Todos",
  en_curso: "En curso",
  atencion: "Atención",
  completada: "Completados",
};

type RetentionSummaryRow = {
  topic_id: string;
  due_count: number;
  next_review_at: string | null;
};

function ProgresoPage() {
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ProgressMapFilter>("todos");
  const { data, isLoading, error } = useQuery({
    queryKey: [
      "topic-progress",
      "progress-v1.0",
      "verified-progress-v1.0",
      "learning-stages-v2.0",
      "retention-v1.0",
      "mastery-v4.0",
    ],
    queryFn: async () => {
      const [progressResult, verifiedResult, stagesResult, retentionResult, v4Result] =
        await Promise.all([
          supabase.rpc("get_topic_progress_summary"),
          supabase.rpc("get_verified_progress_summary"),
          supabase.rpc("get_learning_stage_progress"),
          supabase.rpc("get_retention_review_summary"),
          supabase.rpc("prepare_my_v4_today_context"),
        ]);
      if (progressResult.error) throw progressResult.error;
      if (verifiedResult.error) throw verifiedResult.error;
      if (stagesResult.error) throw stagesResult.error;
      if (retentionResult.error) throw retentionResult.error;
      if (v4Result.error) throw v4Result.error;
      return {
        progress: progressResult.data ?? [],
        verified: verifiedResult.data ?? [],
        stages: stagesResult.data ?? [],
        retention: (retentionResult.data ?? []) as RetentionSummaryRow[],
        v4: (v4Result.data ?? []) as V4TodayContextRow[],
      };
    },
  });

  const topics = sortProgressByTopicNumber(data?.progress ?? []);
  const verifiedByTopic = new Map(
    (data?.verified ?? []).map((row) => [row.topic_id, row] as const),
  );
  const stagesByTopic = new Map((data?.stages ?? []).map((row) => [row.topic_id, row] as const));
  const retentionByTopic = new Map(
    (data?.retention ?? []).map((row) => [row.topic_id, row] as const),
  );
  const mapEntries: ProgressMapTopic[] = topics.map((topic) => ({
    topic,
    stages: stagesByTopic.get(topic.topic_id),
    dueCount: retentionByTopic.get(topic.topic_id)?.due_count ?? 0,
  }));
  const visibleEntries = filterProgressMapTopics(mapEntries, filter);
  const selectedEntry = mapEntries.find((entry) => entry.topic.topic_id === selectedTopicId);

  return (
    <div className="space-y-4">
      <header className="pt-2">
        <h1 className="text-2xl font-bold">Progreso</h1>
        <p className="text-sm text-muted-foreground">
          Qué sabes, qué necesita atención y qué viene después
        </p>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="p-5 text-center">
          <AlertCircle className="mx-auto mb-2 h-6 w-6 text-destructive" />
          <p className="text-sm font-medium">No se pudo cargar el progreso</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Vuelve a intentarlo en unos instantes.
          </p>
        </Card>
      ) : topics.length === 0 ? (
        <Card className="p-6 text-center">
          <BookOpenCheck className="mx-auto mb-2 h-7 w-7 text-primary" />
          <p className="text-sm font-medium">Aún no hay temas con preguntas activas</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Importa preguntas o activa un tema para empezar a medirlo.
          </p>
        </Card>
      ) : (
        <>
          <V4KnowledgeOverview rows={data?.v4 ?? []} />
          <ProgressMapOverview entries={mapEntries} />

          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar temas">
            {(Object.keys(FILTER_LABELS) as ProgressMapFilter[]).map((value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={filter === value ? "default" : "outline"}
                className="h-8 shrink-0 rounded-full px-3 text-xs"
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
              >
                {FILTER_LABELS[value]}
              </Button>
            ))}
          </div>

          {visibleEntries.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {visibleEntries.map((entry) => (
                <ProgressMapCard
                  key={entry.topic.topic_id}
                  entry={entry}
                  onSelect={() => setSelectedTopicId(entry.topic.topic_id)}
                />
              ))}
            </div>
          ) : (
            <Card className="p-5 text-center">
              <p className="text-sm font-medium">No hay temas en este estado</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Prueba otro filtro para volver a ver el mapa completo.
              </p>
            </Card>
          )}

          {data && <VerifiedProgressOverview rows={data.verified} />}

          <Button asChild variant="outline" className="w-full">
            <Link to="/historial">
              <History className="h-4 w-4" /> Ver historial de tests
            </Link>
          </Button>
        </>
      )}

      <Sheet
        open={Boolean(selectedEntry)}
        onOpenChange={(open) => {
          if (!open) setSelectedTopicId(null);
        }}
      >
        {selectedEntry && (
          <TopicProgressSheet
            entry={selectedEntry}
            verified={verifiedByTopic.get(selectedEntry.topic.topic_id)}
            retention={retentionByTopic.get(selectedEntry.topic.topic_id)}
          />
        )}
      </Sheet>
    </div>
  );
}

function ProgressMapOverview({ entries }: { entries: ProgressMapTopic[] }) {
  const totals = progressMapTotals(entries);
  const phases: ProgressMapPhase[] = [
    "sin_empezar",
    "aprendizaje",
    "consolidacion",
    "tribunal",
    "completada",
  ];

  return (
    <Card className="overflow-hidden p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Mapa de temas</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pulsa un tema para ver todo su detalle.
          </p>
        </div>
        <p className="shrink-0 text-sm font-bold">{entries.length} temas</p>
      </div>

      <div
        className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted"
        aria-label={`Distribución: ${phases
          .map((phase) => `${totals[phase]} ${PROGRESS_MAP_PHASE_LABELS[phase]}`)
          .join(", ")}`}
      >
        {phases.map(
          (phase) =>
            totals[phase] > 0 && (
              <span
                key={phase}
                className={MAP_PHASE_DOT_STYLES[phase]}
                style={{ width: `${(totals[phase] / entries.length) * 100}%` }}
              />
            ),
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
        {phases.map((phase) => (
          <span key={phase} className="inline-flex items-center gap-1.5 text-[11px]">
            <span className={cn("h-2 w-2 rounded-full", MAP_PHASE_DOT_STYLES[phase])} />
            <span className="text-muted-foreground">{PROGRESS_MAP_PHASE_LABELS[phase]}</span>
            <strong className="font-semibold text-foreground">{totals[phase]}</strong>
          </span>
        ))}
      </div>
    </Card>
  );
}

function ProgressMapCard({ entry, onSelect }: { entry: ProgressMapTopic; onSelect: () => void }) {
  const { topic, stages } = entry;
  const phase = progressMapPhase(topic, stages);
  const needsAttention = needsProgressAttention(entry);
  const firstRoundComplete = topic.coverage_percentage >= 100;
  const roundedCoverage = progressPercentage(topic.coverage_percentage);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative flex min-h-32 flex-col rounded-xl border p-2.5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        MAP_PHASE_STYLES[phase],
      )}
      aria-label={`Abrir detalle del Tema ${topic.topic_number}: ${topic.topic_name}`}
    >
      <div className="flex w-full items-start justify-between gap-1">
        <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-background/80 px-1.5 text-xs font-bold text-foreground shadow-sm">
          {topic.topic_number}
        </span>
        <span className="flex items-center gap-1">
          {needsAttention && (
            <span title="Necesita atención" className="text-amber-600 dark:text-amber-300">
              <CircleAlert className="h-3.5 w-3.5" />
              <span className="sr-only">Necesita atención</span>
            </span>
          )}
          <ChevronRight className="h-3.5 w-3.5 opacity-45 transition group-hover:translate-x-0.5 group-hover:opacity-80" />
        </span>
      </div>

      <span className="mt-2 line-clamp-2 text-[11px] font-semibold leading-snug text-foreground">
        {topic.topic_name}
      </span>

      <span className="mt-auto block min-w-0 pt-2">
        <span className="block truncate text-[9px] font-bold uppercase tracking-wide">
          {PROGRESS_MAP_PHASE_LABELS[phase]}
        </span>
        <span className="mt-1.5 flex items-center gap-1.5">
          <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-background/80">
            <span
              className={cn("block h-full rounded-full", MAP_PHASE_DOT_STYLES[phase])}
              style={{ width: `${roundedCoverage}%` }}
            />
          </span>
          <span className="text-[9px] font-semibold tabular-nums">
            {firstRoundComplete ? (
              <CheckCircle2 className="h-3 w-3" aria-label="Primera vuelta completada" />
            ) : (
              `${roundedCoverage}%`
            )}
          </span>
        </span>
      </span>
    </button>
  );
}

function TopicProgressSheet({
  entry,
  verified,
  retention,
}: {
  entry: ProgressMapTopic;
  verified?: VerifiedProgressRow;
  retention?: RetentionSummaryRow;
}) {
  return (
    <SheetContent
      side="bottom"
      className="flex max-h-[88dvh] flex-col gap-0 overflow-hidden rounded-t-3xl p-0 sm:inset-x-auto sm:inset-y-0 sm:left-auto sm:right-0 sm:top-0 sm:h-dvh sm:max-h-none sm:w-[min(34rem,46vw)] sm:max-w-none sm:rounded-none sm:border-l sm:border-t-0"
    >
      <SheetHeader className="shrink-0 border-b px-4 py-4 pr-12 text-left sm:px-6">
        <SheetTitle>Tema {entry.topic.topic_number}</SheetTitle>
        <SheetDescription className="line-clamp-2 leading-relaxed">
          {entry.topic.topic_name}
        </SheetDescription>
      </SheetHeader>
      <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain p-3 pb-8 sm:p-5">
        <TopicProgressCard entry={entry} verified={verified} retention={retention} />
      </div>
    </SheetContent>
  );
}

function VerifiedProgressOverview({ rows }: { rows: VerifiedProgressRow[] }) {
  const totals = verifiedProgressTotals(rows);
  const hasVerifiedChange =
    totals.corrected > 0 || totals.retained > 0 || totals.improvedTopics > 0;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-semibold">Avances verificados</p>
          <p className="text-xs text-muted-foreground">Últimos 30 días</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Metric label="Fallos corregidos" value={totals.corrected} />
        <Metric label="Retenciones" value={totals.retained} />
        <Metric label="Temas que mejoran" value={totals.improvedTopics} />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {hasVerifiedChange
          ? "Solo contamos correcciones reales, retención separada en el tiempo y mejoras sobre preguntas comparables."
          : "Todavía no hay cambios demostrables. La app no convierte la simple actividad en un logro artificial."}
      </p>
    </Card>
  );
}

function TopicProgressCard({
  entry,
  verified,
  retention,
}: {
  entry: ProgressMapTopic;
  verified?: VerifiedProgressRow;
  retention?: RetentionSummaryRow;
}) {
  const { topic, stages } = entry;
  const state = evidenceState(topic.evidence_state);
  const mastery = topic.mastery_percentage;
  const coverage = coverageSummary(topic);
  const detail = progressDetailSummary(entry);
  const roundedCoverage = progressPercentage(topic.coverage_percentage);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Estado actual
        </p>
        <Badge
          variant="outline"
          className={
            detail.completed
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : EVIDENCE_STYLES[state]
          }
        >
          {detail.status}
        </Badge>
      </div>

      <div
        className={`mt-3 rounded-xl border p-3 ${
          detail.completed
            ? "border-emerald-500/30 bg-emerald-500/10"
            : COVERAGE_STYLES[coverage.state]
        }`}
      >
        <div className="flex items-start gap-2">
          <Sparkles
            className={`mt-0.5 h-4 w-4 shrink-0 ${
              detail.completed || coverage.state === "completo"
                ? "text-emerald-600"
                : "text-primary"
            }`}
          />
          <div>
            <p className="text-sm font-semibold">{detail.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{detail.message}</p>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border bg-muted/40 p-3">
        <p className="text-xs font-semibold">Siguiente paso</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {(retention?.due_count ?? 0) > 0
            ? `Haz los ${retention?.due_count} ${retention?.due_count === 1 ? "repaso programado" : "repasos programados"} de hoy. La sesión recomendada los priorizará.`
            : nextProgressAction(topic)}
        </p>
      </div>

      <details className="mt-3 rounded-lg border px-3 py-2 text-xs">
        <summary className="cursor-pointer font-medium text-primary">
          Ver nombre oficial completo
        </summary>
        <p className="mt-2 leading-relaxed text-muted-foreground">{topic.topic_name}</p>
      </details>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Cobertura</span>
          <span className="text-muted-foreground">
            {topic.unique_questions_seen}/{topic.active_questions} distintas · {roundedCoverage}%
          </span>
        </div>
        <Progress value={roundedCoverage} aria-label="Cobertura del tema" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-center">
        <Metric label="Acierto actual" value={mastery === null ? "—" : `${mastery}%`} />
        <Metric label="Tests" value={topic.completed_sessions} />
        <Metric label="Conceptos" value={`${topic.seen_concepts}/${topic.available_concepts}`} />
        <Metric label="Base de práctica" value={EVIDENCE_SHORT_LABELS[state]} />
      </div>

      {coverage.remainingConcepts > 0 && coverage.remainingQuestions > 0 && (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          {coverage.remainingConcepts === 1
            ? "El concepto pendiente se completará cuando respondas la pregunta que falta."
            : `${coverage.remainingConcepts} conceptos siguen pendientes dentro de las preguntas que aún no has respondido.`}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground">
          Perspectivas {topic.seen_perspectives}/{topic.available_perspectives}
        </span>
        {topic.active_failures > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-destructive">
            <XCircle className="h-3 w-3" /> {topic.active_failures} fallos
          </span>
        )}
        {topic.active_doubts > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-primary">
            <Flag className="h-3 w-3" /> {topic.active_doubts} dudas
          </span>
        )}
        {(retention?.due_count ?? 0) > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-300">
            <Clock3 className="h-3 w-3" /> {retention?.due_count} para repasar hoy
          </span>
        )}
      </div>

      {stages && <LearningStagesProgress row={stages} />}

      {verified && <VerifiedTopicProgress row={verified} />}
    </Card>
  );
}

function LearningStagesProgress({ row }: { row: LearningStageProgress }) {
  const route = learningRouteSummary(row);
  const nextLocked = LEARNING_STAGES.find((stage) => !isStageUnlocked(row, stage));
  const requirements = nextLocked ? stageRequirements(row, nextLocked) : [];

  return (
    <div className="mt-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold">Fases de preparación</p>
        <Badge
          variant="secondary"
          className={
            route.completed
              ? "bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-300"
              : "text-[10px]"
          }
        >
          {route.completed ? "3 de 3" : route.badge}
        </Badge>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {LEARNING_STAGES.map((stage) => {
          const unlocked = isStageUnlocked(row, stage);
          const current = !route.completed && stage === route.recommendedStage;
          return (
            <div
              key={stage}
              className={`rounded-md border px-2 py-2 text-center ${
                current ? "border-primary bg-primary/10" : "bg-muted/30"
              }`}
            >
              {unlocked ? (
                <CheckCircle2 className="mx-auto h-4 w-4 text-primary" />
              ) : (
                <LockKeyhole className="mx-auto h-4 w-4 text-muted-foreground" />
              )}
              <p className="mt-1 truncate text-[10px] font-medium">
                {LEARNING_STAGE_LABELS[stage]}
              </p>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {route.completed
          ? "Aprendizaje, Consolidación y Tribunal están disponibles."
          : route.message}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Retención confirmada en {row.retention_evidence}{" "}
        {row.retention_evidence === 1 ? "concepto" : "conceptos"}. No bloquea el acceso a otros
        niveles.
      </p>
      {requirements.length > 0 && (
        <div className="mt-2 border-t pt-2">
          <p className="text-[11px] font-medium">
            Para recomendar {LEARNING_STAGE_LABELS[nextLocked!]}:
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-muted-foreground">
            {requirements.map((requirement) => (
              <li key={requirement}>{requirement}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function V4KnowledgeOverview({ rows }: { rows: V4TodayContextRow[] }) {
  if (rows.length === 0) return null;
  const unique = [...new Map(rows.map((row) => [row.concept_id, row])).values()];
  const counts = {
    unseen: unique.filter((row) => row.state === "unseen").length,
    seen: unique.filter((row) => row.state === "seen").length,
    verifying: unique.filter((row) => row.state === "verifying").length,
    consolidating: unique.filter((row) => row.state === "consolidating").length,
    retained: unique.filter((row) => row.state === "retained").length,
  };
  const attention = unique.filter((row) => row.needs_attention).length;
  const nextDue =
    unique
      .map((row) => row.next_review_on)
      .filter((value): value is string => Boolean(value))
      .sort()[0] ?? null;
  return (
    <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-card to-primary/6 p-0">
      <div className="p-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
          Conocimiento real
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Metric label="En comprobación" value={counts.verifying} />
          <Metric label="Consolidando" value={counts.consolidating} />
          <Metric label="Retenidos" value={counts.retained} />
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
          aria-label="Distribución del conocimiento"
        >
          <div className="flex h-full">
            {(
              [counts.seen, counts.verifying, counts.consolidating, counts.retained] as number[]
            ).map((count, index) => (
              <span
                key={index}
                className={["bg-sky-300", "bg-sky-500", "bg-primary", "bg-success"][index]}
                style={{ width: `${(count / unique.length) * 100}%` }}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x border-t bg-background/50 text-xs">
        <div className="p-3">
          <p className="font-bold">
            {attention > 0 ? `${attention} necesitan atención` : "Sin alertas activas"}
          </p>
          <p className="mt-0.5 text-muted-foreground">Debilidades recientes</p>
        </div>
        <div className="p-3">
          <p className="font-bold">{nextDue ? formatDueDate(nextDue) : "Sin fecha pendiente"}</p>
          <p className="mt-0.5 text-muted-foreground">Próxima revisión</p>
        </div>
      </div>
    </Card>
  );
}

function VerifiedTopicProgress({ row }: { row: VerifiedProgressRow }) {
  const state = comparisonState(row.comparison_state);
  const comparisonClass =
    state === "mejora_verificada"
      ? "border-emerald-500/30 bg-emerald-500/10"
      : state === "descenso_observado"
        ? "border-amber-500/30 bg-amber-500/10"
        : "bg-muted/30";

  return (
    <div className={`mt-3 rounded-lg border p-3 ${comparisonClass}`}>
      <div className="flex flex-wrap gap-2 text-xs">
        {row.corrected_failures_30d > 0 && (
          <span className="inline-flex items-center gap-1 font-medium">
            <RotateCcw className="h-3 w-3" /> {row.corrected_failures_30d} fallos corregidos
          </span>
        )}
        {row.retained_questions_30d > 0 && (
          <span className="inline-flex items-center gap-1 font-medium">
            <ShieldCheck className="h-3 w-3" /> {row.retained_questions_30d} retenciones
          </span>
        )}
        {state === "mejora_verificada" && (
          <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-300">
            <TrendingUp className="h-3 w-3" /> Mejora demostrada
          </span>
        )}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{comparisonMessage(row)}</p>
      {state !== "insuficiente" &&
        row.baseline_accuracy !== null &&
        row.current_accuracy !== null && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Bloque anterior {row.baseline_accuracy}% → bloque reciente {row.current_accuracy}%
          </p>
        )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-muted/60 px-2 py-2">
      <div className="text-base font-bold">{value}</div>
      <div className="text-[10px] leading-tight text-muted-foreground">{label}</div>
    </div>
  );
}
