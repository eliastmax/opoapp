import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/historial")({
  component: HistorialPage,
});

function HistorialPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["tests-history"],
    queryFn: async () =>
      (await supabase.from("tests").select("*").order("created_at", { ascending: false })).data ??
      [],
  });

  return (
    <div className="space-y-4">
      <header className="pt-2">
        <h1 className="text-2xl font-bold">Historial</h1>
        <p className="text-sm text-muted-foreground">Tus tests anteriores</p>
      </header>
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (data ?? []).length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Aún no has realizado ningún test
        </Card>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((t) => {
            const linkProps = t.completado
              ? { to: "/resultados/$id" as const, params: { id: t.id } }
              : { to: "/test/$id" as const, params: { id: t.id } };
            return (
              <Link key={t.id} {...linkProps}>
                <Card className="flex items-center justify-between p-3 transition-colors hover:bg-accent/50">
                  <div>
                    <div className="text-sm font-medium">
                      {t.tipo === "simulacro" ? "Simulacro" : t.tipo}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(t.created_at).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {t.numero_preguntas} preguntas
                      {t.exam_duration_minutes ? ` · ${t.exam_duration_minutes} min` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    {t.completado ? (
                      <>
                        <div className="text-lg font-bold text-primary">
                          {Number(t.porcentaje)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t.aciertos}/{t.numero_preguntas}
                        </div>
                      </>
                    ) : (
                      <div className="text-xs font-medium text-warning">Continuar</div>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
