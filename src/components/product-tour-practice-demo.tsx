import { useQuery } from "@tanstack/react-query";
import { Brain, Check, Layers3, Loader2, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import {
  LEARNING_STAGE_DESCRIPTIONS,
  LEARNING_STAGE_LABELS,
  type PracticeStage,
} from "@/lib/learning-stages";
import { cn } from "@/lib/utils";

type PreviewQuestion = {
  id: string;
  pregunta: string;
  opcion_a: string;
  opcion_b: string;
  opcion_c: string;
  opcion_d: string;
  respuesta_correcta: string;
  explicacion: string | null;
  nivel_pedagogico: string | null;
};

type OptionLetter = "A" | "B" | "C" | "D";

const STAGE_TOUR_TARGETS: Record<PracticeStage, string> = {
  aprendizaje: "practice-level-aprendizaje",
  consolidacion: "practice-level-consolidacion",
  tribunal: "practice-level-tribunal",
  mezcladas: "practice-level-mezcladas",
};

const STAGE_HELP: Record<PracticeStage, string> = {
  aprendizaje: "Primero construyes una base segura.",
  consolidacion: "Después conectas reglas, excepciones y relaciones.",
  tribunal: "Aquí entrenas la precisión que exige el examen.",
  mezcladas: "Cuando el tema madura, mantienes activos los tres niveles.",
};

function optionText(question: PreviewQuestion, letter: OptionLetter) {
  return {
    A: question.opcion_a,
    B: question.opcion_b,
    C: question.opcion_c,
    D: question.opcion_d,
  }[letter];
}

async function loadPreviewQuestion(): Promise<PreviewQuestion | null> {
  const context = await supabase.rpc("prepare_my_v4_today_context");
  if (context.error) throw context.error;
  const rows = (context.data ?? []) as Array<{ topic_id?: string | null }>;
  const topicId = rows.find((row) => Boolean(row.topic_id))?.topic_id;
  if (!topicId) return null;

  const questions = await supabase
    .from("questions")
    .select(
      "id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, explicacion, nivel_pedagogico",
    )
    .eq("topic_id", topicId)
    .eq("activa", true)
    .or("nivel_pedagogico.eq.aprendizaje,nivel_pedagogico.is.null")
    .limit(24);
  if (questions.error) throw questions.error;

  const pool = (questions.data ?? []) as PreviewQuestion[];
  return pool.find((question) => Boolean(question.explicacion?.trim())) ?? pool[0] ?? null;
}

export function ProductTourPracticeDemo({ scene }: { scene: number }) {
  const [openingQuestion, setOpeningQuestion] = useState(false);
  const showingQuestion = scene >= 7;
  const showingSelection = scene >= 8;
  const showingFeedback = scene >= 9;
  const questionQuery = useQuery({
    queryKey: ["product-tour-practice-preview-question"],
    enabled: scene > 0,
    staleTime: 5 * 60_000,
    queryFn: loadPreviewQuestion,
  });

  useEffect(() => {
    if (scene !== 7) {
      setOpeningQuestion(false);
      return;
    }
    setOpeningQuestion(true);
    const timer = window.setTimeout(() => setOpeningQuestion(false), 320);
    return () => window.clearTimeout(timer);
  }, [scene]);

  if (scene <= 0) return null;

  return (
    <div className="fixed inset-0 z-[50] overflow-y-auto bg-background">
      <div className="mx-auto min-h-full w-full max-w-md px-4 pb-10 pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
        <div className="mb-4 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
          Vista del tutorial · no cuenta en tus estadísticas
        </div>

        {showingQuestion ? (
          openingQuestion ? (
            <div className="flex min-h-[65vh] flex-col items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary motion-reduce:animate-none" />
              <p className="text-sm font-medium text-muted-foreground">Preparando una pregunta real…</p>
            </div>
          ) : (
            <QuestionPreview
              question={questionQuery.data ?? null}
              loading={questionQuery.isLoading}
              selection={showingSelection}
              feedback={showingFeedback}
            />
          )
        ) : (
          <BuilderPreview scene={scene} />
        )}
      </div>
    </div>
  );
}

function BuilderPreview({ scene }: { scene: number }) {
  const highlightedStage: PracticeStage | null =
    scene === 1
      ? "aprendizaje"
      : scene === 2
        ? "consolidacion"
        : scene === 3
          ? "tribunal"
          : scene === 4
            ? "mezcladas"
            : null;

  return (
    <div className="space-y-4">
      <header className="pt-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Práctica a tu medida</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Crear test</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Una simulación con los mismos niveles y decisiones que usarás al practicar.
        </p>
      </header>

      <Card className="space-y-3 border-primary/15 bg-card/95 p-4">
        <div className="flex items-center gap-3 border-b border-border/70 pb-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Layers3 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold">Nivel de preparación</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              No es fácil, medio y difícil: son etapas distintas de entrenamiento.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(["aprendizaje", "consolidacion", "tribunal", "mezcladas"] as PracticeStage[]).map(
            (stage) => {
              const active = highlightedStage === stage;
              return (
                <div
                  key={stage}
                  data-tour={STAGE_TOUR_TARGETS[stage]}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-[border-color,background-color,transform,box-shadow] duration-200 motion-reduce:transition-none",
                    active
                      ? "scale-[1.015] border-primary bg-primary/10 shadow-[0_16px_36px_-28px_oklch(0.3_0.14_250/0.8)]"
                      : "border-border bg-background/80",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold">{LEARNING_STAGE_LABELS[stage]}</span>
                    {active && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                    {LEARNING_STAGE_DESCRIPTIONS[stage]}
                  </p>
                  <p className="mt-2 text-[11px] font-semibold leading-snug text-foreground/80">
                    {STAGE_HELP[stage]}
                  </p>
                </div>
              );
            },
          )}
        </div>
      </Card>

      <Card
        data-tour="practice-format"
        className={cn(
          "space-y-3 bg-card/95 p-4 transition-[transform,box-shadow] duration-200",
          scene === 5 && "scale-[1.008] shadow-[0_18px_42px_-34px_oklch(0.3_0.14_250/0.8)]",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">Configuración de ejemplo</p>
            <h2 className="mt-1 text-base font-bold">Todo listo en unos segundos</h2>
          </div>
          <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <DemoField label="Contenido" value="Tema recomendado" />
          <DemoField label="Preguntas" value="10 preguntas" />
          <DemoField label="Nivel" value="Aprendizaje" />
          <DemoField label="Modalidad" value="Selección inteligente" />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          OpoTest recomienda el nivel según tu práctica, pero tú sigues controlando el contenido y el formato.
        </p>
      </Card>

      <Button
        type="button"
        data-tour="practice-start"
        className="h-12 w-full text-base font-semibold"
      >
        Iniciar test
      </Button>
    </div>
  );
}

function DemoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/80 bg-background/80 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-xs font-semibold leading-snug">{value}</p>
    </div>
  );
}

function QuestionPreview({
  question,
  loading,
  selection,
  feedback,
}: {
  question: PreviewQuestion | null;
  loading: boolean;
  selection: boolean;
  feedback: boolean;
}) {
  const options = useMemo<Array<[OptionLetter, string]>>(
    () =>
      question
        ? [
            ["A", question.opcion_a],
            ["B", question.opcion_b],
            ["C", question.opcion_c],
            ["D", question.opcion_d],
          ]
        : [],
    [question],
  );
  const correct = (question?.respuesta_correcta?.toUpperCase() ?? "A") as OptionLetter;
  const simulated = (["A", "B", "C", "D"] as OptionLetter[]).find((letter) => letter !== correct) ?? "A";

  useEffect(() => {
    if (!selection || feedback || !question) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const frame = window.requestAnimationFrame(() => {
      const selectedOption = document.querySelector<HTMLElement>('[data-tour="practice-answer"]');
      selectedOption?.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(.965)" },
          { transform: "scale(1.01)" },
          { transform: "scale(1)" },
        ],
        { duration: 360, easing: "cubic-bezier(.2,.75,.25,1)" },
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, [feedback, question, selection]);

  if (loading) {
    return (
      <div className="flex min-h-[65vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary motion-reduce:animate-none" />
        <p className="text-sm text-muted-foreground">Buscando una pregunta real del tema…</p>
      </div>
    );
  }

  if (!question) {
    return (
      <Card data-tour="practice-question" className="p-6 text-center">
        <Brain className="mx-auto h-7 w-7 text-primary" />
        <p className="mt-3 font-semibold">No hay una pregunta disponible para esta vista previa</p>
        <p className="mt-1 text-sm text-muted-foreground">El tutorial continuará sin modificar tu progreso.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      <header className="sticky top-0 z-10 -mx-4 border-b border-border/60 bg-background/94 px-4 pb-3 pt-1 backdrop-blur-xl">
        <div className="flex items-baseline justify-between gap-3 text-xs">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold">1</span>
            <span className="font-medium text-muted-foreground">de 10</span>
          </div>
          <span className="font-semibold text-primary">Demo · Aprendizaje</span>
        </div>
        <Progress value={10} className="mt-2 h-1.5" />
      </header>

      <div data-tour="practice-question" className="space-y-3">
        <Card className="border-primary/15 bg-gradient-to-br from-card to-primary/5 p-4">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Pregunta</span>
          <h2 className="mt-2 text-[1.05rem] font-semibold leading-relaxed">{question.pregunta}</h2>
        </Card>

        <div className="space-y-2" role="presentation">
          {options.map(([letter, text]) => {
            const selected = selection && !feedback && letter === simulated;
            const chosenWrong = feedback && letter === simulated;
            const right = feedback && letter === correct;
            return (
              <div
                key={letter}
                data-tour={selected ? "practice-answer" : undefined}
                className={cn(
                  "min-h-14 w-full rounded-2xl border px-3 py-2.5 text-left transition-[border-color,background-color,transform,box-shadow] duration-200",
                  selected && "border-primary bg-primary/10 shadow-[0_12px_30px_-24px_oklch(0.3_0.14_250/0.8)]",
                  chosenWrong && "border-destructive/35 bg-destructive/8",
                  right && "border-success/35 bg-success/8",
                  !selected && !chosenWrong && !right && "border-border/90 bg-card/90",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-colors duration-200",
                      selected && "bg-primary text-primary-foreground",
                      chosenWrong && "bg-destructive text-destructive-foreground",
                      right && "bg-success text-success-foreground",
                      !selected && !chosenWrong && !right && "bg-muted text-foreground",
                    )}
                  >
                    {letter}
                  </span>
                  <span className="flex-1 text-[0.94rem] leading-relaxed">{text}</span>
                  {selected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                  {chosenWrong && <X className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />}
                  {right && <Check className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {feedback && (
        <Card
          data-tour="practice-feedback"
          className="animate-in fade-in-0 slide-in-from-bottom-1 space-y-3 border-primary/15 bg-card/95 p-4 duration-200 motion-reduce:animate-none"
        >
          <div className="grid gap-2 text-sm">
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
              <p className="text-sm font-bold text-foreground">Tu respuesta simulada</p>
              <p className="mt-1 font-normal leading-relaxed text-destructive">
                {simulated}. {optionText(question, simulated)}
              </p>
            </div>
            <div className="rounded-xl border border-success/20 bg-success/5 p-3">
              <p className="text-sm font-bold text-foreground">Respuesta correcta</p>
              <p className="mt-1 font-normal leading-relaxed text-success">
                {correct}. {optionText(question, correct)}
              </p>
            </div>
          </div>
          {question.explicacion && (
            <div className="rounded-xl border border-amber-400/25 bg-amber-500/5 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800 dark:text-amber-200">Por qué</p>
              <p className="mt-1 text-sm leading-relaxed">{question.explicacion}</p>
            </div>
          )}
          <p className="text-xs leading-relaxed text-muted-foreground">
            Esta selección no se guarda: no crea fallo, duda, test, historial ni cambios de mastery.
          </p>
        </Card>
      )}
    </div>
  );
}
