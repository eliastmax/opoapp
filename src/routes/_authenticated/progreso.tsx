import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, BookOpenCheck, Flag, Gauge, History, Loader2, XCircle } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/progreso")({
  component: ProgresoPage,
});

const EVIDENCE_STYLES: Record<EvidenceState, string> = {
  sin_base: "border-muted-foreground/30 bg-muted text-muted-foreground",
  inicial: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  suficiente: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  robusta: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

function ProgresoPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["topic-progress", "progress-v1.0"],
    queryFn: async () => {
      const { data: rows, error: queryError } = await supabase.rpc("get_topic_progress_summary");
      if (queryError) throw queryError;
      return rows ?? [];
    },
  });

  const groups = groupProgressBySubject(data ?? []);

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
              <TopicProgressCard key={topic.topic_id} topic={topic} />
            ))}
          </section>
        ))
      )}
    </div>
  );
}

function TopicProgressCard({ topic }: { topic: TopicProgressRow }) {
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
      </div>

      <div className="mt-4 rounded-lg border bg-muted/40 p-3">
        <p className="text-xs font-semibold">Siguiente paso</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {nextProgressAction(topic)}
        </p>
      </div>
    </Card>
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
