import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookMarked, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PreparationProfileFlow } from "@/components/v3/preparation-profile-flow";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useActiveOpposition } from "@/hooks/use-active-opposition";
import {
  emptyPreparationProfileDraft,
  usePreparationProfile,
  useSavePreparationProfile,
  type StoredPreparationProfile,
} from "@/hooks/use-preparation-profile";
import { supabase } from "@/integrations/supabase/client";
import type { PreparationProfileDraft, PreparationProfileStep } from "@/lib/preparation-profile";

export const Route = createFileRoute("/_authenticated/preparacion")({
  component: PreparationPage,
});

type OppositionOption = { id: string; name: string; description: string | null };
type TopicOption = { id: string; number: number; name: string };
type SaveState = "idle" | "saving" | "saved" | "error";

function PreparationPage() {
  const activeOpposition = useActiveOpposition();
  const oppositions = useQuery({
    queryKey: ["oppositions", "published"],
    queryFn: async (): Promise<OppositionOption[]> => {
      const { data, error } = await supabase
        .from("oppositions")
        .select("id, name, description")
        .eq("published", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  if (activeOpposition.isLoading || oppositions.isLoading) return <LoadingProfile />;
  if (activeOpposition.isError || oppositions.isError) {
    return (
      <ProfileError
        onRetry={() => {
          void activeOpposition.refetch();
          void oppositions.refetch();
        }}
      />
    );
  }

  if (!activeOpposition.data) {
    return <OppositionChooser oppositions={oppositions.data ?? []} />;
  }

  return (
    <PreparationProfileExperience
      opposition={activeOpposition.data}
      key={activeOpposition.data.id}
    />
  );
}

function OppositionChooser({ oppositions }: { oppositions: OppositionOption[] }) {
  const saveProfile = useSavePreparationProfile();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function choose(opposition: OppositionOption) {
    if (saveProfile.isPending) return;
    setSelectedId(opposition.id);
    try {
      await saveProfile.mutateAsync({
        draft: emptyPreparationProfileDraft(opposition.id),
        currentStep: "opposition",
        currentTopicId: null,
        complete: false,
      });
    } catch (error) {
      setSelectedId(null);
      toast.error(error instanceof Error ? error.message : "No se pudo elegir la oposición");
    }
  }

  return (
    <div className="space-y-4 pt-2">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          Tu preparación
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Elige tu oposición</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Verás únicamente su catálogo y tu progreso será independiente en cada oposición.
        </p>
      </header>
      {oppositions.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">
          No hay oposiciones disponibles en este momento.
        </Card>
      ) : (
        oppositions.map((opposition) => (
          <button
            key={opposition.id}
            type="button"
            disabled={saveProfile.isPending}
            onClick={() => void choose(opposition)}
            className="w-full rounded-2xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent disabled:opacity-60"
          >
            <span className="flex items-start gap-3">
              <BookMarked className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold leading-snug">{opposition.name}</span>
                {opposition.description ? (
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    {opposition.description}
                  </span>
                ) : null}
              </span>
              {selectedId === opposition.id ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
              ) : null}
            </span>
          </button>
        ))
      )}
    </div>
  );
}

function PreparationProfileExperience({
  opposition,
}: {
  opposition: { id: string; name: string };
}) {
  const storedProfile = usePreparationProfile(opposition.id);
  const topics = useQuery({
    queryKey: ["topics", "preparation", opposition.id],
    queryFn: async (): Promise<TopicOption[]> => {
      const { data, error } = await supabase
        .from("topics")
        .select("id, numero, nombre")
        .eq("opposition_id", opposition.id)
        .order("numero")
        .order("nombre");
      if (error) throw error;
      return (data ?? []).map((topic) => ({
        id: topic.id,
        number: topic.numero,
        name: topic.nombre,
      }));
    },
  });

  if (storedProfile.isLoading || topics.isLoading) return <LoadingProfile />;
  if (storedProfile.isError || topics.isError) {
    return (
      <ProfileError
        onRetry={() => {
          void storedProfile.refetch();
          void topics.refetch();
        }}
      />
    );
  }

  return (
    <ProfileEditor opposition={opposition} topics={topics.data ?? []} stored={storedProfile.data} />
  );
}

function ProfileEditor({
  opposition,
  topics,
  stored,
}: {
  opposition: { id: string; name: string };
  topics: TopicOption[];
  stored: StoredPreparationProfile | null | undefined;
}) {
  const navigate = useNavigate();
  const saveProfile = useSavePreparationProfile();
  const [draft, setDraft] = useState<PreparationProfileDraft>(
    stored?.draft ?? emptyPreparationProfileDraft(opposition.id),
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const draftRef = useRef(draft);
  const progressRef = useRef<{
    step: PreparationProfileStep;
    topicId: string | null;
  }>({
    step: stored?.status === "draft" ? stored.currentStep : "opposition",
    topicId: stored?.status === "draft" ? stored.currentTopicId : null,
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCompleteRef = useRef(false);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  async function persist(complete: boolean) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    lastCompleteRef.current = complete;
    if (complete) setSaveState("saving");

    const input = {
      draft: draftRef.current,
      currentStep: progressRef.current.step,
      currentTopicId: progressRef.current.topicId,
      complete,
    };

    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await saveProfile.mutateAsync(input);
        if (complete) {
          setSaveState("saved");
          toast.success("Tu perfil de preparación está listo");
          navigate({ to: "/inicio" });
        } else {
          setSaveState("idle");
        }
        return;
      } catch (error) {
        lastError = error;
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
        }
      }
    }

    if (complete) {
      setSaveState("error");
      toast.error(lastError instanceof Error ? lastError.message : "No se pudo guardar el perfil");
    } else {
      // Draft autosave is deliberately silent. A transient network failure should
      // not interrupt the questionnaire with a large error banner.
      setSaveState("idle");
    }
  }

  function scheduleSave() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => void persist(false), 650);
  }

  function updateDraft(next: PreparationProfileDraft) {
    draftRef.current = next;
    setDraft(next);
    scheduleSave();
  }

  function updateProgress(step: PreparationProfileStep, topicId: string | null) {
    progressRef.current = { step, topicId };
    scheduleSave();
  }

  return (
    <PreparationProfileFlow
      oppositionName={opposition.name}
      topics={topics}
      draft={draft}
      onDraftChange={updateDraft}
      onProgressChange={updateProgress}
      onSave={() => void persist(true)}
      onRetry={() => void persist(lastCompleteRef.current)}
      saveState={saveState}
      resumed={stored?.status === "draft"}
      initialStep={stored?.status === "draft" ? stored.currentStep : "opposition"}
      initialTopicId={stored?.status === "draft" ? stored.currentTopicId : null}
    />
  );
}

function LoadingProfile() {
  return (
    <div className="flex min-h-56 items-center justify-center" role="status">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <span className="sr-only">Cargando perfil de preparación</span>
    </div>
  );
}

function ProfileError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="mt-4 space-y-3 p-5" role="alert">
      <div>
        <h1 className="font-semibold">No hemos podido cargar tu perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tu progreso no se ha modificado. Puedes intentarlo de nuevo.
        </p>
      </div>
      <Button type="button" variant="outline" onClick={onRetry}>
        Reintentar
      </Button>
    </Card>
  );
}