import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { postAuthRoute } from "@/lib/post-auth-route";
import {
  PRODUCT_TOUR_STEPS,
  maintainTourSession,
  shouldOpenProductTour,
  spotlightRect,
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
  const preparation = useQuery({
    queryKey: ["product-tour-preparation", user.id],
    enabled: pathname !== "/preparacion",
    queryFn: async () => (await postAuthRoute(user.id)) === "/inicio",
  });
  const eligibleToStart = shouldOpenProductTour({
    loading: state.isLoading || preparation.isLoading,
    error: state.isError || preparation.isError,
    completedAt: state.data?.completed_at,
    dismissedForSession,
    preparationCompleted: preparation.data === true,
    pathname,
  });
  useEffect(() => {
    setTourSessionActive((current) => maintainTourSession(current, eligibleToStart));
  }, [eligibleToStart]);
  const open = replaying || tourSessionActive;
  const closeSafely = useCallback(() => {
    setDismissedForSession(true);
    setReplaying(false);
    setTourSessionActive(false);
    setStep(0);
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
      queryClient.setQueryData(queryKey(user.id), { completed_at: now, completion_kind: kind });
      return true;
    },
    [closeSafely, queryClient, user.id],
  );
  const replay = useCallback(() => {
    setStep(0);
    setReplaying(true);
    void navigate({ to: "/inicio" });
  }, [navigate]);
  const contextValue = useMemo(() => ({ replay }), [replay]);
  return (
    <ProductTourContext.Provider value={contextValue}>
      {children}
      {open && (
        <SpotlightTour
          step={step}
          pathname={pathname}
          replaying={replaying}
          onStep={setStep}
          onNavigate={(route) => void navigate({ to: route })}
          onSkip={() => (replaying ? closeSafely() : void persist("skipped"))}
          onFinish={() => {
            if (replaying) closeSafely();
            else void persist("completed");
            void navigate({ to: "/inicio" });
          }}
        />
      )}
    </ProductTourContext.Provider>
  );
}

type Cutout = { top: number; left: number; right: number; bottom: number };

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function EmphasizedDescription({ text, emphasis }: { text: string; emphasis: string }) {
  const index = text.indexOf(emphasis);
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <span className="font-semibold text-card-foreground">{emphasis}</span>
      {text.slice(index + emphasis.length)}
    </>
  );
}

