import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ElementType } from "react";
import { ArrowRight, Brain, Loader2, Play, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { displayName } from "@/lib/user-greeting";

export const Route = createFileRoute("/_authenticated/inicio")({ component: InicioPage });

type UnfinishedTest = {
  id: string;
  total: number;
  answered: number;
};

function InicioPage() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["today-tests-first"],
    queryFn: async () => {
      const userResult = await supabase.auth.getUser();
      if (userResult.error || !userResult.data.user) {
        throw userResult.error ?? new Error("Sesión no válida");
      }

      const user = userResult.data.user;
      const profile = await supabase
        .from("profiles")
        .select("nombre, active_opposition_id")
        .eq("id", user.id)
        .maybeSingle();
      if (profile.error) throw profile.error;

      const unfinished = await supabase
        .from("tests")
        .select("id, numero_preguntas")
        .eq("user_id", user.id)
        .eq("completado", false)
        .neq("tipo", "v4_concept_check")
        .order("fecha_inicio", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (unfinished.error) throw unfinished.error;

      const answerResult = unfinished.data
        ? await supabase
            .from("test_answers")
            .select("respuesta_usuario")
            .eq("test_id", unfinished.data.id)
        : { data: [], error: null };
      if (answerResult.error) throw answerResult.error;

      return {
        userName: displayName({
          profileName: profile.data?.nombre,
          metadataName: user.user_metadata?.nombre,
          email: user.email,
        }),
        hasOpposition: Boolean(profile.data?.active_opposition_id),
        unfinished: unfinished.data
          ? {
              id: unfinished.data.id,
              total: unfinished.data.numero_preguntas,
              answered: (answerResult.data ?? []).filter(
                (answer) => answer.respuesta_usuario !== null,
              ).length,
            }
          : null,
      };
    },
  });

  const unfinished = data?.unfinished ?? null;

  return (
    <div className="relative isolate space-y-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-20 -z-10 h-72 w-[92%] max-w-md -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <header className="pt-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Hoy</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {isLoading ? "Preparando tu entrenamiento…" : `Hola, ${data?.userName ?? ""}`}
        </h1>
        {!isLoading && !error && data?.hasOpposition && (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Entrena, mide lo que realmente sabes y usa tus resultados para decidir dónde apretar.
          </p>
        )}
      </header>

      {isLoading ? (
        <TodaySkeleton />
      ) : error ? (
        <Card className="border-destructive/20 p-5 text-center">
          <p className="font-semibold">No hemos podido preparar Hoy</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tus tests y tu progreso están intactos. Inténtalo de nuevo.
          </p>
          <Button className="mt-4 w-full" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </Card>
      ) : !data?.hasOpposition ? (
        <PrimaryCard
          icon={Target}
          eyebrow="Primero, elige tu oposición"
          title="Activa el temario con el que vas a entrenar"
          description="Solo necesitamos saber qué oposición preparas para cargar sus preguntas y tu progreso."
          action="Elegir oposición"
          onAction={() => navigate({ to: "/preparacion" })}
        />
      ) : unfinished ? (
        <UnfinishedPrimary
          test={unfinished}
          onContinue={() =>
            navigate({
              to: "/test/$id",
              params: { id: unfinished.id },
              search: { block: undefined, session: undefined },
            })
          }
        />
      ) : (
        <PrimaryCard
          icon={Brain}
          eyebrow="Tu siguiente entrenamiento"
          title="Pon a prueba lo que sabes"
          description="Elige tema, nivel y formato. Cada respuesta dará a OpoTest evidencia para mostrarte qué dominas y qué necesitas reforzar."
          action="Entrenar ahora"
          onAction={() => navigate({ to: "/crear" })}
        />
      )}
    </div>
  );
}

function UnfinishedPrimary({
  test,
  onContinue,
}: {
  test: UnfinishedTest;
  onContinue: () => void;
}) {
  const remaining = Math.max(0, test.total - test.answered);
  return (
    <PrimaryCard
      icon={Play}
      eyebrow="Continúa donde lo dejaste"
      title="Tienes un test en marcha"
      description={`${test.answered} de ${test.total} preguntas respondidas. Te quedan ${remaining}; continúa sin perder el intento.`}
      action="Continuar test"
      onAction={onContinue}
    />
  );
}

function PrimaryCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  action,
  onAction,
}: {
  icon: ElementType;
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <Card
      data-tour="today-session"
      className="relative overflow-hidden border-0 bg-gradient-to-br from-primary via-primary to-[oklch(0.46_0.13_228)] text-primary-foreground shadow-[0_26px_56px_-28px_oklch(0.3_0.14_250/0.95)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-14 h-44 w-44 rounded-full bg-cyan-200/10 blur-3xl"
      />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-start gap-3.5">
          <span className="rounded-2xl bg-white/15 p-2.5 ring-1 ring-white/20">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/72">
              {eyebrow}
            </p>
            <h2 className="mt-1.5 text-[1.35rem] font-bold leading-[1.15] tracking-tight">
              {title}
            </h2>
            <p className="mt-2.5 text-[15px] leading-relaxed text-white/88">{description}</p>
          </div>
        </div>
        <Button
          onClick={onAction}
          className="mt-5 h-12 w-full bg-white text-primary shadow-sm transition-transform duration-200 hover:bg-white/92 active:scale-[0.995]"
        >
          <Play className="mr-2 h-4 w-4" />
          {action}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

function TodaySkeleton() {
  return (
    <Card className="space-y-4 p-5" aria-label="Preparando tu entrenamiento de hoy">
      <div className="flex gap-3">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
    </Card>
  );
}
