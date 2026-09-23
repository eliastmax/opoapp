import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { ArrowLeft, ArrowRight, BarChart3, CheckCircle2, Layers3, Target, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { postAuthRoute } from "@/lib/post-auth-route";
import {
  PRODUCT_TOUR_STEPS,
  maintainTourSession,
  productTourScene,
  shouldOpenProductTour,
  type ProductTourCompletionKind,
} from "@/lib/product-tour";

const ProductTourContext = createContext<{ replay: () => void } | null>(null);
const queryKey = (userId: string) => ["product-tour", userId] as const;

// eslint-disable-next-line react-refresh/only-export-components
export function useProductTour() {
  const value = useContext(ProductTourContext);
  if (!value) throw new Error("useProductTour must be used within ProductTourProvider");
  return value;
}

export function ProductTourProvider({ user, children }: { user: User; children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (router) => router.location.pathname });
  const [replaying, setReplaying] = useState(false);
  const [tourSessionActive, setTourSessionActive] = useState(false);
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

  const opposition = useQuery({
    queryKey: ["product-tour-opposition", user.id],
    enabled: pathname !== "/preparacion",
    queryFn: async () => (await postAuthRoute(user.id)) === "/inicio",
  });

  const eligibleToStart = shouldOpenProductTour({
    loading: state.isLoading || opposition.isLoading,
    error: state.isError || opposition.isError,
    completedAt: state.data?.completed_at,
    dismissedForSession,
    oppositionSelected: opposition.data === true,
    pathname,
  });

  useEffect(() => {
    setTourSessionActive((current) => maintainTourSession(current, eligibleToStart));
  }, [eligibleToStart]);

  const closeSafely = useCallback(() => {
    setDismissedForSession(true);
    setReplaying(false);
    setTourSessionActive(false);
    setStep(0);
  }, []);

  const persist = useCallback(async (kind: ProductTourCompletionKind) => {
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
    queryClient.setQueryData(queryKey(user.id), { completed_at: now, completion_kind: kind });
    return true;
  }, [closeSafely, queryClient, user.id]);

  const replay = useCallback(() => {
    setStep(0);
    setReplaying(true);
    void navigate({ to: "/inicio" });
  }, [navigate]);

  const contextValue = useMemo(() => ({ replay }), [replay]);
  const open = replaying || tourSessionActive;

  return (
    <ProductTourContext.Provider value={contextValue}>
      {children}
      {open ? (
        <FiveStepTour
          step={step}
          pathname={pathname}
          onStep={setStep}
          onNavigate={(to) => void navigate({ to })}
          onSkip={() => (replaying ? closeSafely() : void persist("skipped"))}
          onFinish={() => {
            if (replaying) closeSafely();
            else void persist("completed");
            void navigate({ to: "/inicio" });
          }}
        />
      ) : null}
    </ProductTourContext.Provider>
  );
}

