import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  KeyRound,
  Lightbulb,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { asTextList, type V4StudyUnitPayload } from "@/lib/v4-experience";
import { toast } from "sonner";

type StudySearch = { block?: string; session?: string; tour?: "preview" };
export const Route = createFileRoute("/_authenticated/estudiar/$unitId")({
  validateSearch: (search: Record<string, unknown>): StudySearch => ({
    block: typeof search.block === "string" ? search.block : undefined,
    session: typeof search.session === "string" ? search.session : undefined,
    tour: search.tour === "preview" ? "preview" : undefined,
  }),
  component: StudyUnitPage,
});

async function loadStudyPreview(unitId: string): Promise<V4StudyUnitPayload> {
  const unitResult = await supabase
    .from("study_units")
    .select(
      "id, code, topic_id, title, position, estimated_minutes, study_summary, exam_keys, confusions, traps, mnemonics, source_refs",
    )
    .eq("id", unitId)
    .eq("active", true)
    .single();
  if (unitResult.error) throw unitResult.error;

  const conceptsResult = await supabase
    .from("concepts")
    .select("id, code, title, description, position")
    .eq("study_unit_id", unitId)
    .eq("active", true)
    .order("position", { ascending: true });
  if (conceptsResult.error) throw conceptsResult.error;

  const conceptIds = (conceptsResult.data ?? []).map((concept) => concept.id);
  const flashcardsResult =
    conceptIds.length > 0
      ? await supabase
          .from("flashcards")
          .select("id, code, concept_id, card_type, prompt, answer, position, source_refs")
          .in("concept_id", conceptIds)
          .eq("active", true)
          .order("position", { ascending: true })
      : { data: [], error: null };
  if (flashcardsResult.error) throw flashcardsResult.error;

  return {
    unit: {
      id: unitResult.data.id,
      code: unitResult.data.code,
      topicId: unitResult.data.topic_id,
      title: unitResult.data.title,
      position: unitResult.data.position,
      estimatedMinutes: unitResult.data.estimated_minutes,
      studySummary: unitResult.data.study_summary,
      examKeys: unitResult.data.exam_keys,
      confusions: unitResult.data.confusions,
      traps: unitResult.data.traps,
      mnemonics: unitResult.data.mnemonics,
      sourceRefs: unitResult.data.source_refs,
    },
    progress: {
      firstOpenedAt: "",
      lastOpenedAt: "",
      completedAt: null,
      completionCount: 0,
    },
    concepts: (conceptsResult.data ?? []).map((concept) => ({
      id: concept.id,
      code: concept.code,
      title: concept.title,
      description: concept.description,
      position: concept.position,
      activePrimaryQuestions: 0,
    })),
    flashcards: (flashcardsResult.data ?? []).map((flashcard) => ({
      id: flashcard.id,
      code: flashcard.code,
      conceptId: flashcard.concept_id,
      cardType: flashcard.card_type,
      prompt: flashcard.prompt,
      answer: flashcard.answer,
      position: flashcard.position,
      sourceRefs: flashcard.source_refs,
    })),
  };
}

