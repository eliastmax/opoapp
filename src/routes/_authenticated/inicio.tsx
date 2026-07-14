import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Trophy, Target, XCircle, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/inicio")({
  component: InicioPage,
});

function InicioPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [activas, completados, ultimo, aciertosTotal, falladasDistintas] = await Promise.all([
        supabase.from("questions").select("id", { count: "exact", head: true }).eq("activa", true),
        supabase.from("tests").select("id", { count: "exact", head: true }).eq("completado", true),
        supabase.from("tests").select("id, porcentaje, aciertos, numero_preguntas, fecha_finalizacion").eq("completado", true).order("fecha_finalizacion", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("test_answers").select("correcta").not("correcta", "is", null),
        supabase.from("test_answers").select("question_id").eq("correcta", false),
      ]);
      const totalRespuestas = aciertosTotal.data?.length ?? 0;
      const aciertos = aciertosTotal.data?.filter((r) => r.correcta === true).length ?? 0;
      const pct = totalRespuestas > 0 ? Math.round((aciertos / totalRespuestas) * 100) : 0;
      const distintasFalladas = new Set((falladasDistintas.data ?? []).map((r) => r.question_id)).size;
      return {
        activas: activas.count ?? 0,
        completados: completados.count ?? 0,
        ultimo: ultimo.data,
        pctGlobal: pct,
        distintasFalladas,
      };
    },
  });

  return (
    <div className="space-y-4">
      <header className="pt-2">
        <h1 className="text-2xl font-bold">Inicio</h1>
        <p className="text-sm text-muted-foreground">Resumen de tu progreso</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={BookOpen} label="Preguntas activas" value={isLoading ? undefined : data?.activas ?? 0} />
        <StatCard icon={Trophy} label="Tests completados" value={isLoading ? undefined : data?.completados ?? 0} />
        <StatCard icon={Target} label="% Acierto global" value={isLoading ? undefined : `${data?.pctGlobal ?? 0}%`} />
        <StatCard icon={XCircle} label="Preguntas falladas" value={isLoading ? undefined : data?.distintasFalladas ?? 0} />
      </div>

      {data?.ultimo && (
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground font-medium">Último resultado</div>
          <div className="mt-1 text-2xl font-bold">{Number(data.ultimo.porcentaje)}%</div>
          <div className="text-sm text-muted-foreground">{data.ultimo.aciertos}/{data.ultimo.numero_preguntas} correctas</div>
          <Link to="/resultados/$id" params={{ id: data.ultimo.id }} className="mt-3 inline-flex items-center gap-1 text-sm text-primary font-medium">
            Ver detalle <ArrowRight className="w-4 h-4" />
          </Link>
        </Card>
      )}

      <div className="space-y-2 pt-2">
        <Link to="/crear"><Button className="w-full h-14 text-base font-semibold">Comenzar test</Button></Link>
        <Link to="/crear"><Button variant="outline" className="w-full h-12">Crear test personalizado</Button></Link>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number | string | undefined }) {
  return (
    <Card className="p-4">
      <Icon className="w-5 h-5 text-primary mb-2" />
      <div className="text-xs text-muted-foreground">{label}</div>
      {value === undefined ? <Skeleton className="h-7 w-16 mt-1" /> : <div className="text-xl font-bold mt-0.5">{value}</div>}
    </Card>
  );
}
