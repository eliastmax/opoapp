import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCopy,
  Flag,
  Loader2,
  MinusCircle,
  RefreshCcw,
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

export const Route = createFileRoute("/_authenticated/resultados/$id")({
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
    topics: { nombre: string } | null;
    subtopics: { nombre: string } | null;
  } | null;
};

function ResultadosPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"fallos" | "dudas" | "todas">("fallos");

  const { data, isLoading } = useQuery({
    queryKey: ["resultados", id],
    queryFn: async () => {
      const { data: test } = await supabase.from("tests").select("*").eq("id", id).single();
      const { data: answers } = await supabase
        .from("test_answers")
        .select(
          "*, questions!test_answers_question_id_fkey(*, topics!questions_topic_id_fkey(nombre), subtopics!questions_subtopic_id_fkey(nombre))",
        )
        .eq("test_id", id)
        .order("orden");
      const { data: selection } = await supabase
        .from("test_question_selection")
        .select("selection_group, selection_reason, was_in_previous_test, overlap_exception")
        .eq("test_id", id)
        .order("selection_order");
      return {
        test,
        answers: (answers ?? []) as unknown as AnswerRow[],
        selection: (selection ?? []) as SelectionTraceRow[],
      };
    },
  });

  if (isLoading)
    return (
      <div className="flex items-center justify-center pt-20">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  if (!data?.test) return <p className="p-4">Test no encontrado</p>;

  const t = data.test;
  const answers = data.answers;
  const falladas = answers.filter((a) => a.correcta === false);
  const dudosas = answers.filter((a) => a.marked_doubt);
  const revisar = [...falladas, ...answers.filter((a) => a.correcta !== false && a.marked_doubt)];
  const diagnosticGroups = buildDiagnosticGroups(answers as unknown as DiagnosticAnswer[]);
  const perfecto = t.fallos === 0 && t.sin_responder === 0;
  const {
    counts: selectionCounts,
    previousOverlap,
    overlapException,
  } = summarizeSelection(data.selection);

  const byTopic: Record<string, { ok: number; tot: number }> = {};
  answers.forEach((a) => {
    const q = a.questions;
    if (!q) return;
    const topicName = q.topics?.nombre ?? "—";
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
    navigate({ to: "/test/$id", params: { id: newTest.id } });
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
    navigate({ to: "/test/$id", params: { id: newTest.id } });
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
          <div className="rounded-xl border border-border/70 bg-muted/35 p-3">
            <div className="mb-1.5 text-sm font-bold text-foreground">Por qué</div>
            <p className="text-[0.95rem] leading-relaxed text-foreground/80">{q.explicacion}</p>
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

  const reviewBlock = (
    <section>
      <div className="mb-3">
        <h2 className="text-lg font-bold tracking-tight">
          {falladas.length > 0 ? "Tus fallos" : dudosas.length > 0 ? "Tus dudas" : "Revisión"}
        </h2>
        <p className="text-xs text-muted-foreground">
          {falladas.length > 0
            ? "Empieza por comprender qué ha fallado y qué debes repasar."
            : dudosas.length > 0
              ? "Revisa las respuestas que no contestaste con seguridad."
              : "Consulta las respuestas completas del test."}
        </p>
      </div>
      {revisar.length === 0 ? (
        <div className="space-y-3">{answers.map(renderAnswer)}</div>
      ) : (
        <Tabs
          value={falladas.length === 0 && tab === "fallos" ? "dudas" : tab}
          onValueChange={(value) => setTab(value as "fallos" | "dudas" | "todas")}
        >
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
      )}
    </section>
  );

  const sinFallosDuros = t.fallos === 0;
  const percentage = Number(t.porcentaje);

  return (
    <div className="space-y-5">
      <header className="pt-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Test completado
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {perfecto ? "Resultado perfecto" : "Tus resultados"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="capitalize">{t.tipo}</span>
          {t.learning_stage ? ` · ${LEARNING_STAGE_LABELS[learningStage(t.learning_stage)]}` : ""}
          {t.stage_free_mode ? " · modo libre" : ""}
        </p>
      </header>

      <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-card via-card to-primary/8 p-0">
        <div className="flex items-center gap-4 p-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-primary text-2xl font-bold text-primary-foreground shadow-lg shadow-primary/15">
            {percentage}%
          </div>
          <div className="min-w-0">
            <div className="text-lg font-bold">
              {perfecto
                ? "Has respondido todo correctamente"
                : t.fallos > 0
                  ? `${t.fallos} ${t.fallos === 1 ? "respuesta necesita" : "respuestas necesitan"} repaso`
                  : "No hay respuestas incorrectas"}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {dudosas.length > 0
                ? `${dudosas.length} ${dudosas.length === 1 ? "respuesta quedó marcada" : "respuestas quedaron marcadas"} como duda.`
                : "No has dejado respuestas marcadas como duda."}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x border-t border-border/70 bg-background/45">
          <ResultStat icon={CheckCircle2} value={t.aciertos} label="Aciertos" tone="success" />
          <ResultStat icon={XCircle} value={t.fallos} label="Fallos" tone="error" />
          <ResultStat
            icon={MinusCircle}
            value={t.sin_responder}
            label="Sin responder"
            tone="muted"
          />
        </div>
      </Card>

      {revisar.length > 0 && reviewBlock}

      <Card className="space-y-3 bg-card/90 p-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
            Siguiente paso
          </div>
          <h2 className="mt-1 font-bold">
            {t.fallos > 0
              ? "Refuerza ahora las respuestas falladas"
              : dudosas.length > 0
                ? "Aclara las respuestas que dejaste con duda"
                : "Continúa con una nueva sesión"}
          </h2>
        </div>
        {sinFallosDuros ? (
          <>
            {dudosas.length > 0 && (
              <Button className="h-12 w-full" onClick={repetirDudas}>
                <RefreshCcw className="h-4 w-4" /> Repetir dudas
              </Button>
            )}
            <Link to="/crear" className="block">
              <Button variant={dudosas.length > 0 ? "outline" : "default"} className="h-12 w-full">
                Hacer otro test <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </>
        ) : (
          <>
            <Button className="h-12 w-full" onClick={repetirFalladas}>
              <RefreshCcw className="h-4 w-4" /> Repetir falladas
            </Button>
            {dudosas.length > 0 && (
              <Button variant="outline" className="h-12 w-full" onClick={repetirDudas}>
                Repetir dudas
              </Button>
            )}
            <Link to="/crear" className="block">
              <Button variant="outline" className="h-12 w-full">
                Crear otro test
              </Button>
            </Link>
          </>
        )}
        <Link to="/inicio" className="block">
          <Button variant="ghost" className="h-10 w-full text-muted-foreground">
            Volver al inicio
          </Button>
        </Link>
      </Card>

      <Card className="bg-card/90 px-4">
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="topics">
            <AccordionTrigger className="hover:no-underline">Desglose por tema</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 text-sm">
                {Object.entries(byTopic).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-start justify-between gap-3 rounded-lg bg-muted/50 p-2.5"
                  >
                    <span className="leading-snug">{k}</span>
                    <span className="shrink-0 font-bold">
                      {v.ok}/{v.tot}
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

      {revisar.length === 0 && (
        <Card className="bg-card/90 px-4">
          <Accordion type="single" collapsible>
            <AccordionItem value="all" className="border-b-0">
              <AccordionTrigger className="hover:no-underline">
                Revisar todas las respuestas
              </AccordionTrigger>
              <AccordionContent>{reviewBlock}</AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      )}
    </div>
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
  tone: "success" | "error" | "muted";
}) {
  const color =
    tone === "success"
      ? "text-success"
      : tone === "error"
        ? "text-destructive"
        : "text-muted-foreground";
  return (
    <div className="px-2 py-3 text-center">
      <Icon className={`mx-auto mb-1 h-4 w-4 ${color}`} />
      <div className="font-bold leading-none">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
