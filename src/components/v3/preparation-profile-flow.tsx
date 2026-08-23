import { useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, BookMarked, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  ASSESSMENT_OPTIONS,
  PREPARATION_PROFILE_STEPS,
  assessedTopicCount,
  canContinuePreparationStep,
  preparationStepProgress,
  type ExamTiming,
  type PreparationProfileDraft,
  type PreparationProfileStep,
  type TopicAssessmentValue,
} from "@/lib/preparation-profile";
import { cn } from "@/lib/utils";

type TopicOption = { id: string; number: number; name: string };
type SaveState = "idle" | "saving" | "saved" | "error";

type PreparationProfileFlowProps = {
  oppositionName: string;
  topics: TopicOption[];
  draft: PreparationProfileDraft;
  onDraftChange: (draft: PreparationProfileDraft) => void;
  onSave: () => void;
  onRetry?: () => void;
  saveState?: SaveState;
  resumed?: boolean;
  initialStep?: PreparationProfileStep;
  initialTopicId?: string | null;
  sessionSizeOptions?: number[];
  onProgressChange?: (step: PreparationProfileStep, topicId: string | null) => void;
};

const WEEK_DAYS = [
  ["monday", "L"],
  ["tuesday", "M"],
  ["wednesday", "X"],
  ["thursday", "J"],
  ["friday", "V"],
  ["saturday", "S"],
  ["sunday", "D"],
] as const;

