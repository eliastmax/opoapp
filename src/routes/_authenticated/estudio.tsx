import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { WeeklyRoadmap } from "@/components/weekly-roadmap";
import { supabase } from "@/integrations/supabase/client";
import { MASTERY_LABELS } from "@/lib/v4-experience";
import type { V4TodayContextRow } from "@/lib/v4-today-plan";

export const Route = createFileRoute("/_authenticated/estudio")({ component: StudyCenterPage });

function StudyCenterPage() {
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
  const concepts = new Map(data.map((row) => [row.concept_id, row]));
  const retained = [...concepts.values()].filter((row) => row.state === "retained").length;
  const attention = [...concepts.values()].filter((row) => row.needs_attention).length;
  const units = new Map<string, { row: V4TodayContextRow; concepts: V4TodayContextRow[] }>();
  for (const row of data) {
    const existing = units.get(row.study_unit_id);
    if (existing) existing.concepts.push(row);
    else units.set(row.study_unit_id, { row, concepts: [row] });
  }
  const grouped = new Map<
    string,
    Array<{ row: V4TodayContextRow; concepts: V4TodayContextRow[] }>
  >();
  for (const unit of units.values()) {
    const key = `${unit.row.topic_number}. ${unit.row.topic_name}`;
    const list = grouped.get(key) ?? [];
    list.push(unit);
    grouped.set(key, list);
  }

  return (
    <div className="space-y-5">
      <header className="pt-2">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
          Centro de estudio
        </p>
        <h1 className="mt-1 text-2xl font-bold">Tu conocimiento</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consulta qué has trabajado y dónde conviene prestar atención.
        </p>
      </header>
      <section id="hoja-de-ruta" aria-label="Hoja de ruta semanal">
        <WeeklyRoadmap />
      </section>
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="p-6 text-center">
          <AlertCircle className="mx-auto h-7 w-7 text-destructive" />
          <p className="mt-3 font-bold">No se pudo cargar el centro de estudio</p>
          <Button className="mt-4 w-full" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </Card>
      ) : data.length === 0 ? (
        <Card className="p-6 text-center">
          <BookOpen className="mx-auto h-7 w-7 text-primary" />
          <h2 className="mt-3 font-bold">Aún no hay unidades disponibles</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Puedes seguir usando los tests mientras se incorpora contenido V4.
          </p>
          <Button asChild className="mt-4 w-full">
            <Link to="/crear">Crear test</Link>
          </Button>
        </Card>
      ) : (
        <>
          <Card className="grid grid-cols-3 divide-x overflow-hidden p-0">
            <Summary value={concepts.size} label="Conocimientos" />
            <Summary value={retained} label="Retenidos" />
            <Summary
              value={attention}
              label="Atención"
              tone={attention > 0 ? "warning" : "default"}
            />
          </Card>
          {attention > 0 && (
            <Link to="/inicio" className="block">
              <Card className="flex items-center gap-3 border-warning/30 bg-warning/8 p-4">
                <span className="rounded-xl bg-warning/15 p-2.5 text-warning-foreground">
                  <ShieldAlert className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">
                    {attention} {attention === 1 ? "punto necesita" : "puntos necesitan"} atención
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Hoy los ordena por prioridad para que no tengas que elegir.
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Card>
            </Link>
          )}
          {[...grouped.entries()]
            .sort(([a], [b]) => a.localeCompare(b, "es", { numeric: true }))
            .map(([topic, topicUnits]) => (
              <section key={topic}>
                <h2 className="mb-2 text-sm font-bold">Tema {topic}</h2>
                <div className="space-y-2">
                  {topicUnits
                    .sort((a, b) => a.row.unit_position - b.row.unit_position)
                    .map((unit) => (
                      <UnitCard key={unit.row.study_unit_id} unit={unit} />
                    ))}
                </div>
              </section>
            ))}
        </>
      )}
    </div>
  );
}

function UnitCard({ unit }: { unit: { row: V4TodayContextRow; concepts: V4TodayContextRow[] } }) {
  const worked = unit.concepts.filter((concept) => concept.state !== "unseen").length;
  const attention = unit.concepts.some((concept) => concept.needs_attention);
  const highest = unit.concepts.reduce(
    (best, concept) => (stateRank(concept.state) > stateRank(best.state) ? concept : best),
    unit.concepts[0],
  );
  return (
    <Card className="overflow-hidden p-0">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${unit.row.unit_completed ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}
          >
            {unit.row.unit_completed ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <BookOpen className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-bold leading-snug">{unit.row.study_unit_title}</h3>
              {attention && (
                <span className="shrink-0 rounded-full bg-warning/15 px-2 py-1 text-[10px] font-bold text-warning-foreground">
                  Atención
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {worked}/{unit.concepts.length} conocimientos trabajados ·{" "}
              {MASTERY_LABELS[highest.state]}
            </p>
            <Progress value={(worked / unit.concepts.length) * 100} className="mt-3 h-1.5" />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t bg-muted/25 px-4 py-3">
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" /> {unit.row.unit_estimated_minutes} min
        </span>
        <Button asChild variant="ghost" size="sm" className="h-8 text-xs text-primary">
          <Link to="/estudiar/$unitId" params={{ unitId: unit.row.study_unit_id }}>
            {unit.row.unit_completed ? "Repasar unidad" : "Estudiar unidad"}
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
function stateRank(state: V4TodayContextRow["state"]) {
  return ["unseen", "seen", "verifying", "consolidating", "retained"].indexOf(state);
}
function Summary({
  value,
  label,
  tone = "default",
}: {
  value: number;
  label: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className="min-w-0 px-2 py-4 text-center">
      <p
        className={`text-xl font-bold ${tone === "warning" ? "text-warning-foreground" : "text-foreground"}`}
      >
        {value}
      </p>
      <p className="mt-1 truncate text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