function SpotlightTour({
  step,
  pathname,
  replaying,
  onStep,
  onNavigate,
  onSkip,
  onFinish,
}: {
  step: number;
  pathname: string;
  replaying: boolean;
  onStep: (step: number) => void;
  onNavigate: (route: "/inicio" | "/estudio") => void;
  onSkip: () => void;
  onFinish: () => void;
}) {
  const item = PRODUCT_TOUR_STEPS[step];
  const popoverRef = useRef<HTMLDivElement>(null);
  const stepTransitionTimer = useRef<number | null>(null);
  const [cutout, setCutout] = useState<Cutout | null>(null);
  const [resolvedStep, setResolvedStep] = useState<number | null>(null);
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [popoverHeight, setPopoverHeight] = useState(190);

  const moveToStep = useCallback(
    (nextStep: number) => {
      if (stepTransitionTimer.current) window.clearTimeout(stepTransitionTimer.current);
      setPopoverVisible(false);
      const delay = prefersReducedMotion() ? 0 : 120;
      stepTransitionTimer.current = window.setTimeout(() => {
        setResolvedStep(null);
        onStep(nextStep);
      }, delay);
    },
    [onStep],
  );

  useEffect(
    () => () => {
      if (stepTransitionTimer.current) window.clearTimeout(stepTransitionTimer.current);
    },
    [],
  );

  useEffect(() => {
    setPopoverVisible(false);
    setResolvedStep(null);
    if (pathname !== item.route) {
      setCutout(null);
      onNavigate(item.route);
    }
  }, [item.route, item.target, onNavigate, pathname]);

  useLayoutEffect(() => {
    if (pathname !== item.route) return;
    let cancelled = false;
    let frame = 0;
    let cleanup: (() => void) | undefined;
    let targetObserver: MutationObserver | undefined;
    let targetTimeout = 0;
    let revealTimeout = 0;
    const attachTarget = (target: HTMLElement) => {
      if (cancelled) return;
      targetObserver?.disconnect();
      window.clearTimeout(targetTimeout);
      target.scrollIntoView({
        block: item.target.startsWith("nav-") ? "nearest" : "center",
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
      const update = () => setCutout(spotlightRect(target.getBoundingClientRect()));
      frame = window.requestAnimationFrame(update);
      const revealDelay = prefersReducedMotion() ? 0 : 160;
      revealTimeout = window.setTimeout(() => {
        if (!cancelled) setResolvedStep(step);
      }, revealDelay);
      window.addEventListener("resize", update);
      window.addEventListener("orientationchange", update);
      window.addEventListener("scroll", update, true);
      const observer = new ResizeObserver(update);
      observer.observe(target);
      cleanup = () => {
        window.removeEventListener("resize", update);
        window.removeEventListener("orientationchange", update);
        window.removeEventListener("scroll", update, true);
        observer.disconnect();
      };
    };
    const findTarget = () => {
      const target = document.querySelector<HTMLElement>(`[data-tour="${item.target}"]`);
      if (target) attachTarget(target);
    };
    findTarget();
    if (!document.querySelector(`[data-tour="${item.target}"]`)) {
      targetObserver = new MutationObserver(findTarget);
      targetObserver.observe(document.body, { childList: true, subtree: true });
      targetTimeout = window.setTimeout(() => {
        if (cancelled) return;
        const fallback = document.querySelector<HTMLElement>(
          item.route === "/estudio" ? '[data-tour="nav-study"]' : '[data-tour="today-session"]',
        );
        if (fallback) attachTarget(fallback);
      }, 12_000);
    }
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(targetTimeout);
      window.clearTimeout(revealTimeout);
      targetObserver?.disconnect();
      cleanup?.();
    };
  }, [item.route, item.target, pathname, step]);

  useLayoutEffect(() => {
    if (resolvedStep !== step || !popoverRef.current) return;
    setPopoverHeight(popoverRef.current.getBoundingClientRect().height);
    const frame = window.requestAnimationFrame(() => setPopoverVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [resolvedStep, step]);

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>("[data-app-shell]");
    shell?.setAttribute("inert", "");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onSkip();
      if (event.key !== "Tab" || !popoverRef.current) return;
      const focusable = [...popoverRef.current.querySelectorAll<HTMLElement>("button")];
      if (!focusable.length) return;
      event.preventDefault();
      const current = focusable.indexOf(document.activeElement as HTMLElement);
      const next = event.shiftKey
        ? (current - 1 + focusable.length) % focusable.length
        : (current + 1) % focusable.length;
      focusable[next].focus();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      shell?.removeAttribute("inert");
      document.removeEventListener("keydown", onKey);
    };
  }, [onSkip]);

  useEffect(() => {
    if (popoverVisible && resolvedStep === step) {
      popoverRef.current?.querySelector<HTMLElement>("[data-tour-primary]")?.focus();
    }
  }, [popoverVisible, resolvedStep, step]);

  if (!cutout)
    return (
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/68 backdrop-blur-[1px] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150"
        role="status"
      >
        <span className="rounded-full bg-card/95 p-3 text-primary shadow-lg">
          <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" />
          <span className="sr-only">Preparando el siguiente paso del tutorial</span>
        </span>
      </div>
    );

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(330, viewportWidth - 24);
  const placeBelow = viewportHeight - cutout.bottom >= popoverHeight + 24;
  const top = placeBelow
    ? Math.min(cutout.bottom + 14, viewportHeight - popoverHeight - 12)
    : Math.max(12, cutout.top - popoverHeight - 14);
  const left = Math.max(
    12,
    Math.min(cutout.left + (cutout.right - cutout.left - width) / 2, viewportWidth - width - 12),
  );
  const targetCenter = cutout.left + (cutout.right - cutout.left) / 2;
  const arrowLeft = Math.max(24, Math.min(targetCenter - left, width - 24));
  const scrim =
    "fixed z-[60] bg-black/68 backdrop-blur-[1px] transition-[top,left,width,height] duration-200 ease-out motion-reduce:transition-none";
  const popoverReady = resolvedStep === step;
  const popoverMotion = popoverVisible
    ? "translate-y-0 scale-100 opacity-100"
    : placeBelow
      ? "translate-y-2 scale-[0.98] opacity-0"
      : "-translate-y-2 scale-[0.98] opacity-0";

  return (
    <div
      aria-live="polite"
      aria-label={`Tutorial de OpoTest, paso ${step + 1} de ${PRODUCT_TOUR_STEPS.length}`}
    >
      <div className={`${scrim} left-0 right-0 top-0`} style={{ height: cutout.top }} />
      <div className={`${scrim} bottom-0 left-0 right-0`} style={{ top: cutout.bottom }} />
      <div
        className={`${scrim} left-0`}
        style={{ top: cutout.top, width: cutout.left, height: cutout.bottom - cutout.top }}
      />
      <div
        className={`${scrim} right-0`}
        style={{ top: cutout.top, left: cutout.right, height: cutout.bottom - cutout.top }}
      />
      <div
        className="pointer-events-none fixed z-[61] rounded-[1.15rem] border-2 border-white/90 shadow-[0_0_0_3px_oklch(0.65_0.14_240/0.35),0_0_28px_oklch(0.75_0.12_230/0.3)] transition-[top,left,width,height,opacity] duration-200 ease-out motion-reduce:transition-none"
        style={{
          top: cutout.top,
          left: cutout.left,
          width: cutout.right - cutout.left,
          height: cutout.bottom - cutout.top,
        }}
        aria-hidden="true"
      />
      {popoverReady && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-title"
          aria-describedby="tour-description"
          className={`fixed z-[70] rounded-2xl border border-border/80 bg-card p-4 text-card-foreground shadow-[0_20px_55px_-18px_rgb(0_0_0/0.55)] transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none ${popoverMotion} ${popoverVisible ? "pointer-events-auto" : "pointer-events-none"}`}
          style={{ top, left, width }}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute h-3 w-3 rotate-45 border border-border/80 bg-card ${placeBelow ? "-top-1.5" : "-bottom-1.5"}`}
            style={{ left: arrowLeft - 6 }}
          />
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-muted-foreground">
                {step + 1} de {PRODUCT_TOUR_STEPS.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2.5 text-muted-foreground"
                onClick={onSkip}
              >
                {replaying ? "Cerrar" : "Omitir"}
              </Button>
            </div>
            <h2 id="tour-title" className="mt-1 text-[18px] font-semibold leading-tight">
              {item.title}
            </h2>
            <p
              id="tour-description"
              className="mt-2 text-[15px] leading-[1.45] text-muted-foreground"
            >
              <EmphasizedDescription text={item.description} emphasis={item.emphasis} />
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              {step > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10"
                  onClick={() => moveToStep(step - 1)}
                  aria-label="Paso anterior"
                >
                  <ArrowLeft className="h-4 w-4" /> Anterior
                </Button>
              )}
              <Button
                data-tour-primary
                size="sm"
                className="h-10"
                onClick={() => (item.final ? onFinish() : moveToStep(step + 1))}
              >
                {item.final ? "Empezar mi sesión" : "Siguiente"}
                {!item.final && <ArrowRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
