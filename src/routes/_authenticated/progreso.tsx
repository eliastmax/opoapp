import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CalendarClock,
  ChevronDown,
  CircleAlert,
  History,
  Loader2,
  Play,
  ShieldCheck,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  TESTS_FIRST_STATE_LABELS,
  TESTS_FIRST_STATE_STYLES,
  evidenceDescription,
  groupTestsFirstProgressByTopic,
  testsFirstStateTotals,
  type TestsFirstProgressRow,
} from "@/lib/tests-first-progress";
import { toUserFacingError } from "@/lib/user-facing-error";

export const Route = createFileRoute("/_authenticated/progreso")({ component: ProgresoPage });

function ProgresoPage() {
  const navigate = useNavigate();
  const [startingConceptId, setStartingConceptId] = useState<string | null>(null);
  const {
    data = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tests-first-concept-progress"],
    queryFn: async () => {
      const result = await supabase.rpc("get_my_tests_first_concept_progress");
      if (result.error) throw result.error;
      return (result.data ?? []) as TestsFirstProgressRow[];
    },
  });
  const totals = useMemo(() => testsFirstStateTotals(data), [data]);
  const topics = useMemo(() => groupTestsFirstProgressByTopic(data), [data]);
  const attention = useMemo(
    () =>
      data
        .filter((row) => row.attention_required || row.learner_state === "needs_reinforcement")
        .slice(0, 3),
    [data],
  );

  async function startConceptTest(row: TestsFirstProgressRow) {
    if (startingConceptId || row.active_primary_question_count < 1) return;
    setStartingConceptId(row.concept_id);
    const result = await supabase.rpc("create_tests_first_concept_test", {
      p_concept_ids: [row.concept_id],
      p_question_count: Math.min(3, row.active_primary_question_count),
    });
    if (result.error || !result.data?.[0]) {
      toast.error(toUserFacingError(result.error ?? new Error("No se pudo crear el test")).message);
      setStartingConceptId(null);
      return;
    }
    navigate({
      to: "/test/$id",
      params: { id: result.data[0].test_id },
      search: { block: undefined, session: undefined },
    });
  }

  return (
    <div className="space-y-4 pb-6">
      <header className="pt-2">
        <h1 className="text-2xl font-bold">Progreso</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Qué sabes realmente según tus tests y dónde quedan huecos por comprobar.
        </p>
      </header>
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="p-5 text-center">
          <AlertCircle className="mx-auto mb-2 h-6 w-6 text-destructive" />
          <p className="font-semibold">No se pudo cargar el progreso</p>
          <Button className="mt-4" variant="outline" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </Card>
      ) : data.length === 0 ? (
        <Card className="p-6 text-center">
          <Target className="mx-auto mb-2 h-7 w-7 text-primary" />
          <p className="font-semibold">No hay conceptos activos para esta oposición</p>
        </Card>
      ) : (
        <>
          <StateOverview totals={totals} total={data.length} />
          {attention.length > 0 && (
            <section aria-labelledby="attention-title">
              <h2 id="attention-title" className="font-bold">
                Requieren atención
              </h2>
              <p className="mb-2 text-xs text-muted-foreground">
                Priorizados por evidencia de tests y dudas confirmadas.
              </p>
              <div className="space-y-2">
                {attention.map((row) => (
                  <ConceptCard
                    key={row.concept_id}
                    row={row}
                    compact
                    starting={startingConceptId === row.concept_id}
                    onStart={() => void startConceptTest(row)}
                  />
                ))}
              </div>
            </section>
          )}
          <section aria-labelledby="topics-title" className="space-y-2">
            <h2 id="topics-title" className="font-bold">
              Conceptos por tema
            </h2>
            <p className="text-xs text-muted-foreground">
              No evaluado significa evidencia insuficiente de tests, no “no estudiado”.
            </p>
            {topics.map((topic) => (
              <details key={topic.topic_id} className="group rounded-2xl border bg-card/90">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-primary/10 px-2 text-sm font-bold text-primary">
                    {topic.topic_number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{topic.topic_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {topic.rows.length} {topic.rows.length === 1 ? "concepto" : "conceptos"}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="space-y-2 border-t p-3">
                  {topic.rows.map((row) => (
                    <ConceptCard
                      key={row.concept_id}
                      row={row}
                      starting={startingConceptId === row.concept_id}
                      onStart={() => void startConceptTest(row)}
                    />
                  ))}
                </div>
              </details>
            ))}
          </section>
          <Button asChild variant="outline" className="h-11 w-full">
            <Link to="/historial">
              <History className="h-4 w-4" /> Ver historial de tests
            </Link>
          </Button>
        </>
      )}
    </div>
  );
}

