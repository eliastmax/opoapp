import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Home, PlusSquare, Gauge, Upload, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthLayout,
});

const nav = [
  { to: "/inicio", label: "Inicio", icon: Home },
  { to: "/crear", label: "Crear", icon: PlusSquare },
  { to: "/progreso", label: "Progreso", icon: Gauge },
  { to: "/importar", label: "Importar", icon: Upload },
  { to: "/ajustes", label: "Ajustes", icon: Settings },
] as const;

function AuthLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-4 pb-28">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 inset-x-0 border-t border-border/80 bg-card/90 backdrop-blur-xl safe-bottom z-40 shadow-[0_-10px_30px_-24px_oklch(0.28_0.08_250/0.5)]">
        <div className="max-w-md mx-auto grid grid-cols-5 px-1">
          {nav.map((item) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group flex flex-col items-center justify-center gap-1 py-2 min-h-14 text-[11px] font-medium transition-colors",
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
    </div>
  );
}
