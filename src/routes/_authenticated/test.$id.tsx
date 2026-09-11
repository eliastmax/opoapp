import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Flag,
  Lightbulb,
  Loader2,
  LockKeyhole,
  LogOut,
  XCircle,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { Respuesta } from "@/lib/csv-parser";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatExamTime, remainingExamSeconds } from "@/lib/exam-simulation";
import { weeklyRoadmapQueryKey } from "@/hooks/use-weekly-roadmap";
import { AnswerSaveCoordinator } from "@/lib/answer-save-coordinator";
import { captureTechnicalEvent } from "@/lib/technical-observability";
import { toUserFacingError } from "@/lib/user-facing-error";
import type { Database } from "@/integrations/supabase/types";

type ConfirmationFeedback =
  Database["public"]["Functions"]["confirm_test_answer"]["Returns"][number];

export const Route = createFileRoute("/_authenticated/test/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    block: typeof search.block === "string" ? search.block : undefined,
    session: typeof search.session === "string" ? search.session : undefined,
  }),
  component: TestPage,
});

function TestPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [current, setCurrent] = useState(0);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [incidentReason, setIncidentReason] = useState("error_juridico");
  const [incidentDetail, setIncidentDetail] = useState("");
  const [reporting, setReporting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [initializedTestId, setInitializedTestId] = useState<string | null>(null);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const autoFinishRequested = useRef(false);
  const [savingAnswerIds, setSavingAnswerIds] = useState<Set<string>>(() => new Set());
  const [failedAnswerIds, setFailedAnswerIds] = useState<Set<string>>(() => new Set());
  const [confirmingAnswerId, setConfirmingAnswerId] = useState<string | null>(null);
  const [feedbackByAnswerId, setFeedbackByAnswerId] = useState<
    Record<string, ConfirmationFeedback>
  >({});
  const answerSaves = useRef<AnswerSaveCoordinator<Respuesta> | null>(null);
  if (!answerSaves.current)
    answerSaves.current = new AnswerSaveCoordinator<Respuesta>(
      async (answerId, value) => {
        setSavingAnswerIds((ids) => new Set(ids).add(answerId));
        const { error } = await supabase
          .from("test_answers")
          .update({ respuesta_usuario: value })
          .eq("id", answerId);
        setSavingAnswerIds((ids) => {
          const next = new Set(ids);
          next.delete(answerId);
          return next;
        });
        if (error) throw error;
        setFailedAnswerIds((ids) => {
          const next = new Set(ids);
          next.delete(answerId);
          return next;
        });
      },
      (answerId, saveError) => {
        setSavingAnswerIds((ids) => {
          const next = new Set(ids);
          next.delete(answerId);
          return next;
        });
        setFailedAnswerIds((ids) => new Set(ids).add(answerId));
        captureTechnicalEvent("test_answer_save_error", saveError, { operation: "save_answer" });
        toast.error(
          `${toUserFacingError(saveError).message} Tu respuesta sigue visible; pulsa Reintentar.`,
        );
      },
    );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["test", id],
    queryFn: async () => {
      const { data: rows, error } = await supabase.rpc("get_my_test_session", { p_test_id: id });
      if (error) throw error;
      if (!rows?.length) throw new Error("Test not found");
      const first = rows[0];
      return {
        test: {
          id: first.test_id,
          tipo: first.test_type,
          completado: first.completed,
          fecha_inicio: first.started_at,
          exam_duration_minutes: first.exam_duration_minutes,
        },
        answers: rows.map((row) => ({
          id: row.answer_id,
          question_id: row.question_id,
          orden: row.answer_order,
          respuesta_usuario: row.selected_answer,
          marked_doubt: row.marked_doubt,
          confirmed: row.confirmed,
          confirmed_at: row.confirmed_at,
          questions: {
            id: row.question_id,
            codigo: row.question_code,
            pregunta: row.question_text,
            opcion_a: row.option_a,
            opcion_b: row.option_b,
            opcion_c: row.option_c,
            opcion_d: row.option_d,
            dificultad: row.difficulty,
            dificultad_examen: row.exam_difficulty,
            nivel_pedagogico: row.pedagogical_level,
            topic_id: row.topic_id,
            subtopic_id: row.subtopic_id,
          },
        })),
      };
    },
  });

  const finish = useCallback(async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      await answerSaves.current?.flush();
      const { error } = await supabase.rpc("complete_test", { p_test_id: id });
      if (error) throw error;
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["dashboard"] }),
        qc.invalidateQueries({ queryKey: weeklyRoadmapQueryKey }),
      ]);
      navigate({ to: "/resultados/$id", params: { id }, search, replace: true });
    } catch (error) {
      captureTechnicalEvent("rpc_error", error, { operation: "complete_test" });
      toast.error(toUserFacingError(error).message);
      setFinishing(false);
      autoFinishRequested.current = false;
    }
  }, [finishing, id, navigate, qc, search]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (data && !data.test.completado) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [data]);

  useEffect(() => {
    if (!data || initializedTestId === id) return;
    const firstPending = data.answers.findIndex((answer) => !answer.confirmed);
    setCurrent(firstPending >= 0 ? firstPending : Math.max(data.answers.length - 1, 0));
    setInitializedTestId(id);
  }, [data, id, initializedTestId]);

  const examSecondsRemaining =
    data?.test.exam_duration_minutes && !data.test.completado
      ? remainingExamSeconds(data.test.fecha_inicio, data.test.exam_duration_minutes, clockNow)
      : null;

  useEffect(() => {
    if (!data?.test.exam_duration_minutes || data.test.completado) return;
    setClockNow(Date.now());
    const interval = window.setInterval(() => setClockNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [data?.test.completado, data?.test.exam_duration_minutes]);

  useEffect(() => {
    if (
      examSecondsRemaining !== 0 ||
      !data ||
      data.test.completado ||
      autoFinishRequested.current
    ) {
      return;
    }
    autoFinishRequested.current = true;
    toast.info("Tiempo agotado. Corrigiendo el simulacro…");
    void finish();
  }, [data, examSecondsRemaining, finish]);

  const total = data?.answers.length ?? 0;
  const answered = useMemo(
    () => data?.answers.filter((a) => a.respuesta_usuario !== null).length ?? 0,
    [data],
  );
  const doubts = useMemo(() => data?.answers.filter((a) => a.marked_doubt).length ?? 0, [data]);
  const remaining = total - answered;
  const guided = Boolean(search.block);
  const currentAnswer = data?.answers[current];

  useEffect(() => {
    if (
      !data ||
      data.test.completado ||
      data.test.tipo === "simulacro" ||
      !currentAnswer?.confirmed ||
      !currentAnswer.respuesta_usuario ||
      feedbackByAnswerId[currentAnswer.id]
    ) {
      return;
    }
    let cancelled = false;
    void supabase
      .rpc("confirm_test_answer", {
        p_test_id: id,
        p_answer_id: currentAnswer.id,
        p_selected_answer: currentAnswer.respuesta_usuario,
      })
      .then(({ data: feedback, error: feedbackError }) => {
        if (cancelled || feedbackError || !feedback?.[0]) return;
        setFeedbackByAnswerId((current) => ({
          ...current,
          [currentAnswer.id]: feedback[0],
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [currentAnswer, data, feedbackByAnswerId, id]);

  if (isLoading)
    return (
      <div className="flex items-center justify-center pt-20">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  if (error)
    return (
      <Card className="p-5 text-center">
        <p className="font-semibold">No hemos podido cargar el test</p>
        <p className="mt-1 text-sm text-muted-foreground">{toUserFacingError(error).message}</p>
        <Button className="mt-4" onClick={() => void refetch()}>
          Reintentar
        </Button>
      </Card>
    );
  if (!data) return null;

  if (data.test.completado) {
    navigate({ to: "/resultados/$id", params: { id }, search, replace: true });
    return null;
  }

  const item = data.answers[current];
  const question = item.questions;
  if (!question) return null;

  function selectOption(opt: Respuesta) {
    if (item.confirmed) return;
    qc.setQueryData<typeof data>(["test", id], (prev) => {
      if (!prev) return prev;
      const answers = [...prev.answers];
      answers[current] = { ...answers[current], respuesta_usuario: opt };
      return { ...prev, answers };
    });
    answerSaves.current?.select(item.id, opt);
  }

  async function confirmAnswer() {
    if (!item.respuesta_usuario || item.confirmed || confirmingAnswerId) return;
    setConfirmingAnswerId(item.id);
    try {
      await answerSaves.current?.flush();
      const { data: confirmation, error: confirmationError } = await supabase.rpc(
        "confirm_test_answer",
        {
          p_test_id: id,
          p_answer_id: item.id,
          p_selected_answer: item.respuesta_usuario,
        },
      );
      if (confirmationError) throw confirmationError;
      const feedback = confirmation?.[0];
      if (!feedback) throw new Error("No se recibió la confirmación de la respuesta");
      qc.setQueryData<typeof data>(["test", id], (previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          answers: previous.answers.map((answer) =>
            answer.id === item.id
              ? { ...answer, confirmed: true, confirmed_at: feedback.confirmed_at }
              : answer,
          ),
        };
      });
      setFeedbackByAnswerId((current) => ({ ...current, [item.id]: feedback }));
    } catch (confirmationError) {
      captureTechnicalEvent("rpc_error", confirmationError, {
        operation: "confirm_test_answer",
      });
      toast.error(toUserFacingError(confirmationError).message);
    } finally {
      setConfirmingAnswerId(null);
    }
  }

  async function toggleDoubt() {
    const markedDoubt = !item.marked_doubt;
    const { error } = await supabase
      .from("test_answers")
      .update({ marked_doubt: markedDoubt })
      .eq("id", item.id);
    if (error) {
      toast.error(toUserFacingError(error).message);
      return;
    }
    qc.setQueryData<typeof data>(["test", id], (prev) => {
      if (!prev) return prev;
      const answers = [...prev.answers];
      answers[current] = { ...answers[current], marked_doubt: markedDoubt };
      return { ...prev, answers };
    });
  }

  async function reportIncident() {
    if (reporting) return;
    setReporting(true);
    const detail = incidentDetail.trim();
    const { error } = await supabase.from("question_incidents").insert({
      question_id: question.id,
      reason: incidentReason,
      detail: detail || null,
    });
    if (error) {
      toast.error(
        error.code === "23505"
          ? "Esta incidencia ya está pendiente de revisión."
          : toUserFacingError(error).message,
      );
      setReporting(false);
      return;
    }
    toast.success("Incidencia registrada para revisión.");
    setReportOpen(false);
    setIncidentDetail("");
    setReporting(false);
  }

  function revisarRespuestas() {
    setConfirmFinish(false);
    const idx = data!.answers.findIndex((a) => a.respuesta_usuario === null);
    const doubtIdx = data!.answers.findIndex((a) => a.marked_doubt);
    setCurrent(idx >= 0 ? idx : doubtIdx >= 0 ? doubtIdx : 0);
  }

  function handleNext() {
    if (current < total - 1) setCurrent((c) => c + 1);
    else setConfirmFinish(true);
  }

  async function exitTest() {
    try {
      await answerSaves.current?.flush();
      navigate({ to: "/inicio", replace: true });
    } catch (saveError) {
      toast.error(`${toUserFacingError(saveError).message} Reintenta el guardado antes de salir.`);
    }
  }

  const options: Array<[Respuesta, string]> = [
    ["A", question.opcion_a],
    ["B", question.opcion_b],
    ["C", question.opcion_c],
    ["D", question.opcion_d],
  ];
  const feedback = feedbackByAnswerId[item.id];
  const isSimulation = data.test.tipo === "simulacro";

  return (
    <div className="space-y-3 pb-20">
      <header className="sticky top-0 z-20 -mx-4 -mt-4 border-b border-border/60 bg-background/90 px-4 pb-3 pt-4 backdrop-blur-xl">
        {guided && (
          <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            Comprobar · Demostrar
          </p>
        )}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-foreground">{current + 1}</span>
            <span className="font-medium text-muted-foreground">de {total}</span>
          </div>
          {examSecondsRemaining !== null ? (
            <div
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-xs font-bold ${
                examSecondsRemaining <= 300
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary"
              }`}
              aria-live="polite"
              aria-label={`Tiempo restante: ${formatExamTime(examSecondsRemaining)}`}
            >
              <Clock3 className="h-3.5 w-3.5" />
              {formatExamTime(examSecondsRemaining)}
            </div>
          ) : (
            <span className="flex-1" />
          )}
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              aria-label="Avisar de un problema"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="hidden min-[370px]:inline">Avisar</span>
            </button>
            <button
              type="button"
              onClick={() => setConfirmExit(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden min-[370px]:inline">Salir</span>
            </button>
          </div>
        </div>
        <div className="mt-1.5 flex items-center gap-3">
          <Progress value={((current + 1) / total) * 100} className="h-1.5 flex-1" />
          <span
            className="shrink-0 text-[11px] font-medium text-muted-foreground"
            aria-live="polite"
          >
            {remaining === 0 ? "Todo respondido" : `${remaining} pendientes`}
          </span>
        </div>
      </header>

      <Card className="border-primary/15 bg-gradient-to-br from-card to-primary/5 p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            Pregunta
          </span>
          <button
            type="button"
            onClick={toggleDoubt}
            aria-pressed={item.marked_doubt}
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              item.marked_doubt
                ? "border-warning/40 bg-warning/15 text-warning-foreground"
                : "border-border bg-background/80 text-muted-foreground hover:bg-muted"
            }`}
          >
            <Flag className={`h-3.5 w-3.5 ${item.marked_doubt ? "fill-current" : ""}`} />
            {item.marked_doubt ? "Con duda" : "Marcar duda"}
          </button>
        </div>
        <h1 className="text-[1.05rem] font-semibold leading-relaxed tracking-[-0.01em]">
          {question.pregunta}
        </h1>
      </Card>

      <div className="space-y-2" role="radiogroup" aria-label="Opciones de respuesta">
        {options.map(([letter, text]) => {
          const active = item.respuesta_usuario === letter;
          return (
            <button
              key={letter}
              type="button"
              onClick={() => selectOption(letter)}
              role="radio"
              aria-checked={active}
              disabled={item.confirmed || confirmingAnswerId === item.id}
              className={`min-h-14 w-full rounded-2xl border px-3 py-2.5 text-left shadow-[0_8px_24px_-22px_oklch(0.28_0.08_250/0.5)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                item.confirmed
                  ? active
                    ? "cursor-not-allowed border-primary/60 bg-primary/10"
                    : "cursor-not-allowed border-border/70 bg-muted/35 opacity-65"
                  : active
                    ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                    : "border-border/90 bg-card/90 hover:border-primary/30 hover:bg-accent/30"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl text-sm font-bold transition-colors ${active ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-foreground"}`}
                >
                  {letter}
                </span>
                <span className="flex-1 text-[0.94rem] leading-relaxed">{text}</span>
              </div>
            </button>
          );
        })}
      </div>

      {item.confirmed && isSimulation && (
        <Card className="flex items-center gap-3 border-primary/15 bg-primary/5 p-4">
          <LockKeyhole className="h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-bold">Respuesta confirmada</p>
            <p className="text-xs text-muted-foreground">
              La corrección se mostrará cuando finalices el simulacro.
            </p>
          </div>
        </Card>
      )}

      {item.confirmed && !isSimulation && feedback?.feedback_revealed && (
        <Card
          className={`space-y-3 border p-4 ${
            feedback.is_correct
              ? "border-success/25 bg-success/5"
              : "border-destructive/25 bg-destructive/5"
          }`}
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            {feedback.is_correct ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            <p className="font-bold">{feedback.is_correct ? "Correcta" : "Incorrecta"}</p>
          </div>
          {!feedback.is_correct && feedback.correct_answer && (
            <div className="rounded-xl border border-success/20 bg-background/75 p-3 text-sm">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Respuesta correcta
              </p>
              <p className="mt-1 font-semibold leading-relaxed text-success">
                {feedback.correct_answer}.
                {options.find(([letter]) => letter === feedback.correct_answer)?.[1]}
              </p>
            </div>
          )}
          {feedback.concept_title && (
            <div className="text-sm">
              <span className="font-semibold">Concepto:</span> {feedback.concept_title}
            </div>
          )}
          {feedback.explanation && (
            <div className="rounded-xl border border-amber-400/25 bg-amber-50/70 p-3.5 dark:bg-amber-950/20">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                <Lightbulb className="h-4 w-4" /> Explicación
              </div>
              <p className="whitespace-pre-wrap break-words text-sm leading-7">
                {feedback.explanation}
              </p>
            </div>
          )}
        </Card>
      )}

      {(savingAnswerIds.has(item.id) || failedAnswerIds.has(item.id)) && (
        <div className="flex items-center justify-between text-xs" aria-live="polite">
          <span
            className={failedAnswerIds.has(item.id) ? "text-destructive" : "text-muted-foreground"}
          >
            {failedAnswerIds.has(item.id)
              ? "No se ha podido guardar esta respuesta."
              : "Guardando respuesta…"}
          </span>
          {failedAnswerIds.has(item.id) && (
            <Button size="sm" variant="outline" onClick={() => answerSaves.current?.retry(item.id)}>
              Reintentar
            </Button>
          )}
        </div>
      )}

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/90 shadow-[0_-12px_32px_-24px_oklch(0.28_0.08_250/0.55)] backdrop-blur-xl">
        <div className="safe-bottom mx-auto grid max-w-md grid-cols-[0.8fr_1.2fr] gap-2 px-4 py-3">
          <Button
            variant="outline"
            className="h-12 bg-card/90"
            disabled={current === 0}
            onClick={() => setCurrent((c) => c - 1)}
          >
            <ArrowLeft className="h-4 w-4" /> Anterior
          </Button>
          {item.confirmed ? (
            <Button className="h-12" onClick={handleNext}>
              {current === total - 1 ? "Finalizar" : "Siguiente"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              className="h-12"
              disabled={
                !item.respuesta_usuario ||
                confirmingAnswerId === item.id ||
                savingAnswerIds.has(item.id) ||
                failedAnswerIds.has(item.id)
              }
              onClick={() => void confirmAnswer()}
            >
              {confirmingAnswerId === item.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LockKeyhole className="h-4 w-4" />
              )}
              Confirmar respuesta
            </Button>
          )}
        </div>
      </footer>

      <AlertDialog open={confirmFinish} onOpenChange={setConfirmFinish}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar test</AlertDialogTitle>
            <AlertDialogDescription>
              Has llegado al final del test. ¿Quieres finalizar y corregir?
              {remaining > 0 ? ` Te quedan ${remaining} sin responder.` : ""}
              {doubts > 0
                ? ` Has marcado ${doubts} ${doubts === 1 ? "pregunta" : "preguntas"} como duda.`
                : ""}
              {examSecondsRemaining !== null
                ? ` Tiempo restante: ${formatExamTime(examSecondsRemaining)}.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={revisarRespuestas}>Revisar respuestas</AlertDialogCancel>
            <AlertDialogAction onClick={finish} disabled={finishing || failedAnswerIds.size > 0}>
              {finishing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Finalizar y corregir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmExit} onOpenChange={setConfirmExit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Salir del test?</AlertDialogTitle>
            <AlertDialogDescription>
              El test no se corregirá y las respuestas dadas no afectarán a tus fallos activos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar test</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void exitTest();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Salir del test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={reportOpen} onOpenChange={setReportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Comunicar incidencia</AlertDialogTitle>
            <AlertDialogDescription>
              No cambia esta pregunta ni tu resultado. Quedará anotada para revisarla después.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <label className="block text-sm font-medium" htmlFor="incident-reason">
              Motivo
            </label>
            <select
              id="incident-reason"
              value={incidentReason}
              onChange={(event) => setIncidentReason(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="error_juridico">Posible error jurídico</option>
              <option value="enunciado_ambiguo">Enunciado ambiguo</option>
              <option value="referencia_incorrecta">Referencia o página incorrecta</option>
              <option value="duplicada_similar">Duplicada o demasiado parecida</option>
              <option value="redaccion_formato">Redacción o formato</option>
            </select>
            <label className="block text-sm font-medium" htmlFor="incident-detail">
              Nota opcional
            </label>
            <Textarea
              id="incident-detail"
              value={incidentDetail}
              onChange={(event) => setIncidentDetail(event.target.value.slice(0, 600))}
              placeholder="Qué te hace dudar o qué debería revisarse"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reporting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void reportIncident();
              }}
              disabled={reporting}
            >
              {reporting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar incidencia"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
