import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
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
  productTourPath,
  productTourScene,
  productTourSceneCount,
  shouldOpenProductTour,
  spotlightRect,
  type ProductTourCompletionKind,
  type ProductTourRoute,
} from "@/lib/product-tour";

const ProductTourContext = createContext<{ replay: () => void } | null>(null);
const queryKey = (userId: string) => ["product-tour", userId] as const;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function EmphasizedDescription({
  description,
  emphasis,
}: {
  description: string;
  emphasis: readonly string[];
}) {
  const ranges = emphasis
    .map((fragment) => ({ fragment, start: description.indexOf(fragment) }))
    .filter(({ start }) => start >= 0)
    .sort((a, b) => a.start - b.start);

  if (!ranges.length) return description;

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const { fragment, start } of ranges) {
    if (start < cursor) continue;
    if (start > cursor) parts.push(description.slice(cursor, start));
    parts.push(
      <span key={`${fragment}-${start}`} className="font-semibold text-foreground">
        {fragment}
      </span>,
    );
    cursor = start + fragment.length;
  }
  if (cursor < description.length) parts.push(description.slice(cursor));

  return <>{parts}</>;
}

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
  const navigateTourRoute = useCallback(
    (route: ProductTourRoute, unitId: string | null) => {
      if (route === "/inicio" || route === "/estudio") {
        void navigate({ to: route });
        return;
      }
      if (!unitId) {
        void navigate({ to: "/estudio" });
        return;
      }
      void navigate({
        to: "/estudiar/$unitId",
        params: { unitId },
        search: { tour: "preview" },
      });
    },
    [navigate],
  );
  const contextValue = useMemo(() => ({ replay }), [replay]);
  return (
    <ProductTourContext.Provider value={contextValue}>
      {children}
      {open && (
        <SpotlightTour
          step={step}
          pathname={pathname}
          onStep={setStep}
          onNavigate={navigateTourRoute}
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

function SpotlightTour({
  step,
  pathname,
  onStep,
  onNavigate,
  onSkip,
  onFinish,
}: {
  step: number;
  pathname: string;
  onStep: (step: number) => void;
  onNavigate: (route: ProductTourRoute, unitId: string | null) => void;
  onSkip: () => void;
  onFinish: () => void;
}) {
  const [scene, setScene] = useState(0);
  const [tourUnitId, setTourUnitId] = useState<string | null>(null);
  const item = productTourScene(step, scene);
  const popoverRef = useRef<HTMLDivElement>(null);
  const stepTimerRef = useRef<number | null>(null);
  const [cutout, setCutout] = useState<Cutout | null>(null);
  const [popoverHeight, setPopoverHeight] = useState(190);
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [routeTransition, setRouteTransition] = useState(false);
  const [targetAccent, setTargetAccent] = useState(false);
  const expectedPath = productTourPath(item.route, tourUnitId);
  const finalScene = PRODUCT_TOUR_STEPS[step].final && scene === productTourSceneCount(step) - 1;

  const queuePosition = useCallback(
    (nextStep: number, nextScene: number) => {
      const nextItem = productTourScene(nextStep, nextScene);
      const currentPath = productTourPath(item.route, tourUnitId);
      const nextPath = productTourPath(nextItem.route, tourUnitId);
      setPopoverVisible(false);
      setTargetAccent(false);
      if (currentPath !== nextPath) setRouteTransition(true);
      if (stepTimerRef.current !== null) window.clearTimeout(stepTimerRef.current);
      stepTimerRef.current = window.setTimeout(
        () => {
          if (nextStep !== step) onStep(nextStep);
          setScene(nextScene);
        },
        prefersReducedMotion() ? 0 : 130,
      );
    },
    [item.route, onStep, step, tourUnitId],
  );

  const goNext = useCallback(() => {
    const scenes = productTourSceneCount(step);
    if (scene + 1 < scenes) {
      queuePosition(step, scene + 1);
      return;
    }
    if (step + 1 < PRODUCT_TOUR_STEPS.length) queuePosition(step + 1, 0);
  }, [queuePosition, scene, step]);

  const goPrevious = useCallback(() => {
    if (scene > 0) {
      queuePosition(step, scene - 1);
      return;
    }
    if (step <= 0) return;
    const previousStep = step - 1;
    queuePosition(previousStep, productTourSceneCount(previousStep) - 1);
  }, [queuePosition, scene, step]);

  useEffect(
    () => () => {
      if (stepTimerRef.current !== null) window.clearTimeout(stepTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    setPopoverVisible(false);
    if (!expectedPath) return;
    if (pathname !== expectedPath) {
      setRouteTransition(true);
      onNavigate(item.route, tourUnitId);
    }
  }, [expectedPath, item.route, item.target, onNavigate, pathname, scene, step, tourUnitId]);

  useLayoutEffect(() => {
    if (!expectedPath || pathname !== expectedPath) return;
    let cancelled = false;
    let frame = 0;
    let cleanup: (() => void) | undefined;
    let targetObserver: MutationObserver | undefined;
    let targetTimeout = 0;
    let revealTimer = 0;
    let accentTimer = 0;
    const scheduleReveal = () => {
      window.clearTimeout(revealTimer);
      revealTimer = window.setTimeout(
        () => {
          if (cancelled) return;
          setRouteTransition(false);
          setPopoverVisible(true);
          if (prefersReducedMotion()) {
            setTargetAccent(false);
            return;
          }
          setTargetAccent(true);
          window.clearTimeout(accentTimer);
          accentTimer = window.setTimeout(() => {
            if (!cancelled) setTargetAccent(false);
          }, 240);
        },
        prefersReducedMotion() ? 0 : 220,
      );
    };
    const attachTarget = (target: HTMLElement) => {
      if (cancelled) return;
      const discoveredUnitId = target.dataset.tourUnitId;
      if (discoveredUnitId) setTourUnitId(discoveredUnitId);
      targetObserver?.disconnect();
      window.clearTimeout(targetTimeout);
      target.scrollIntoView({
        block: item.target.startsWith("nav-") ? "nearest" : "center",
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
      const update = () => {
        setCutout(spotlightRect(target.getBoundingClientRect()));
        scheduleReveal();
      };
      frame = window.requestAnimationFrame(update);
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
        const fallbackSelector =
          item.route === "/estudio"
            ? '[data-tour="nav-study"]'
            : item.route === "/inicio"
              ? '[data-tour="today-session"]'
              : null;
        const fallback = fallbackSelector
          ? document.querySelector<HTMLElement>(fallbackSelector)
          : null;
        if (fallback) attachTarget(fallback);
      }, 12_000);
    }
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(targetTimeout);
      window.clearTimeout(revealTimer);
      window.clearTimeout(accentTimer);
      targetObserver?.disconnect();
      cleanup?.();
    };
  }, [expectedPath, item.route, item.target, pathname]);

  useLayoutEffect(() => {
    if (popoverRef.current) setPopoverHeight(popoverRef.current.getBoundingClientRect().height);
  }, [cutout, scene, step]);
  useEffect(() => {
    const shell = document.querySelector<HTMLElement>("[data-app-shell]");
    shell?.setAttribute("inert", "");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onSkip();
      if (event.key !== "Tab" || !popoverRef.current) return;
      if (!popoverVisible) {
        event.preventDefault();
        return;
      }
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
  }, [onSkip, popoverVisible]);
  useEffect(() => {
    if (!popoverVisible) return;
    const frame = window.requestAnimationFrame(() => {
      popoverRef.current?.querySelector<HTMLElement>("[data-tour-primary]")?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [popoverVisible, scene, step]);

  if (!cutout)
    return (
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60"
        role="status"
      >
        <span className="rounded-full bg-card p-3 text-primary shadow-lg">
          <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" />
          <span className="sr-only">Preparando el siguiente paso del tutorial</span>
        </span>
      </div>
    );
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(340, viewportWidth - 32);
  const placeBelow = viewportHeight - cutout.bottom >= popoverHeight + 24;
  const top = placeBelow
    ? Math.min(cutout.bottom + 14, viewportHeight - popoverHeight - 16)
    : Math.max(16, cutout.top - popoverHeight - 14);
  const left = Math.max(
    16,
    Math.min(cutout.left + (cutout.right - cutout.left - width) / 2, viewportWidth - width - 16),
  );
  const popoverOffset = placeBelow ? 8 : -8;
  return (
    <div
      aria-live="polite"
      aria-label={`Tutorial de OpoTest, paso ${step + 1} de ${PRODUCT_TOUR_STEPS.length}`}
    >
      <div
        className="pointer-events-none fixed z-[60] rounded-[1.15rem] border border-white/75 transition-[top,left,width,height,box-shadow] duration-200 ease-out motion-reduce:transition-none"
        style={{
          top: cutout.top,
          left: cutout.left,
          width: cutout.right - cutout.left,
          height: cutout.bottom - cutout.top,
          boxShadow: targetAccent
            ? "0 0 0 9999px rgb(0 0 0 / 0.68), 0 0 0 2px rgb(125 211 252 / 0.20), 0 0 18px rgb(125 211 252 / 0.22)"
            : "0 0 0 9999px rgb(0 0 0 / 0.68), 0 0 0 1px rgb(125 211 252 / 0.14), 0 0 10px rgb(125 211 252 / 0.12)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed inset-0 z-[62] bg-black/68 transition-opacity duration-150 ease-out motion-reduce:transition-none"
        style={{ opacity: routeTransition ? 1 : 0 }}
        aria-hidden="true"
      />
      <div
        ref={popoverRef}
        role="dialog"
        aria-modal="true"
        aria-hidden={!popoverVisible}
        aria-labelledby="tour-title"
        aria-describedby="tour-description"
        className="fixed z-[70] rounded-2xl border border-border/80 bg-card p-4 text-card-foreground shadow-[0_20px_55px_-18px_rgb(0_0_0/0.55)] transition-[opacity,transform] ease-out min-[390px]:p-[18px] motion-reduce:transition-none"
        style={{
          top,
          left,
          width,
          opacity: popoverVisible ? 1 : 0,
          transform: popoverVisible
            ? "translateY(0) scale(1)"
            : `translateY(${popoverOffset}px) scale(0.98)`,
          transitionDuration: prefersReducedMotion() ? "0ms" : popoverVisible ? "210ms" : "120ms",
          pointerEvents: popoverVisible ? "auto" : "none",
        }}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-card ${
            placeBelow
              ? "-top-1.5 border-l border-t border-border/80"
              : "-bottom-1.5 border-b border-r border-border/80"
          }`}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-medium leading-none text-muted-foreground">
            {step + 1} de {PRODUCT_TOUR_STEPS.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-[13px] font-medium text-muted-foreground"
            onClick={onSkip}
            tabIndex={popoverVisible ? 0 : -1}
          >
            Omitir
          </Button>
        </div>
        <h2
          id="tour-title"
          className="mt-3 text-[19px] font-semibold leading-[1.2] min-[390px]:text-xl"
        >
          {item.title}
        </h2>
        <p id="tour-description" className="mt-2 text-base leading-[1.45] text-muted-foreground">
          <EmphasizedDescription description={item.description} emphasis={item.emphasis} />
        </p>
        <div
          className={`mt-5 flex items-center gap-2 ${step > 0 || scene > 0 ? "justify-between" : "justify-end"}`}
        >
          {(step > 0 || scene > 0) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-10 px-2.5 text-[15px] font-semibold text-muted-foreground"
              onClick={goPrevious}
              aria-label="Paso anterior"
              tabIndex={popoverVisible ? 0 : -1}
            >
              Anterior
            </Button>
          )}
          <Button
            data-tour-primary
            size="sm"
            className="h-10 px-4 text-[15px] font-semibold"
            onClick={() => (finalScene ? onFinish() : goNext())}
            tabIndex={popoverVisible ? 0 : -1}
          >
            {finalScene ? "Empezar mi sesión" : "Siguiente"}
          </Button>
        </div>
      </div>
    </div>
  );
}