function FiveStepTour({ step, pathname, onStep, onNavigate, onSkip, onFinish }: {
  step: number;
  pathname: string;
  onStep: (step: number) => void;
  onNavigate: (route: "/inicio" | "/crear" | "/progreso") => void;
  onSkip: () => void;
  onFinish: () => void;
}) {
  const item = productTourScene(step);
  const final = step === PRODUCT_TOUR_STEPS.length - 1;

  useEffect(() => {
    if (pathname !== item.route) onNavigate(item.route);
  }, [item.route, onNavigate, pathname]);

  function next() {
    if (final) onFinish();
    else onStep(step + 1);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] backdrop-blur-[1px] min-[700px]:items-center" role="presentation">
      <Card role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-description" className="max-h-[calc(100svh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-1.5rem)] w-full max-w-md overflow-y-auto rounded-[26px] border-primary/15 bg-card p-4 shadow-2xl min-[390px]:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5" aria-label={`Paso ${step + 1} de 5`}>
            {PRODUCT_TOUR_STEPS.map((_, index) => <span key={index} className={`h-1.5 rounded-full transition-all duration-200 motion-reduce:transition-none ${index === step ? "w-6 bg-primary" : index < step ? "w-2 bg-primary/40" : "w-2 bg-border"}`} />)}
          </div>
          <button type="button" onClick={onSkip} className="rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">Omitir</button>
        </div>
        <TourVisual step={step} />
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.15em] text-primary">{PRODUCT_TOUR_STEPS[step].journeyLabel}</p>
        <h2 id="tour-title" className="mt-1.5 text-[24px] font-bold leading-tight tracking-tight min-[390px]:text-[26px]">{item.title}</h2>
        <p id="tour-description" className="mt-2 text-[16px] leading-[1.5] text-muted-foreground"><EmphasizedDescription description={item.description} emphasis={item.emphasis} /></p>
        <div className="mt-5 grid grid-cols-[auto_1fr] gap-2">
          <Button type="button" variant="outline" className="h-12 min-w-12" onClick={() => step > 0 && onStep(step - 1)} disabled={step === 0} aria-label="Volver al paso anterior"><ArrowLeft className="h-4 w-4" /></Button>
          <Button type="button" className="h-12 text-[15px] font-semibold" onClick={next} data-tour-primary>{final ? "Terminar tutorial" : "Continuar"}{!final ? <ArrowRight className="ml-2 h-4 w-4" /> : null}</Button>
        </div>
      </Card>
    </div>
  );
}

function EmphasizedDescription({ description, emphasis }: { description: string; emphasis: readonly string[] }) {
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const fragment of emphasis) {
    const start = description.indexOf(fragment, cursor);
    if (start < 0) continue;
    if (start > cursor) parts.push(description.slice(cursor, start));
    parts.push(<strong key={`${fragment}-${start}`} className="font-semibold text-foreground">{fragment}</strong>);
    cursor = start + fragment.length;
  }
  if (cursor < description.length) parts.push(description.slice(cursor));
  return <>{parts}</>;
}

function TourVisual({ step }: { step: number }) {
  return (
    <div aria-hidden="true" className="mt-4 min-h-32 overflow-hidden rounded-2xl border bg-muted/25 p-4">
      {step === 0 ? <div className="flex h-24 items-center justify-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary">1</span><span className="text-sm font-semibold text-muted-foreground">respuesta</span><span className="text-xl font-bold text-muted-foreground">≠</span><span className="text-sm font-semibold">dominio</span></div>
      : step === 1 ? <div className="space-y-2"><p className="text-xs font-semibold text-muted-foreground">MISMO CONCEPTO</p>{["Literalidad", "Excepción", "Aplicación"].map((label) => <div key={label} className="flex items-center gap-2 rounded-xl bg-background px-3 py-2"><Layers3 className="h-4 w-4 text-primary" /><span className="text-sm font-semibold">{label}</span></div>)}</div>
      : step === 2 ? <div className="grid h-24 grid-cols-3 gap-2"><Signal icon={CheckCircle2} label="Acierto" /><Signal icon={XCircle} label="Fallo" /><Signal icon={Target} label="Duda" /></div>
      : step === 3 ? <div className="flex h-24 items-center gap-3 rounded-xl bg-background px-4"><BarChart3 className="h-8 w-8 text-primary" /><div className="flex-1"><p className="text-sm font-semibold">Evidencia por concepto</p><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full w-2/3 rounded-full bg-primary/60" /></div></div></div>
      : <div className="flex h-24 items-center gap-3 rounded-xl bg-primary/7 px-4"><Target className="h-8 w-8 text-primary" /><div><p className="text-sm font-semibold">Siguiente entrenamiento</p><p className="mt-1 text-xs text-muted-foreground">Volver a comprobar lo que necesita más evidencia.</p></div></div>}
    </div>
  );
}

function Signal({ icon: Icon, label }: { icon: typeof CheckCircle2; label: string }) {
  return <div className="flex flex-col items-center justify-center rounded-xl bg-background"><Icon className="h-5 w-5 text-primary" /><span className="mt-1 text-xs font-semibold">{label}</span></div>;
}