export function PreparationProfileFlow({
  oppositionName,
  topics,
  draft,
  onDraftChange,
  onSave,
  onRetry,
  saveState = "idle",
  resumed = false,
  initialStep = "opposition",
  initialTopicId = null,
  sessionSizeOptions = [5, 10, 20],
  onProgressChange,
}: PreparationProfileFlowProps) {
  const [step, setStep] = useState<PreparationProfileStep>(initialStep);
  const [topicIndex, setTopicIndex] = useState(() => {
    const savedIndex = initialTopicId
      ? topics.findIndex((candidate) => candidate.id === initialTopicId)
      : -1;
    return savedIndex >= 0 ? savedIndex : 0;
  });
  const stepIndex = PREPARATION_PROFILE_STEPS.indexOf(step);
  const topic = topics[topicIndex];
  const assessed = useMemo(
    () =>
      assessedTopicCount(
        topics.map((item) => item.id),
        draft.topicAssessments,
      ),
    [draft.topicAssessments, topics],
  );

  function update(patch: Partial<PreparationProfileDraft>) {
    onDraftChange({ ...draft, ...patch });
  }

  function nextStep() {
    if (step === "topics") {
      onSave();
      return;
    }
    const next = PREPARATION_PROFILE_STEPS[stepIndex + 1];
    setStep(next);
    onProgressChange?.(next, next === "topics" ? (topics[topicIndex]?.id ?? null) : null);
  }

  function previousStep() {
    if (step === "topics" && topicIndex > 0) {
      const previousIndex = topicIndex - 1;
      setTopicIndex(previousIndex);
      onProgressChange?.("topics", topics[previousIndex]?.id ?? null);
      return;
    }
    if (stepIndex > 0) {
      const previous = PREPARATION_PROFILE_STEPS[stepIndex - 1];
      setStep(previous);
      onProgressChange?.(previous, null);
    }
  }

  function assessTopic(value: TopicAssessmentValue) {
    if (!topic) return;
    update({ topicAssessments: { ...draft.topicAssessments, [topic.id]: value } });
    if (topicIndex < topics.length - 1) {
      const nextIndex = topicIndex + 1;
      setTopicIndex(nextIndex);
      onProgressChange?.("topics", topics[nextIndex]?.id ?? null);
    } else {
      onProgressChange?.("topics", topic.id);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <header className="pt-2">
        <div className="flex items-center justify-between text-[15px] font-semibold text-muted-foreground">
          <span>Tu perfil de preparación</span>
          <span>
            Paso {stepIndex + 1} de {PREPARATION_PROFILE_STEPS.length}
          </span>
        </div>
        <Progress value={preparationStepProgress(step)} className="mt-2 h-1.5" />
        {resumed ? (
          <p className="mt-2 text-[15px] text-muted-foreground">Retomamos donde lo dejaste.</p>
        ) : null}
      </header>

      <Card className="p-5">
        {step === "opposition" ? <OppositionStep oppositionName={oppositionName} /> : null}
        {step === "exam" ? (
          <ExamStep value={draft.examTiming} onChange={(examTiming) => update({ examTiming })} />
        ) : null}
        {step === "days" ? (
          <PracticeDaysStep
            value={draft.practiceDays}
            onChange={(practiceDays) => update({ practiceDays })}
          />
        ) : null}
        {step === "session" ? (
          <SessionSizeStep
            value={draft.questionsPerSession}
            options={sessionSizeOptions}
            onChange={(questionsPerSession) => update({ questionsPerSession })}
          />
        ) : null}
        {step === "topics" ? (
          <TopicAssessmentStep
            topic={topic}
            current={topicIndex + 1}
            total={topics.length}
            assessed={assessed}
            value={topic ? draft.topicAssessments[topic.id] : undefined}
            onChange={assessTopic}
          />
        ) : null}
      </Card>

      {saveState === "error" ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-destructive/8 p-3 text-[15px]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="flex-1">
            <p className="font-semibold">No hemos podido guardar tus datos</p>
            <p className="mt-0.5 text-[14px] text-muted-foreground">
              Lo introducido sigue en pantalla.
            </p>
          </div>
          {onRetry ? (
            <Button type="button" variant="ghost" size="sm" onClick={onRetry}>
              Reintentar
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-[auto_1fr] gap-2">
        {stepIndex > 0 || topicIndex > 0 ? (
          <Button type="button" variant="outline" className="h-12 text-[16px]" onClick={previousStep}>
            <ArrowLeft className="h-4 w-4" /> Atrás
          </Button>
        ) : (
          <span />
        )}
        {step !== "topics" ? (
          <Button
            type="button"
            className="h-12 text-[16px]"
            disabled={!canContinuePreparationStep(step, draft)}
            onClick={nextStep}
          >
            Continuar <ArrowRight className="h-4 w-4" />
          </Button>
        ) : topicIndex === topics.length - 1 &&
          Object.prototype.hasOwnProperty.call(draft.topicAssessments, topic?.id ?? "") ? (
          <Button type="button" className="h-12 text-[16px]" disabled={saveState === "saving"} onClick={onSave}>
            {saveState === "saving" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Guardar perfil
          </Button>
        ) : (
          <p className="self-center text-right text-[15px] leading-[1.35] text-muted-foreground">
            Elige una opción para pasar al siguiente tema
          </p>
        )}
      </div>
    </div>
  );
}

function StepHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header>
      <p className="text-[14px] font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p>
      <h1 className="mt-1 text-[22px] font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-[16px] leading-[1.5] text-muted-foreground">{description}</p>
    </header>
  );
}

function OppositionStep({ oppositionName }: { oppositionName: string }) {
  return (
    <div className="space-y-4">
      <StepHeading
        eyebrow="Tu oposición"
        title="Empezamos por tu objetivo"
        description="Confirma el proceso para el que vamos a organizar tu práctica."
      />
      <div className="flex items-start gap-3 rounded-2xl bg-primary/8 p-4 ring-1 ring-primary/10">
        <BookMarked className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p className="line-clamp-3 text-[16px] font-semibold leading-snug" title={oppositionName}>
          {oppositionName}
        </p>
      </div>
    </div>
  );
}

function ExamStep({
  value,
  onChange,
}: {
  value: ExamTiming | null;
  onChange: (value: ExamTiming) => void;
}) {
  return (
    <div className="space-y-4">
      <StepHeading
        eyebrow="Fecha del examen"
        title="¿Cuándo será?"
        description="Una aproximación es suficiente. Podrás cambiarla más adelante."
      />
      <ChoiceButton
        selected={value?.precision === "exact"}
        onClick={() =>
          onChange({ precision: "exact", value: value?.precision === "exact" ? value.value : "" })
        }
      >
        Sé la fecha exacta
      </ChoiceButton>
      {value?.precision === "exact" ? (
        <Input
          type="date"
          aria-label="Fecha exacta del examen"
          value={value.value}
          onChange={(event) => onChange({ precision: "exact", value: event.target.value })}
        />
      ) : null}
      <ChoiceButton
        selected={value?.precision === "month"}
        onClick={() =>
          onChange({ precision: "month", value: value?.precision === "month" ? value.value : "" })
        }
      >
        Sé el mes o periodo aproximado
      </ChoiceButton>
      {value?.precision === "month" ? (
        <Input
          type="month"
          aria-label="Mes aproximado del examen"
          value={value.value}
          onChange={(event) => onChange({ precision: "month", value: event.target.value })}
        />
      ) : null}
      <ChoiceButton
        selected={value?.precision === "unknown"}
        onClick={() => onChange({ precision: "unknown", value: null })}
      >
        Todavía no lo sé
      </ChoiceButton>
    </div>
  );
}

function PracticeDaysStep({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <div className="space-y-4">
      <StepHeading
        eyebrow="Tu ritmo"
        title="¿Qué días te viene bien practicar?"
        description="Elige los días habituales. No será una obligación ni una racha."
      />
      <div className="grid grid-cols-7 gap-1.5" aria-label="Días disponibles">
        {WEEK_DAYS.map(([id, label]) => {
          const selected = value.includes(id);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={selected}
              onClick={() =>
                onChange(selected ? value.filter((day) => day !== id) : [...value, id])
              }
              className={cn(
                "flex min-h-11 items-center justify-center rounded-xl border text-[16px] font-bold transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-accent",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      <p className="text-[15px] text-muted-foreground">
        {value.length === 0
          ? "Elige al menos un día."
          : `${value.length} ${value.length === 1 ? "día" : "días"} por semana`}
      </p>
    </div>
  );
}

function SessionSizeStep({
  value,
  options,
  onChange,
}: {
  value: number | null;
  options: number[];
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-4">
      <StepHeading
        eyebrow="Cada sesión"
        title="¿Cuántas preguntas te resultan cómodas?"
        description="Elige una cantidad realista. Podrás hacer sesiones distintas cuando quieras."
      />
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={cn(
              "min-h-[72px] rounded-2xl border text-center transition-colors",
              value === option
                ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20"
                : "border-border bg-background hover:bg-accent",
            )}
          >
            <span className="block text-[22px] font-bold">{option}</span>
            <span className="text-[15px]">preguntas</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TopicAssessmentStep({
  topic,
  current,
  total,
  assessed,
  value,
  onChange,
}: {
  topic?: TopicOption;
  current: number;
  total: number;
  assessed: number;
  value?: TopicAssessmentValue;
  onChange: (value: TopicAssessmentValue) => void;
}) {
  if (!topic) {
    return <p className="text-[16px] text-muted-foreground">No hay temas disponibles para valorar.</p>;
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between text-[16px] font-semibold text-muted-foreground">
          <span>Valoración inicial</span>
          <span>
            {current} de {total}
          </span>
        </div>
        <Progress value={total > 0 ? (assessed / total) * 100 : 0} className="mt-2 h-2" />
      </div>
      <div>
        <p className="text-[15px] font-semibold uppercase tracking-wide text-primary">
          Tema {topic.number}
        </p>
        <h1 className="mt-1 line-clamp-3 text-[22px] font-bold leading-[1.25]" title={topic.name}>
          {topic.name}
        </h1>
        <p className="mt-3 text-[17px] leading-[1.5] text-muted-foreground">
          ¿Cómo sientes que llevas este tema ahora mismo?
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {ASSESSMENT_OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value ?? "unknown"}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "min-h-[82px] rounded-2xl border p-4 text-left transition-colors",
                selected
                  ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                  : "border-border bg-background hover:bg-accent",
                option.value === null && "col-span-2",
              )}
            >
              <span className="block text-[18px] font-bold">
                {option.value === null ? "No sé" : `${option.value}%`}
              </span>
              <span className="mt-1 block text-[16px] leading-[1.4] text-muted-foreground">
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
      <p className="rounded-xl bg-muted/60 p-4 text-[15px] leading-[1.5] text-muted-foreground">
        Esta valoración solo ayuda a organizar el comienzo. No aumenta tu progreso ni da ningún tema
        por aprendido.
      </p>
    </div>
  );
}

function ChoiceButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex min-h-12 w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-[16px] font-semibold transition-colors",
        selected
          ? "border-primary bg-primary/8 text-primary ring-1 ring-primary/15"
          : "border-border bg-background hover:bg-accent",
      )}
    >
      {children}
      {selected ? <Check className="h-4 w-4 shrink-0" /> : null}
    </button>
  );
}
