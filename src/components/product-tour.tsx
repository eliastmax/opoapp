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
import { ProductTourPracticeDemo } from "@/components/product-tour-practice-demo";
import { ProductTourStudyDemo } from "@/components/product-tour-study-demo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { postAuthRoute } from "@/lib/post-auth-route";
import {
  PRODUCT_TOUR_STEPS,
  maintainTourSession,
  productTourJourneyLabel,
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

function viewportHeight() {
  return window.visualViewport?.height ?? window.innerHeight;
}

function isDemoTarget(targetName: string) {
  return targetName.startsWith("tour-study-") || targetName === "practice-levels" || targetName === "practice-check";
}

function focusRect(target: HTMLElement, targetName: string) {
  const rect = target.getBoundingClientRect();
  if (isDemoTarget(targetName)) return spotlightRect(rect, 7);

  const maxHeight = Math.min(320, viewportHeight() * 0.42);
  if (rect.height <= maxHeight) return spotlightRect(rect, 8);

  return spotlightRect(
    {
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: Math.min(rect.bottom, rect.top + maxHeight),
    },
    8,
  );
}

function bringRealTargetIntoView(target: HTMLElement, targetName: string) {
  if (isDemoTarget(targetName) || targetName.startsWith("nav-")) return;
  const rect = target.getBoundingClientRect();
  const vh = viewportHeight();
  const safeTop = 76;
  const safeBottom = vh - 250;
  if (rect.top >= safeTop && Math.min(rect.bottom, rect.top + 220) <= safeBottom) return;
  target.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "center",
    inline: "nearest",
  });
}

