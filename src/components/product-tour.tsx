import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  CircleHelp,
  Clock3,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  PRODUCT_TOUR_STEPS,
  shouldOpenProductTour,
  type ProductTourCompletionKind,
} from "@/lib/product-tour";
import { cn } from "@/lib/utils";

const ProductTourContext = createContext<{ replay: () => void } | null>(null);
const queryKey = (userId: string) => ["product-tour", userId] as const;

// The hook and provider intentionally share this small context module.
// eslint-disable-next-line react-refresh/only-export-components
export function useProductTour() {
  const value = useContext(ProductTourContext);
  if (!value) throw new Error("useProductTour must be used within ProductTourProvider");
  return value;
}

export function ProductTourProvider({ user, children }: { user: User; children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [replaying, setReplaying] = useState(false);
  const [step, setStep] = useState(0);
  const [dismissedForSession, setDismissedForSession] = useState(false);
  const state = useQuery({
    queryKey: queryKey(user.id),
    retry: 1,
    queryFn: async () => {
      const result = await supabase
        .from("product_tour_states")
        .select("completed_at, completion_kind")
        .eq("user_id", user.id)
        .maybeSingle();
      if (result.error) throw result.error;
      return result.data;
    },
  });

  const automatic = shouldOpenProductTour({
    loading: state.isLoading,
    error: state.isError,
    completedAt: state.data?.completed_at,
    dismissedForSession,
  });
  const open = replaying || automatic;

  useEffect(() => {
    if (!open) setStep(0);
  }, [open]);

  const closeSafely = useCallback(() => {
    setDismissedForSession(true);
    setReplaying(false);
  }, []);

  const persist = useCallback(
    async (kind: ProductTourCompletionKind) => {
      closeSafely();
      const now = new Date().toISOString();
      const result = await supabase
        .from("product_tour_states")
        .upsert(
          { user_id: user.id, completed_at: now, completion_kind: kind, updated_at: now },
          { onConflict: "user_id" },
        );
      if (result.error) {
        toast.error("No hemos podido guardar el tutorial. Puedes seguir usando OpoTest.");
        return false;
      }
      queryClient.setQueryData(queryKey(user.id), {
        completed_at: now,
        completion_kind: kind,
      });
      return true;
    },
    [closeSafely, queryClient, user.id],
  );

  const replay = useCallback(() => {
    setStep(0);
    setReplaying(true);
  }, []);
  const contextValue = useMemo(() => ({ replay }), [replay]);

  return (
    <ProductTourContext.Provider value={contextValue}>
      {children}
      <ProductTourDialog
        open={open}
        step={step}
        replaying={replaying}
        onStep={setStep}
        onSkip={() => (replaying ? closeSafely() : void persist("skipped"))}
        onFinish={() => {
          if (replaying) closeSafely();
          else void persist("completed");
          void navigate({ to: "/inicio" });
        }}
        onExplore={() => (replaying ? closeSafely() : void persist("completed"))}
      />
    </ProductTourContext.Provider>
  );
}

function ProductTourDialog({
  open,
  step,
  replaying,
  onStep,
  onSkip,
  onFinish,
  onExplore,
}: {
  open: boolean;
  step: number;
  replaying: boolean;
  onStep: (step: number) => void;
  onSkip: () => void;
  onFinish: () => void;
  onExplore: () => void;
}) {
  const item = PRODUCT_TOUR_STEPS[step];
  const last = step === PRODUCT_TOUR_STEPS.length - 1;
  return (
    <Dialog open={open}>
      <DialogContent
        hideClose
        onEscapeKeyDown={onSkip}
        onInteractOutside={(event) => event.preventDefault()}
        className="flex h-[min(680px,calc(100dvh-1rem))] w-[calc(100%-1rem)] max-w-md flex-col gap-0 overflow-hidden rounded-[1.5rem] border-border/70 p-0 shadow-xl motion-reduce:duration-0 sm:h-[min(700px,calc(100dvh-3rem))]"
        aria-describedby="product-tour-description"
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <div className="flex items-center gap-1.5" aria-label={`Paso ${step + 1} de 5`}>
            {PRODUCT_TOUR_STEPS.map((tourStep, index) => (
              <span
                key={tourStep.title}
                className={cn(
                  "h-1.5 rounded-full transition-[width,background-color] duration-200 motion-reduce:transition-none",
                  index === step
                    ? "w-7 bg-primary"
                    : index < step
                      ? "w-3 bg-primary/45"
                      : "w-3 bg-muted",
                )}
              />
            ))}
          </div>
          <Button variant="ghost" className="h-11 px-3 text-muted-foreground" onClick={onSkip}>
            {replaying ? "Cerrar" : "Omitir"}
          </Button>
        </div>

        <div
          key={step}
          className="flex min-h-0 flex-1 flex-col px-5 pb-3 pt-2 animate-in fade-in slide-in-from-right-2 duration-200 motion-reduce:animate-none sm:px-7"
        >
          <div className="flex min-h-[250px] flex-1 items-center justify-center py-3">
            <TourVisual step={step} />
          </div>
          <div className="pb-3 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              {item.eyebrow}
            </p>
            <DialogTitle className="mt-2 text-balance text-[1.65rem] leading-tight tracking-tight">
              {item.title}
            </DialogTitle>
            <DialogDescription
              id="product-tour-description"
              className="mx-auto mt-3 max-w-sm text-pretty text-[15px] leading-relaxed"
            >
              {item.description}
            </DialogDescription>
          </div>
        </div>

        <div className="border-t border-border/70 bg-card px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-4 sm:px-7">
          {last ? (
            <div className="space-y-2">
              <Button className="h-12 w-full text-base" onClick={onFinish} autoFocus>
                Empezar por Hoy <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                className="h-11 w-full text-muted-foreground"
                onClick={onExplore}
              >
                Explorar por mi cuenta
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              {step > 0 && (
                <Button
                  variant="outline"
                  className="h-12 w-12 shrink-0 px-0"
                  onClick={() => onStep(step - 1)}
                  aria-label="Paso anterior"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <Button className="h-12 flex-1 text-base" onClick={() => onStep(step + 1)} autoFocus>
                Siguiente <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TourVisual({ step }: { step: number }) {
  const shell =
    "w-full max-w-[310px] rounded-[1.35rem] border border-border/80 bg-card p-4 shadow-[0_18px_45px_-36px_oklch(0.28_0.08_250/0.7)]";
  if (step === 0)
    return (
      <div className={shell}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Tu sesión de hoy
          </span>
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="mt-4 flex gap-3">
          <span className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <Play className="h-5 w-5" />
          </span>
          <div>
            <p className="font-bold">Continúa tu preparación</p>
            <p className="mt-1 text-xs text-muted-foreground">Estudio · práctica · repaso</p>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2 rounded-xl bg-muted/70 px-3 py-2.5 text-xs">
          <Clock3 className="h-4 w-4 text-primary" />
          <span>Un siguiente paso claro para hoy</span>
        </div>
      </div>
    );
  if (step === 1)
    return (
      <div className={shell}>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="font-bold">Tema 1</span>
          <span className="ml-auto text-xs text-muted-foreground">2/4</span>
        </div>
        <div className="mt-4 space-y-2.5">
          {["Unidad 1 · Trabajada", "Unidad 2 · En curso", "Unidad 3 · Por empezar"].map(
            (label, index) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl border bg-background/70 p-3"
              >
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full",
                    index === 0 ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
                  )}
                >
                  {index === 0 ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span className="text-xs font-medium">{label}</span>
              </div>
            ),
          )}
        </div>
      </div>
    );
  if (step === 2)
    return (
      <div className={shell}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">Pregunta 3</span>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            Practicar
          </span>
        </div>
        <p className="mt-4 text-sm font-bold leading-snug">
          ¿Cuál de estas opciones corresponde al concepto estudiado?
        </p>
        <div className="mt-4 space-y-2">
          {["Opción A", "Opción B", "Opción C"].map((label) => (
            <div
              key={label}
              className="rounded-xl border px-3 py-2.5 text-xs text-muted-foreground"
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    );
  if (step === 3)
    return (
      <div className="w-full max-w-[320px]">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="rounded-2xl border bg-card p-3 text-center">
            <CircleHelp className="mx-auto h-6 w-6 text-warning" />
            <p className="mt-2 text-xs font-bold">Necesita refuerzo</p>
          </div>
          <RotateCcw className="h-5 w-5 text-primary" />
          <div className="rounded-2xl border bg-card p-3 text-center">
            <Brain className="mx-auto h-6 w-6 text-success" />
            <p className="mt-2 text-xs font-bold">Mejor asentado</p>
          </div>
        </div>
        <div className="mx-auto mt-4 h-1.5 w-4/5 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-3/4 rounded-full bg-primary" />
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Revisar · practicar · avanzar
        </p>
      </div>
    );
  return (
    <div className="relative flex h-52 w-52 items-center justify-center rounded-full bg-primary/8">
      <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] bg-primary text-primary-foreground shadow-[0_20px_50px_-28px_oklch(0.38_0.14_252)]">
        <Check className="h-14 w-14" strokeWidth={1.8} />
      </div>
      <Sparkles className="absolute right-5 top-5 h-6 w-6 text-primary" />
      <BookOpen className="absolute bottom-6 left-3 h-5 w-5 text-primary/65" />
    </div>
  );
}
