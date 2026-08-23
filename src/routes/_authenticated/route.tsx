import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router";
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

function AuthLayout() {
  const { user } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const focusedJourney =
    pathname.startsWith("/test/") ||
    pathname.startsWith("/sesion") ||
    pathname.startsWith("/estudiar/") ||
    pathname.startsWith("/recordar/");
  const pageTourTarget =
    pathname === "/crear"
      ? "practice-builder"
      : pathname === "/progreso"
        ? "progress-overview"
        : null;

  return (
    <ProductTourProvider user={user}>
      <div data-app-shell className="min-h-screen flex flex-col">
        <main
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