function reserveDesktopDemoRail(target: HTMLElement, targetName: string) {
  if (!isDemoTarget(targetName) || window.innerWidth < 900) return () => {};
  const shell = target.closest<HTMLElement>(".fixed.inset-0");
  if (!shell) return () => {};

  let stage: HTMLElement = target;
  while (stage.parentElement && stage.parentElement !== shell) stage = stage.parentElement;
  if (stage.parentElement !== shell) return () => {};

  const previousTransform = stage.style.transform;
  const previousTransition = stage.style.transition;
  const stageRect = stage.getBoundingClientRect();
  const coachWidth = window.innerWidth < 1000 ? 320 : 360;
  const railLeft = window.innerWidth - coachWidth - 48;
  const requiredShift = Math.max(0, stageRect.right - railLeft);
  const availableShift = Math.max(0, stageRect.left - 16);
  const shift = Math.min(requiredShift, availableShift);

  // The spotlight is measured on the next frame. A transform transition would leave
  // the cutout behind while the demo keeps moving, so reserve the rail atomically.
  stage.style.transition = "none";
  stage.style.transform = shift > 0 ? `translateX(-${Math.ceil(shift)}px)` : previousTransform;

  return () => {
    stage.style.transform = previousTransform;
    stage.style.transition = previousTransition;
  };
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
      <span key={`${fragment}-${start}`} className="font-bold text-foreground">
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
    void navigate({ to: "/estudio" });
  }, [navigate]);

  const navigateTourRoute = useCallback(
    (route: ProductTourRoute, unitId: string | null) => {
      if (route !== "study-preview") {
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
  const [studyAnswerVisible, setStudyAnswerVisible] = useState(false);
  const [cutout, setCutout] = useState<Cutout | null>(null);
  const [popoverHeight, setPopoverHeight] = useState(220);
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [routeTransition, setRouteTransition] = useState(false);
  const [targetAccent, setTargetAccent] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const stepTimerRef = useRef<number | null>(null);

  const item = productTourScene(step, scene);
  const expectedPath = productTourPath(item.route, tourUnitId);
  const sceneCount = productTourSceneCount(step);
  const journeyLabel = productTourJourneyLabel(step);
  const finalScene = PRODUCT_TOUR_STEPS[step].final && scene === sceneCount - 1;
  const flashcardNeedsReveal = item.target === "tour-study-flashcard" && !studyAnswerVisible;

  const queuePosition = useCallback(
    (nextStep: number, nextScene: number) => {
      const nextItem = productTourScene(nextStep, nextScene);
      const currentPath = productTourPath(item.route, tourUnitId);
      const nextPath = productTourPath(nextItem.route, tourUnitId);
      setPopoverVisible(false);
      setTargetAccent(false);
      setCutout(null);
      setStudyAnswerVisible(false);
      if (currentPath !== nextPath) setRouteTransition(true);
      if (stepTimerRef.current !== null) window.clearTimeout(stepTimerRef.current);
      stepTimerRef.current = window.setTimeout(
        () => {
          if (nextStep !== step) onStep(nextStep);
          setScene(nextScene);
        },
        prefersReducedMotion() ? 0 : 120,
      );
    },
    [item.route, onStep, step, tourUnitId],
  );

  const goNext = useCallback(() => {
    if (flashcardNeedsReveal) {
      setStudyAnswerVisible(true);
      return;
    }
    if (scene + 1 < sceneCount) {
      queuePosition(step, scene + 1);
      return;
    }
    if (step + 1 < PRODUCT_TOUR_STEPS.length) queuePosition(step + 1, 0);
  }, [flashcardNeedsReveal, queuePosition, scene, sceneCount, step]);

  const goPrevious = useCallback(() => {
    if (item.target === "tour-study-flashcard" && studyAnswerVisible) {
      setStudyAnswerVisible(false);
      return;
    }
    if (scene > 0) {
      queuePosition(step, scene - 1);
      return;
    }
    if (step <= 0) return;
    const previousStep = step - 1;
    queuePosition(previousStep, productTourSceneCount(previousStep) - 1);
  }, [item.target, queuePosition, scene, step, studyAnswerVisible]);

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
  }, [expectedPath, item.route, onNavigate, pathname, tourUnitId]);

  useLayoutEffect(() => {
    if (!expectedPath || pathname !== expectedPath) return;

    let cancelled = false;
    let frame = 0;
    let revealTimer = 0;
    let accentTimer = 0;
    let targetTimeout = 0;
    let mutationObserver: MutationObserver | null = null;
    let cleanupTarget: (() => void) | null = null;

    const reveal = () => {
      window.clearTimeout(revealTimer);
      revealTimer = window.setTimeout(
        () => {
          if (cancelled) return;
          setRouteTransition(false);
          setPopoverVisible(true);
          if (!prefersReducedMotion()) {
            setTargetAccent(true);
            window.clearTimeout(accentTimer);
            accentTimer = window.setTimeout(() => {
              if (!cancelled) setTargetAccent(false);
            }, 220);
          }
        },
        prefersReducedMotion() ? 0 : isDemoTarget(item.target) ? 100 : 320,
      );
    };

    const attachTarget = (target: HTMLElement) => {
      if (cancelled) return;
      const discoveredUnitId = target.dataset.tourUnitId;
      if (discoveredUnitId) setTourUnitId(discoveredUnitId);

      mutationObserver?.disconnect();
      window.clearTimeout(targetTimeout);
      cleanupTarget?.();
      const restoreDemoRail = reserveDesktopDemoRail(target, item.target);
      bringRealTargetIntoView(target, item.target);

      const update = () => {
        if (cancelled) return;
        setCutout(focusRect(target, item.target));
      };

      const settle = () => {
        frame = window.requestAnimationFrame(() => {
          update();
          reveal();
        });
      };

      if (isDemoTarget(item.target) || prefersReducedMotion()) settle();
      else window.setTimeout(settle, 260);

      const resizeObserver = new ResizeObserver(update);
      resizeObserver.observe(target);
      window.addEventListener("resize", update);
      window.visualViewport?.addEventListener("resize", update);
      window.addEventListener("scroll", update, true);

      cleanupTarget = () => {
        resizeObserver.disconnect();
        window.removeEventListener("resize", update);
        window.visualViewport?.removeEventListener("resize", update);
        window.removeEventListener("scroll", update, true);
        restoreDemoRail();
      };
    };

    const findTarget = () => {
      const target = document.querySelector<HTMLElement>(`[data-tour="${item.target}"]`);
      if (target) attachTarget(target);
    };

    findTarget();

    if (!document.querySelector(`[data-tour="${item.target}"]`)) {
      mutationObserver = new MutationObserver(findTarget);
      mutationObserver.observe(document.body, { childList: true, subtree: true, attributes: true });
      targetTimeout = window.setTimeout(() => {
        if (cancelled) return;
        const target = document.querySelector<HTMLElement>(`[data-tour="${item.target}"]`);
        if (target) {
          attachTarget(target);
          return;
        }
        const fallbackSelector =
          item.route === "/estudio"
            ? '[data-tour="nav-study"]'
            : item.route === "/crear"
              ? '[data-tour="nav-practice"]'
              : item.route === "/progreso"
                ? '[data-tour="nav-progress"]'
                : item.route === "/inicio"
                  ? '[data-tour="today-session"]'
                  : null;
        const fallback = fallbackSelector
          ? document.querySelector<HTMLElement>(fallbackSelector)
          : null;
        if (fallback) attachTarget(fallback);
        else goNext();
      }, 5_000);
    }

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(revealTimer);
      window.clearTimeout(accentTimer);
      window.clearTimeout(targetTimeout);
      mutationObserver?.disconnect();
      cleanupTarget?.();
    };
  }, [expectedPath, goNext, item.route, item.target, pathname]);

  useLayoutEffect(() => {
    const node = popoverRef.current;
    if (!node) return;
    const measure = () => {
      const height = node.getBoundingClientRect().height;
      if (height > 0) setPopoverHeight(height);
    };
    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(node);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      resizeObserver.disconnect();
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, [cutout]);

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
  }, [popoverVisible, scene, step, studyAnswerVisible]);

  const studyDemo =
    step === 0 && scene > 0 ? (
      <ProductTourStudyDemo unitId={tourUnitId} scene={scene} answerVisible={studyAnswerVisible} />
    ) : null;
  const practiceDemo = step === 1 && scene > 0 ? <ProductTourPracticeDemo scene={scene} /> : null;

  if (!cutout)
    return (
      <>
        {studyDemo}
        {practiceDemo}
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60" role="status">
          <span className="rounded-full bg-card p-4 text-primary shadow-lg">
            <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none" />
            <span className="sr-only">Preparando el siguiente paso del tutorial</span>
          </span>
        </div>
      </>
    );

  const vw = window.innerWidth;
  const vh = viewportHeight();
  const width = Math.min(vw >= 900 && vw < 1000 ? 320 : 360, vw - 24);
  const demo = isDemoTarget(item.target);
  const desktopDemoRail = demo && vw >= 900;
  const mobileDemoSheet = demo && vw < 900;
  const narrowRealTarget = !demo && vw < 700;
  const compactFinal = finalScene && (vw < 960 || vh < 760);
  const compactPopover = narrowRealTarget || compactFinal;
  const fullWidthFinal = finalScene && vw < 700;

  const belowSpace = vh - cutout.bottom - 16;
  const aboveSpace = cutout.top - 16;
  const placeBelow = belowSpace >= popoverHeight || belowSpace >= aboveSpace;
  const unclampedTop = placeBelow ? cutout.bottom + 12 : cutout.top - popoverHeight - 12;
  const normalTop = Math.max(12, Math.min(unclampedTop, vh - popoverHeight - 12));
  const normalLeft = Math.max(
    12,
    Math.min(cutout.left + (cutout.right - cutout.left - width) / 2, vw - width - 12),
  );

  const top = desktopDemoRail ? 24 : mobileDemoSheet ? undefined : normalTop;
  const bottom = mobileDemoSheet ? 12 : undefined;
  const left = desktopDemoRail ? undefined : fullWidthFinal ? 12 : normalLeft;
  const right = desktopDemoRail ? 24 : undefined;
  const popoverWidth = fullWidthFinal ? vw - 24 : width;
  const chosenRealTargetSpace = Math.max(0, (placeBelow ? belowSpace : aboveSpace) - 4);
  const realTargetMaxHeight = compactPopover
    ? Math.max(180, Math.min(vh - 24, chosenRealTargetSpace))
    : vh - 24;
  const maxHeight = desktopDemoRail
    ? vh - 48
    : mobileDemoSheet
      ? Math.max(220, Math.min(vh * 0.43, 360))
      : realTargetMaxHeight;
  const dots = Array.from({ length: sceneCount }, (_, index) => index);

  return (
    <>
      {studyDemo}
      {practiceDemo}
      <div aria-live="polite" aria-label={`Tutorial de OpoTest, paso ${step + 1} de ${PRODUCT_TOUR_STEPS.length}`}>
        <div
          className="pointer-events-none fixed z-[60] rounded-[1.15rem] border border-white/75 transition-[top,left,width,height,box-shadow] duration-200 ease-out motion-reduce:transition-none"
          style={{
            top: cutout.top,
            left: cutout.left,
            width: cutout.right - cutout.left,
            height: cutout.bottom - cutout.top,
            boxShadow: targetAccent
              ? "0 0 0 9999px rgb(0 0 0 / 0.68), 0 0 0 2px rgb(125 211 252 / 0.22), 0 0 18px rgb(125 211 252 / 0.24)"
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
          className={`fixed z-[70] rounded-3xl border border-border/80 bg-card text-card-foreground shadow-[0_24px_60px_-20px_rgb(0_0_0/0.58)] transition-[opacity,transform] ease-out motion-reduce:transition-none ${compactPopover ? "p-4" : "p-5"}`}
          style={{
            top,
            bottom,
            left,
            right,
            width: popoverWidth,
            maxHeight,
            overflowY: "auto",
            opacity: popoverVisible ? 1 : 0,
            transform: popoverVisible ? "translateY(0) scale(1)" : "translateY(8px) scale(.985)",
            transitionDuration: prefersReducedMotion() ? "0ms" : popoverVisible ? "190ms" : "110ms",
            pointerEvents: popoverVisible ? "auto" : "none",
          }}
        >
          {compactPopover ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 text-[14px] font-bold">
                <span className="shrink-0 text-muted-foreground">
                  Paso {step + 1} de {PRODUCT_TOUR_STEPS.length}
                </span>
                <span aria-hidden="true" className="text-muted-foreground/50">·</span>
                <span className="shrink-0 text-primary">{journeyLabel}</span>
                {sceneCount > 1 && (
                  <span className="flex items-center gap-1" aria-label={`Momento ${scene + 1} de ${sceneCount}`}>
                    {dots.map((dot) => (
                      <span
                        key={dot}
                        className={`h-1.5 w-1.5 rounded-full transition-colors ${
                          dot <= scene ? "bg-primary" : "bg-muted-foreground/25"
                        }`}
                      />
                    ))}
                  </span>
                )}
              </div>
              {!finalScene && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 shrink-0 px-2 text-[14px] font-semibold text-muted-foreground"
                  onClick={onSkip}
                  tabIndex={popoverVisible ? 0 : -1}
                >
                  Saltar
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="block text-[15px] font-bold text-muted-foreground">
                  Paso {step + 1} de {PRODUCT_TOUR_STEPS.length}
                </span>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[15px] font-bold text-primary">{journeyLabel}</span>
                  {sceneCount > 1 && (
                    <span className="flex items-center gap-1.5" aria-label={`Momento ${scene + 1} de ${sceneCount}`}>
                      {dots.map((dot) => (
                        <span
                          key={dot}
                          className={`h-2 w-2 rounded-full transition-colors ${
                            dot <= scene ? "bg-primary" : "bg-muted-foreground/25"
                          }`}
                        />
                      ))}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 px-2.5 text-[15px] font-semibold text-muted-foreground"
                onClick={onSkip}
                tabIndex={popoverVisible ? 0 : -1}
              >
                Saltar tutorial
              </Button>
            </div>
          )}

          <h2
            id="tour-title"
            className={`${compactPopover ? "mt-3 text-[21px] leading-[1.18]" : "mt-4 text-[24px] leading-[1.18]"} font-bold tracking-tight`}
          >
            {item.title}
          </h2>
          <p
            id="tour-description"
            className={`${compactPopover ? "mt-2 text-[16px] leading-[1.42]" : "mt-3 text-[18px] leading-[1.48]"} text-muted-foreground`}
          >
            <EmphasizedDescription description={item.description} emphasis={item.emphasis} />
          </p>

          <div className={`${compactPopover ? "mt-4" : "mt-6"} flex items-center gap-3 ${step > 0 || scene > 0 ? "justify-between" : "justify-end"}`}>
            {(step > 0 || scene > 0) && (
              <Button
                variant="ghost"
                className={`${compactPopover ? "h-11 px-2 text-[15px]" : "h-12 px-3 text-[17px]"} font-bold text-muted-foreground`}
                onClick={goPrevious}
                aria-label="Paso anterior"
                tabIndex={popoverVisible ? 0 : -1}
              >
                Anterior
              </Button>
            )}
            <Button
              data-tour-primary
              className={`${compactPopover ? "h-11 px-4 text-[15px]" : "h-12 px-5 text-[17px]"} font-bold`}
              onClick={() => (finalScene ? onFinish() : goNext())}
              tabIndex={popoverVisible ? 0 : -1}
            >
              {finalScene ? "Empezar mi sesión" : flashcardNeedsReveal ? "Ver respuesta" : "Siguiente"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
