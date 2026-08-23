import { useQuery } from "@tanstack/react-query";
import { Check, Layers3, Loader2, Lock, LockOpen, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { LEARNING_STAGE_LABELS } from "@/lib/learning-stages";
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
};

type OptionLetter = "A" | "B" | "C" | "D";

const STAGE_TARGETS = [
  "tour-study-practice-aprendizaje",
  "tour-study-practice-consolidacion",
  "tour-study-practice-tribunal",
] as const;

function optionText(question: PreviewQuestion, letter: OptionLetter) {
  return {
    A: question.opcion_a,
    B: question.opcion_b,
    C: question.opcion_c,
    D: question.opcion_d,
  }[letter];
}

function questionCompactness(question: PreviewQuestion) {
  const options = [question.opcion_a, question.opcion_b, question.opcion_c, question.opcion_d];
  return (
    question.pregunta.length +
    Math.max(...options.map((option) => option.length)) * 2 +
    options.reduce((sum, option) => sum + option.length, 0) / 4 +
    (question.explicacion?.trim() ? 0 : 400)
  );
}

async function loadPreviewQuestion(): Promise<PreviewQuestion | null> {
  const context = await supabase.rpc("prepare_my_v4_today_context");
  if (context.error) throw context.error;
  const rows = (context.data ?? []) as Array<{ topic_id?: string | null }>;
  const topicId = rows.find((row) => Boolean(row.topic_id))?.topic_id;
  if (!topicId) return null;

  const questions = await supabase
    .from("questions")
    .select("id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, explicacion")
    .eq("topic_id", topicId)
    .eq("activa", true)
    .limit(40);
  if (questions.error) throw questions.error;

  const pool = (questions.data ?? []) as PreviewQuestion[];
  const compact = pool.filter((question) => {
    const options = [question.opcion_a, question.opcion_b, question.opcion_c, question.opcion_d];
    return question.pregunta.length <= 155 && options.every((option) => option.length <= 115);
  });
  const candidates = compact.length > 0 ? compact : pool;
  return [...candidates].sort((a, b) => questionCompactness(a) - questionCompactness(b))[0] ?? null;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function DemoShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[50] overflow-hidden bg-background">
      <style>{`
        @media (max-width: 899px) {
          [role="dialog"][aria-labelledby="tour-title"] {
            top: auto !important;
            bottom: 12px !important;
            max-height: 42dvh !important;
            overflow-y: auto !important;
          }
        }
        @media (min-width: 900px) {
          [role="dialog"][aria-labelledby="tour-title"] {
            left: auto !important;
            right: 24px !important;
            top: 24px !important;
            max-height: calc(100dvh - 48px) !important;
            overflow-y: auto !important;
          }
        }
      `}</style>
      <div className="mx-auto flex h-[56dvh] w-full max-w-md flex-col px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] min-[900px]:h-full min-[900px]:min-h-[100dvh] min-[900px]:pb-8">
        <div className="flex shrink-0 items-center justify-center gap-2 text-[14px] font-semibold text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
          Demo · nada de esto cuenta en tus estadísticas
        </div>
        <div className="mt-3 flex min-h-0 flex-1 items-center justify-center">{children}</div>
      </div>
    </div>
  );
}

export function ProductTourPracticeDemo({ scene }: { scene: number }) {
  const [unlocked, setUnlocked] = useState(0);
  const [unlocking, setUnlocking] = useState<number | null>(null);
  const [answerPhase, setAnswerPhase] = useState<"idle" | "selected" | "feedback">("idle");
  const questionQuery = useQuery({
    queryKey: ["product-tour-practice-preview-question-v4"],
    enabled: scene >= 4,
    staleTime: 5 * 60_000,
    queryFn: loadPreviewQuestion,
  });

  useEffect(() => {
    if (scene < 1 || scene > 3) {
      setUnlocked(0);
      setUnlocking(null);
      return;
    }

    const targetUnlock = scene - 1;
    const previousUnlock = Math.max(0, targetUnlock - 1);
    if (targetUnlock === 0) {
      setUnlocked(0);
      setUnlocking(null);
      return;
    }

    if (prefersReducedMotion()) {
      setUnlocked(targetUnlock);
      setUnlocking(null);
      return;
    }

    setUnlocked(previousUnlock);
    setUnlocking(targetUnlock);
    const openTimer = window.setTimeout(() => setUnlocked(targetUnlock), 720);
    const endTimer = window.setTimeout(() => setUnlocking(null), 1_550);
    return () => {
      window.clearTimeout(openTimer);
      window.clearTimeout(endTimer);
    };
  }, [scene]);

  useEffect(() => {
    if (scene === 5) {
      setAnswerPhase("feedback");
      return;
    }
    if (scene !== 4 || questionQuery.isLoading || !questionQuery.data) {
      setAnswerPhase("idle");
      return;
    }
    setAnswerPhase("idle");
    const selected = window.setTimeout(
      () => setAnswerPhase("selected"),
      prefersReducedMotion() ? 0 : 760,
    );
    return () => window.clearTimeout(selected);
  }, [questionQuery.data, questionQuery.isLoading, scene]);

  if (scene >= 1 && scene <= 3) {
    return <LevelsPreview activeIndex={scene - 1} unlocked={unlocked} unlocking={unlocking} />;
  }

  if (scene >= 4) {
    return (
      <QuestionPreview
        question={questionQuery.data ?? null}
        loading={questionQuery.isLoading}
        phase={answerPhase}
      />
    );
  }

  return null;
}

