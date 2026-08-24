import { useQuery } from "@tanstack/react-query";
import { BookOpen, Brain, KeyRound, Lightbulb, Loader2, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { asTextList } from "@/lib/v4-experience";

type StudyPreview = {
  title: string;
  summary: string;
  keys: string[];
  confusions: string[];
  traps: string[];
  flashcard: { prompt: string; answer: string; conceptTitle: string | null } | null;
};

function normalizedText(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

function excerpt(text: string, max = 120) {
  const clean = normalizedText(text);
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  const stop = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("; "), slice.lastIndexOf(", "));
  return `${slice.slice(0, stop > max * 0.55 ? stop + 1 : max).trim()}…`;
}

function flashcardCompactness(flashcard: { prompt: string; answer: string }) {
  return flashcard.answer.trim().length * 1.35 + flashcard.prompt.trim().length;
}

async function loadStudyPreview(unitId: string): Promise<StudyPreview> {
  const unitResult = await supabase
    .from("study_units")
    .select("id, title, study_summary, exam_keys, confusions, traps")
    .eq("id", unitId)
    .eq("active", true)
    .single();
  if (unitResult.error) throw unitResult.error;

  const conceptsResult = await supabase
    .from("concepts")
    .select("id, title, position")
    .eq("study_unit_id", unitId)
    .eq("active", true)
    .order("position", { ascending: true });
  if (conceptsResult.error) throw conceptsResult.error;

  const concepts = conceptsResult.data ?? [];
  const conceptIds = concepts.map((concept) => concept.id);
  const flashcardsResult =
    conceptIds.length > 0
      ? await supabase
          .from("flashcards")
          .select("id, concept_id, prompt, answer, position")
          .in("concept_id", conceptIds)
          .eq("active", true)
          .order("position", { ascending: true })
          .limit(12)
      : { data: [], error: null };
  if (flashcardsResult.error) throw flashcardsResult.error;

  const flashcards = flashcardsResult.data ?? [];
  const compactFlashcards = flashcards.filter(
    (flashcard) =>
      normalizedText(flashcard.prompt).length <= 135 && normalizedText(flashcard.answer).length <= 220,
  );
  const flashcard = [...(compactFlashcards.length > 0 ? compactFlashcards : flashcards)].sort(
    (a, b) => flashcardCompactness(a) - flashcardCompactness(b),
  )[0] ?? null;
  const conceptTitle = flashcard
    ? concepts.find((concept) => concept.id === flashcard.concept_id)?.title ?? null
    : null;

  return {
    title: unitResult.data.title,
    summary: unitResult.data.study_summary ?? "",
    keys: asTextList(unitResult.data.exam_keys),
    confusions: asTextList(unitResult.data.confusions),
    traps: asTextList(unitResult.data.traps),
    flashcard: flashcard
      ? { prompt: flashcard.prompt, answer: flashcard.answer, conceptTitle }
      : null,
  };
}

function targetForScene(scene: number) {
  if (scene === 1) return "tour-study-understand";
  if (scene === 2) return "tour-study-traps";
  if (scene === 3) return "tour-study-flashcard-question";
  return "tour-study-flashcard-answer";
}

function DemoShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[50] overflow-hidden bg-background">
      <style>{`
        @media (max-width: 899px) {
          [role="dialog"][aria-labelledby="tour-title"] {
            top: auto !important;
            bottom: 12px !important;
            max-height: 42dvh !important;
            overflow-y: auto !important;
          }
        }
        @media (min-width: 900px) {
          [role="dialog"][aria-labelledby="tour-title"] {
            left: auto !important;
            right: 24px !important;
            top: 24px !important;
            max-height: calc(100dvh - 48px) !important;
            overflow-y: auto !important;
          }
        }
        @keyframes tour-flashcard-flip-in {
          0% { transform: rotateY(88deg) scale(.985); opacity: .22; }
          68% { transform: rotateY(-5deg) scale(1.008); opacity: 1; }
          100% { transform: rotateY(0deg) scale(1); opacity: 1; }
        }
      `}</style>
      <div className="mx-auto flex h-[56dvh] w-full max-w-lg flex-col px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] min-[900px]:h-full min-[900px]:min-h-[100dvh] min-[900px]:pb-8">
        <div className="flex shrink-0 items-center justify-center gap-2 text-[14px] font-semibold text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
          Vista del tutorial · tu progreso no cambia
        </div>
        <div className="mt-3 flex min-h-0 flex-1 items-center justify-center">{children}</div>
      </div>
    </div>
  );
}

