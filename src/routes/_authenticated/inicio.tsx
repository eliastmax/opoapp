import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  Crosshair,
  Layers3,
  Loader2,
  Play,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CoverageFigures,
  CoverageRings,
  Streak,
  TrainingError,
  trainingCard,
} from "@/components/training-visuals";
import { WeeklyTestsFirstRecap } from "@/components/weekly-tests-first-recap";
import { useActiveOpposition } from "@/hooks/use-active-opposition";
import {
  useConceptTraining,
  useTrainingActivity,
  useTrainingProgress,
  useTrainingTopics,
} from "@/hooks/use-training-overview";
import { supabase } from "@/integrations/supabase/client";
import { displayName } from "@/lib/user-greeting";
import { coverage, recommendKnowledge } from "@/lib/training-overview";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/inicio")({ component: InicioPage });

function InicioPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const opposition = useActiveOpposition();
  const oppositionId = opposition.data?.id;
  const progress = useTrainingProgress(user.id, oppositionId);
  const activity = useTrainingActivity(user.id, oppositionId);
  const training = useConceptTraining();
  const today = useQuery({
    queryKey: ["today-tests-first", user.id, oppositionId],
    queryFn: async () => {
      const profile = await supabase
        .from("profiles")
        .select("nombre")
        .eq("id", user.id)
        .maybeSingle();
      if (profile.error) throw profile.error;
      const userName = displayName({
        profileName: profile.data?.nombre,
        metadataName: user.user_metadata?.nombre,
        email: user.email,
      });
      if (!oppositionId) return { userName, unfinished: null };

      const unfinished = await supabase
        .from("tests")
        .select("id, numero_preguntas")
        .eq("user_id", user.id)
        .eq("opposition_id", oppositionId)
        .eq("completado", false)
        .neq("tipo", "v4_concept_check")
        .order("fecha_inicio", { ascending: false })
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (unfinished.error) throw unfinished.error;
      if (!unfinished.data) return { userName, unfinished: null };

      const answerResult = await supabase
        .from("test_answers")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("test_id", unfinished.data.id)
        .not("respuesta_usuario", "is", null);
      if (answerResult.error) throw answerResult.error;
      return {
        userName,
        unfinished: {
          id: unfinished.data.id,
          total: unfinished.data.numero_preguntas,
          answered: answerResult.count ?? 0,
        },
      };
    },
  });
  const unfinished = today.data?.unfinished;
  const recommendation = progress.data && recommendKnowledge(progress.data);
  const summary = progress.data && coverage(progress.data);
  const loading =
    today.isLoading ||
    opposition.isLoading ||
    (!!oppositionId && !unfinished && progress.isLoading);
  const error = today.isError || opposition.isError;

  return (
    <div className="space-y-4">
      <header className="space-y-3 pt-3">
        {opposition.data && (
          <p className="text-xs font-semibold tracking-wide text-primary">{opposition.data.name}</p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-[2rem] leading-tight font-bold tracking-tight">
            {today.data ? `Hola, ${today.data.userName}` : "Hoy"}
          </h1>
          {!activity.isError && activity.data && <Streak days={activity.data.streak} />}
        </div>
        <p className="text-sm text-muted-foreground">
          Cada entrenamiento te ayuda a decidir qué repasar.
        </p>
      </header>

      {error ? (
        <TrainingError
          message="Hoy no se ha podido cargar."
          retry={() => {
            void opposition.refetch();
            void today.refetch();
          }}
        />
      ) : loading ? (
        <Skeleton className="h-56 rounded-[1.5rem]" aria-label="Preparando tu entrenamiento" />
      ) : !oppositionId ? (
        <PrimaryCard
          title="Elige tu oposición"
          description="Activa el temario que quieres practicar."
          action="Elegir oposición"
          onAction={() => navigate({ to: "/preparacion" })}
        />
      ) : unfinished ? (
        <PrimaryCard
          title="Tu test está en marcha"
          description="Retoma el entrenamiento donde lo dejaste."
          action="Continuar test"
          questions={`${unfinished.answered} de ${unfinished.total} respondidas`}
          onAction={() =>
            navigate({
              to: "/test/$id",
              params: { id: unfinished.id },
              search: { block: undefined, session: undefined },
            })
          }
        />
      ) : recommendation && !progress.isError ? (
        <PrimaryCard
          title={
            recommendation.reason === "reinforce"
              ? "Refuerza lo trabajado"
              : "Comprueba lo que sabes"
          }
          description={
            recommendation.reason === "reinforce"
              ? `Tus respuestas del tema ${recommendation.row.topic_number} señalan dónde te conviene practicar.`
              : `Empieza con preguntas del tema ${recommendation.row.topic_number} para reunir evidencia.`
          }
          action="Iniciar entrenamiento"
          questions={`${recommendation.questionCount} preguntas`}
          duration={`${recommendation.questionCount}–${recommendation.questionCount * 2} min aprox.`}
          pending={training.isPending}
          onAction={() =>
            training.mutate({
              conceptId: recommendation.row.concept_id,
              questionCount: recommendation.questionCount,
            })
          }
        />
      ) : (
        <PrimaryCard
          title="Prepara tu próximo test"
          description="Elige el tema y el número de preguntas que quieres practicar."
          action="Configurar test"
          onAction={() => navigate({ to: "/crear" })}
        />
      )}

      {oppositionId && !error && (
        <>
          <PendingReviews userId={user.id} oppositionId={oppositionId} />
          {progress.isError ? (
            <TrainingError
              message="Tu dominio del temario no se ha podido cargar."
              retry={() => void progress.refetch()}
            />
          ) : (
            summary &&
            summary.total > 0 && (
              <section className={cn(trainingCard, "p-4")} aria-labelledby="today-progress">
                <h2 id="today-progress" className="font-bold">
                  Tu dominio del temario
                </h2>
                <div className="my-3 flex items-center gap-5">
                  <CoverageRings summary={summary} />
                  <CoverageFigures summary={summary} />
                </div>
                <Button
                  variant="ghost"
                  asChild
                  className="h-11 w-full justify-between text-primary"
                >
                  <Link to="/progreso">
                    Ver mi progreso <ChevronRight aria-hidden="true" />
                  </Link>
                </Button>
              </section>
            )
          )}
          {activity.isError ? (
            <TrainingError
              message="Tu actividad no se ha podido cargar."
              retry={() => void activity.refetch()}
            />
          ) : (
            activity.data && <WeeklyTestsFirstRecap data={activity.data} />
          )}
        </>
      )}
    </div>
  );
}

function PrimaryCard({
  title,
  description,
  questions,
  duration,
  action,
  pending,
  onAction,
}: {
  title: string;
  description: string;
  questions?: string;
  duration?: string;
  action: string;
  pending?: boolean;
  onAction: () => void;
}) {
  return (
    <section
      data-tour="today-session"
      className="relative isolate overflow-hidden rounded-[1.5rem] bg-[#163d70] p-5 text-white shadow-[0_20px_30px_-21px_#163d70] motion-safe:animate-in motion-safe:fade-in"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-20 -z-10 size-56 rounded-full border-24 border-[#468bd3]/25 ring-[18px] ring-[#468bd3]/15"
      />
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-blue-100">
        <span className="grid size-8 place-items-center rounded-lg bg-white/15">
          <Crosshair className="size-4" aria-hidden="true" />
        </span>
        Entrenamiento de hoy
      </div>
      <h2 className="text-[1.5rem] leading-tight font-bold tracking-tight">{title}</h2>
      <p className="mt-2 max-w-[34ch] text-sm leading-relaxed text-blue-100">{description}</p>
      {questions && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-blue-100">
          <span className="flex items-center gap-1.5">
            <Layers3 className="size-4" aria-hidden="true" /> {questions}
          </span>
          {duration && (
            <span className="flex items-center gap-1.5">
              <Clock3 className="size-4" aria-hidden="true" /> {duration}
            </span>
          )}
        </div>
      )}
      <Button
        type="button"
        disabled={pending}
        onClick={onAction}
        className="mt-5 h-12 w-full justify-between bg-white text-[#163d70] hover:bg-blue-50 focus-visible:ring-white focus-visible:ring-offset-[#163d70]"
      >
        {pending ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <Play aria-hidden="true" />
        )}
        {action}
        <ArrowRight aria-hidden="true" />
      </Button>
    </section>
  );
}

