import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Brain, Check, Eye, Loader2, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import type { V4FlashcardRating } from "@/lib/v4-flashcards";
import { toast } from "sonner";

type FlashcardSearch = { block?: string; session?: string };
export const Route = createFileRoute("/_authenticated/recordar/$unitId")({
  validateSearch: (search: Record<string, unknown>): FlashcardSearch => ({
    block: typeof search.block === "string" ? search.block : undefined,
    session: typeof search.session === "string" ? search.session : undefined,
  }),
  component: FlashcardsPage,
});

function FlashcardsPage() {
  const { unitId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [working, setWorking] = useState(false);
  const {
    data: cards = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["v4-flashcards", unitId],
    queryFn: async () => {
      const result = await supabase.rpc("get_my_v4_flashcard_queue", {
        p_limit: 50,
        p_study_unit_id: unitId,
      });
      if (result.error) throw result.error;
      return result.data ?? [];
    },
  });
  const card = cards[0];
  const total = reviewed + cards.length;

  async function rate(rating: V4FlashcardRating) {
    if (!card) return;
    setWorking(true);
    const result = await supabase.rpc("review_my_v4_flashcard", {
      p_flashcard_id: card.flashcard_id,
      p_rating: rating,
    });
    if (result.error) toast.error(result.error.message);
    else {
      setReviewed((value) => value + 1);
      setRevealed(false);
      await qc.invalidateQueries({ queryKey: ["v4-flashcards", unitId] });
    }
    setWorking(false);
  }

  async function continueJourney() {
    setWorking(true);
    if (search.block) {
      const result = await supabase.rpc("complete_my_v4_daily_block", { p_block_id: search.block });
      if (result.error) {
        toast.error(result.error.message);
        setWorking(false);
        return;
      }
      navigate({ to: "/sesion" });
    } else navigate({ to: "/estudio" });
  }

  if (isLoading)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  if (error)
    return (
      <Card className="mt-10 p-6 text-center">
        <p className="font-bold">No se pudieron cargar las tarjetas</p>
        <Button className="mt-4 w-full" onClick={() => void refetch()}>
          Reintentar
        </Button>
      </Card>
    );
  if (!card)
    return (
      <div className="flex min-h-[70vh] flex-col justify-center">
        <Card className="p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-success/10 text-success">
            <Check className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-xl font-bold">Recuperación terminada</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Has revisado {reviewed} {reviewed === 1 ? "tarjeta" : "tarjetas"}. OpoTest volverá a
            mostrar cada una cuando toque.
          </p>
          <Button
            className="mt-5 h-12 w-full"
            disabled={working}
            onClick={() => void continueJourney()}
          >
            {working && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Siguiente bloque{" "}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Card>
      </div>
    );

  return (
    <div className="space-y-5 pb-5">
      <header className="sticky top-0 z-20 -mx-4 -mt-4 border-b bg-background/94 px-4 pb-3 pt-4 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 h-9 w-9"
            onClick={() => navigate({ to: search.session ? "/sesion" : "/estudio" })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              Recordar · Recuperar
            </p>
            <h1 className="truncate text-lg font-bold">{card.study_unit_title}</h1>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {reviewed + 1}/{Math.max(total, 1)}
          </span>
        </div>
        <Progress value={(reviewed / Math.max(total, 1)) * 100} className="mt-3 h-1.5" />
      </header>
      <p className="text-center text-sm text-muted-foreground">
        Intenta responder antes de dar la vuelta.
      </p>
      <Card className="flex min-h-[20rem] flex-col justify-between border-primary/15 bg-gradient-to-br from-card to-primary/6 p-6 text-center shadow-[0_22px_50px_-35px_oklch(0.3_0.12_250/0.75)]">
        <div>
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Brain className="h-5 w-5" />
          </span>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {card.concept_title}
          </p>
          <h2 className="mt-3 text-xl font-bold leading-relaxed">{card.prompt}</h2>
        </div>
        {revealed ? (
          <div className="mt-6 rounded-2xl border border-primary/15 bg-background/75 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Respuesta</p>
            <p className="mt-2 text-base leading-relaxed">{card.answer}</p>
          </div>
        ) : (
          <Button className="mt-8 h-12 w-full" onClick={() => setRevealed(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Mostrar respuesta
          </Button>
        )}
      </Card>
      {revealed && (
        <div>
          <p className="mb-2 text-center text-xs font-semibold text-muted-foreground">
            ¿La recordabas antes de verla?
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              className="h-14 flex-col gap-1 border-destructive/25 text-destructive"
              disabled={working}
              onClick={() => void rate("missed")}
            >
              <X className="h-4 w-4" />
              <span className="text-xs">No la sabía</span>
            </Button>
            <Button
              variant="outline"
              className="h-14 flex-col gap-1 border-warning/35 text-warning-foreground"
              disabled={working}
              onClick={() => void rate("unsure")}
            >
              <RotateCcw className="h-4 w-4" />
              <span className="text-xs">Dudé</span>
            </Button>
            <Button
              className="h-14 flex-col gap-1"
              disabled={working}
              onClick={() => void rate("known")}
            >
              <Check className="h-4 w-4" />
              <span className="text-xs">La sabía</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
