import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Layers3,
  Loader2,
  Play,
  RotateCcw,
  Target,
  Timer,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  historyOverview,
  historyTestLabel,
  matchesHistoryFilter,
  type HistoryFilter,
} from "@/lib/test-history";

export const Route = createFileRoute("/_authenticated/historial")({
  component: HistorialPage,
});

const FILTERS: { value: HistoryFilter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "completados", label: "Terminados" },
  { value: "pendientes", label: "Pendientes" },
  { value: "simulacros", label: "Simulacros" },
];

function HistorialPage() {
  const [filter, setFilter] = useState<HistoryFilter>("todos");
  const { data, isLoading } = useQuery({
    queryKey: ["tests-history"],
    queryFn: async () => {
      const result = await supabase
        .from("tests")
        .select("*")
        .order("created_at", { ascending: false });
      if (result.error) throw result.error;
      return result.data ?? [];
    },
  });

  const tests = data ?? [];
  const overview = historyOverview(tests);
  const filteredTests = tests.filter((test) => matchesHistoryFilter(test, filter));

  return (
    <div className="space-y-4">
      <header className="pt-2">
        <h1 className="text-2xl font-bold">Historial</h1>
        <p className="text-sm text-muted-foreground">
          Consulta resultados o continúa donde lo dejaste
        </p>
      </header>

      {!isLoading && tests.length > 0 && (
        <>
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-0">
            <div className="flex items-center gap-3 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Tu actividad</p>
                <p className="text-xs text-muted-foreground">
                  Resumen de los tests que ya has terminado
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 border-t border-primary/10 bg-background/45">
              <OverviewMetric value={overview.completed} label="Tests" />
              <OverviewMetric value={overview.answered} label="Respondidas" bordered />
              <OverviewMetric value={`${overview.accuracy}%`} label="Acierto global" />
            </div>
          </Card>

          <div className="grid grid-cols-4 gap-1 rounded-2xl bg-muted/70 p-1">
            {FILTERS.map((item) => (
              <Button
                key={item.value}
                type="button"
                variant={filter === item.value ? "default" : "ghost"}
                size="sm"
                className="h-9 rounded-xl px-1 text-xs"
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : tests.length === 0 ? (
        <Card className="p-7 text-center">
          <ClipboardList className="mx-auto mb-3 h-8 w-8 text-primary" />
          <p className="font-semibold">Tu historial está vacío</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cuando empieces un test, podrás recuperarlo y consultar aquí su resultado.
          </p>
          <Button asChild className="mt-4">
            <Link to="/crear">Crear mi primer test</Link>
          </Button>
        </Card>
      ) : filteredTests.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm font-medium">No hay tests en este filtro</p>
          <Button
            type="button"
            variant="link"
            className="mt-1 h-auto p-0"
            onClick={() => setFilter("todos")}
          >
            Ver todo el historial
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTests.map((test) => (
            <HistoryCard key={test.id} test={test} />
          ))}
        </div>
      )}
    </div>
  );
}

function OverviewMetric({
  value,
  label,
  bordered = false,
}: {
  value: string | number;
  label: string;
  bordered?: boolean;
}) {
  return (
    <div
      className={
        bordered ? "border-x border-primary/10 px-2 py-3 text-center" : "px-2 py-3 text-center"
      }
    >
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function HistoryCard({
  test,
}: {
  test: {
    id: string;
    tipo: string;
    created_at: string;
    completado: boolean;
    numero_preguntas: number;
    aciertos: number;
    fallos: number;
    sin_responder: number;
    porcentaje: number;
    exam_duration_minutes: number | null;
  };
}) {
  const linkProps = test.completado
    ? { to: "/resultados/$id" as const, params: { id: test.id } }
    : { to: "/test/$id" as const, params: { id: test.id } };
  const percentage = Number(test.porcentaje ?? 0);
  const isSimulation = test.tipo === "simulacro";
  const isMultiTopic = test.tipo.startsWith("multitema_");
  const isReview = test.tipo === "falladas" || test.tipo === "dudas";
  const Icon = isSimulation ? Timer : isMultiTopic ? Layers3 : isReview ? RotateCcw : ClipboardList;
  const scoreColor =
    percentage >= 80
      ? "text-emerald-600 dark:text-emerald-400"
      : percentage >= 60
        ? "text-amber-600 dark:text-amber-400"
        : "text-rose-600 dark:text-rose-400";
  const barColor =
    percentage >= 80 ? "bg-emerald-500" : percentage >= 60 ? "bg-amber-500" : "bg-rose-500";

  return (
    <Link {...linkProps} className="block">
      <Card className="group overflow-hidden p-0 transition-all hover:border-primary/30 hover:shadow-md">
        <div className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold leading-snug">{historyTestLabel(test.tipo)}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock3 className="h-3 w-3" />
                  {formatHistoryDate(test.created_at)}
                </p>
              </div>
              {test.completado ? (
                <div className="shrink-0 text-right">
                  <p className={`text-xl font-bold ${scoreColor}`}>{percentage}%</p>
                  <p className="text-[11px] text-muted-foreground">
                    {test.aciertos}/{test.numero_preguntas}
                  </p>
                </div>
              ) : (
                <Badge className="shrink-0 gap-1">
                  <Play className="h-3 w-3" /> Continuar
                </Badge>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                {test.numero_preguntas} preguntas
                {test.exam_duration_minutes ? ` · ${test.exam_duration_minutes} min` : ""}
              </span>
              <span className="flex items-center gap-1 font-medium text-primary">
                {test.completado ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ver resultado
                  </>
                ) : (
                  <>
                    Abrir <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
        {test.completado && (
          <div className="h-1 bg-muted">
            <div
              className={`h-full ${barColor}`}
              style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
            />
          </div>
        )}
      </Card>
    </Link>
  );
}

function formatHistoryDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
