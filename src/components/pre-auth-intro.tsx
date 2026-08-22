import { useEffect, useRef, useState } from "react";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PRE_AUTH_ENTRY,
  PRE_AUTH_INTRO_STEPS,
  type PreAuthIntroVisual,
} from "@/lib/pre-auth-intro";

const ENTRY_STEP = PRE_AUTH_INTRO_STEPS.length;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function PreAuthIntro({
  onCreateAccount,
  onLogin,
}: {
  onCreateAccount: () => void;
  onLogin: () => void;
}) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);
  const transitionTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
    },
    [],
  );

  function moveTo(next: number) {
    if (next === step || transitioning || next < 0 || next > ENTRY_STEP) return;
    const nextDirection: 1 | -1 = next > step ? 1 : -1;
    setDirection(nextDirection);

    if (prefersReducedMotion()) {
      setStep(next);
      setVisible(true);
      return;
    }

    setTransitioning(true);
    setVisible(false);
    transitionTimer.current = window.setTimeout(() => {
      setStep(next);
      window.requestAnimationFrame(() => {
        setVisible(true);
        setTransitioning(false);
      });
    }, 120);
  }

  const isEntry = step === ENTRY_STEP;
  const current = isEntry ? PRE_AUTH_ENTRY : PRE_AUTH_INTRO_STEPS[step];
  const currentVisual = isEntry ? null : PRE_AUTH_INTRO_STEPS[step].visual;

  return (
    <div className="min-h-[100svh] bg-background">
      <div className="mx-auto flex min-h-[100svh] w-full max-w-md flex-col px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-[calc(env(safe-area-inset-top,0px)+1rem)] min-[390px]:px-6">
        <header className="shrink-0" aria-label="OpoTest Study">
          <div className="flex h-8 items-center gap-2 text-sm font-semibold tracking-tight text-foreground/80">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/8 text-primary">
              <GraduationCap className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <span>OpoTest Study</span>
          </div>
          <div
            className={`mt-4 flex h-2 items-center gap-1.5 transition-opacity duration-200 motion-reduce:transition-none ${isEntry ? "opacity-0" : "opacity-100"}`}
            aria-label={isEntry ? undefined : `Paso ${step + 1} de 3`}
          >
            {PRE_AUTH_INTRO_STEPS.map((_, index) => (
              <span
                key={index}
                aria-hidden="true"
                className={`h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none ${
                  index === step
                    ? "w-6 bg-primary"
                    : index < step
                      ? "w-1.5 bg-primary/35"
                      : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>
        </header>

        <main
          aria-live="polite"
          className={`flex min-h-0 flex-1 flex-col pt-5 transition-[opacity,transform] ease-out motion-reduce:transition-none ${
            visible
              ? "translate-x-0 opacity-100 duration-200"
              : direction > 0
                ? "-translate-x-2 opacity-0 duration-[120ms]"
                : "translate-x-2 opacity-0 duration-[120ms]"
          }`}
        >
          <div className="shrink-0">
            <h1 className="whitespace-pre-line text-[30px] font-semibold leading-[1.06] tracking-[-0.035em] text-foreground min-[390px]:text-[32px] min-[430px]:text-[34px]">
              {current.title}
            </h1>
            <p className="mt-4 max-w-[38ch] text-[16px] leading-[1.5] text-muted-foreground min-[390px]:text-[17px]">
              <EmphasizedText text={current.description} emphasis={current.emphasis} />
            </p>
          </div>

          <div className={`mt-5 min-h-0 flex-1 ${isEntry ? "flex items-center" : "min-h-[210px]"}`}>
            {currentVisual ? <ValueVisual visual={currentVisual} /> : <EntryVisual />}
          </div>
        </main>

        <footer className="shrink-0 pt-4">
          {!isEntry ? (
            <>
              <Button
                className="h-12 w-full rounded-2xl text-[15px] font-semibold shadow-[0_14px_30px_-20px_oklch(0.3_0.14_250/0.8)]"
                disabled={transitioning}
                onClick={() => moveTo(step + 1)}
              >
                Continuar
              </Button>
              <div className="mt-2 grid h-9 grid-cols-2 items-center text-[13px] font-medium text-muted-foreground">
                <button
                  type="button"
                  disabled={transitioning || step === 0}
                  onClick={() => moveTo(step - 1)}
                  className={`justify-self-start px-1 py-2 transition-colors hover:text-foreground ${step === 0 ? "invisible" : "visible"}`}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={transitioning}
                  onClick={() => moveTo(ENTRY_STEP)}
                  className="justify-self-end px-1 py-2 transition-colors hover:text-foreground"
                >
                  Omitir
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <Button
                className="h-12 w-full rounded-2xl text-[15px] font-semibold shadow-[0_14px_30px_-20px_oklch(0.3_0.14_250/0.8)]"
                onClick={onCreateAccount}
              >
                Crear mi cuenta
              </Button>
              <button
                type="button"
                onClick={onLogin}
                className="flex h-10 w-full items-center justify-center rounded-xl text-[14px] font-medium text-foreground/75 transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                Ya tengo cuenta · Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => moveTo(ENTRY_STEP - 1)}
                className="mx-auto flex h-8 items-center px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Anterior
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}

function EmphasizedText({ text, emphasis }: { text: string; emphasis: readonly string[] }) {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  for (const fragment of emphasis) {
    const index = text.indexOf(fragment, cursor);
    if (index < 0) continue;
    if (index > cursor) nodes.push(text.slice(cursor, index));
    nodes.push(
      <span key={`${fragment}-${index}`} className="font-semibold text-muted-foreground">
        {fragment}
      </span>,
    );
    cursor = index + fragment.length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}

function ValueVisual({ visual }: { visual: PreAuthIntroVisual }) {
  if (visual === "clarity") return <ClarityVisual />;
  if (visual === "progress") return <ProgressVisual />;
  return <PriorityVisual />;
}

function VisualShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className="relative h-full min-h-[210px] w-full overflow-hidden rounded-[28px] border border-border/70 bg-card/80 p-5 shadow-[0_24px_55px_-38px_oklch(0.28_0.09_250/0.45)] min-[390px]:p-6"
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/6 blur-2xl" />
      {children}
    </div>
  );
}

function ClarityVisual() {
  const rows = [
    { label: "Temas", offset: "ml-5", width: "w-24" },
    { label: "Tests", offset: "mr-8", width: "w-16" },
    { label: "Fallos", offset: "ml-9", width: "w-20" },
    { label: "Repasos", offset: "mr-3", width: "w-28" },
  ] as const;

  return (
    <VisualShell>
      <div className="relative z-10 flex h-full flex-col">
        <div className="space-y-2.5">
          {rows.map((row) => (
            <div
              key={row.label}
              className={`flex h-9 items-center gap-3 rounded-xl border border-border/65 bg-background/65 px-3 ${row.offset}`}
            >
              <span className="text-[12px] font-medium text-muted-foreground">{row.label}</span>
              <span className={`ml-auto h-1.5 rounded-full bg-muted ${row.width}`} />
            </div>
          ))}
        </div>
        <div className="mx-auto my-2 h-4 w-px bg-gradient-to-b from-border to-primary/30" />
        <div className="mt-auto rounded-2xl border border-primary/15 bg-primary/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] font-semibold text-foreground">Preparación con rumbo</span>
            <span className="h-2 w-2 rounded-full bg-primary" />
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary/10">
            <div className="h-full w-[74%] rounded-full bg-primary/55" />
          </div>
        </div>
      </div>
    </VisualShell>
  );
}

function ProgressVisual() {
  const signals = [
    { label: "Contenido asentado", dot: "bg-success", line: "w-[82%]" },
    { label: "Aquí todavía dudas", dot: "bg-warning", line: "w-[56%]" },
    { label: "Necesita otra vuelta", dot: "bg-primary", line: "w-[68%]" },
  ] as const;

  return (
    <VisualShell>
      <div className="relative z-10 flex h-full flex-col">
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Tu preparación
        </p>
        <div className="mt-5 space-y-4">
          {signals.map((signal) => (
            <div key={signal.label}>
              <div className="flex items-center gap-2.5">
                <span className={`h-2.5 w-2.5 rounded-full ${signal.dot}`} />
                <span className="text-[13px] font-medium text-foreground/85">{signal.label}</span>
              </div>
              <div className="ml-5 mt-2 h-1.5 rounded-full bg-muted/90">
                <div className={`h-full rounded-full bg-foreground/12 ${signal.line}`} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-3 pt-5">
          <span className="h-px flex-1 bg-border" />
          <span className="h-2 w-2 rounded-full bg-border" />
          <span className="h-px w-8 bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary/45" />
          <span className="h-px w-8 bg-primary/25" />
          <span className="h-3 w-3 rounded-full bg-primary" />
          <span className="h-px flex-1 bg-primary/25" />
        </div>
      </div>
    </VisualShell>
  );
}

function PriorityVisual() {
  return (
    <VisualShell>
      <div className="relative z-10 flex h-full flex-col justify-center gap-3">
        <PriorityRow topic="Tema 4" label="Más asentado" muted />
        <PriorityRow topic="Tema 11" label="Merece atención" />
        <PriorityRow topic="Tema 18" label="Más asentado" muted />
      </div>
    </VisualShell>
  );
}

function PriorityRow({ topic, label, muted = false }: { topic: string; label: string; muted?: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-opacity ${
        muted
          ? "border-border/55 bg-background/45 opacity-55"
          : "border-primary/20 bg-primary/7 shadow-[0_14px_28px_-24px_oklch(0.3_0.14_250/0.7)]"
      }`}
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl text-[12px] font-semibold ${
          muted ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
        }`}
      >
        {topic.replace("Tema ", "T")}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-foreground">{topic}</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">{label}</p>
      </div>
      <span className={`h-2.5 w-2.5 rounded-full ${muted ? "bg-border" : "bg-primary"}`} />
    </div>
  );
}

function EntryVisual() {
  return (
    <div aria-hidden="true" className="relative mx-auto flex h-[clamp(170px,27svh,230px)] w-full items-center justify-center">
      <div className="absolute h-44 w-44 rounded-full bg-primary/7 blur-3xl" />
      <div className="relative flex flex-col items-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-primary text-primary-foreground shadow-[0_22px_45px_-24px_oklch(0.3_0.14_250/0.8)]">
          <GraduationCap className="h-8 w-8" strokeWidth={2.1} />
        </span>
        <span className="mt-4 text-[16px] font-semibold tracking-tight text-foreground">OpoTest Study</span>
      </div>
    </div>
  );
}
