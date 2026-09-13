import { useEffect, useRef, useState } from "react";
import { CheckCircle2, GraduationCap, Layers3, Target, XCircle } from "lucide-react";
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
  const transitionTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current);
    },
    [],
  );

  function moveTo(next: number) {
    if (next === step || transitioning || next < 0 || next > ENTRY_STEP) return;
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

  return (
    <div className="min-h-[100svh] bg-background">
      <div className="mx-auto flex min-h-[100svh] w-full max-w-md flex-col px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-[calc(env(safe-area-inset-top,0px)+1rem)] min-[390px]:px-6">
        <header className="shrink-0" aria-label="OpoTest">
          <div className="flex h-8 items-center gap-2 text-sm font-semibold tracking-tight text-foreground/80">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/8 text-primary">
              <GraduationCap className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <span>OpoTest</span>
          </div>
          {!isEntry ? (
            <div className="mt-4 flex h-2 items-center gap-1.5" aria-label={`Paso ${step + 1} de 4`}>
              {PRE_AUTH_INTRO_STEPS.map((_, index) => (
                <span
                  key={index}
                  aria-hidden="true"
                  className={`h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none ${index === step ? "w-6 bg-primary" : index < step ? "w-1.5 bg-primary/35" : "w-1.5 bg-border"}`}
                />
              ))}
            </div>
          ) : (
            <div className="mt-4 h-2" />
          )}
        </header>

        <main
          aria-live="polite"
          className={`flex min-h-0 flex-1 flex-col pt-5 transition-[opacity,transform] duration-200 motion-reduce:transition-none ${visible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}
        >
          <div className="shrink-0">
            <h1 className="whitespace-pre-line text-[30px] font-semibold leading-[1.06] tracking-[-0.035em] min-[390px]:text-[32px] min-[430px]:text-[34px]">
              {current.title}
            </h1>
            <p className="mt-4 max-w-[38ch] text-[16px] leading-[1.5] text-muted-foreground min-[390px]:text-[17px]">
              <EmphasizedText text={current.description} emphasis={current.emphasis} />
            </p>
          </div>
          <div className="mt-5 flex min-h-[210px] flex-1 items-center">
            {isEntry ? <EntryVisual /> : <ValueVisual visual={PRE_AUTH_INTRO_STEPS[step].visual} />}
          </div>
        </main>

        <footer className="shrink-0 pt-4">
          {!isEntry ? (
            <>
              <Button className="h-12 w-full rounded-2xl text-[15px] font-semibold" disabled={transitioning} onClick={() => moveTo(step + 1)}>
                Continuar
              </Button>
              <div className="mt-2 grid h-9 grid-cols-2 items-center text-[13px] font-medium text-muted-foreground">
                <button type="button" disabled={transitioning || step === 0} onClick={() => moveTo(step - 1)} className={`justify-self-start px-1 py-2 hover:text-foreground ${step === 0 ? "invisible" : "visible"}`}>
                  Atrás
                </button>
                <button type="button" disabled={transitioning} onClick={() => moveTo(ENTRY_STEP)} className="justify-self-end px-1 py-2 hover:text-foreground">
                  Omitir
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <Button className="h-12 w-full rounded-2xl text-[15px] font-semibold" onClick={onCreateAccount}>Crear cuenta</Button>
              <button type="button" onClick={onLogin} className="flex h-10 w-full items-center justify-center rounded-xl text-[14px] font-medium text-foreground/75 hover:bg-muted/60 hover:text-foreground">
                Iniciar sesión
              </button>
              <button type="button" onClick={() => moveTo(ENTRY_STEP - 1)} className="mx-auto flex h-8 items-center px-3 text-[12px] font-medium text-muted-foreground hover:text-foreground">
                Atrás
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
    nodes.push(<span key={`${fragment}-${index}`} className="font-semibold text-foreground/85">{fragment}</span>);
    cursor = index + fragment.length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}

function ValueVisual({ visual }: { visual: PreAuthIntroVisual }) {
  return (
    <div aria-hidden="true" className="relative w-full overflow-hidden rounded-[28px] border border-border/70 bg-card/80 p-5 shadow-sm min-[390px]:p-6">
      {visual === "half" ? <HalfVisual /> : visual === "angles" ? <AnglesVisual /> : visual === "evidence" ? <EvidenceVisual /> : <CheckVisual />}
    </div>
  );
}

function HalfVisual() {
  return <div className="space-y-3"><VisualRow label="Estudiar la regla" value="Base" /><VisualRow label="Reconocerla en preguntas" value="Comprobar" strong /></div>;
}
function AnglesVisual() {
  return <div className="space-y-2.5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Mismo concepto</p>{["Literalidad", "Excepción", "Aplicación"].map((label, index) => <div key={label} className="flex items-center gap-3 rounded-2xl border bg-background/70 p-3"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary"><Layers3 className="h-4 w-4" /></span><span className="text-sm font-semibold">Ángulo {index + 1} · {label}</span></div>)}</div>;
}
function EvidenceVisual() {
  return <div className="space-y-3"><div className="grid grid-cols-3 gap-2 text-center"><Signal icon={CheckCircle2} label="Acierto" /><Signal icon={XCircle} label="Fallo" /><Signal icon={Target} label="Duda" /></div><div className="rounded-2xl bg-primary/7 p-4"><p className="text-sm font-semibold">La evidencia señala dónde reforzar</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-primary/10"><div className="h-full w-2/3 rounded-full bg-primary/60" /></div></div></div>;
}
function CheckVisual() {
  return <div className="space-y-3"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Siguiente entrenamiento</p><div className="rounded-2xl border border-primary/20 bg-primary/7 p-4"><p className="text-base font-semibold">Comprueba el concepto desde otro ángulo</p><p className="mt-1 text-sm text-muted-foreground">La siguiente respuesta añade evidencia, no actividad vacía.</p></div></div>;
}
function VisualRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex items-center justify-between rounded-2xl border p-4 ${strong ? "border-primary/20 bg-primary/7" : "bg-background/70"}`}><span className="text-sm font-semibold">{label}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${strong ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{value}</span></div>;
}
function Signal({ icon: Icon, label }: { icon: typeof CheckCircle2; label: string }) {
  return <div className="rounded-2xl border bg-background/70 px-2 py-3"><Icon className="mx-auto h-5 w-5 text-primary" /><p className="mt-1.5 text-xs font-semibold">{label}</p></div>;
}
function EntryVisual() {
  return <div aria-hidden="true" className="mx-auto flex w-full flex-col items-center justify-center py-6"><span className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-primary text-primary-foreground"><GraduationCap className="h-8 w-8" /></span><span className="mt-4 text-[17px] font-semibold tracking-tight">OpoTest</span></div>;
}
