import { Link } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, CircleAlert, Clock3, RefreshCw, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveOpposition } from "@/hooks/use-active-opposition";
import { usePreparationProfile } from "@/hooks/use-preparation-profile";
import { useWeeklyRoadmap } from "@/hooks/use-weekly-roadmap";
import {
  formatRoadmapDate,
  isRoadmapToday,
  roadmapProgress,
  weeklyRoadmapViewState,
  type WeeklyRoadmapRow,
} from "@/lib/weekly-roadmap";

export function WeeklyRoadmap() {
  const opposition = useActiveOpposition();
  const profile = usePreparationProfile(opposition.data?.id);
  const roadmap = useWeeklyRoadmap();

  if (opposition.isLoading || profile.isLoading || roadmap.isLoading)
    return <WeeklyRoadmapSkeleton />;

  if (opposition.isError || profile.isError || roadmap.isError) {
    return (
      <Card className="border-border/80 bg-card/90 p-4" role="status">
        <div className="flex items-start gap-3">
          <CircleAlert
            className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold">No hemos podido cargar tu ruta semanal</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Tu progreso no se ha modificado. Puedes volver a intentarlo.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 -ml-3"
              onClick={() =>
                void Promise.all([opposition.refetch(), profile.refetch(), roadmap.refetch()])
              }
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reintentar
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (!opposition.data || !profile.data || profile.data.status !== "completed") {
    return <PreparationProfilePrompt />;
  }

  const state = weeklyRoadmapViewState(roadmap.data ?? []);
  if (state.status === "empty") {
    return (
      <Card className="border-border/80 bg-card/90 p-4">
        <RoadmapHeading />
        <p className="mt-2 text-sm font-semibold">No hemos podido preparar tu ruta todavía</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          No hay una propuesta completa que podamos mostrar con seguridad. Puedes volver a comprobarlo.
        </p>
      </Card>
    );
  }

  if (state.status === "week_complete") return <TerminalRoadmap row={state.row} complete />;
  if (state.status === "no_days_remaining")
    return <TerminalRoadmap row={state.row} complete={false} />;
  if (state.status === "no_questions_available") return <NoQuestionsRoadmap row={state.row} />;
  return <ActiveRoadmap rows={state.rows} />;
}

function RoadmapHeading() {
  return (
    <div className="flex items-center gap-2">
      <span className="rounded-xl bg-primary/10 p-2 text-primary">
        <Route className="h-4 w-4" aria-hidden="true" />
      </span>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
          Esta semana
        </p>
        <h2 className="text-sm font-bold">Tu hoja de ruta</h2>
      </div>
    </div>
  );
}

function WeeklyRoadmapSkeleton() {
  return (
    <Card
      className="min-h-56 border-border/80 bg-card/90 p-4"
      aria-label="Cargando hoja de ruta semanal"
    >
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-xl" />
        <Skeleton className="h-9 w-36" />
      </div>
      <Skeleton className="mt-4 h-4 w-3/4" />
      <Skeleton className="mt-2 h-2 w-full" />
      <div className="mt-5 space-y-3">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </Card>
  );
}

function PreparationProfilePrompt() {
  return (
    <Card className="border-primary/15 bg-card/90 p-4">
      <RoadmapHeading />
      <p className="mt-3 text-sm font-semibold">Configura tu perfil para organizar la semana</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Indícanos tus días disponibles y el ritmo que te resulta cómodo. No modifica tu progreso.
      </p>
      <Button asChild variant="outline" className="mt-3 h-10 w-full">
        <Link to="/preparacion">Perfil de preparación</Link>
      </Button>
    </Card>
  );
}

function TerminalRoadmap({ row, complete }: { row: WeeklyRoadmapRow; complete: boolean }) {
  return (
    <Card className="border-primary/15 bg-card/90 p-4">
      <RoadmapHeading />
      <div className="mt-3 flex gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {complete
              ? "Objetivo semanal completado"
              : "Esta semana ya no quedan días configurados"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{row.reason}</p>
        </div>
      </div>
      <RoadmapSummary row={row} />
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{row.exam_guidance}</p>
    </Card>
  );
}

function NoQuestionsRoadmap({ row }: { row: WeeklyRoadmapRow }) {
  return (
    <Card className="border-border/80 bg-card/90 p-4">
      <RoadmapHeading />
      <div className="mt-3 flex gap-3">
        <CircleAlert
          className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold">No hay preguntas disponibles para organizar la semana</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{row.reason}</p>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{row.exam_guidance}</p>
    </Card>
  );
}

function ActiveRoadmap({ rows }: { rows: WeeklyRoadmapRow[] }) {
  const first = rows[0];
  const today = rows.find((row) => isRoadmapToday(row.scheduled_date));
  const upcoming = rows.filter((row) => row !== today).slice(0, 3);
  const topics = Array.from(new Set(rows.map((row) => row.topic_name).filter(Boolean))).slice(0, 3);

  return (
    <Card className="border-primary/15 bg-card/90 p-4 shadow-[0_16px_38px_-28px_oklch(0.32_0.14_250/0.45)]">
      <RoadmapHeading />
      <RoadmapSummary row={first} />
      <div className="mt-4 rounded-xl bg-muted/45 p-3">
        <div className="flex items-start gap-2.5">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-xs font-bold">
              {today ? "Hoy te proponemos" : "Hoy no tienes una sesión prevista"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {today
                ? `${today.topic_name} · ${today.questions} preguntas. ${today.reason}`
                : "La ruta reserva las sesiones para tus próximos días disponibles, sin acumularlas."}
            </p>
          </div>
        </div>
      </div>
      {upcoming.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-xs font-bold">Próximas sesiones</h3>
          <ul className="mt-2 space-y-2" aria-label="Próximas sesiones de la semana">
            {upcoming.map((session) => (
              <li
                key={`${session.scheduled_date}-${session.slot_number}`}
                className="flex items-center gap-2 text-xs"
              >
                <Clock3 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="w-16 shrink-0 capitalize text-muted-foreground">
                  {formatRoadmapDate(session.scheduled_date!)}
                </span>
                <span
                  className="min-w-0 flex-1 truncate font-medium"
                  title={session.topic_name ?? undefined}
                >
                  {session.topic_name}
                </span>
                <span className="shrink-0 text-muted-foreground">{session.questions} preg.</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {topics.length > 0 ? (
        <div className="mt-4 border-t pt-3">
          <h3 className="text-xs font-bold">Esta semana priorizamos</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{topics.join(" · ")}</p>
        </div>
      ) : null}
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{first.exam_guidance}</p>
    </Card>
  );
}

function RoadmapSummary({ row }: { row: WeeklyRoadmapRow }) {
  const progress = roadmapProgress(row);
  const exceededTarget = row.completed_sessions > row.target_sessions;
  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold">
          {row.target_sessions} {row.target_sessions === 1 ? "sesión" : "sesiones"} ·{" "}
          {row.target_questions} preguntas
        </p>
        <p className="shrink-0 text-xs font-semibold text-muted-foreground">
          {exceededTarget
            ? `${row.completed_sessions} hechas`
            : `${row.completed_sessions}/${row.target_sessions}`}
        </p>
      </div>
      <Progress
        value={progress}
        className="mt-2 h-1.5"
        aria-label={`${row.completed_sessions} de ${row.target_sessions} sesiones completadas esta semana`}
      />
      <p className="mt-1.5 text-xs text-muted-foreground">
        {exceededTarget
          ? `Objetivo superado · ${row.completed_questions} preguntas realizadas esta semana`
          : `${row.completed_questions} preguntas realizadas esta semana`}
      </p>
    </div>
  );
}