function StateOverview({
  totals,
  total,
}: {
  totals: ReturnType<typeof testsFirstStateTotals>;
  total: number;
}) {
  const states = ["not_evaluated", "needs_reinforcement", "consolidating", "mastered"] as const;
  return (
    <Card className="overflow-hidden border-primary/15 p-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="font-bold">Tu mapa tests-first</h2>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 min-[430px]:grid-cols-4">
        {states.map((state) => (
          <div key={state} className="rounded-xl bg-muted/55 p-3 text-center">
            <p className="text-xl font-bold">{totals[state]}</p>
            <p className="mt-1 text-[11px] leading-tight text-muted-foreground">
              {TESTS_FIRST_STATE_LABELS[state]}
            </p>
          </div>
        ))}
      </div>
      <Progress value={(totals.mastered / total) * 100} className="mt-4 h-2" />
      <p className="mt-2 text-xs text-muted-foreground">
        {totals.mastered} de {total} conceptos tienen evidencia diversa y suficiente para figurar
        como Dominados.
      </p>
    </Card>
  );
}

function ConceptCard({
  row,
  compact = false,
  starting,
  onStart,
}: {
  row: TestsFirstProgressRow;
  compact?: boolean;
  starting: boolean;
  onStart: () => void;
}) {
  const canTrain = row.active_primary_question_count > 0;
  return (
    <Card className={compact ? "p-3" : "p-3.5"}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={TESTS_FIRST_STATE_STYLES[row.learner_state]}>
              {TESTS_FIRST_STATE_LABELS[row.learner_state]}
            </Badge>
            {row.attention_required && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                <CircleAlert className="h-3.5 w-3.5" /> Atención
              </span>
            )}
          </div>
          <h3 className="mt-2 break-words text-sm font-bold leading-snug">{row.concept_title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {evidenceDescription(row)}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span>{row.distinct_test_questions} preguntas distintas</span>
            <span>{row.distinct_completed_test_sessions} sesiones</span>
            {row.safe_accuracy !== null && <span>{row.safe_accuracy}% de acierto seguro</span>}
            <span>{row.active_primary_question_count} PRIMARY activas</span>
          </div>
          {row.next_review_on && (
            <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
              <CalendarClock className="h-3.5 w-3.5" /> Toca comprobarlo:{" "}
              {formatDate(row.next_review_on)}
            </p>
          )}
          {!canTrain && (
            <p className="mt-2 text-xs text-muted-foreground">
              No hay capacidad PRIMARY activa para entrenar este concepto.
            </p>
          )}
        </div>
        <Button
          size="sm"
          variant={row.learner_state === "needs_reinforcement" ? "default" : "outline"}
          className="h-9 shrink-0 px-3"
          disabled={!canTrain || starting}
          onClick={onStart}
        >
          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          <span className="hidden min-[390px]:inline">
            {row.learner_state === "needs_reinforcement" ? "Reforzar" : "Entrenar"}
          </span>
        </Button>
      </div>
      {row.learner_state === "mastered" && (
        <div className="mt-3 flex items-center gap-1.5 border-t pt-2 text-[11px] text-emerald-700 dark:text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" /> Evidencia suficiente y diversa
        </div>
      )}
    </Card>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" }).format(
    new Date(value),
  );
}
