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
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-4 pb-24">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 inset-x-0 border-t bg-card/95 backdrop-blur safe-bottom z-40">
        <div className="max-w-md mx-auto grid grid-cols-5">
          {nav.map((item) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2 min-h-14 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 2} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
