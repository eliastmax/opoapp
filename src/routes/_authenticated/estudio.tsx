import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Loader2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { WeeklyRoadmap } from "@/components/weekly-roadmap";
import { useWeeklyRoadmap } from "@/hooks/use-weekly-roadmap";
import { supabase } from "@/integrations/supabase/client";
import {
  buildStudyCenterModel,
  studyUnitActionLabel,
  studyUnitStatusLabel,
  type StudyCenterTopic,
  type StudyCenterUnit,
} from "@/lib/study-center";
import { weeklyRoadmapViewState } from "@/lib/weekly-roadmap";
import type { V4TodayContextRow } from "@/lib/v4-today-plan";

export const Route = createFileRoute("/_authenticated/estudio")({ component: StudyCenterPage });

function StudyCenterPage() {
  const [openTopicId, setOpenTopicId] = useState<string | null>(null);
  const [roadmapOpen, setRoadmapOpen] = useState(false);
  const {
    data = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["v4-study-center"],
    queryFn: async () => {
      const result = await supabase.rpc("prepare_my_v4_today_context");
      if (result.error) throw result.error;
      return (result.data ?? []) as V4TodayContextRow[];
    },
  });
  const model = useMemo(() => buildStudyCenterModel(data), [data]);

  useEffect(() => {
    if (!model.continuation) return;
    setOpenTopicId((current) => current ?? model.continuation?.topicId ?? null);
  }, [model.continuation]);

  return (
    <div className="space-y-5 pb-2">
      <header className="pt-2">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
          Centro de estudio
        </p>
        <h1 className="mt-1 text-[1.75rem] font-bold tracking-tight">Tu temario</h1>
        <p className="mt-1 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
          Continúa donde lo dejaste o entra en cualquier tema para estudiar.
        </p>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="p-6 text-center">
          <AlertCircle className="mx-auto h-7 w-7 text-destructive" />
          <p className="mt-3 font-bold">No se pudo cargar tu temario</p>
          <p className="mt-1 text-sm text-muted-foreground">Tu progreso está intacto.</p>
          <Button className="mt-4 w-full" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </Card>
      ) : data.length === 0 ? (
        <Card className="p-6 text-center">
          <BookOpen className="mx-auto h-7 w-7 text-primary" />
          <h2 className="mt-3 font-bold">Aún no hay unidades disponibles</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Puedes seguir practicando con tests mientras se incorpora contenido de estudio.
          </p>
          <Button asChild className="mt-4 w-full">
            <Link to="/crear">Crear test</Link>
          </Button>
        </Card>
      ) : (
        <>
          {model.continuation && <ContinueStudyCard unit={model.continuation} />}

          <StudyRoadmapStrip open={roadmapOpen} onToggle={() => setRoadmapOpen((value) => !value)} />
          {roadmapOpen && (
            <section
              id="hoja-de-ruta"
              aria-label="Hoja de ruta semanal"
              className="animate-in fade-in-0 slide-in-from-top-1 duration-200"
            >
              <div className="mb-3 px-1">
                <p className="text-xs font-bold">Por qué esta ruta</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  La construimos a partir de tus días disponibles y del ritmo que configuraste.
                  Sirve para repartir el trabajo de la semana sin que tengas que decidir desde cero
                  cada día. Dentro verás también por qué se prioriza cada sesión.
                </p>
              </div>
              <WeeklyRoadmap />
            </section>
          )}

          <section aria-labelledby="study-syllabus-title" className="space-y-3">
            <div className="flex items-end justify-between gap-3 px-0.5">
              <div>
                <h2 id="study-syllabus-title" className="text-lg font-bold tracking-tight">
                  Tu temario
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {model.topics.length} temas · {model.units.length} unidades
                </p>
              </div>
              <span className="text-xs font-medium text-muted-foreground">Toca un tema para abrirlo</span>
            </div>

            {model.topics.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                open={openTopicId === topic.id}
                onToggle={() => setOpenTopicId((current) => (current === topic.id ? null : topic.id))}
                tourUnitId={model.continuation?.id ?? null}
              />
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function ContinueStudyCard({ unit }: { unit: StudyCenterUnit }) {
  const action = studyUnitActionLabel(unit.status);
  const eyebrow =
    unit.status === "not_started"
      ? "Empieza por aquí"
      : unit.status === "needs_attention"
        ? "Conviene reforzar"
        : unit.status === "completed"
          ? "Puedes repasarlo"
          : "Continúa estudiando";

  return (
    <Card className="relative overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.11] via-card to-card p-5 shadow-[0_22px_46px_-38px_oklch(0.3_0.14_250/0.75)]">
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/10">
            {unit.status === "needs_attention" ? (
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
            ) : (
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">Tema {unit.topicNumber}</p>
          </div>
        </div>

        <h2 className="mt-4 text-xl font-bold leading-snug tracking-tight">{unit.title}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-muted-foreground">
          <span>{unit.totalConcepts} {unit.totalConcepts === 1 ? "concepto" : "conceptos"}</span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />≈ {unit.estimatedMinutes} min
          </span>
          {unit.activeFlashcards > 0 && <span>{unit.activeFlashcards} flashcards</span>}
        </div>

        {unit.workedConcepts > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] font-semibold text-muted-foreground">
              <span>{unit.workedConcepts} de {unit.totalConcepts} conceptos trabajados</span>
              <span>{Math.round(unit.progress)}%</span>
            </div>
            <Progress value={unit.progress} className="h-1.5" />
          </div>
        )}

        <Button asChild className="mt-5 h-11 w-full text-[15px] font-semibold">
          <Link to="/estudiar/$unitId" params={{ unitId: unit.id }}>
            {action} unidad <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}

function StudyRoadmapStrip({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const roadmap = useWeeklyRoadmap();
  const state = weeklyRoadmapViewState(roadmap.data ?? []);
  const row =
    state.status === "active" ? state.rows[0] : state.status === "empty" ? null : state.row;
  const completed = row ? Math.min(row.completed_sessions, row.target_sessions) : 0;
  const target = row?.target_sessions ?? 0;

  return (
    <Card className="border-border/70 bg-card/70 p-3.5 shadow-none">
      <button
        type="button"
        className="flex w-full items-center gap-3 text-left"
        aria-expanded={open}
        aria-controls="hoja-de-ruta"
        onClick={onToggle}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-primary">Esta semana</p>
          <p className="mt-0.5 text-sm font-semibold">
            {roadmap.isLoading
              ? "Preparando tu ruta…"
              : row && target > 0
                ? `${completed} de ${target} sesiones`
                : "Tu hoja de ruta"}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Ajustada a tus días y a tu ritmo para repartir el trabajo sin planificar cada jornada.
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-primary">{open ? "Ocultar" : "Ver ruta"}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-primary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
    </Card>
  );
}

function TopicCard({
  topic,
  open,
  onToggle,
  tourUnitId,
}: {
  topic: StudyCenterTopic;
  open: boolean;
  onToggle: () => void;
  tourUnitId: string | null;
}) {
  const topicMeta =
    topic.completedUnits === topic.units.length
      ? `${topic.units.length} de ${topic.units.length} unidades completadas`
      : topic.workedUnits > 0
        ? `${topic.workedUnits} de ${topic.units.length} unidades trabajadas`
        : `${topic.units.length} ${topic.units.length === 1 ? "unidad" : "unidades"} · Por empezar`;

  return (
    <section className="overflow-hidden rounded-2xl border border-border/75 bg-card/75 shadow-[0_14px_34px_-32px_oklch(0.3_0.08_250/0.55)]">
      <button
        type="button"
        className="w-full px-4 py-4 text-left transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/35"
        aria-expanded={open}
        onClick={onToggle}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">Tema {topic.number}</p>
            <h3 className="mt-1 line-clamp-2 text-[15px] font-bold leading-snug" title={topic.name}>
              {topic.name}
            </h3>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">{topicMeta}</p>
              {topic.progress > 0 && <span className="text-[11px] font-semibold text-muted-foreground">{Math.round(topic.progress)}%</span>}
            </div>
            <Progress value={topic.progress} className="mt-2 h-1" />
          </div>
          <ChevronDown
            className={`mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </div>
      </button>

      {open && (
        <div className="border-t border-border/70 bg-background/35">
          {topic.units.map((unit) => (
            <UnitLink key={unit.id} unit={unit} tourTarget={unit.id === tourUnitId} />
          ))}
        </div>
      )}
    </section>
  );
}

function UnitLink({ unit, tourTarget }: { unit: StudyCenterUnit; tourTarget: boolean }) {
  const action = studyUnitActionLabel(unit.status);
  const status = studyUnitStatusLabel(unit.status);
  const statusClass =
    unit.status === "needs_attention"
      ? "text-warning-foreground"
      : unit.status === "completed"
        ? "text-success"
        : unit.status === "in_progress"
          ? "text-primary"
          : "text-muted-foreground";
  const detail =
    unit.workedConcepts > 0
      ? `${unit.workedConcepts} de ${unit.totalConcepts} conceptos`
      : `${unit.totalConcepts} ${unit.totalConcepts === 1 ? "concepto" : "conceptos"}`;

  return (
    <Link
      to="/estudiar/$unitId"
      params={{ unitId: unit.id }}
      data-tour={tourTarget ? "study-unit" : undefined}
      data-tour-unit-id={tourTarget ? unit.id : undefined}
      className="group block border-b border-border/65 px-4 py-3.5 last:border-b-0 transition-colors hover:bg-primary/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30"
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            unit.status === "completed"
              ? "bg-success/10 text-success"
              : unit.status === "needs_attention"
                ? "bg-warning/12 text-warning-foreground"
                : "bg-primary/8 text-primary"
          }`}
        >
          {unit.status === "completed" ? (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          ) : unit.status === "needs_attention" ? (
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          ) : (
            <BookOpen className="h-4 w-4" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold leading-snug">{unit.title}</h4>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className={`font-semibold ${statusClass}`}>{status}</span>
            <span aria-hidden="true" className="text-border">·</span>
            <span className="text-muted-foreground">{detail}</span>
            <span aria-hidden="true" className="text-border">·</span>
            <span className="text-muted-foreground">≈ {unit.estimatedMinutes} min</span>
          </div>
          {unit.workedConcepts > 0 && <Progress value={unit.progress} className="mt-2.5 h-1" />}
          <div className="mt-2.5 flex items-center justify-between gap-3">
            {unit.activeFlashcards > 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
                Flashcards incluidas
              </span>
            ) : (
              <span />
            )}
            <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
              {action} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