function StudyUnitPage() {
  const { unitId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [finishing, setFinishing] = useState(false);
  const previewing = search.tour === "preview";
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["v4-study-unit", unitId, previewing ? "tour-preview" : "normal"],
    queryFn: async () => {
      if (previewing) return loadStudyPreview(unitId);
      const result = await supabase.rpc("open_my_v4_study_unit", { p_study_unit_id: unitId });
      if (result.error) throw result.error;
      return result.data as V4StudyUnitPayload;
    },
  });

  async function completeUnit() {
    if (previewing) return;
    setFinishing(true);
    try {
      const result = await supabase.rpc("complete_my_v4_study_unit", { p_study_unit_id: unitId });
      if (result.error) throw result.error;
      const completion = result.data as { dueFlashcards: number };
      if (completion.dueFlashcards > 0) {
        navigate({ to: "/recordar/$unitId", params: { unitId }, search });
        return;
      }
      if (search.block) {
        const completed = await supabase.rpc("complete_my_v4_daily_block", {
          p_block_id: search.block,
        });
        if (completed.error) throw completed.error;
        navigate({ to: "/sesion" });
      } else navigate({ to: "/estudio" });
    } catch (caught) {
      toast.error((caught as Error).message);
      setFinishing(false);
    }
  }

  if (isLoading) return <CenteredLoading text={previewing ? "Preparando una unidad de ejemplo…" : "Abriendo la unidad…"} />;
  if (error || !data)
    return (
      <Card className="mt-10 p-6 text-center">
        <AlertCircle className="mx-auto h-7 w-7 text-destructive" />
        <h1 className="mt-3 font-bold">No se pudo abrir esta unidad</h1>
        <Button className="mt-4 w-full" onClick={() => void refetch()}>
          Reintentar
        </Button>
      </Card>
    );

  const keys = asTextList(data.unit.examKeys);
  const confusions = asTextList(data.unit.confusions);
  const traps = asTextList(data.unit.traps);
  const mnemonics = asTextList(data.unit.mnemonics);
  const previewFlashcard = data.flashcards[0] ?? null;
  const previewConcept = previewFlashcard
    ? data.concepts.find((concept) => concept.id === previewFlashcard.conceptId) ?? data.concepts[0]
    : data.concepts[0];

  return (
    <article className={`space-y-5 ${previewing ? "pb-8" : "pb-28"}`}>
      <header className="sticky top-0 z-20 -mx-4 -mt-4 border-b bg-background/94 px-4 pb-3 pt-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 h-9 w-9"
            aria-label="Volver"
            onClick={() => navigate({ to: search.session ? "/sesion" : "/estudio" })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              Estudiar · Comprender
            </p>
            <h1 className="truncate text-lg font-bold">{data.unit.title}</h1>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {data.unit.estimatedMinutes} min
          </span>
        </div>
      </header>

      {previewing && (
        <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
          Vista del tutorial · tu progreso no cambia
        </div>
      )}

      <Card
        data-tour="study-summary"
        className="border-primary/15 bg-gradient-to-br from-card to-primary/6 p-5"
      >
        <div className="flex items-center gap-2 text-primary">
          <BookOpen className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-[0.14em]">Idea central</span>
        </div>
        <div className="mt-3 whitespace-pre-line text-[0.98rem] leading-7 text-foreground/90">
          {data.unit.studySummary}
        </div>
      </Card>

      {keys.length > 0 && (
        <StudySection icon={KeyRound} title="Claves de examen" items={keys} tone="primary" />
      )}

      <section>
        <div className="mb-2">
          <h2 className="font-bold">Qué debes distinguir</h2>
          <p className="text-xs text-muted-foreground">
            Los conceptos que después tendrás que recuperar sin mirar.
          </p>
        </div>
        <div className="space-y-2">
          {data.concepts.map((concept) => (
            <Card key={concept.id} className="p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                  {concept.position}
                </span>
                <div>
                  <h3 className="text-sm font-bold">{concept.title}</h3>
                  {concept.description && (
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {concept.description}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {previewing && previewFlashcard && (
        <section data-tour="flashcard-preview" className="scroll-mt-24">
          <div className="mb-2">
            <h2 className="font-bold">Después, recuérdalo</h2>
            <p className="text-xs text-muted-foreground">
              Una flashcard real de esta unidad, abierta solo para enseñarte cómo funciona.
            </p>
          </div>
          <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-card to-primary/6 p-5 shadow-[0_20px_46px_-36px_oklch(0.3_0.12_250/0.7)]">
            <div className="flex items-center gap-2 text-primary">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Brain className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Flashcard</p>
                {previewConcept && <p className="truncate text-xs font-semibold">{previewConcept.title}</p>}
              </div>
            </div>
            <p className="mt-5 text-center text-lg font-bold leading-relaxed">{previewFlashcard.prompt}</p>
            <div className="mt-5 rounded-2xl border border-primary/12 bg-background/75 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-primary">Respuesta</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/90">{previewFlashcard.answer}</p>
            </div>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
              Al estudiar de verdad, primero intentas responder y después compruebas la respuesta.
            </p>
          </Card>
        </section>
      )}

      {confusions.length > 0 && (
        <StudySection icon={Lightbulb} title="No lo confundas" items={confusions} tone="warning" />
      )}
      {traps.length > 0 && (
        <StudySection icon={ShieldAlert} title="Trampas frecuentes" items={traps} tone="danger" />
      )}
      {mnemonics.length > 0 && (
        <StudySection
          icon={CheckCircle2}
          title="Para recordarlo"
          items={mnemonics}
          tone="success"
        />
      )}

      {!previewing && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/94 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-3 backdrop-blur-xl">
          <div className="mx-auto max-w-md">
            <Button className="h-12 w-full" onClick={() => void completeUnit()} disabled={finishing}>
              {finishing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              He terminado de estudiar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
              Ahora intentarás recordarlo sin mirar.
            </p>
          </div>
        </div>
      )}
    </article>
  );
}

function StudySection({
  icon: Icon,
  title,
  items,
  tone,
}: {
  icon: React.ElementType;
  title: string;
  items: string[];
  tone: "primary" | "warning" | "danger" | "success";
}) {
  const styles = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/15 text-warning-foreground",
    danger: "bg-destructive/10 text-destructive",
    success: "bg-success/10 text-success",
  }[tone];
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <span className={`rounded-lg p-2 ${styles}`}>
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-bold">{title}</h2>
      </div>
      <ul className="mt-3 space-y-2.5">
        {items.map((item, index) => (
          <li
            key={`${item}-${index}`}
            className="flex gap-2.5 text-sm leading-relaxed text-foreground/85"
          >
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
            {item}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CenteredLoading({ text }: { text: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
