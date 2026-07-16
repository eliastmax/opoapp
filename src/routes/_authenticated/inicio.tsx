import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Trophy, Target, XCircle, ArrowRight, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inicio")({
  component: InicioPage,
});

function InicioPage() {
  const navigate = useNavigate();
  const [repasando, setRepasando] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [activas, completados, ultimo, aciertosTotal, falladasDistintas] = await Promise.all([
        supabase.from("questions").select("id", { count: "exact", head: true }).eq("activa", true),
        supabase.from("tests").select("id", { count: "exact", head: true }).eq("completado", true),
        supabase.from("tests").select("id, porcentaje, aciertos, numero_preguntas, fecha_finalizacion").eq("completado", true).order("fecha_finalizacion", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("test_answers").select("correcta").not("correcta", "is", null),
        supabase.from("test_answers").select("question_id, questions!test_answers_question_id_fkey!inner(activa)").eq("correcta", false).eq("questions.activa", true),
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

  async function repasarFallos() {
    setRepasando(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user!.id;

      const { data: rows, error: eRows } = await supabase
        .from("test_answers")
        .select("question_id, questions!test_answers_question_id_fkey!inner(activa)")
        .eq("correcta", false);
      if (eRows) throw eRows;

      const ids = Array.from(
        new Set(
          (rows ?? [])
            .filter((r) => r.questions && r.questions.activa === true)
            .map((r) => r.question_id),
        ),
      );

      if (ids.length === 0) {
        toast.error("No tienes fallos pendientes");
        setRepasando(false);
        return;
      }

      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }

      const { data: test, error: eTest } = await supabase.from("tests").insert({
        user_id: userId, tipo: "falladas", numero_preguntas: ids.length, sin_responder: ids.length,
      }).select().single();
      if (eTest) throw eTest;

      const answers = ids.map((qid, i) => ({ user_id: userId, test_id: test.id, question_id: qid, orden: i + 1 }));
      const { error: eAns } = await supabase.from("test_answers").insert(answers);
      if (eAns) throw eAns;

      navigate({ to: "/test/$id", params: { id: test.id } });
    } catch (e) {
      toast.error((e as Error).message);
      setRepasando(false);
    }
  }

  const falladas = data?.distintasFalladas ?? 0;
  const hasFalladas = falladas > 0;

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
        {hasFalladas ? (
          <button
            type="button"
            onClick={repasarFallos}
            disabled={repasando}
            aria-label={`Repasar ${falladas} preguntas falladas`}
            className="text-left rounded-lg border bg-card p-4 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70"
          >
            <XCircle className="w-5 h-5 text-primary mb-2" />
            <div className="text-xs text-muted-foreground">Preguntas falladas</div>
            <div className="text-xl font-bold mt-0.5">{falladas}</div>
            <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
              {repasando ? <><Loader2 className="w-3 h-3 animate-spin" /> Preparando…</> : <>Repasar fallos <ArrowRight className="w-3 h-3" /></>}
            </div>
          </button>
        ) : (
          <Card className="p-4">
            <XCircle className="w-5 h-5 text-primary mb-2" />
            <div className="text-xs text-muted-foreground">Preguntas falladas</div>
            {isLoading ? <Skeleton className="h-7 w-16 mt-1" /> : <div className="text-xl font-bold mt-0.5">0</div>}
            {!isLoading && <div className="text-xs text-muted-foreground mt-1">No tienes fallos pendientes</div>}
          </Card>
        )}
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

      <div className="pt-2">
        <Link to="/crear"><Button className="w-full h-14 text-base font-semibold">Crear test</Button></Link>
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
