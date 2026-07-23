import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BookOpenCheck,
  Flag,
  Gauge,
  History,
  Loader2,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  CheckCircle2,
  LockKeyhole,
  XCircle,
  Clock3,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  EVIDENCE_LABELS,
  evidenceDescription,
  evidenceState,
  groupProgressBySubject,
  nextProgressAction,
  type EvidenceState,
  type TopicProgressRow,
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
  learningStage,
  stageRequirements,
  type LearningStageProgress,
} from "@/lib/learning-stages";

export const Route = createFileRoute("/_authenticated/progreso")({
  component: ProgresoPage,
});

const EVIDENCE_STYLES: Record<EvidenceState, string> = {
  sin_base: "border-muted-foreground/30 bg-muted text-muted-foreground",
  inicial: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  suficiente: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  robusta: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

type RetentionSummaryRow = {
  topic_id: string;
  due_count: number;
  next_review_at: string | null;
};

function ProgresoPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: [
      "topic-progress",
      "progress-v1.0",
      "verified-progress-v1.0",
      "learning-stages-v1.0",
      "retention-v1.0",
    ],
    queryFn: async () => {
      const [progressResult, verifiedResult, stagesResult, retentionResult] = await Promise.all([
        supabase.rpc("get_topic_progress_summary"),
        supabase.rpc("get_verified_progress_summary"),
        supabase.rpc("get_learning_stage_progress"),
        supabase.rpc("get_retention_review_summary"),
      ]);
      if (progressResult.error) throw progressResult.error;
      if (verifiedResult.error) throw verifiedResult.error;
      if (stagesResult.error) throw stagesResult.error;
      if (retentionResult.error) throw retentionResult.error;
      return {
        progress: progressResult.data ?? [],
        verified: verifiedResult.data ?? [],
        stages: stagesResult.data ?? [],
        retention: (retentionResult.data ?? []) as RetentionSummaryRow[],
      };
    },
  });

  const groups = groupProgressBySubject(data?.progress ?? []);
  const verifiedByTopic = new Map(
    (data?.verified ?? []).map((row) => [row.topic_id, row] as const),
  );
  const stagesByTopic = new Map((data?.stages ?? []).map((row) => [row.topic_id, row] as const));
  const retentionByTopic = new Map(
    (data?.retention ?? []).map((row) => [row.topic_id, row] as const),
  );

  return (
    <div className="space-y-4">
      <header className="pt-2">
        <h1 className="text-2xl font-bold">Progreso</h1>
        <p className="text-sm text-muted-foreground">Tu avance por materia y tema</p>
      </header>

      <Card className="p-4">
        <div className="flex gap-3">
          <Gauge className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="text-sm font-semibold">Un progreso que no se infla al repetir</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              La cobertura cuenta preguntas distintas. El acierto actual usa únicamente tu última
              respuesta a cada pregunta y su fiabilidad aumenta con práctica variada y separada.
            </p>
          </div>
        </div>
      </Card>

      <Button asChild variant="outline" className="w-full">
        <Link to="/historial">
          <History className="h-4 w-4" /> Ver historial de tests
        </Link>
      </Button>

      {data && <VerifiedProgressOverview rows={data.verified} />}

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
      ) : groups.length === 0 ? (
        <Card className="p-6 text-center">
          <BookOpenCheck className="mx-auto mb-2 h-7 w-7 text-primary" />
          <p className="text-sm font-medium">Aún no hay temas con preguntas activas</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Importa preguntas o activa un tema para empezar a medirlo.
          </p>
        </Card>
      ) : (
        groups.map((group) => (
          <section key={group.id} className="space-y-3">
            <h2 className="px-1 text-sm font-semibold text-muted-foreground">{group.name}</h2>
            {group.topics.map((topic) => (
              <TopicProgressCard
                key={topic.topic_id}
                topic={topic}
                verified={verifiedByTopic.get(topic.topic_id)}
                stages={stagesByTopic.get(topic.topic_id)}
                retention={retentionByTopic.get(topic.topic_id)}
              />
            ))}
          </section>
        ))
      )}
    </div>
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
  topic,
  verified,
  stages,
  retention,
}: {
  topic: TopicProgressRow;
  verified?: VerifiedProgressRow;
  stages?: LearningStageProgress;
  retention?: RetentionSummaryRow;
}) {
  const state = evidenceState(topic.evidence_state);
  const mastery = topic.mastery_percentage;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Tema {topic.topic_number}</p>
          <h3 className="font-semibold leading-snug">{topic.topic_name}</h3>
        </div>
        <Badge variant="outline" className={EVIDENCE_STYLES[state]}>
          {EVIDENCE_LABELS[state]}
        </Badge>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {evidenceDescription(state)}
      </p>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Cobertura</span>
          <span className="text-muted-foreground">
            {topic.unique_questions_seen}/{topic.active_questions} distintas ·{" "}
            {topic.coverage_percentage}%
          </span>
        </div>
        <Progress value={topic.coverage_percentage} aria-label="Cobertura del tema" />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Metric label="Acierto actual" value={mastery === null ? "—" : `${mastery}%`} />
        <Metric label="Tests" value={topic.completed_sessions} />
        <Metric label="Conceptos" value={`${topic.seen_concepts}/${topic.available_concepts}`} />
      </div>

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

      <div className="mt-4 rounded-lg border bg-muted/40 p-3">
        <p className="text-xs font-semibold">Siguiente paso</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {(retention?.due_count ?? 0) > 0
            ? `Tienes ${retention?.due_count} ${retention?.due_count === 1 ? "repaso programado" : "repasos programados"} para hoy. La sesión recomendada los priorizará.`
            : nextProgressAction(topic)}
        </p>
      </div>

      {stages && <LearningStagesProgress row={stages} />}

      {verified && <VerifiedTopicProgress row={verified} />}
    </Card>
  );
}

function LearningStagesProgress({ row }: { row: LearningStageProgress }) {
  const recommended = learningStage(row.recommended_stage);
  const nextLocked = LEARNING_STAGES.find((stage) => !isStageUnlocked(row, stage));
  const requirements = nextLocked ? stageRequirements(row, nextLocked) : [];

  return (
    <div className="mt-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold">Ruta de preparación</p>
        <Badge variant="secondary" className="text-[10px]">
          Ahora: {LEARNING_STAGE_LABELS[recommended]}
        </Badge>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {LEARNING_STAGES.map((stage) => {
          const unlocked = isStageUnlocked(row, stage);
          const current = stage === recommended;
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
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{row.stage_message}</p>
      {requirements.length > 0 && (
        <div className="mt-2 border-t pt-2">
          <p className="text-[11px] font-medium">
            Para desbloquear {LEARNING_STAGE_LABELS[nextLocked!]}:
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