export function ProductTourStudyDemo({
  unitId,
  scene,
  answerVisible,
}: {
  unitId: string | null;
  scene: number;
  answerVisible: boolean;
}) {
  const query = useQuery({
    queryKey: ["product-tour-study-focus", unitId],
    enabled: Boolean(unitId) && scene > 0,
    staleTime: 5 * 60_000,
    queryFn: () => loadStudyPreview(unitId as string),
  });
  const target = targetForScene(scene);

  if (scene <= 0) return null;

  if (!unitId || query.isLoading) {
    return (
      <DemoShell>
        <Card data-tour={target} className="flex min-h-48 w-full items-center justify-center p-6">
          <div className="text-center">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary motion-reduce:animate-none" />
            <p className="mt-3 text-lg font-semibold">Preparando una unidad real…</p>
          </div>
        </Card>
      </DemoShell>
    );
  }

  if (query.error || !query.data) {
    return (
      <DemoShell>
        <Card data-tour={target} className="w-full p-6 text-center">
          <p className="text-lg font-semibold">Esta vista no ha podido cargarse.</p>
          <p className="mt-2 text-base text-muted-foreground">El tutorial puede continuar sin cambiar tu progreso.</p>
        </Card>
      </DemoShell>
    );
  }

  const data = query.data;

  if (scene === 1) {
    const firstKey = data.keys[0] ?? null;
    return (
      <DemoShell>
        <Card
          data-tour="tour-study-understand"
          className="w-full border-primary/15 bg-gradient-to-br from-card to-primary/5 p-4"
        >
          <div className="flex items-center gap-2 text-primary">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
            <span className="text-[14px] font-bold uppercase tracking-[0.08em]">Idea central</span>
          </div>
          <p className="mt-2.5 text-[16px] leading-[1.45] text-foreground/90">{excerpt(data.summary, 105)}</p>
          {normalizedText(data.summary).length > 105 && (
            <p className="mt-1.5 text-[13px] font-medium text-muted-foreground">
              Al estudiar verás el resumen completo.
            </p>
          )}
          {firstKey && (
            <div className="mt-3 border-t border-border/70 pt-3">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-primary/10 p-1.5 text-primary">
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                </span>
                <p className="text-[15px] font-bold">Clave de examen</p>
              </div>
              <p className="mt-2 text-[15px] leading-[1.4]">{excerpt(firstKey, 92)}</p>
            </div>
          )}
        </Card>
      </DemoShell>
    );
  }

  if (scene === 2) {
    const confusion = data.confusions[0] ?? null;
    const trap = data.traps[0] ?? null;
    return (
      <DemoShell>
        <Card data-tour="tour-study-traps" className="w-full space-y-3 p-4">
          {confusion && (
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-warning/15 p-1.5 text-warning-foreground">
                  <Lightbulb className="h-4 w-4" aria-hidden="true" />
                </span>
                <p className="text-[15px] font-bold">No lo confundas</p>
              </div>
              <p className="mt-2 text-[15px] leading-[1.4]">{excerpt(confusion, 105)}</p>
            </div>
          )}
          {trap && (
            <div className={confusion ? "border-t border-border/70 pt-3" : undefined}>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-destructive/10 p-1.5 text-destructive">
                  <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                </span>
                <p className="text-[15px] font-bold">Trampa frecuente</p>
              </div>
              <p className="mt-2 text-[15px] leading-[1.4]">{excerpt(trap, 105)}</p>
            </div>
          )}
          {!confusion && !trap && (
            <div className="py-3 text-center">
              <ShieldAlert className="mx-auto h-7 w-7 text-primary" aria-hidden="true" />
              <p className="mt-3 text-lg font-semibold">Esta unidad no tiene avisos marcados.</p>
            </div>
          )}
        </Card>
      </DemoShell>
    );
  }

  const showingAnswer = scene >= 4 || answerVisible;

  return (
    <DemoShell>
      {data.flashcard ? (
        <div className="w-full [perspective:1200px]">
          {showingAnswer ? (
            <Card
              key="flashcard-answer"
              data-tour="tour-study-flashcard-answer"
              className="w-full [backface-visibility:hidden] border-primary/15 bg-gradient-to-br from-card to-primary/5 p-4 motion-safe:[animation:tour-flashcard-flip-in_320ms_ease-out_both]"
            >
              <div className="flex items-center gap-2 text-primary">
                <Brain className="h-5 w-5" aria-hidden="true" />
                <p className="text-[14px] font-bold uppercase tracking-[0.08em]">
                  {normalizedText(data.flashcard.answer).length > 205 ? "Respuesta · vista breve" : "Respuesta"}
                </p>
              </div>
              <p className="mt-4 text-[16px] font-medium leading-[1.4] text-foreground">
                {excerpt(data.flashcard.answer, 205)}
              </p>
              {normalizedText(data.flashcard.answer).length > 205 && (
                <p className="mt-3 text-[13px] font-medium leading-[1.35] text-muted-foreground">
                  En Estudio verás la respuesta completa.
                </p>
              )}
            </Card>
          ) : (
            <Card
              key="flashcard-question"
              data-tour="tour-study-flashcard-question"
              className="w-full [backface-visibility:hidden] border-primary/15 bg-gradient-to-br from-card to-primary/5 p-4 motion-safe:[animation:tour-flashcard-flip-in_320ms_ease-out_both]"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Brain className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-bold uppercase tracking-[0.08em] text-primary">Flashcard</p>
                  {data.flashcard.conceptTitle && (
                    <p className="truncate text-[13px] font-semibold text-muted-foreground">
                      {data.flashcard.conceptTitle}
                    </p>
                  )}
                </div>
              </div>
              <p className="mt-4 text-center text-[20px] font-bold leading-[1.35]">
                {excerpt(data.flashcard.prompt, 135)}
              </p>
              <p className="mt-3 text-center text-[15px] font-semibold text-muted-foreground">
                Piensa la respuesta antes de verla.
              </p>
            </Card>
          )}
        </div>
      ) : (
        <Card data-tour={target} className="w-full p-6 text-center">
          <p className="text-lg font-semibold">No hay una flashcard disponible para esta vista.</p>
        </Card>
      )}
    </DemoShell>
  );
}