function PendingReviews({ userId, oppositionId }: { userId: string; oppositionId: string }) {
  const topics = useTrainingTopics(oppositionId);
  const reviews = useQuery({
    queryKey: ["training-reviews", userId, oppositionId, topics.data?.map((topic) => topic.id)],
    enabled: Boolean(topics.data?.length),
    queryFn: async () => {
      const ids = topics.data!.map((topic) => topic.id);
      return Promise.all(
        (
          [
            {
              view: "active_failed_questions",
              date: "last_answered_at",
              mode: "falladas",
              label: "Repasar fallos",
              icon: RotateCcw,
            },
            {
              view: "active_doubt_questions",
              date: "last_reviewed_at",
              mode: "dudas",
              label: "Aclarar dudas",
              icon: CircleHelp,
            },
          ] as const
        ).map(async (item) => {
          const result = await supabase
            .from(item.view)
            .select("topic_id")
            .eq("user_id", userId)
            .in("topic_id", ids)
            .order(item.date, { ascending: false })
            .order("question_id")
            .limit(1)
            .maybeSingle();
          if (result.error) throw result.error;
          return {
            ...item,
            topic: topics.data!.find((topic) => topic.id === result.data?.topic_id),
          };
        }),
      );
    },
  });
  if (topics.isError || reviews.isError) {
    return (
      <TrainingError
        message="No se han podido consultar los repasos."
        retry={() => {
          void (topics.isError ? topics.refetch() : reviews.refetch());
        }}
      />
    );
  }
  const pending = reviews.data?.filter((item) => item.topic);
  if (!pending?.length) return null;

  return (
    <section className={cn(trainingCard, "p-4")} aria-labelledby="pending-review">
      <h2 id="pending-review" className="flex items-center gap-2 font-bold">
        <ClipboardCheck className="size-4 text-primary" aria-hidden="true" /> Repasos pendientes
      </h2>
      <div className="mt-2 divide-y">
        {pending.map(
          ({ topic, mode, icon: Icon, label }) =>
            topic && (
              <Link
                key={mode}
                to="/crear"
                search={{ topic: topic.id, review: mode }}
                className="flex min-h-12 items-center gap-2.5 rounded-md py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#d49a36]/20 text-amber-900 dark:text-amber-100">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block">{label}</strong>
                  <span
                    className="block truncate text-xs text-muted-foreground"
                    title={topic.nombre}
                  >
                    Tema {topic.numero} · {topic.nombre}
                  </span>
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </Link>
            ),
        )}
      </div>
    </section>
  );
}
