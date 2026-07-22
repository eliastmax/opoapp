import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CheckCircle2, ClipboardCopy, Flag, Loader2, MinusCircle, XCircle } from "lucide-react";
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
    dificultad: string;
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
  const reviewRef = useRef<HTMLDivElement | null>(null);
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

  const byDif: Record<string, { ok: number; tot: number }> = {};
  const byTopic: Record<string, { ok: number; tot: number }> = {};
  answers.forEach((a) => {
    const q = a.questions;
    if (!q) return;
    byDif[q.dificultad] ??= { ok: 0, tot: 0 };
    byDif[q.dificultad].tot++;
    if (a.correcta) byDif[q.dificultad].ok++;
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

  function scrollToReview() {
    setTimeout(() => reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function goReview(target: "fallos" | "dudas" | "todas") {
    setTab(target);
    scrollToReview();
  }

  async function copyTestReport() {
    const report = buildTestExport({
      percentage: Number(t.porcentaje),
      correct: t.aciertos,
      failures: t.fallos,
      unanswered: t.sin_responder,
      questionCount: t.numero_preguntas,
      groups: diagnosticGroups,
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
            cls: "text-muted-foreground",
            Icon: MinusCircle,
          }
        : a.correcta
          ? {
              label: a.marked_doubt ? "Correcta · Con duda" : "Correcta",
              cls: a.marked_doubt ? "text-primary" : "text-success",
              Icon: a.marked_doubt ? Flag : CheckCircle2,
            }
          : {
              label: a.marked_doubt ? "Fallada · Con duda" : "Fallada",
              cls: "text-destructive",
              Icon: XCircle,
            };
    const EstIcon = estado.Icon;
    return (
      <Card key={a.id} className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground capitalize">{q.dificultad}</div>
          <div className={`inline-flex items-center gap-1 text-xs font-medium ${estado.cls}`}>
            <EstIcon className="w-3.5 h-3.5" /> {estado.label}
          </div>
        </div>
        <p className="text-sm font-medium">{q.pregunta}</p>
        <div className="text-sm space-y-1">
          <div>
            Tu respuesta:{" "}
            <span
              className={`font-medium ${a.correcta ? "text-success" : a.respuesta_usuario === null ? "text-muted-foreground" : "text-destructive"}`}
            >
              {userAnswer ?? "Sin responder"}
            </span>
          </div>
          <div>
            Respuesta correcta: <span className="text-success font-medium">{correctAnswer}</span>
          </div>
        </div>
        {q.explicacion && (
          <p className="text-xs text-muted-foreground border-t pt-2">{q.explicacion}</p>
        )}
        {reviewTarget && (a.correcta === false || a.marked_doubt) && (
          <p className="text-xs text-primary">
            <span className="font-medium">Qué repasar:</span> {reviewTarget}
          </p>
        )}
        {q.referencia_fuente && (
          <p className="text-xs text-muted-foreground">Fuente: {q.referencia_fuente}</p>
        )}
      </Card>
    );
  };

  const reviewBlock = (
    <div ref={reviewRef}>
      <h2 className="mb-2 font-semibold">
        {falladas.length > 0 ? "Tus fallos" : dudosas.length > 0 ? "Tus dudas" : "Revisión"}
      </h2>
      {revisar.length === 0 ? (
        <div className="space-y-3">{answers.map(renderAnswer)}</div>
      ) : (
        <Tabs
          value={falladas.length === 0 && tab === "fallos" ? "dudas" : tab}
          onValueChange={(value) => setTab(value as "fallos" | "dudas" | "todas")}
        >
          <TabsList
            className={`grid w-full ${falladas.length > 0 && dudosas.length > 0 ? "grid-cols-3" : "grid-cols-2"}`}
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
    </div>
  );

  const sinFallosDuros = t.fallos === 0;

  return (
    <div className="space-y-4">
      <header className="pt-2">
        <h1 className="text-2xl font-bold">{perfecto ? "Test completado" : "Resultados"}</h1>
        <p className="text-sm text-muted-foreground capitalize">{t.tipo}</p>
      </header>

      <Card className="p-4 text-center">
        <div className="text-5xl font-bold text-primary">{Number(t.porcentaje)}%</div>
        {sinFallosDuros ? (
          <div className="mt-3 space-y-1">
            <div className="text-sm">
              {t.aciertos} de {t.numero_preguntas} respuestas correctas
            </div>
            {t.sin_responder === 0 ? (
              <div className="text-sm font-medium text-success">
                Sin fallos
                {dudosas.length > 0
                  ? ` · ${dudosas.length} ${dudosas.length === 1 ? "duda" : "dudas"}`
                  : ""}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">{t.sin_responder} sin responder</div>
            )}
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
            <div>
              <CheckCircle2 className="w-4 h-4 mx-auto text-success" />
              <div className="font-semibold">{t.aciertos}</div>
              <div className="text-xs text-muted-foreground">Aciertos</div>
            </div>
            <div>
              <XCircle className="w-4 h-4 mx-auto text-destructive" />
              <div className="font-semibold">{t.fallos}</div>
              <div className="text-xs text-muted-foreground">Fallos</div>
            </div>
            <div>
              <MinusCircle className="w-4 h-4 mx-auto text-muted-foreground" />
              <div className="font-semibold">{t.sin_responder}</div>
              <div className="text-xs text-muted-foreground">Sin responder</div>
            </div>
          </div>
        )}
      </Card>

      {revisar.length > 0 && reviewBlock}

      {data.selection.length > 0 && (
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground font-medium mb-2">
            Cómo se eligieron
          </div>
          <div className="space-y-1 text-sm">
            {Object.entries(selectionCounts).map(([group, count]) => (
              <div key={group} className="flex justify-between gap-2">
                <span>{SELECTION_LABELS[group] ?? group}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {previousOverlap === 0
              ? "Ninguna pregunta coincide con el test anterior."
              : `${previousOverlap} ${previousOverlap === 1 ? "pregunta coincide" : "preguntas coinciden"} con el test anterior.`}
            {overlapException
              ? " Se utilizaron más repeticiones porque no había suficientes alternativas con esos filtros."
              : " Se ha respetado el límite máximo orientativo del 30 %."}
          </p>
        </Card>
      )}

      <Card className="space-y-3 p-4">
        <div>
          <div className="text-xs font-medium uppercase text-muted-foreground">
            Exportar resultado
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Copia un resumen con el resultado, los conceptos a repasar y sus referencias. No incluye
            el banco completo.
          </p>
        </div>
        <Button type="button" variant="outline" className="w-full" onClick={copyTestReport}>
          <ClipboardCopy className="mr-2 h-4 w-4" />
          Copiar informe para ChatGPT
        </Button>
      </Card>

      {sinFallosDuros ? (
        <div className="space-y-2">
          {dudosas.length > 0 && (
            <Button className="w-full h-12" onClick={repetirDudas}>
              Repetir dudas
            </Button>
          )}
          <Link to="/crear">
            <Button className="w-full h-12">Hacer otro test</Button>
          </Link>
          <Button variant="outline" className="w-full h-12" onClick={() => goReview("todas")}>
            Revisar respuestas
          </Button>
          <Link to="/inicio">
            <Button variant="outline" className="w-full h-12">
              Volver al inicio
            </Button>
          </Link>
          <Link to="/historial">
            <Button variant="ghost" className="w-full h-12">
              Ver historial
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          <Button className="w-full h-12" onClick={repetirFalladas}>
            Repetir falladas
          </Button>
          {dudosas.length > 0 && (
            <Button variant="outline" className="w-full h-12" onClick={repetirDudas}>
              Repetir dudas
            </Button>
          )}
          <Button variant="outline" className="w-full h-12" onClick={() => goReview("fallos")}>
            Ver corrección
          </Button>
          <Button variant="outline" className="w-full h-12" onClick={() => goReview("todas")}>
            Revisar todas
          </Button>
          <Link to="/inicio">
            <Button variant="ghost" className="w-full h-12">
              Volver al inicio
            </Button>
          </Link>
        </div>
      )}

      <Card className="p-4">
        <div className="text-xs uppercase text-muted-foreground font-medium mb-2">
          Por dificultad
        </div>
        <div className="space-y-1 text-sm">
          {Object.entries(byDif).map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="capitalize">{k}</span>
              <span>
                {v.ok}/{v.tot}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-xs uppercase text-muted-foreground font-medium mb-2">Por tema</div>
        <div className="space-y-1 text-sm">
          {Object.entries(byTopic).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <span className="truncate">{k}</span>
              <span className="flex-none">
                {v.ok}/{v.tot}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {revisar.length === 0 && reviewBlock}
    </div>
  );
}
