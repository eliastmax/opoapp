import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCopy,
  Clock3,
  Compass,
  ListChecks,
  Flag,
  Lightbulb,
  Loader2,
  MinusCircle,
  RefreshCcw,
  ShieldCheck,
  Target,
  XCircle,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { keepActiveFailureIds } from "@/lib/active-failures";
import { keepActiveDoubtIds } from "@/lib/active-doubts";
import {
  SELECTION_LABELS,
  summarizeSelection,
  type SelectionTraceRow,
} from "@/lib/smart-selection";
import {
  answerWithText,
  buildDiagnosticGroups,
  buildTestExport,
  questionReference,
  type DiagnosticAnswer,
  type DiagnosticQuestion,
} from "@/lib/result-diagnostics";
import { LEARNING_STAGE_LABELS, learningStage } from "@/lib/learning-stages";
import { resultFeedback } from "@/lib/result-feedback";
import { trainingCard } from "@/components/training-visuals";
import { cn } from "@/lib/utils";
import { useActiveOpposition } from "@/hooks/use-active-opposition";
import { topicLabel } from "@/lib/topic-label";
import { elapsedExamMinutes } from "@/lib/exam-simulation";
import type { Database } from "@/integrations/supabase/types";
import {
  TESTS_FIRST_STATE_LABELS,
  TESTS_FIRST_STATE_STYLES,
  evidenceDescription,
  type TestsFirstProgressRow,
} from "@/lib/tests-first-progress";
import { Badge } from "@/components/ui/badge";
import { toUserFacingError } from "@/lib/user-facing-error";

export const Route = createFileRoute("/_authenticated/resultados/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    block: typeof search.block === "string" ? search.block : undefined,
    session: typeof search.session === "string" ? search.session : undefined,
  }),
  component: ResultadosPage,
});

type AnswerRow = {
  id: string;
  respuesta_usuario: string | null;
  correcta: boolean | null;
  orden: number;
  question_id: string;
  marked_doubt: boolean;
  questions: {
    codigo: string;
    dificultad: string;
    dificultad_examen: string | null;
    nivel_pedagogico: string | null;
    pregunta: string;
    opcion_a: string;
    opcion_b: string;
    opcion_c: string;
    opcion_d: string;
    respuesta_correcta: string;
    explicacion: string | null;
    referencia_fuente: string | null;
    concepto: string | null;
    perspectiva: string | null;
    apartado: string | null;
    documento_referencia: string | null;
    pagina_inicio: number | null;
    pagina_fin: number | null;
    objetivo_aprendizaje: string | null;
    topics: { nombre: string; numero: number } | null;
    subtopics: { nombre: string } | null;
  } | null;
};

type CompletedTestConcept = Omit<
  Database["public"]["Functions"]["get_my_completed_test_concepts"]["Returns"][number],
  "learner_state"
> & { learner_state: TestsFirstProgressRow["learner_state"] };

function ResultadosPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const opposition = useActiveOpposition();
  const [tab, setTab] = useState<"fallos" | "dudas" | "todas" | null>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const [continuingSession, setContinuingSession] = useState(false);
  const [startingWeakPoints, setStartingWeakPoints] = useState(false);

  async function continueGuidedSession() {
    if (!search.block) return;
    setContinuingSession(true);
    const result = await supabase.rpc("complete_my_v4_daily_block", {
      p_block_id: search.block,
      p_linked_test_id: id,
    });
    if (result.error) {
      toast.error(result.error.message);
      setContinuingSession(false);
      return;
    }
    navigate({ to: "/sesion" });
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["resultados", user.id, opposition.data?.id, id],
    enabled: Boolean(opposition.data?.id),
    queryFn: async () => {
      const [resultResponse, conceptsResponse] = await Promise.all([
        supabase.rpc("get_my_completed_test_result", { p_test_id: id }),
        supabase.rpc("get_my_completed_test_concepts", { p_test_id: id }),
      ]);
      if (resultResponse.error) {
        const { code, message } = resultResponse.error;
        if (code === "22P02" || code === "42501" || message === "Completed test not found") {
          return null;
        }
        throw resultResponse.error;
      }
      if (!resultResponse.data) return null;
      if (conceptsResponse.error) throw conceptsResponse.error;
      const result = resultResponse.data as unknown as {
        test: Database["public"]["Tables"]["tests"]["Row"];
        answers: AnswerRow[];
        selection: SelectionTraceRow[];
      };
      return {
        test: result.test,
        answers: result.answers ?? [],
        selection: result.selection ?? [],
        concepts: (conceptsResponse.data ?? []) as CompletedTestConcept[],
      };
    },
  });

  if (isLoading || opposition.isLoading)
    return (
      <div className="flex items-center justify-center pt-20">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  if (isError || opposition.isError || !data?.test) {
    const failed = isError || opposition.isError;
    return (
      <Card className="space-y-3 p-5" role={failed ? "alert" : "status"}>
        <h1 className="text-lg font-bold">
          {failed ? "No hemos podido cargar el resultado" : "Resultado no disponible"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {failed
            ? "Comprueba tu conexión e inténtalo de nuevo."
            : "Puede que el test esté pendiente, pertenezca a otra cuenta o sea de otra oposición."}
        </p>
        <div className="flex flex-wrap gap-2">
          {failed && (
            <Button onClick={() => void (opposition.isError ? opposition.refetch() : refetch())}>
              Reintentar
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link to="/historial">Volver a Historial</Link>
          </Button>
        </div>
      </Card>
    );
  }

  const t = data.test;
  const answers = data.answers;
  const falladas = answers.filter((a) => a.correcta === false);
  const dudosas = answers.filter((a) => a.marked_doubt);
  const hasReview = falladas.length > 0 || dudosas.length > 0;
  const reviewTab = falladas.length > 0 ? "fallos" : "dudas";
  const diagnosticGroups = buildDiagnosticGroups(answers as unknown as DiagnosticAnswer[]);
  const {
    counts: selectionCounts,
    previousOverlap,
    overlapException,
  } = summarizeSelection(data.selection);
  const weakConcepts = data.concepts
    .filter(
      (concept) => concept.learner_state === "needs_reinforcement" || concept.attention_required,
    )
    .slice(0, 3);

  const byTopic: Record<string, { ok: number; tot: number }> = {};
  answers.forEach((a) => {
    const q = a.questions;
    if (!q) return;
    const topicName = q.topics
      ? topicLabel(q.topics.numero, q.topics.nombre)
      : "Tema sin identificar";
    byTopic[topicName] ??= { ok: 0, tot: 0 };
    byTopic[topicName].tot++;
    if (a.correcta) byTopic[topicName].ok++;
  });

  async function repetirFalladas() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user!.id;
    const historicalIds = falladas.map((f) => f.question_id);
    if (historicalIds.length === 0) {
      toast.error("No hay falladas");
      return;
    }

    const { data: activeRows, error: activeError } = await supabase
      .from("active_failed_questions")
      .select("question_id")
      .eq("user_id", userId)
      .in("question_id", historicalIds);
    if (activeError) {
      toast.error(activeError.message);
      return;
    }

    const qids = keepActiveFailureIds(historicalIds, activeRows ?? []);
    if (qids.length === 0) {
      toast.success("Estas preguntas ya están corregidas");
      return;
    }

    const { data: newTest, error } = await supabase
      .from("tests")
      .insert({
        user_id: userId,
        tipo: "falladas",
        learning_stage: t.learning_stage,
        stage_free_mode: t.stage_free_mode,
        numero_preguntas: qids.length,
        sin_responder: qids.length,
      })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    const rows = qids.map((qid, i) => ({
      user_id: userId,
      test_id: newTest.id,
      question_id: qid,
      orden: i + 1,
    }));
    const { error: answersError } = await supabase.from("test_answers").insert(rows);
    if (answersError) {
      toast.error(answersError.message);
      return;
    }
    navigate({
      to: "/test/$id",
      params: { id: newTest.id },
      search: { block: undefined, session: undefined },
    });
  }

  async function repetirDudas() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user!.id;
    const historicalIds = dudosas.map((answer) => answer.question_id);
    if (historicalIds.length === 0) {
      toast.error("No hay dudas en este test");
      return;
    }

    const { data: activeRows, error: activeError } = await supabase
      .from("active_doubt_questions")
      .select("question_id")
      .eq("user_id", userId)
      .in("question_id", historicalIds);
    if (activeError) {
      toast.error(activeError.message);
      return;
    }

    const qids = keepActiveDoubtIds(historicalIds, activeRows ?? []);
    if (qids.length === 0) {
      toast.success("Estas dudas ya están repasadas");
      return;
    }

    const { data: newTest, error } = await supabase
      .from("tests")
      .insert({
        user_id: userId,
        tipo: "dudas",
        learning_stage: t.learning_stage,
        stage_free_mode: t.stage_free_mode,
        numero_preguntas: qids.length,
        sin_responder: qids.length,
      })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    const rows = qids.map((qid, i) => ({
      user_id: userId,
      test_id: newTest.id,
      question_id: qid,
      orden: i + 1,
    }));
    const { error: answersError } = await supabase.from("test_answers").insert(rows);
    if (answersError) {
      toast.error(answersError.message);
      return;
    }
    navigate({
      to: "/test/$id",
      params: { id: newTest.id },
      search: { block: undefined, session: undefined },
    });
  }

  async function trainWeakPoints() {
    if (startingWeakPoints || weakConcepts.length === 0) return;
    setStartingWeakPoints(true);
    const available = weakConcepts.filter((concept) => concept.active_primary_question_count > 0);
    if (available.length === 0) {
      toast.info("Estos conceptos no tienen capacidad PRIMARY activa para crear otro test.");
      setStartingWeakPoints(false);
      return;
    }
    const result = await supabase.rpc("create_tests_first_concept_test", {
      p_concept_ids: available.map((concept) => concept.concept_id),
      p_question_count: Math.min(
        10,
        available.reduce((total, concept) => total + concept.active_primary_question_count, 0),
      ),
    });
    if (result.error || !result.data?.[0]) {
      toast.error(toUserFacingError(result.error ?? new Error("No se pudo crear el test")).message);
      setStartingWeakPoints(false);
      return;
    }
    navigate({
      to: "/test/$id",
      params: { id: result.data[0].test_id },
      search: { block: undefined, session: undefined },
    });
  }

  async function copyTestReport() {
    const report = buildTestExport({
      percentage: Number(t.porcentaje),
      correct: t.aciertos,
      failures: t.fallos,
      unanswered: t.sin_responder,
      questionCount: t.numero_preguntas,
      groups: diagnosticGroups,
      answers: answers as unknown as Parameters<typeof buildTestExport>[0]["answers"],
    });
    try {
      await navigator.clipboard.writeText(report);
      toast.success("Informe copiado");
    } catch {
      toast.error("No se pudo copiar el informe");
    }
  }

  const renderAnswer = (a: AnswerRow) => {
    const q = a.questions;
    if (!q) return null;
    const userAnswer = answerWithText(q as DiagnosticQuestion, a.respuesta_usuario);
    const correctAnswer = answerWithText(q as DiagnosticQuestion, q.respuesta_correcta);
    const reviewTarget = questionReference(q as DiagnosticQuestion);
    const estado =
      a.respuesta_usuario === null
        ? {
            label: a.marked_doubt ? "Sin responder · Con duda" : "Sin responder",
            cls: "border-border bg-muted text-muted-foreground",
            Icon: MinusCircle,
          }
        : a.correcta
          ? {
              label: a.marked_doubt ? "Correcta · Con duda" : "Correcta",
              cls: a.marked_doubt
                ? "border-warning/30 bg-warning/15 text-warning-foreground"
                : "border-success/20 bg-success/10 text-success",
              Icon: a.marked_doubt ? Flag : CheckCircle2,
            }
          : {
              label: a.marked_doubt ? "Fallada · Con duda" : "Fallada",
              cls: "border-destructive/20 bg-destructive/10 text-destructive",
              Icon: XCircle,
            };
    const EstIcon = estado.Icon;
    return (
      <Card key={a.id} className="space-y-3 overflow-hidden bg-card/90 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Pregunta {a.orden}
          </div>
          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${estado.cls}`}
          >
            <EstIcon className="h-3.5 w-3.5" /> {estado.label}
          </div>
        </div>
        <p className="text-[0.98rem] font-semibold leading-relaxed">{q.pregunta}</p>
        <div className="grid gap-2 text-sm">
          <div
            className={`rounded-xl border p-3 ${
              a.correcta
                ? "border-success/20 bg-success/5"
                : a.respuesta_usuario === null
                  ? "bg-muted/50"
                  : "border-destructive/20 bg-destructive/5"
            }`}
          >
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Tu respuesta
            </div>
            <div
              className={`font-medium leading-relaxed ${
                a.correcta
                  ? "text-success"
                  : a.respuesta_usuario === null
                    ? "text-muted-foreground"
                    : "text-destructive"
              }`}
            >
              {userAnswer ?? "Sin responder"}
            </div>
          </div>
          <div className="rounded-xl border border-success/20 bg-success/5 p-3">
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Respuesta correcta
            </div>
            <div className="font-medium leading-relaxed text-success">{correctAnswer}</div>
          </div>
        </div>
        {reviewTarget && (a.correcta === false || a.marked_doubt) && (
          <div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm text-primary">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
              <BookOpenCheck className="h-3.5 w-3.5" /> Qué repasar
            </div>
            <p className="leading-relaxed">{reviewTarget}</p>
          </div>
        )}
        {q.explicacion && (
          <div className="rounded-xl border border-amber-400/25 bg-gradient-to-br from-amber-50/90 to-orange-50/60 p-3.5 dark:from-amber-950/25 dark:to-orange-950/15">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300">
                <Lightbulb className="h-4 w-4" />
              </span>
              <div className="text-xs font-bold uppercase tracking-[0.12em] text-amber-800 dark:text-amber-200">
                Por qué
              </div>
            </div>
            <p className="text-[0.95rem] font-normal leading-7 text-foreground/85">
              {q.explicacion}
            </p>
          </div>
        )}
        {q.referencia_fuente && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Fuente:</span> {q.referencia_fuente}
          </p>
        )}
      </Card>
    );
  };

  function openReview(next: "fallos" | "dudas" | "todas") {
    setTab(next);
    requestAnimationFrame(() => reviewHeading.current?.focus());
  }

  const reviewBlock = tab && (
    <section id="revision" className="scroll-mt-4">
      <h2
        ref={reviewHeading}
        tabIndex={-1}
        className="mb-3 scroll-mt-4 text-lg font-bold tracking-tight outline-none"
      >
        Corrección del test
      </h2>
      {hasReview ? (
        <Tabs value={tab} onValueChange={(value) => setTab(value as "fallos" | "dudas" | "todas")}>
          <TabsList
            className={`grid h-11 w-full rounded-xl ${falladas.length > 0 && dudosas.length > 0 ? "grid-cols-3" : "grid-cols-2"}`}
          >
            {falladas.length > 0 && (
              <TabsTrigger value="fallos">Fallos ({falladas.length})</TabsTrigger>
            )}
            {dudosas.length > 0 && (
              <TabsTrigger value="dudas">Dudas ({dudosas.length})</TabsTrigger>
            )}
            <TabsTrigger value="todas">Todas ({answers.length})</TabsTrigger>
          </TabsList>
          {falladas.length > 0 && (
            <TabsContent value="fallos" className="mt-3 space-y-3">
              {falladas.map(renderAnswer)}
            </TabsContent>
          )}
          {dudosas.length > 0 && (
            <TabsContent value="dudas" className="mt-3 space-y-3">
              {dudosas.map(renderAnswer)}
            </TabsContent>
          )}
          <TabsContent value="todas" className="mt-3 space-y-3">
            {answers.map(renderAnswer)}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-3">{answers.map(renderAnswer)}</div>
      )}

      {falladas.length > 0 ? (
        <div className="mt-4 space-y-2">
          <Button variant="outline" className="h-12 w-full" onClick={repetirFalladas}>
            <RefreshCcw className="h-4 w-4" /> Practicar de nuevo las falladas
          </Button>
          {dudosas.length > 0 && (
            <Button variant="outline" className="h-11 w-full" onClick={repetirDudas}>
              Practicar las dudas
            </Button>
          )}
        </div>
      ) : dudosas.length > 0 ? (
        <Button variant="outline" className="mt-4 h-12 w-full" onClick={repetirDudas}>
          <RefreshCcw className="h-4 w-4" /> Practicar de nuevo las dudas
        </Button>
      ) : null}
    </section>
  );

  const percentage = Number(t.porcentaje);
  const feedback = resultFeedback({
    percentage,
    correct: t.aciertos,
    failures: t.fallos,
    unanswered: t.sin_responder,
    doubts: dudosas.length,
    questionCount: t.numero_preguntas,
  });
  const simulationElapsed = elapsedExamMinutes(
    t.fecha_inicio,
    t.fecha_finalizacion,
    t.exam_duration_minutes,
  );

  const strongConcept = data.concepts
    .filter((concept) => concept.test_correct_count > 0 && concept.test_doubt_count === 0)
    .sort(
      (a, b) =>
        b.test_correct_count / b.test_question_count -
          a.test_correct_count / a.test_question_count ||
        b.test_correct_count - a.test_correct_count,
    )[0];
  const focusQuestion = falladas[0] ?? dudosas[0];
  const focusName =
    focusQuestion?.questions?.concepto?.trim() || focusQuestion?.questions?.topics?.nombre;

  return (
    <div className="space-y-4">
      <header className="pt-3">
        <p className="text-xs font-semibold tracking-wide text-primary">
          {t.tipo === "simulacro" ? "Simulacro completado" : "Entrenamiento completado"}
          {t.learning_stage ? ` · ${LEARNING_STAGE_LABELS[learningStage(t.learning_stage)]}` : ""}
          {t.stage_free_mode ? " · modo libre" : ""}
        </p>
        <h1 className="mt-2 text-[2rem] leading-tight font-bold tracking-tight">Resultados</h1>
      </header>

      <section className={cn(trainingCard, "overflow-hidden")} aria-label="Resultado del test">
        <div className="flex items-center gap-4 bg-[#163d70] p-5 text-white">
          <div className="grid min-h-20 min-w-20 shrink-0 place-items-center rounded-2xl bg-white/10 p-2 ring-1 ring-inset ring-white/25">
            <div className="text-center">
              <p className="text-[1.65rem] leading-none font-bold tracking-tight tabular-nums">
                {new Intl.NumberFormat("es-ES").format(percentage)}%
              </p>
              <p className="mt-1 text-xs text-blue-100">del test</p>
            </div>
          </div>
          <div className="min-w-0">
            <h2 className="text-lg leading-snug font-bold">{feedback.title}</h2>
            <p className="mt-1 text-sm text-blue-100">
              {t.aciertos} de {t.numero_preguntas} preguntas correctas
            </p>
            {t.tipo === "simulacro" && t.exam_duration_minutes && simulationElapsed !== null && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-blue-100">
                <Clock3 className="size-3.5" aria-hidden="true" /> {simulationElapsed} de{" "}
                {t.exam_duration_minutes} min utilizados
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-4 divide-x">
          <ResultStat icon={CheckCircle2} value={t.aciertos} label="Aciertos" tone="success" />
          <ResultStat icon={XCircle} value={t.fallos} label="Fallos" tone="error" />
          <ResultStat icon={Flag} value={dudosas.length} label="Dudas" tone="warning" />
          <ResultStat icon={MinusCircle} value={t.sin_responder} label="En blanco" tone="muted" />
        </div>
      </section>

      {answers.length > 0 && (
        <section className={cn(trainingCard, "p-4")} aria-labelledby="answer-map">
          <h2 id="answer-map" className="flex items-center gap-2 font-bold">
            <ListChecks className="size-4 text-primary" aria-hidden="true" /> Tus respuestas
          </h2>
          <AnswerMap answers={answers} />
        </section>
      )}

      <section className={cn(trainingCard, "space-y-3 p-4")} aria-labelledby="next-objective">
        <h2 id="next-objective" className="flex items-center gap-2 font-bold">
          <Compass className="size-4 text-primary" aria-hidden="true" /> Qué hacer ahora
        </h2>
        {strongConcept && (
          <div className="rounded-xl bg-[#279d79]/10 p-3">
            <h3 className="text-xs font-bold text-emerald-900 dark:text-emerald-100">
              Punto fuerte en este test
            </h3>
            <p className="mt-1 text-sm">
              {strongConcept.concept_title} · {strongConcept.test_correct_count}/
              {strongConcept.test_question_count} correctas.
            </p>
          </div>
        )}
        <div className="rounded-xl bg-muted/75 p-3">
          <h3 className="text-xs font-bold">Próximo objetivo</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {focusQuestion
              ? `${falladas.length > 0 ? "Revisa la explicación del primer fallo" : "Aclara la primera duda"}${focusName ? ` sobre ${focusName}` : ""}.`
              : t.sin_responder > 0
                ? "Revisa las preguntas que dejaste en blanco y comprueba qué te faltaba para responder."
                : "Prueba preguntas distintas para comprobar si mantienes este resultado."}
          </p>
        </div>
        {search.block ? (
          <Button
            className="h-12 w-full"
            disabled={continuingSession}
            onClick={() => void continueGuidedSession()}
          >
            {continuingSession && <Loader2 className="animate-spin" aria-hidden="true" />}
            Continuar sesión <ArrowRight aria-hidden="true" />
          </Button>
        ) : hasReview ? (
          <Button className="h-12 w-full" onClick={() => openReview(reviewTab)}>
            Repasar fallos y dudas <ArrowRight aria-hidden="true" />
          </Button>
        ) : (
          <Button asChild className="h-12 w-full">
            <Link to="/crear">
              Hacer otro test <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        )}
        <div className="grid grid-cols-[1fr_auto] gap-1">
          {answers.length > 0 && (
            <Button
              variant="ghost"
              className="h-11 justify-start px-1.5 text-primary"
              onClick={() => openReview("todas")}
            >
              Ver corrección completa
            </Button>
          )}
          <Button variant="ghost" className="col-start-2 h-11 px-1.5 text-muted-foreground" asChild>
            <Link to="/inicio">Volver a inicio</Link>
          </Button>
        </div>
      </section>

      {reviewBlock}

      <Card className="bg-card/90 px-4">
        <Accordion type="single" collapsible>
          <AccordionItem value="concepts" className="border-b-0">
            <AccordionTrigger className="hover:no-underline">
              Conocimientos puestos a prueba
            </AccordionTrigger>
            <AccordionContent>
              <TestedConceptsCard
                concepts={data.concepts}
                weakConcepts={weakConcepts}
                starting={startingWeakPoints}
                onTrain={() => void trainWeakPoints()}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      <Card className="bg-card/90 px-4">
        <Accordion
          type="multiple"
          defaultValue={t.tipo.startsWith("multitema_") || t.tipo === "simulacro" ? ["topics"] : []}
          className="w-full"
        >
          <AccordionItem value="topics">
            <AccordionTrigger className="hover:no-underline">Desglose por tema</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 text-sm">
                {Object.entries(byTopic)
                  .sort(([a], [b]) => a.localeCompare(b, "es", { numeric: true }))
                  .map(([k, v]) => (
                    <div
                      key={k}
                      className="flex items-start justify-between gap-3 rounded-lg bg-muted/50 p-2.5"
                    >
                      <span className="leading-snug">{k}</span>
                      <span className="shrink-0 font-bold">
                        {v.ok}/{v.tot} · {Math.round((v.ok / v.tot) * 100)}%
                      </span>
                    </div>
                  ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {data.selection.length > 0 && (
            <AccordionItem value="selection">
              <AccordionTrigger className="hover:no-underline">
                Cómo se eligieron las preguntas
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1 text-sm">
                  {Object.entries(selectionCounts).map(([group, count]) => (
                    <div key={group} className="flex justify-between gap-2">
                      <span>{SELECTION_LABELS[group] ?? group}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {previousOverlap === 0
                    ? "Ninguna pregunta coincide con el test anterior."
                    : `${previousOverlap} ${previousOverlap === 1 ? "pregunta coincide" : "preguntas coinciden"} con el test anterior.`}
                  {overlapException
                    ? " Se utilizaron más repeticiones porque no había suficientes alternativas."
                    : " Se ha respetado el límite orientativo de coincidencia."}
                </p>
              </AccordionContent>
            </AccordionItem>
          )}

          <AccordionItem value="tools" className="border-b-0">
            <AccordionTrigger className="hover:no-underline">
              Informe y herramientas
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Copia el resultado, los contenidos a repasar y el banco completo realizado, con
                opciones, respuestas, explicaciones y referencias.
              </p>
              <Button type="button" variant="outline" className="w-full" onClick={copyTestReport}>
                <ClipboardCopy className="h-4 w-4" /> Copiar informe para ChatGPT
              </Button>
              <Link
                to="/historial"
                className="block text-center text-sm font-semibold text-primary"
              >
                Ver historial
              </Link>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>
    </div>
  );
}

function AnswerMap({ answers }: { answers: AnswerRow[] }) {
  return (
    <>
      <ol
        className="mt-3 grid grid-cols-8 gap-1.5 min-[390px]:grid-cols-10"
        aria-label="Resultado de cada pregunta"
      >
        {answers.map((answer) => {
          const outcome =
            answer.correcta === true
              ? {
                  label: "acierto",
                  tone: "bg-[#279d79]/17 text-emerald-950 dark:text-emerald-100",
                  Icon: CheckCircle2,
                }
              : answer.correcta === false
                ? {
                    label: "fallo",
                    tone: "bg-destructive/12 text-red-900 dark:text-red-200",
                    Icon: XCircle,
                  }
                : { label: "en blanco", tone: "bg-muted text-muted-foreground", Icon: MinusCircle };
          return (
            <li key={answer.id}>
              <span className="sr-only">
                Pregunta {answer.orden}, {outcome.label}
                {answer.marked_doubt ? ", con duda" : ""}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "relative grid min-h-10 content-center justify-items-center gap-0.5 rounded-md py-1 text-xs leading-none tabular-nums",
                  outcome.tone,
                )}
              >
                <outcome.Icon className="size-3" />
                {answer.orden}
                {answer.marked_doubt && (
                  <span className="absolute top-1 right-1 size-1.5 rounded-full bg-[#a96806] ring-[1.5px] ring-card" />
                )}
              </span>
            </li>
          );
        })}
      </ol>
      {answers.some((answer) => answer.marked_doubt) && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-[#a96806]" /> Punto ámbar =
          duda marcada
        </p>
      )}
    </>
  );
}

function ResultStat({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
  tone: "success" | "error" | "warning" | "muted";
}) {
  const color =
    tone === "success"
      ? "text-success"
      : tone === "error"
        ? "text-destructive"
        : tone === "warning"
          ? "text-amber-800 dark:text-amber-200"
          : "text-muted-foreground";
  return (
    <div className="px-2 py-3 text-center">
      <Icon className={`mx-auto mb-1 h-4 w-4 ${color}`} aria-hidden="true" />
      <div className="font-bold leading-none">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function TestedConceptsCard({
  concepts,
  weakConcepts,
  starting,
  onTrain,
}: {
  concepts: CompletedTestConcept[];
  weakConcepts: CompletedTestConcept[];
  starting: boolean;
  onTrain: () => void;
}) {
  if (concepts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No hay conocimientos asociados a este test.</p>
    );
  }
  return (
    <div>
      <p className="text-sm text-muted-foreground">Estado actual según el conjunto de tus tests.</p>
      <div className="mt-3 space-y-2">
        {concepts.map((concept) => (
          <div key={concept.concept_id} className="rounded-xl bg-muted/55 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 flex-1 text-sm font-bold leading-snug">
                {concept.concept_title}
              </p>
              <Badge variant="outline" className={TESTS_FIRST_STATE_STYLES[concept.learner_state]}>
                {TESTS_FIRST_STATE_LABELS[concept.learner_state]}
              </Badge>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {evidenceDescription(concept)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              En este test: {concept.test_correct_count}/{concept.test_question_count} correctas
              {concept.test_doubt_count > 0 ? ` · ${concept.test_doubt_count} con duda` : ""}
              {concept.safe_accuracy !== null ? ` · ${concept.safe_accuracy}% seguro global` : ""}
            </p>
          </div>
        ))}
      </div>
      {weakConcepts.length > 0 && (
        <Button
          variant="outline"
          className="mt-3 h-12 w-full"
          disabled={starting}
          onClick={onTrain}
        >
          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
          Entrenar puntos débiles
        </Button>
      )}
    </div>
  );
}
