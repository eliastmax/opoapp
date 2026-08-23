import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Home, PlusSquare, Gauge, BookOpen, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductTourProvider } from "@/components/product-tour";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", search: { mode: "login" } });
    return { user: data.user };
  },
  component: AuthLayout,
});

const nav = [
  { to: "/inicio", label: "Hoy", icon: Home },
  { to: "/estudio", label: "Estudio", icon: BookOpen },
  { to: "/crear", label: "Practicar", icon: PlusSquare },
  { to: "/progreso", label: "Progreso", icon: Gauge },
  { to: "/ajustes", label: "Ajustes", icon: Settings },
] as const;

type ProgressTargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function ProgressTourTarget() {
  const [rect, setRect] = useState<ProgressTargetRect | null>(null);

  useEffect(() => {
    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let trackedCard: HTMLElement | null = null;

    const measure = () => {
      const main = document.querySelector<HTMLElement>("[data-app-main]");
      const marker = document.querySelector<HTMLElement>(
        '[aria-label="Distribución del conocimiento"]',
      );
      const card = marker?.closest<HTMLElement>(".overflow-hidden") ?? null;
      if (!main || !card) return false;

      const mainRect = main.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      setRect({
        top: cardRect.top - mainRect.top,
        left: cardRect.left - mainRect.left,
        width: cardRect.width,
        height: cardRect.height,
      });

      if (card !== trackedCard) {
        resizeObserver?.disconnect();
        trackedCard = card;
        resizeObserver = new ResizeObserver(measure);
        resizeObserver.observe(main);
        resizeObserver.observe(card);
      }
      mutationObserver?.disconnect();
      mutationObserver = null;
      return true;
    };

    if (!measure()) {
      const main = document.querySelector<HTMLElement>("[data-app-main]");
      if (main) {
        mutationObserver = new MutationObserver(measure);
        mutationObserver.observe(main, { childList: true, subtree: true });
      }
    }

    const visualViewport = window.visualViewport;
    window.addEventListener("resize", measure);
    visualViewport?.addEventListener("resize", measure);
    return () => {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener("resize", measure);
      visualViewport?.removeEventListener("resize", measure);
    };
  }, []);

  if (!rect) return null;

  return (
    <div
      data-tour="progress-overview"
      className="pointer-events-none absolute"
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }}
      aria-hidden="true"
    />
  );
}

function AuthLayout() {
  const { user } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const focusedJourney =
    pathname.startsWith("/test/") ||
    pathname.startsWith("/sesion") ||
    pathname.startsWith("/estudiar/") ||
    pathname.startsWith("/recordar/");
  const pageTourTarget = pathname === "/crear" ? "practice-builder" : null;

  return (
    <ProductTourProvider user={user}>
      <div data-app-shell className="min-h-screen flex flex-col">
        <main
          data-app-main
          className={cn(
            "relative flex-1 w-full max-w-md mx-auto px-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)]",
            focusedJourney ? "pb-6" : "pb-28",
          )}
        >
          {pageTourTarget && (
            <div
              data-tour={pageTourTarget}
              className="pointer-events-none absolute inset-x-4 top-[calc(env(safe-area-inset-top,0px)+1rem)] h-[min(48dvh,360px)]"
              aria-hidden="true"
            />
          )}
          {pathname === "/progreso" && <ProgressTourTarget />}
          <Outlet />
        </main>
        {!focusedJourney && (
          <nav className="fixed bottom-0 inset-x-0 border-t border-border/80 bg-card/90 backdrop-blur-xl safe-bottom z-40 shadow-[0_-10px_30px_-24px_oklch(0.28_0.08_250/0.5)]">
            <div className="max-w-md mx-auto grid grid-cols-5 px-1">
              {nav.map((item) => {
                const active = pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    data-tour={
                      item.to === "/estudio"
                        ? "nav-study"
                        : item.to === "/crear"
                          ? "nav-practice"
                          : item.to === "/progreso"
                            ? "nav-progress"
                            : undefined
                    }
                    className={cn(
                      "group flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors sm:text-[11px]",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 min-w-10 items-center justify-center rounded-full transition-colors",
                        active && "bg-primary/10",
                      )}
                    >
                      <Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 2} />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </ProductTourProvider>
  );
}
