import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  PlayCircle,
  Trash2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { uniqueActiveFailureIds } from "@/lib/active-failures";
import { uniqueActiveDoubtIds } from "@/lib/active-doubts";
import { describeRecommendedSession, RECOMMENDED_SESSION_SIZES } from "@/lib/recommended-session";
import { displayName } from "@/lib/user-greeting";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/inicio")({
  component: InicioPage,
});

function InicioPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [repasando, setRepasando] = useState(false);
  const [repasandoDudas, setRepasandoDudas] = useState(false);
  const [recommendedSize, setRecommendedSize] = useState<number>(10);
  const [creatingRecommended, setCreatingRecommended] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [discarding, setDiscarding] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw userError ?? new Error("Sesión no válida");

      const [
        profile,
        activas,
        completados,
        ultimo,
        aciertosTotal,
        falladasActivas,
        dudasActivas,
        unfinishedTest,
      ] = await Promise.all([
        supabase.from("profiles").select("nombre").eq("id", userData.user.id).maybeSingle(),
        supabase.from("questions").select("id", { count: "exact", head: true }).eq("activa", true),
        supabase.from("tests").select("id", { count: "exact", head: true }).eq("completado", true),
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
        supabase
          .from("tests")
          .select("id, tipo, numero_preguntas, fecha_inicio")
          .eq("user_id", userData.user.id)
          .eq("completado", false)
          .order("fecha_inicio", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (unfinishedTest.error) throw unfinishedTest.error;

      let unfinished = null;
      if (unfinishedTest.data) {
        const { data: unfinishedAnswers, error: unfinishedAnswersError } = await supabase
          .from("test_answers")
          .select("respuesta_usuario")
          .eq("user_id", userData.user.id)
          .eq("test_id", unfinishedTest.data.id);
        if (unfinishedAnswersError) throw unfinishedAnswersError;
        unfinished = {
          ...unfinishedTest.data,
          answered:
            unfinishedAnswers?.filter((answer) => answer.respuesta_usuario !== null).length ?? 0,
        };
      }

      const totalRespuestas = aciertosTotal.data?.length ?? 0;
      const aciertos = aciertosTotal.data?.filter((r) => r.correcta === true).length ?? 0;
      const pct = totalRespuestas > 0 ? Math.round((aciertos / totalRespuestas) * 100) : 0;
      return {
        userName: displayName({
          profileName: profile.data?.nombre,
          metadataName: userData.user.user_metadata?.nombre,
          email: userData.user.email,
        }),
        activas: activas.count ?? 0,
        completados: completados.count ?? 0,
        ultimo: ultimo.data,
        pctGlobal: pct,
        distintasFalladas: falladasActivas.count ?? 0,
        distintasDudosas: dudasActivas.count ?? 0,
        unfinished,
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

  async function discardUnfinishedTest() {
    if (!data?.unfinished || discarding) return;
    setDiscarding(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw userError ?? new Error("Sesión no válida");
      const { error } = await supabase
        .from("tests")
        .delete()
        .eq("id", data.unfinished.id)
        .eq("user_id", userData.user.id);
      if (error) throw error;
      setConfirmDiscard(false);
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Test descartado");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setDiscarding(false);
    }
  }

  const falladas = data?.distintasFalladas ?? 0;
  const hasFalladas = falladas > 0;
  const dudas = data?.distintasDudosas ?? 0;

  return (
    <div className="space-y-5">
      <header className="pt-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          OpoTest Study
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          Te damos la bienvenida, {data?.userName ?? "…"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Hoy seguimos avanzando paso a paso.</p>
      </header>

      <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary via-primary to-[oklch(0.48_0.12_225)] p-5 text-primary-foreground shadow-[0_22px_50px_-28px_oklch(0.32_0.14_250/0.85)]">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-white/15 p-2.5 text-white ring-1 ring-white/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
              Siguiente paso
            </p>
            <h2 className="mt-0.5 text-lg font-bold">Sesión recomendada</h2>
            <p className="mt-1 text-sm leading-relaxed text-white/80">
              La app combina tus fallos, dudas y puntos débiles para elegir qué practicar ahora.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-xs font-medium text-white/75">Número de preguntas</div>
          <div className="grid grid-cols-3 gap-2" aria-label="Número de preguntas recomendadas">
            {RECOMMENDED_SESSION_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setRecommendedSize(size)}
                disabled={creatingRecommended}
                aria-pressed={recommendedSize === size}
                className={`h-9 rounded-xl border text-sm font-bold transition-colors disabled:opacity-50 ${
                  recommendedSize === size
                    ? "border-white bg-white text-primary"
                    : "border-white/25 bg-white/10 text-white hover:bg-white/15"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <Button
          type="button"
          className="mt-3 h-11 w-full bg-white text-primary shadow-sm hover:bg-white/90"
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
        <p className="mt-2 text-center text-xs text-white/65">
          Si falta alguna categoría, la app redistribuye las preguntas sin repetirlas.
        </p>
      </Card>

      {data?.unfinished && (
        <Card className="overflow-hidden border-primary/15 bg-card/95 p-0 shadow-[0_16px_40px_-30px_oklch(0.28_0.08_250/0.5)]">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                <PlayCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                  Test en curso
                </p>
                <h2 className="mt-0.5 text-base font-bold">Continúa donde lo dejaste</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.unfinished.answered >= data.unfinished.numero_preguntas
                    ? "Todo respondido · pendiente de corregir"
                    : `${data.unfinished.answered} de ${data.unfinished.numero_preguntas} respondidas`}
                </p>
              </div>
            </div>
            <Progress
              value={
                data.unfinished.numero_preguntas > 0
                  ? (data.unfinished.answered / data.unfinished.numero_preguntas) * 100
                  : 0
              }
              className="mt-3 h-1.5"
            />
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2 border-t border-border/70 bg-muted/25 p-3">
            <Button
              type="button"
              className="h-10"
              onClick={() =>
                navigate({
                  to: "/test/$id",
                  params: { id: data.unfinished!.id },
                })
              }
            >
              Continuar test <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-muted-foreground hover:text-destructive"
              aria-label="Descartar test en curso"
              onClick={() => setConfirmDiscard(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      <Link to="/crear" className="block">
        <Button variant="outline" className="h-12 w-full border-primary/20 bg-card/90 text-base">
          <BookOpen className="h-4 w-4" /> Crear test personalizado
        </Button>
      </Link>

      <section aria-labelledby="activity-heading">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="activity-heading" className="text-sm font-bold">
            Tu actividad
          </h2>
          <Link to="/progreso" className="text-xs font-semibold text-primary">
            Ver progreso
          </Link>
        </div>
        <Card className="grid grid-cols-3 divide-x overflow-hidden bg-card/90 p-0">
          <StatItem
            icon={BookOpen}
            label="Preguntas"
            value={isLoading ? undefined : (data?.activas ?? 0)}
          />
          <StatItem
            icon={Trophy}
            label="Tests"
            value={isLoading ? undefined : (data?.completados ?? 0)}
          />
          <StatItem
            icon={Target}
            label="Acierto"
            value={isLoading ? undefined : `${data?.pctGlobal ?? 0}%`}
          />
        </Card>
      </section>

      <section className="space-y-2" aria-labelledby="review-heading">
        <h2 id="review-heading" className="text-sm font-bold">
          Repaso pendiente
        </h2>
        <ReviewCard
          icon={XCircle}
          title="Preguntas falladas"
          count={falladas}
          emptyText="No tienes fallos pendientes"
          actionText="Repasar fallos"
          loading={isLoading || repasando}
          disabled={!hasFalladas || isLoading}
          onClick={repasarFallos}
          tone="error"
        />
        <ReviewCard
          icon={Flag}
          title="Preguntas con duda"
          count={dudas}
          emptyText="No tienes dudas pendientes"
          actionText="Repasar dudas"
          loading={isLoading || repasandoDudas}
          disabled={dudas === 0 || isLoading}
          onClick={repasarDudas}
          tone="warning"
        />
      </section>

      {data?.ultimo && (
        <Card className="flex items-center gap-4 bg-card/90 p-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-success/10 text-xl font-bold text-success">
            {Number(data.ultimo.porcentaje)}%
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Último resultado
            </div>
            <div className="mt-0.5 text-sm font-semibold">
              {data.ultimo.aciertos}/{data.ultimo.numero_preguntas} respuestas correctas
            </div>
            <Link
              to="/resultados/$id"
              params={{ id: data.ultimo.id }}
              className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary"
            >
              Ver detalle <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>
      )}

      <Link to="/progreso" className="block">
        <Card className="flex items-center gap-3 bg-card/90 p-4 transition-colors hover:bg-accent/50">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <Gauge className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Ver progreso por temas</div>
            <div className="text-xs text-muted-foreground">
              Cobertura, acierto actual y evidencia
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Card>
      </Link>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar este test?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán sus respuestas guardadas. Esta acción no afecta a tus preguntas ni a los
              tests ya terminados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={discarding}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void discardUnfinishedTest();
              }}
              disabled={discarding}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {discarding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string | undefined;
}) {
  return (
    <div className="min-w-0 px-2 py-4 text-center">
      <Icon className="mx-auto mb-1.5 h-4 w-4 text-primary" />
      {value === undefined ? (
        <Skeleton className="mx-auto h-6 w-10" />
      ) : (
        <div className="text-lg font-bold leading-none">{value}</div>
      )}
      <div className="mt-1 truncate text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function ReviewCard({
  icon: Icon,
  title,
  count,
  emptyText,
  actionText,
  loading,
  disabled,
  onClick,
  tone,
}: {
  icon: React.ElementType;
  title: string;
  count: number;
  emptyText: string;
  actionText: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
  tone: "error" | "warning";
}) {
  const iconClass =
    tone === "error"
      ? "bg-destructive/10 text-destructive"
      : "bg-warning/15 text-warning-foreground";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 rounded-2xl border bg-card/90 p-3.5 text-left shadow-[0_10px_32px_-24px_oklch(0.28_0.08_250/0.45)] transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-80"
    >
      <span className={`rounded-xl p-2.5 ${iconClass}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">
          {count > 0 ? `${count} pendientes` : emptyText}
        </span>
      </span>
      {count > 0 && (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              {actionText}
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </span>
      )}
    </button>
  );
}