function LevelsPreview({
  activeIndex,
  unlocked,
  unlocking,
}: {
  activeIndex: number;
  unlocked: number;
  unlocking: number | null;
}) {
  const reduceMotion = prefersReducedMotion();
  const stages = [
    {
      key: "aprendizaje",
      title: LEARNING_STAGE_LABELS.aprendizaje,
      description: "Entiende la base",
      detail: "Base, reglas y conceptos esenciales. Empiezas aquí.",
      locked: false,
      index: 0,
    },
    {
      key: "consolidacion",
      title: LEARNING_STAGE_LABELS.consolidacion,
      description: "Domina relaciones y excepciones",
      detail: "Se abre cuando tu base ya es estable.",
      locked: unlocked < 1,
      index: 1,
    },
    {
      key: "tribunal",
      title: LEARNING_STAGE_LABELS.tribunal,
      description: "Entrena los matices del examen",
      detail: "Se abre después de consolidar con seguridad.",
      locked: unlocked < 2,
      index: 2,
    },
  ] as const;

  return (
    <DemoShell>
      <Card className="w-full border-primary/15 bg-card/95 p-4">
        <div className="flex items-center gap-3 border-b border-border/70 pb-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Layers3 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[17px] font-bold">Tres niveles. Tres objetivos.</p>
            <p className="mt-0.5 text-[14px] leading-[1.35] text-muted-foreground">
              Avanzas cuando tu práctica demuestra seguridad.
            </p>
          </div>
        </div>

        <style>{`
          @keyframes tour-lock-shake {
            0%, 100% { transform: rotate(0) scale(1); }
            20% { transform: rotate(-12deg) scale(1.08); }
            40% { transform: rotate(11deg) scale(1.08); }
            60% { transform: rotate(-8deg) scale(1.06); }
            80% { transform: rotate(6deg) scale(1.03); }
          }
          @keyframes tour-unlock-pop {
            0% { transform: scale(.45) rotate(28deg); opacity: 0; }
            58% { transform: scale(1.28) rotate(-8deg); opacity: 1; }
            100% { transform: scale(1) rotate(0); opacity: 1; }
          }
          @keyframes tour-stage-glow {
            0% { box-shadow: 0 0 0 0 rgb(14 116 214 / 0); }
            55% { box-shadow: 0 0 0 5px rgb(14 116 214 / .13); }
            100% { box-shadow: 0 0 0 0 rgb(14 116 214 / 0); }
          }
        `}</style>

        <div className="mt-3 space-y-2.5">
          {stages.map((stage) => {
            const active = stage.index === activeIndex;
            const isUnlocking = unlocking === stage.index;
            const justUnlocked = isUnlocking && !stage.locked;
            const advancedUnlocked = stage.index > 0 && !stage.locked;
            return (
              <div
                key={stage.key}
                data-tour={STAGE_TARGETS[stage.index]}
                className={cn(
                  "relative overflow-hidden rounded-2xl border p-3 transition-[border-color,background-color,transform,box-shadow] duration-300 motion-reduce:transition-none",
                  active
                    ? "scale-[1.01] border-primary bg-primary/8"
                    : "border-border/80 bg-background/70",
                  justUnlocked && "[animation:tour-stage-glow_700ms_ease-out]",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-300",
                      stage.locked ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
                    )}
                  >
                    {stage.index === 0 ? (
                      <Check className="h-5 w-5" aria-label={`${stage.title} disponible`} />
                    ) : stage.locked ? (
                      <Lock
                        className="h-5 w-5 motion-reduce:animate-none"
                        style={{
                          animation:
                            isUnlocking && !reduceMotion
                              ? "tour-lock-shake 620ms ease-in-out both"
                              : undefined,
                        }}
                        aria-label={`${stage.title} bloqueado`}
                      />
                    ) : isUnlocking ? (
                      <LockOpen
                        className="h-5 w-5 motion-reduce:animate-none"
                        style={{
                          animation:
                            justUnlocked && !reduceMotion
                              ? "tour-unlock-pop 520ms cubic-bezier(.2,.9,.25,1.25) both"
                              : undefined,
                        }}
                        aria-label={`${stage.title} desbloqueándose`}
                      />
                    ) : (
                      <Check className="h-5 w-5" aria-label={`${stage.title} disponible`} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[16px] font-bold">{stage.title}</p>
                      {stage.index > 0 && isUnlocking && stage.locked && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                          Desbloqueando…
                        </span>
                      )}
                      {advancedUnlocked && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                          {isUnlocking ? "Desbloqueado" : "Disponible"}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[15px] font-semibold text-primary">{stage.description}</p>
                  </div>
                </div>
                {active && (
                  <p className="mt-2 text-[14px] leading-[1.35] text-muted-foreground">{stage.detail}</p>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </DemoShell>
  );
}

function QuestionPreview({
  question,
  loading,
  phase,
}: {
  question: PreviewQuestion | null;
  loading: boolean;
  phase: "idle" | "selected" | "feedback";
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
  const feedback = phase === "feedback";
  const target = feedback ? "tour-study-practice-feedback" : "tour-study-practice-question";

  if (loading) {
    return (
      <DemoShell>
        <Card data-tour={target} className="flex min-h-48 w-full items-center justify-center p-6">
          <div className="text-center">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary motion-reduce:animate-none" />
            <p className="mt-3 text-lg font-semibold">Preparando una pregunta real…</p>
          </div>
        </Card>
      </DemoShell>
    );
  }

  if (!question) {
    return (
      <DemoShell>
        <Card data-tour={target} className="w-full p-6 text-center">
          <p className="text-lg font-semibold">No hay una pregunta disponible para esta demo.</p>
        </Card>
      </DemoShell>
    );
  }

  return (
    <DemoShell>
      <div className="w-full">
        <style>{`
          @keyframes tour-answer-tap {
            0% { transform: scale(1); }
            35% { transform: scale(.965); }
            68% { transform: scale(1.015); }
            100% { transform: scale(1); }
          }
        `}</style>
        <div className="mb-2 flex items-baseline justify-between px-1 text-[14px]">
          <span className="font-bold">1 de 10</span>
          <span className="font-bold text-primary">Demo · Aprendizaje</span>
        </div>
        <Progress value={10} className="mb-3 h-1.5" />

        {!feedback ? (
          <div data-tour="tour-study-practice-question" className="space-y-2.5">
            <Card className="border-primary/15 bg-gradient-to-br from-card to-primary/5 p-3.5">
              <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-primary">Pregunta</p>
              <h2 className="mt-1.5 text-[16px] font-semibold leading-[1.35]">{question.pregunta}</h2>
            </Card>

            <div className="space-y-1.5">
              {options.map(([letter, text]) => {
                const selected = phase === "selected" && letter === simulated;
                return (
                  <div
                    key={letter}
                    className={cn(
                      "rounded-xl border px-2.5 py-2 transition-[border-color,background-color,transform,box-shadow] duration-200",
                      selected
                        ? "border-primary bg-primary/10 shadow-[0_10px_26px_-22px_oklch(0.3_0.14_250/0.8)] [animation:tour-answer-tap_420ms_ease-out]"
                        : "border-border/90 bg-card/90",
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[14px] font-bold",
                          selected ? "bg-primary text-primary-foreground" : "bg-muted",
                        )}
                      >
                        {letter}
                      </span>
                      <span className="flex-1 text-[14px] leading-[1.3]">{text}</span>
                      {selected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <Card className="w-full space-y-2.5 p-3.5 animate-in fade-in-0 slide-in-from-bottom-1 duration-200 motion-reduce:animate-none">
            <div data-tour="tour-study-practice-feedback" className="space-y-2">
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
                <p className="text-[15px] font-bold">Tu respuesta</p>
                <div className="mt-1 flex items-start gap-2">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                  <p className="text-[14px] font-normal leading-[1.35] text-destructive">
                    {simulated}. {optionText(question, simulated)}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-success/20 bg-success/5 p-3">
                <p className="text-[15px] font-bold">Respuesta correcta</p>
                <div className="mt-1 flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  <p className="text-[14px] font-normal leading-[1.35] text-success">
                    {correct}. {optionText(question, correct)}
                  </p>
                </div>
              </div>
            </div>
            {question.explicacion && (
              <p className="text-[13px] leading-[1.35] text-muted-foreground">
                {question.explicacion.length > 105
                  ? `${question.explicacion.slice(0, 102).trim()}…`
                  : question.explicacion}
              </p>
            )}
          </Card>
        )}
      </div>
    </DemoShell>
  );
}
