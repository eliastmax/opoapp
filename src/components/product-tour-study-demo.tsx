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

function excerpt(text: string, max = 120) {
  const clean = text.trim().replace(/\s+/g, " ");
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  const stop = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("; "), slice.lastIndexOf(", "));
  return `${slice.slice(0, stop > max * 0.55 ? stop + 1 : max).trim()}…`;
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
          .limit(1)
      : { data: [], error: null };
  if (flashcardsResult.error) throw flashcardsResult.error;

  const flashcard = flashcardsResult.data?.[0] ?? null;
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
    <div className="fixed inset-0 z-[50] overflow-y-auto bg-background">
      <style>{`
        @media (max-width: 899px) {
          [role="dialog"][aria-labelledby="tour-title"] {
            top: auto !important;
            bottom: 12px !important;
            max-height: 43dvh !important;
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
      `}</style>
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-4 pb-[48dvh] pt-[calc(env(safe-area-inset-top,0px)+1rem)] min-[900px]:pb-8">
        <div className="flex items-center justify-center gap-2 text-[15px] font-semibold text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
          Vista del tutorial · tu progreso no cambia
        </div>
        <div className="mt-4 flex-1">{children}</div>
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
        <Card data-tour={target} className="mt-8 flex min-h-56 items-center justify-center p-6">
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
        <Card data-tour={target} className="mt-8 p-6 text-center">
          <p className="text-lg font-semibold">Esta vista no ha podido cargarse.</p>
          <p className="mt-2 text-base text-muted-foreground">El tutorial puede continuar sin cambiar tu progreso.</p>
        </Card>
      </DemoShell>
    );
  }

  const data = query.data;

  if (scene === 1) {
    return (
      <DemoShell>
        <div data-tour="tour-study-understand" className="space-y-2.5">
          <Card className="border-primary/15 bg-gradient-to-br from-card to-primary/5 p-5">
            <div className="flex items-center gap-2 text-primary">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
              <span className="text-[15px] font-bold uppercase tracking-[0.08em]">Idea central</span>
            </div>
            <p className="mt-3 text-[17px] leading-[1.55] text-foreground/90">{excerpt(data.summary)}</p>
            {data.summary.trim().length > 120 && (
              <p className="mt-2 text-[15px] font-medium text-muted-foreground">
                Al estudiar verás el resumen completo.
              </p>
            )}
          </Card>
          {data.keys.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <span className="rounded-xl bg-primary/10 p-2 text-primary">
                  <KeyRound className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="text-lg font-bold">Claves de examen</h2>
              </div>
              <ul className="mt-3 space-y-2.5">
                {data.keys.slice(0, 1).map((key, index) => (
                  <li key={`${key}-${index}`} className="flex gap-2.5 text-[16px] leading-[1.45]">
                    <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-primary/70" />
                    <span>{key}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </DemoShell>
    );
  }

  if (scene === 2) {
    const confusions = data.confusions.slice(0, 1);
    const traps = data.traps.slice(0, 1);
    return (
      <DemoShell>
        <div data-tour="tour-study-traps" className="space-y-2.5">
          {confusions.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <span className="rounded-xl bg-warning/15 p-2 text-warning-foreground">
                  <Lightbulb className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="text-lg font-bold">No lo confundas</h2>
              </div>
              <ul className="mt-3 space-y-2.5">
                {confusions.map((item, index) => (
                  <li key={`${item}-${index}`} className="flex gap-2.5 text-[16px] leading-[1.45]">
                    <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-warning" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {traps.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <span className="rounded-xl bg-destructive/10 p-2 text-destructive">
                  <ShieldAlert className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="text-lg font-bold">Trampas frecuentes</h2>
              </div>
              <ul className="mt-3 space-y-2.5">
                {traps.map((item, index) => (
                  <li key={`${item}-${index}`} className="flex gap-2.5 text-[16px] leading-[1.45]">
                    <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-destructive/70" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {(data.confusions.length > confusions.length || data.traps.length > traps.length) && (
            <p className="px-1 text-[15px] font-medium leading-[1.4] text-muted-foreground">
              Dentro de la unidad encontrarás más avisos cuando los haya.
            </p>
          )}
          {confusions.length === 0 && traps.length === 0 && (
            <Card className="p-6 text-center">
              <ShieldAlert className="mx-auto h-7 w-7 text-primary" aria-hidden="true" />
              <p className="mt-3 text-lg font-semibold">Esta unidad no tiene avisos marcados.</p>
            </Card>
          )}
        </div>
      </DemoShell>
    );
  }

  const showingAnswer = scene >= 4 || answerVisible;

  return (
    <DemoShell>
      <Card className="border-primary/15 bg-gradient-to-br from-card to-primary/5 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Brain className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-bold uppercase tracking-[0.08em] text-primary">Flashcard</p>
            {data.flashcard?.conceptTitle && (
              <p className="truncate text-[15px] font-semibold text-muted-foreground">
                {data.flashcard.conceptTitle}
              </p>
            )}
          </div>
        </div>

        {data.flashcard ? (
          showingAnswer ? (
            <>
              <p className="mt-4 text-center text-[15px] font-semibold leading-[1.4] text-muted-foreground">
                {excerpt(data.flashcard.prompt, 90)}
              </p>
              <div
                data-tour="tour-study-flashcard-answer"
                className="mt-4 rounded-2xl border border-primary/15 bg-background/80 p-4 animate-in fade-in-0 zoom-in-95 duration-250 motion-reduce:animate-none"
              >
                <p className="text-[15px] font-bold uppercase tracking-[0.08em] text-primary">Respuesta</p>
                <p className="mt-2 text-[17px] leading-[1.5]">{data.flashcard.answer}</p>
              </div>
            </>
          ) : (
            <div data-tour="tour-study-flashcard-question" className="pt-1">
              <p className="mt-5 text-center text-[21px] font-bold leading-[1.4]">{data.flashcard.prompt}</p>
              <p className="mt-5 text-center text-[16px] font-semibold text-muted-foreground">
                Piensa la respuesta antes de verla.
              </p>
            </div>
          )
        ) : (
          <div data-tour={target}>
            <p className="mt-5 text-lg font-semibold">No hay una flashcard disponible para esta vista.</p>
          </div>
        )}
      </Card>
    </DemoShell>
  );
}
