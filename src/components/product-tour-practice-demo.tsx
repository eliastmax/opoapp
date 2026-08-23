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
    .limit(24);
  if (questions.error) throw questions.error;

  const pool = (questions.data ?? []) as PreviewQuestion[];
  return pool.find((question) => Boolean(question.explicacion?.trim())) ?? pool[0] ?? null;
}

function optionText(question: PreviewQuestion, letter: OptionLetter) {
  return {
    A: question.opcion_a,
    B: question.opcion_b,
    C: question.opcion_c,
    D: question.opcion_d,
  }[letter];
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function DemoShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[50] overflow-y-auto bg-background">
      <style>{`
        @media (max-width: 899px) {
          [role="dialog"][aria-labelledby="tour-title"] {
            top: auto !important;
            bottom: 12px !important;
            max-height: 43dvh !important;
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
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pb-[48dvh] pt-[calc(env(safe-area-inset-top,0px)+1rem)] min-[900px]:pb-8">
        <div className="flex items-center justify-center gap-2 text-[15px] font-semibold text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
          Demo · nada de esto cuenta en tus estadísticas
        </div>
        <div className="mt-4 flex-1">{children}</div>
      </div>
    </div>
  );
}

export function ProductTourPracticeDemo({ scene }: { scene: number }) {
  const [unlocked, setUnlocked] = useState(0);
  const [unlocking, setUnlocking] = useState<number | null>(null);
  const [answerPhase, setAnswerPhase] = useState<"idle" | "selected" | "feedback">("idle");
  const questionQuery = useQuery({
    queryKey: ["product-tour-practice-preview-question-v3"],
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
    const openTimer = window.setTimeout(() => setUnlocked(targetUnlock), 420);
    const endTimer = window.setTimeout(() => setUnlocking(null), 1_000);
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
      prefersReducedMotion() ? 0 : 520,
    );
    return () => window.clearTimeout(selected);
  }, [questionQuery.data, questionQuery.isLoading, scene]);

  if (scene >= 1 && scene <= 3) {
    return (
      <LevelsPreview
        activeIndex={scene - 1}
        unlocked={unlocked}
        unlocking={unlocking}
      />
    );
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
      detail: "Excepciones y relaciones. Se desbloquea cuando tu base ya es estable.",
      locked: unlocked < 1,
      index: 1,
    },
    {
      key: "tribunal",
      title: LEARNING_STAGE_LABELS.tribunal,
      description: "Entrena los matices del examen",
      detail: "Casos, matices y distractores. Se desbloquea tras consolidar con seguridad.",
      locked: unlocked < 2,
      index: 2,
    },
  ] as const;

  return (
    <DemoShell>
      <Card className="border-primary/15 bg-card/95 p-5">
        <div className="flex items-center gap-3 border-b border-border/70 pb-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Layers3 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-lg font-bold">Tres niveles. Tres objetivos.</p>
            <p className="mt-1 text-[16px] leading-[1.4] text-muted-foreground">
              Empiezas por la base y avanzas cuando tu práctica demuestra seguridad.
            </p>
          </div>
        </div>

        <style>{`
          @keyframes tour-lock-release {
            0%, 18% { transform: translateX(0) rotate(0) scale(1); opacity: 1; }
            36% { transform: translateX(-2px) rotate(-10deg) scale(1.05); }
            54% { transform: translateX(2px) rotate(9deg) scale(1.08); }
            76% { transform: translateY(-2px) rotate(-12deg) scale(.92); opacity: 1; }
            100% { transform: translateY(-5px) rotate(-24deg) scale(.62); opacity: 0; }
          }
          @keyframes tour-unlock-pop {
            0% { transform: scale(.55) rotate(18deg); opacity: 0; }
            62% { transform: scale(1.18) rotate(-4deg); opacity: 1; }
            100% { transform: scale(1) rotate(0); opacity: 1; }
          }
          @keyframes tour-stage-release {
            0% { transform: scale(1); }
            55% { transform: scale(1.018); }
            100% { transform: scale(1.012); }
          }
        `}</style>

        <div className="mt-4 space-y-3">
          {stages.map((stage) => {
            const active = stage.index === activeIndex;
            const isUnlocking = unlocking === stage.index;
            const justUnlocked = isUnlocking && !stage.locked;
            return (
              <div
                key={stage.key}
                data-tour={STAGE_TARGETS[stage.index]}
                className={cn(
                  "relative overflow-hidden rounded-2xl border p-3.5 transition-[border-color,background-color,transform,box-shadow] duration-300 motion-reduce:transition-none",
                  active
                    ? "scale-[1.012] border-primary bg-primary/8 shadow-[0_18px_38px_-32px_oklch(0.3_0.14_250/0.8)]"
                    : "border-border/80 bg-background/70",
                  justUnlocked && "[animation:tour-stage-release_420ms_ease-out]",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "relative flex h-10 w-10 shrink-0 items-center justify-center overflow-visible rounded-xl transition-colors duration-300",
                      stage.locked ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
                    )}
                  >
                    {stage.index === 0 ? (
                      <Check className="h-5 w-5" aria-hidden="true" />
                    ) : stage.locked ? (
                      <Lock
                        className="h-5 w-5 motion-reduce:animate-none"
                        style={{
                          animation:
                            isUnlocking && !reduceMotion
                              ? "tour-lock-release 360ms ease-in-out forwards"
                              : undefined,
                        }}
                        aria-label={`${stage.title} bloqueado`}
                      />
                    ) : (
                      <LockOpen
                        className="h-5 w-5 motion-reduce:animate-none"
                        style={{
                          animation:
                            justUnlocked && !reduceMotion
                              ? "tour-unlock-pop 430ms cubic-bezier(.2,.9,.25,1.25) both"
                              : undefined,
                        }}
                        aria-label={`${stage.title} desbloqueado`}
                      />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[17px] font-bold">{stage.title}</p>
                      {stage.index > 0 && justUnlocked && (
                        <span className="animate-in fade-in-0 zoom-in-50 rounded-full bg-primary/10 px-2 py-0.5 text-[13px] font-bold text-primary duration-300 motion-reduce:animate-none">
                          Desbloqueado
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[16px] font-semibold text-primary">{stage.description}</p>
                  </div>
                </div>
                <p className="mt-2 text-[15px] leading-[1.4] text-muted-foreground">{stage.detail}</p>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-[15px] font-medium leading-[1.45] text-muted-foreground">
          Aprendizaje está disponible desde el principio. Consolidación y Tribunal se desbloquean en orden; OpoTest te avisa cuándo avanzar.
        </p>
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
        <Card data-tour={target} className="mt-8 flex min-h-56 items-center justify-center p-6">
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
        <Card data-tour={target} className="mt-8 p-6 text-center">
          <p className="text-lg font-semibold">No hay una pregunta disponible para esta demo.</p>
        </Card>
      </DemoShell>
    );
  }

  return (
    <DemoShell>
      <div className="space-y-3">
        <div className="flex items-baseline justify-between px-1 text-[15px]">
          <span className="font-bold">1 de 10</span>
          <span className="font-bold text-primary">Demo · Aprendizaje</span>
        </div>
        <Progress value={10} className="h-2" />

        {!feedback ? (
          <div data-tour="tour-study-practice-question" className="space-y-3">
            <Card className="border-primary/15 bg-gradient-to-br from-card to-primary/5 p-4">
              <p className="text-[15px] font-bold uppercase tracking-[0.08em] text-primary">Pregunta</p>
              <h2 className="mt-2 text-[18px] font-semibold leading-[1.45]">{question.pregunta}</h2>
            </Card>

            <div className="space-y-2">
              {options.map(([letter, text]) => {
                const selected = phase === "selected" && letter === simulated;
                return (
                  <div
                    key={letter}
                    className={cn(
                      "rounded-2xl border px-3 py-3 transition-[border-color,background-color,transform] duration-200",
                      selected
                        ? "scale-[0.99] border-primary bg-primary/10"
                        : "border-border/90 bg-card/90",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[16px] font-bold",
                          selected ? "bg-primary text-primary-foreground" : "bg-muted",
                        )}
                      >
                        {letter}
                      </span>
                      <span className="flex-1 text-[16px] leading-[1.4]">{text}</span>
                      {selected && <Check className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <Card
            data-tour="tour-study-practice-feedback"
            className="animate-in fade-in-0 slide-in-from-bottom-1 space-y-3 p-4 duration-200 motion-reduce:animate-none"
          >
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-3.5">
              <p className="text-[16px] font-bold">Tu respuesta</p>
              <div className="mt-1 flex items-start gap-2">
                <X className="mt-1 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
                <p className="text-[16px] font-normal leading-[1.45] text-destructive">
                  {simulated}. {optionText(question, simulated)}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-success/20 bg-success/5 p-3.5">
              <p className="text-[16px] font-bold">Respuesta correcta</p>
              <div className="mt-1 flex items-start gap-2">
                <Check className="mt-1 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                <p className="text-[16px] font-normal leading-[1.45] text-success">
                  {correct}. {optionText(question, correct)}
                </p>
              </div>
            </div>
            {question.explicacion && (
              <p className="text-[15px] leading-[1.45] text-muted-foreground">
                {question.explicacion.length > 160
                  ? `${question.explicacion.slice(0, 157).trim()}…`
                  : question.explicacion}
              </p>
            )}
          </Card>
        )}
      </div>
    </DemoShell>
  );
}
