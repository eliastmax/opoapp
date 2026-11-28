import { createFileRoute, Link } from "@tanstack/react-router";
import { useId, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Grid2X2,
  List,
  Loader2,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CoverageFigures,
  CoverageRings,
  ProgressBar,
  Streak,
  TrainingError,
  trainingCard,
} from "@/components/training-visuals";
import { useActiveOpposition } from "@/hooks/use-active-opposition";
import {
  useConceptTraining,
  useTrainingActivity,
  useTrainingProgress,
  useTrainingTopics,
} from "@/hooks/use-training-overview";
import {
  evidenceDescription,
  groupTestsFirstProgressByTopic,
  hasLearnerAttention,
  type TestsFirstProgressRow,
  type TestsFirstState,
} from "@/lib/tests-first-progress";
import { coverage, percent, priorityKnowledge, type Coverage } from "@/lib/training-overview";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/progreso")({ component: ProgresoPage });

const states = {
  mastered: {
    label: "Dominado",
    plural: "Dominados",
    color: "bg-[#279d79]",
    description:
      "Has acertado con regularidad en suficientes preguntas y sesiones distintas, sin dudas pendientes en esa evidencia.",
  },
  consolidating: {
    label: "Consolidando",
    plural: "Consolidando",
    color: "bg-[#468bd3]",
    description:
      "Ya hay evidencia suficiente para evaluarlo y todavía necesita más práctica o variedad para afianzarse.",
  },
  needs_reinforcement: {
    label: "Por reforzar",
    plural: "Por reforzar",
    color: "bg-[#d49a36]",
    description:
      "Hay evidencia suficiente y tu porcentaje de aciertos indica que conviene volver a practicarlo.",
  },
  not_evaluated: {
    label: "Sin evaluar",
    plural: "Sin evaluar",
    color: "bg-[#92929b]",
    description:
      "Todavía falta evidencia de tests para evaluar este conocimiento. Puedes haberlo estudiado o practicado ya.",
  },
} satisfies Record<
  TestsFirstState,
  { label: string; plural: string; color: string; description: string }
>;
const stateOrder = Object.keys(states) as TestsFirstState[];
const pageSize = 20;

type Topic = {
  id: string;
  numero: number;
  nombre: string;
  rows: TestsFirstProgressRow[];
  summary: Coverage;
};

function ProgresoPage() {
  const { user } = Route.useRouteContext();
  const opposition = useActiveOpposition();
  const oppositionId = opposition.data?.id;
  const progress = useTrainingProgress(user.id, oppositionId);
  const catalog = useTrainingTopics(oppositionId);
  const activity = useTrainingActivity(user.id, oppositionId);
  const rows = progress.data ?? [];
  const summary = coverage(rows);
  const byTopic = new Map(
    groupTestsFirstProgressByTopic(rows).map((topic) => [topic.topic_id, topic.rows]),
  );
  const topics: Topic[] = (catalog.data ?? []).map((topic) => {
    const matched = byTopic.get(topic.id) ?? [];
    return { ...topic, rows: matched, summary: coverage(matched) };
  });

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3 pt-3">
        <div className="min-w-0">
          {opposition.data && (
            <p className="mb-2 text-xs font-semibold tracking-wide text-primary">
              {opposition.data.name}
            </p>
          )}
          <h1 className="text-[2rem] leading-tight font-bold tracking-tight">Progreso</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Consulta tu dominio y decide qué practicar.
          </p>
        </div>
        <ProgressInfo />
      </header>
      {opposition.isError || progress.isError || catalog.isError ? (
        <TrainingError
          message="Tu progreso no se ha podido cargar."
          retry={() => {
            if (opposition.isError) void opposition.refetch();
            if (progress.isError) void progress.refetch();
            if (catalog.isError) void catalog.refetch();
          }}
        />
      ) : opposition.isLoading || progress.isLoading || catalog.isLoading ? (
        <Skeleton className="h-64 rounded-[1.5rem]" aria-label="Cargando el progreso" />
      ) : !oppositionId ? (
        <div className={cn(trainingCard, "space-y-3 p-5")}>
          <p className="text-sm">Elige una oposición para consultar tu temario.</p>
          <Button asChild className="h-11">
            <Link to="/preparacion">Elegir oposición</Link>
          </Button>
        </div>
      ) : (
        <ProgressContent
          key={`${user.id}:${oppositionId}`}
          rows={rows}
          topics={topics}
          summary={summary}
          activity={activity}
        />
      )}
    </div>
  );
}

