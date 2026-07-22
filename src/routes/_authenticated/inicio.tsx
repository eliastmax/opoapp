import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Trophy,
  Target,
  XCircle,
  ArrowRight,
  Loader2,
  Flag,
  Gauge,
  Sparkles,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { uniqueActiveFailureIds } from "@/lib/active-failures";
import { uniqueActiveDoubtIds } from "@/lib/active-doubts";
import { describeRecommendedSession, RECOMMENDED_SESSION_SIZES } from "@/lib/recommended-session";

export const Route = createFileRoute("/_authenticated/inicio")({
  component: InicioPage,
});

function InicioPage() {
  const navigate = useNavigate();
  const [repasando, setRepasando] = useState(false);
  const [repasandoDudas, setRepasandoDudas] = useState(false);
  const [recommendedSize, setRecommendedSize] = useState<number>(10);
  const [creatingRecommended, setCreatingRecommended] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw userError ?? new Error("Sesión no válida");

      const [activas, completados, ultimo, aciertosTotal, falladasActivas, dudasActivas] =
        await Promise.all([
          supabase
            .from("questions")
            .select("id", { count: "exact", head: true })
            .eq("activa", true),
          supabase
            .from("tests")
            .select("id", { count: "exact", head: true })
            .eq("completado", true),
          supabase
            .from("tests")
            .select("id, porcentaje, aciertos, numero_preguntas, fecha_finalizacion")
            .eq("completado", true)
            .order("fecha_finalizacion", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.from("test_answers").select("correcta").not("correcta", "is", null),
          supabase
            .from("active_failed_questions")
            .select("question_id", { count: "exact", head: true })
            .eq("user_id", userData.user.id),
          supabase
            .from("active_doubt_questions")
            .select("question_id", { count: "exact", head: true })
            .eq("user_id", userData.user.id),
        ]);
      const totalRespuestas = aciertosTotal.data?.length ?? 0;
      const aciertos = aciertosTotal.data?.filter((r) => r.correcta === true).length ?? 0;
      const pct = totalRespuestas > 0 ? Math.round((aciertos / totalRespuestas) * 100) : 0;
      return {
        activas: activas.count ?? 0,
        completados: completados.count ?? 0,
        ultimo: ultimo.data,
        pctGlobal: pct,
        distintasFalladas: falladasActivas.count ?? 0,
        distintasDudosas: dudasActivas.count ?? 0,
      };
    },
  });

  async function repasarFallos() {
    setRepasando(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user!.id;

      const { data: rows, error: eRows } = await supabase
        .from("active_failed_questions")
        .select("question_id")
        .eq("user_id", userId);
      if (eRows) throw eRows;

      const ids = uniqueActiveFailureIds(rows ?? []);

      if (ids.length === 0) {
        toast.error("No tienes fallos pendientes");
        setRepasando(false);
        return;
      }

      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }

      const { data: test, error: eTest } = await supabase
        .from("tests")
        .insert({
          user_id: userId,
          tipo: "falladas",
          numero_preguntas: ids.length,
          sin_responder: ids.length,
        })
        .select()
        .single();
      if (eTest) throw eTest;

      const answers = ids.map((qid, i) => ({
        user_id: userId,
        test_id: test.id,
        question_id: qid,
        orden: i + 1,
      }));
      const { error: eAns } = await supabase.from("test_answers").insert(answers);
      if (eAns) throw eAns;

      navigate({ to: "/test/$id", params: { id: test.id } });
    } catch (e) {
      toast.error((e as Error).message);
      setRepasando(false);
    }
  }

  async function repasarDudas() {
    setRepasandoDudas(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user!.id;
      const { data: rows, error: rowsError } = await supabase
        .from("active_doubt_questions")
        .select("question_id")
        .eq("user_id", userId);
      if (rowsError) throw rowsError;

      const ids = uniqueActiveDoubtIds(rows ?? []);
      if (ids.length === 0) {
        toast.error("No tienes dudas pendientes");
        setRepasandoDudas(false);
        return;
      }

      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }

      const { data: test, error: testError } = await supabase
        .from("tests")
        .insert({
          user_id: userId,
          tipo: "dudas",
          numero_preguntas: ids.length,
          sin_responder: ids.length,
        })
        .select()
        .single();
      if (testError) throw testError;
      const answers = ids.map((questionId, index) => ({
        user_id: userId,
        test_id: test.id,
        question_id: questionId,
        orden: index + 1,
      }));
      const { error: answersError } = await supabase.from("test_answers").insert(answers);
      if (answersError) throw answersError;
      navigate({ to: "/test/$id", params: { id: test.id } });
    } catch (error) {
      toast.error((error as Error).message);
      setRepasandoDudas(false);
    }
  }

  async function createRecommendedSession() {
    setCreatingRecommended(true);
    try {
      const { data: rows, error } = await supabase.rpc("create_recommended_test", {
        p_question_count: recommendedSize,
      });
      if (error) throw error;

      const session = rows?.[0];
      if (!session) throw new Error("No se pudo preparar la sesión recomendada");

      toast.success(describeRecommendedSession(session));
      navigate({ to: "/test/$id", params: { id: session.test_id } });
    } catch (error) {
      toast.error((error as Error).message);
      setCreatingRecommended(false);
    }
  }

  const falladas = data?.distintasFalladas ?? 0;
  const hasFalladas = falladas > 0;
  const dudas = data?.distintasDudosas ?? 0;

  return (
    <div className="space-y-4">
      <header className="pt-2">
        <h1 className="text-2xl font-bold">Inicio</h1>
        <p className="text-sm text-muted-foreground">Resumen de tu progreso</p>
      </header>

      <Card className="border-primary/25 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Sesión recomendada</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Mezcla tus fallos y dudas, el tema actual, puntos débiles y repaso de retención.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-xs font-medium text-muted-foreground">Número de preguntas</div>
          <div className="grid grid-cols-3 gap-2" aria-label="Número de preguntas recomendadas">
            {RECOMMENDED_SESSION_SIZES.map((size) => (
              <Button
                key={size}
                type="button"
                variant={recommendedSize === size ? "default" : "outline"}
                size="sm"
                onClick={() => setRecommendedSize(size)}
                disabled={creatingRecommended}
                aria-pressed={recommendedSize === size}
              >
                {size}
              </Button>
            ))}
          </div>
        </div>

        <Button
          type="button"
          className="mt-3 w-full"
          onClick={createRecommendedSession}
          disabled={creatingRecommended || isLoading || (data?.activas ?? 0) === 0}
        >
          {creatingRecommended ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparando…
            </>
          ) : (
            <>
              Empezar sesión recomendada <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Si falta alguna categoría, la app redistribuye las preguntas sin repetirlas.
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={BookOpen}
          label="Preguntas activas"
          value={isLoading ? undefined : (data?.activas ?? 0)}
        />
        <StatCard
          icon={Trophy}
          label="Tests completados"
          value={isLoading ? undefined : (data?.completados ?? 0)}
        />
        <StatCard
          icon={Target}
          label="% Acierto histórico"
          value={isLoading ? undefined : `${data?.pctGlobal ?? 0}%`}
        />
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
              {repasando ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" /> Preparando…
                </>
              ) : (
                <>
                  Repasar fallos <ArrowRight className="w-3 h-3" />
                </>
              )}
            </div>
          </button>
        ) : (
          <Card className="p-4">
            <XCircle className="w-5 h-5 text-primary mb-2" />
            <div className="text-xs text-muted-foreground">Preguntas falladas</div>
            {isLoading ? (
              <Skeleton className="h-7 w-16 mt-1" />
            ) : (
              <div className="text-xl font-bold mt-0.5">0</div>
            )}
            {!isLoading && (
              <div className="text-xs text-muted-foreground mt-1">No tienes fallos pendientes</div>
            )}
          </Card>
        )}
      </div>

      {dudas > 0 && (
        <button
          type="button"
          onClick={repasarDudas}
          disabled={repasandoDudas}
          aria-label={`Repasar ${dudas} preguntas marcadas como duda`}
          className="w-full text-left rounded-lg border bg-card p-4 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70"
        >
          <div className="flex items-center gap-3">
            <Flag className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Preguntas con duda</div>
              <div className="text-xl font-bold">{dudas}</div>
            </div>
            <div className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
              {repasandoDudas ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" /> Preparando…
                </>
              ) : (
                <>
                  Repasar dudas <ArrowRight className="w-3 h-3" />
                </>
              )}
            </div>
          </div>
        </button>
      )}

      {data?.ultimo && (
        <Card className="p-4">
          <div className="text-xs uppercase text-muted-foreground font-medium">
            Último resultado
          </div>
          <div className="mt-1 text-2xl font-bold">{Number(data.ultimo.porcentaje)}%</div>
          <div className="text-sm text-muted-foreground">
            {data.ultimo.aciertos}/{data.ultimo.numero_preguntas} correctas
          </div>
          <Link
            to="/resultados/$id"
            params={{ id: data.ultimo.id }}
            className="mt-3 inline-flex items-center gap-1 text-sm text-primary font-medium"
          >
            Ver detalle <ArrowRight className="w-4 h-4" />
          </Link>
        </Card>
      )}

      <Link to="/progreso" className="block">
        <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-accent/50">
          <Gauge className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <div className="text-sm font-semibold">Ver progreso por temas</div>
            <div className="text-xs text-muted-foreground">
              Cobertura, acierto actual y evidencia
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Card>
      </Link>

      <div className="pt-2">
        <Link to="/crear">
          <Button variant="outline" className="w-full h-12 text-base font-semibold">
            Crear test personalizado
          </Button>
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string | undefined;
}) {
  return (
    <Card className="p-4">
      <Icon className="w-5 h-5 text-primary mb-2" />
      <div className="text-xs text-muted-foreground">{label}</div>
      {value === undefined ? (
        <Skeleton className="h-7 w-16 mt-1" />
      ) : (
        <div className="text-xl font-bold mt-0.5">{value}</div>
      )}
    </Card>
  );
}