function ProgressInfo() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="size-11 shrink-0 rounded-full"
          aria-label="Cómo calculamos el progreso"
        >
          <CircleHelp aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-[1.5rem] motion-reduce:animate-none">
        <DialogTitle className="pr-4 leading-snug">Cómo calculamos el progreso</DialogTitle>
        <DialogDescription>
          El temario trabajado incluye los conocimientos con evidencia suficiente para evaluarlos.
          El dominio cuenta solo los dominados. Los dos porcentajes se calculan sobre todos los
          conocimientos activos de tu oposición.
        </DialogDescription>
        <dl className="space-y-3">
          {stateOrder.map((state) => (
            <div key={state} className="rounded-xl bg-muted/65 p-3">
              <dt className="flex items-center gap-2 text-sm font-bold">
                <Dot color={states[state].color} /> {states[state].label}
              </dt>
              <dd className="mt-1 text-sm text-muted-foreground">{states[state].description}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-muted-foreground">
          El dominio puede subir o bajar con nuevas respuestas. Este indicador no equivale a una
          probabilidad de aprobar el examen.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function ProgressContent({
  rows,
  topics,
  summary,
  activity,
}: {
  rows: TestsFirstProgressRow[];
  topics: Topic[];
  summary: Coverage;
  activity: ReturnType<typeof useTrainingActivity>;
}) {
  const [mode, setMode] = useState<"map" | "list">("map");
  const [selectedId, setSelectedId] = useState<string>();
  const [detail, setDetail] = useState<"all" | "topic" | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const overallButton = useRef<HTMLButtonElement>(null);
  const topicButton = useRef<HTMLButtonElement>(null);
  const selectedHeading = useRef<HTMLHeadingElement>(null);
  const selected =
    topics.find((topic) => topic.id === selectedId) ??
    topics.find((topic) => topic.rows.some((row) => row.distinct_test_questions > 0)) ??
    topics[0];
  const started = topics.filter((topic) =>
    topic.rows.some((row) => row.distinct_test_questions > 0),
  ).length;
  const hasActivity = !activity.isError && activity.data;
  const recentAccuracy = hasActivity ? hasActivity.accuracy : null;

  function openDetail(view: "all" | "topic") {
    setDetail(view);
    requestAnimationFrame(() => heading.current?.focus());
  }

  function closeDetail() {
    setDetail(null);
    requestAnimationFrame(() => (detail === "all" ? overallButton : topicButton).current?.focus());
  }

  if (detail) {
    return (
      <KnowledgeDetail
        heading={heading}
        rows={rows}
        topics={topics}
        initialTopic={detail === "topic" ? selected : undefined}
        onBack={closeDetail}
      />
    );
  }

  return (
    <>
      <section
        data-tour="progress-overview"
        className={cn(trainingCard, "overflow-hidden")}
        aria-labelledby="progress-summary"
      >
        <div className="p-4">
          <h2 id="progress-summary" className="font-bold">
            Tu temario de un vistazo
          </h2>
          <div className="mt-4 mb-3 flex items-center gap-5">
            <CoverageRings summary={summary} />
            <CoverageFigures summary={summary} />
          </div>
          {summary.total === 0 && (
            <p className="my-3 text-sm text-muted-foreground">
              Aún no hay conocimientos activos para medir el progreso.
            </p>
          )}
          <dl className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-muted/65 px-3 py-2.5">
              <dt className="text-xs text-muted-foreground">Temas iniciados</dt>
              <dd className="mt-0.5 font-bold tabular-nums">
                {started} de {topics.length}
              </dd>
            </div>
            <div className="rounded-xl bg-muted/65 px-3 py-2.5">
              <dt className="text-xs text-muted-foreground">Acierto en 7 días</dt>
              <dd className="mt-0.5 font-bold tabular-nums">
                {recentAccuracy === null ? "—" : `${recentAccuracy}%`}
              </dd>
            </div>
          </dl>
          {hasActivity && (
            <div className="mt-3">
              <Streak days={hasActivity.streak} />
            </div>
          )}
          {activity.isError && (
            <div className="mt-3">
              <TrainingError
                message="No se ha podido cargar la actividad reciente."
                retry={() => void activity.refetch()}
              />
            </div>
          )}
        </div>
        {summary.total > 0 && (
          <button
            type="button"
            ref={overallButton}
            onClick={() => openDetail("all")}
            className="flex min-h-12 w-full items-center justify-between gap-2 border-t px-4 text-left text-sm font-semibold text-primary transition-colors hover:bg-accent/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          >
            Ver progreso detallado <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
          </button>
        )}
      </section>

      {selected && (
        <>
          <section className={cn(trainingCard, "p-4")} aria-labelledby="map-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="map-heading" className="font-bold">
                Mapa del temario
              </h2>
              <div
                className="flex rounded-xl bg-muted p-1"
                role="group"
                aria-label="Vista del temario"
              >
                <ViewButton
                  active={mode === "map"}
                  onClick={() => setMode("map")}
                  icon={Grid2X2}
                  label="Mapa"
                />
                <ViewButton
                  active={mode === "list"}
                  onClick={() => setMode("list")}
                  icon={List}
                  label="Listado"
                />
              </div>
            </div>
            <ul
              className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"
              aria-label="Leyenda del mapa"
            >
              <li className="flex items-center gap-1.5">
                <Dot color="bg-[#279d79]" /> Dominado
              </li>
              <li className="flex items-center gap-1.5">
                <Dot color="bg-[#468bd3]" /> Por dominar
              </li>
              <li className="flex items-center gap-1.5">
                <Dot color="bg-[#92929b]" /> Sin evaluar
              </li>
            </ul>
            <ul
              className={cn(
                "mt-4",
                mode === "map" ? "grid grid-cols-6 gap-1.5 min-[390px]:gap-2" : "space-y-2",
              )}
            >
              {topics.map((topic) => (
                <li className="min-w-0" key={topic.id}>
                  <TopicTile
                    topic={topic}
                    mode={mode}
                    selected={selected.id === topic.id}
                    onClick={() => {
                      setSelectedId(topic.id);
                      if (mode === "list")
                        requestAnimationFrame(() => selectedHeading.current?.focus());
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>
          <section
            id="tema-seleccionado"
            className={cn(trainingCard, "space-y-3 p-4")}
            aria-labelledby="selected-topic"
          >
            <div>
              <p className="text-xs font-bold text-primary">Tema {selected.numero}</p>
              <h2
                id="selected-topic"
                ref={selectedHeading}
                tabIndex={-1}
                className="scroll-mt-4 outline-none mt-1 text-lg leading-snug font-bold break-words"
              >
                {selected.nombre}
              </h2>
            </div>
            <ProgressBar summary={selected.summary} />
            {selected.summary.total > 0 ? (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  <strong className="text-foreground">
                    {percent(selected.summary.worked, selected.summary.total)}%
                  </strong>{" "}
                  trabajado
                </span>
                <span>
                  <strong className="text-foreground">
                    {percent(selected.summary.mastered, selected.summary.total)}%
                  </strong>{" "}
                  dominado
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Este tema aún no tiene conocimientos activos para medir.
              </p>
            )}
            <TopicPriorities rows={selected.rows} />
            <div className="space-y-2 pt-1">
              <Button className="h-11 w-full" asChild>
                <Link to="/crear" search={{ topic: selected.id }}>
                  <Play aria-hidden="true" /> Entrenar este tema
                </Link>
              </Button>
              <Button
                ref={topicButton}
                className="h-11 w-full justify-between"
                variant="ghost"
                onClick={() => openDetail("topic")}
              >
                Ver todos los conocimientos <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </section>
        </>
      )}
      <Button variant="ghost" className="h-11 w-full text-muted-foreground" asChild>
        <Link to="/historial">Ver historial de tests</Link>
      </Button>
    </>
  );
}

function ViewButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof List;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring",
        active ? "bg-card text-primary shadow-sm" : "text-muted-foreground",
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" /> {label}
    </button>
  );
}

function Dot({ color }: { color: string }) {
  return <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", color)} />;
}

function TopicTile({
  topic,
  selected,
  mode,
  onClick,
}: {
  topic: Topic;
  selected: boolean;
  mode: "map" | "list";
  onClick: () => void;
}) {
  const worked = percent(topic.summary.worked, topic.summary.total);
  const mastered = percent(topic.summary.mastered, topic.summary.total);
  const progressText =
    worked === null ? "sin conocimientos activos" : `${worked}% trabajado, ${mastered}% dominado`;
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`Tema ${topic.numero}: ${topic.nombre}, ${progressText}`}
      aria-controls="tema-seleccionado"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border text-left transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        selected ? "border-primary bg-primary/8 ring-1 ring-primary" : "bg-background",
        mode === "map"
          ? "flex min-h-12 flex-col items-center justify-center gap-1.5 p-1.5"
          : "flex items-center gap-3 p-3",
      )}
    >
      <span
        className={cn(
          "font-bold tabular-nums",
          mode === "list" &&
            "grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary",
        )}
      >
        {topic.numero}
      </span>
      {mode === "map" ? (
        <ProgressBar summary={topic.summary} className="h-1.5 w-full" />
      ) : (
        <span className="min-w-0 flex-1">
          <span className="block text-sm leading-snug font-semibold break-words">
            {topic.nombre}
          </span>
          <span className="my-1.5 block text-xs text-muted-foreground">{progressText}</span>
          <ProgressBar summary={topic.summary} />
        </span>
      )}
    </button>
  );
}

function TopicPriorities({ rows }: { rows: TestsFirstProgressRow[] }) {
  const priorities = priorityKnowledge(rows).slice(0, 3);
  if (!priorities.length) return null;
  return (
    <div className="rounded-xl border border-[#d49a36]/25 bg-[#d49a36]/10 p-3">
      <h3 className="text-sm font-bold">Qué te conviene reforzar</h3>
      <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
        {priorities.map((row) => (
          <li key={row.concept_id} className="flex items-baseline gap-2">
            <Dot color="bg-[#d49a36]" />
            <span>{row.concept_title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function KnowledgeDetail({
  heading,
  rows,
  topics,
  initialTopic,
  onBack,
}: {
  heading: React.RefObject<HTMLHeadingElement | null>;
  rows: TestsFirstProgressRow[];
  topics: Topic[];
  initialTopic?: Topic;
  onBack: () => void;
}) {
  const [topicId, setTopicId] = useState(initialTopic?.id ?? "");
  const [state, setState] = useState<TestsFirstState | "">("");
  const [page, setPage] = useState(1);
  const training = useConceptTraining();
  const scope = topicId ? (topics.find((topic) => topic.id === topicId)?.rows ?? []) : rows;
  const summary = coverage(scope);
  const filtered = state ? scope.filter((row) => row.learner_state === state) : scope;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);
  const results = useRef<HTMLParagraphElement>(null);
  const filterId = useId();

  function turnPage(next: number) {
    setPage(next);
    results.current?.focus();
  }
  const filterClass =
    "min-h-11 w-full min-w-0 rounded-xl border bg-background px-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring";

  return (
    <section className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="h-11">
        <ArrowLeft aria-hidden="true" /> Volver al resumen
      </Button>
      <div className={cn(trainingCard, "p-4")}>
        <h2 ref={heading} tabIndex={-1} className="text-xl font-bold tracking-tight outline-none">
          {initialTopic ? `Conocimientos del tema ${initialTopic.numero}` : "Progreso detallado"}
        </h2>
        {initialTopic && (
          <p className="mt-1 text-sm leading-snug text-muted-foreground">{initialTopic.nombre}</p>
        )}
        <dl className="mt-4 grid grid-cols-2 gap-2 min-[430px]:grid-cols-4">
          {stateOrder.map((key) => (
            <div key={key} className="flex flex-col rounded-xl bg-muted/65 p-2.5">
              <dt className="mt-0.5 text-xs text-muted-foreground">{states[key].plural}</dt>
              <dd className="order-first flex items-center gap-2 text-lg font-bold tabular-nums">
                <Dot color={states[key].color} /> {summary.states[key]}
              </dd>
            </div>
          ))}
        </dl>
        <div className={cn("mt-4 grid gap-2", !initialTopic && "grid-cols-2")}>
          {!initialTopic && (
            <div className="min-w-0 space-y-1">
              <label htmlFor={`${filterId}-topic`} className="block text-xs font-semibold">
                Tema
              </label>
              <select
                id={`${filterId}-topic`}
                className={filterClass}
                value={topicId}
                onChange={(event) => {
                  setTopicId(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todos los temas</option>
                {topics.map((topic) => (
                  <option value={topic.id} key={topic.id}>
                    Tema {topic.numero} · {topic.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="min-w-0 space-y-1">
            <label htmlFor={`${filterId}-state`} className="block text-xs font-semibold">
              Estado
            </label>
            <select
              id={`${filterId}-state`}
              className={filterClass}
              value={state}
              onChange={(event) => {
                setState(event.target.value as TestsFirstState | "");
                setPage(1);
              }}
            >
              <option value="">Todos los estados</option>
              {stateOrder.map((key) => (
                <option key={key} value={key}>
                  {states[key].plural}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <p
        ref={results}
        tabIndex={-1}
        className="text-xs text-muted-foreground outline-none"
        aria-live="polite"
      >
        {visible.length > 0
          ? `${start + 1}–${start + visible.length} de ${filtered.length} conocimientos`
          : "0 conocimientos"}
      </p>
      {visible.length > 0 ? (
        <ul className="space-y-2">
          {visible.map((row) => (
            <li key={row.concept_id}>
              <KnowledgeRow
                row={row}
                showTopic={!topicId}
                busy={training.isPending}
                onStart={() =>
                  training.mutate({
                    conceptId: row.concept_id,
                    questionCount: Math.min(3, row.active_primary_question_count),
                  })
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className={cn(trainingCard, "p-5 text-center text-sm text-muted-foreground")}>
          <BookOpen className="mx-auto mb-2 size-5 text-primary" aria-hidden="true" /> No hay
          conocimientos con estos filtros.
        </div>
      )}
      {pages > 1 && (
        <nav
          className="flex items-center justify-between gap-2"
          aria-label="Páginas de conocimientos"
        >
          <Button
            className="h-11"
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => turnPage(currentPage - 1)}
          >
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground">
            {currentPage} de {pages}
          </span>
          <Button
            className="h-11"
            variant="outline"
            disabled={currentPage === pages}
            onClick={() => turnPage(currentPage + 1)}
          >
            Siguiente
          </Button>
        </nav>
      )}
    </section>
  );
}

const reviewDate = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });

function KnowledgeRow({
  row,
  showTopic,
  busy,
  onStart,
}: {
  row: TestsFirstProgressRow;
  showTopic: boolean;
  busy: boolean;
  onStart: () => void;
}) {
  const definition = states[row.learner_state];
  return (
    <details className={cn(trainingCard, "group overflow-hidden rounded-2xl")}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-3.5 py-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <Dot color={definition.color} /> {definition.label}
            </span>
            {showTopic && <span>Tema {row.topic_number}</span>}
            {hasLearnerAttention(row) && (
              <span className="text-amber-900 dark:text-amber-100">Requiere atención</span>
            )}
          </div>
          <h3 className="mt-1 text-sm leading-snug font-bold break-words">{row.concept_title}</h3>
        </div>
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </summary>
      <div className="space-y-3 border-t px-3.5 py-3">
        <p className="text-sm leading-relaxed text-muted-foreground">{evidenceDescription(row)}</p>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          <div>
            <dt className="text-muted-foreground">Preguntas distintas</dt>
            <dd className="font-bold">{row.distinct_test_questions}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Tests completados</dt>
            <dd className="font-bold">{row.distinct_completed_test_sessions}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Respuestas con duda</dt>
            <dd className="font-bold">{row.doubt_answers}</dd>
          </div>
          {row.safe_accuracy !== null && (
            <div>
              <dt className="text-muted-foreground">Acierto con muestra suficiente</dt>
              <dd className="font-bold">{row.safe_accuracy}%</dd>
            </div>
          )}
          <div>
            <dt className="text-muted-foreground">Preguntas activas para entrenar</dt>
            <dd className="font-bold">{row.active_primary_question_count}</dd>
          </div>
        </dl>
        {row.next_review_on && (
          <p className="text-xs font-semibold text-primary">
            Próxima comprobación · {reviewDate.format(new Date(row.next_review_on))}
          </p>
        )}
        {row.active_primary_question_count > 0 && (
          <Button className="h-11" variant="outline" disabled={busy} onClick={onStart}>
            {busy ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Play aria-hidden="true" />
            )}{" "}
            Entrenar conocimiento
          </Button>
        )}
      </div>
    </details>
  );
}
