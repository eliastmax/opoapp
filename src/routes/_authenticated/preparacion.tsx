import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookMarked, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useActiveOpposition } from "@/hooks/use-active-opposition";
import { supabase } from "@/integrations/supabase/client";
import { toUserFacingError } from "@/lib/user-facing-error";

export const Route = createFileRoute("/_authenticated/preparacion")({ component: PreparationPage });

type OppositionOption = { id: string; name: string; description: string | null };

function PreparationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const activeOpposition = useActiveOpposition();
  const [selectingId, setSelectingId] = useState<string | null>(null);
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

  async function choose(opposition: OppositionOption) {
    if (selectingId) return;
    setSelectingId(opposition.id);
    try {
      const userResult = await supabase.auth.getUser();
      if (userResult.error || !userResult.data.user) {
        throw userResult.error ?? new Error("Sesión no válida");
      }
      const userId = userResult.data.user.id;
      const membership = await supabase
        .from("user_oppositions")
        .select("opposition_id")
        .eq("user_id", userId)
        .eq("opposition_id", opposition.id)
        .maybeSingle();
      if (membership.error) throw membership.error;
      if (!membership.data) {
        const enrollment = await supabase
          .from("user_oppositions")
          .insert({ user_id: userId, opposition_id: opposition.id });
        if (enrollment.error) throw enrollment.error;
      }
      const activation = await supabase.rpc("set_active_opposition", {
        p_opposition_id: opposition.id,
      });
      if (activation.error) throw activation.error;
      await queryClient.invalidateQueries();
      navigate({ to: "/inicio", replace: true });
    } catch (error) {
      toast.error(toUserFacingError(error).message);
      setSelectingId(null);
    }
  }

  const loading = activeOpposition.isLoading || oppositions.isLoading;
  const error = activeOpposition.error ?? oppositions.error;
  if (loading) return <LoadingOppositions />;
  if (error) {
    return (
      <Card className="mt-4 space-y-3 p-5" role="alert">
        <div>
          <h1 className="font-semibold">No hemos podido cargar las oposiciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">No se ha cambiado ningún dato. Puedes intentarlo de nuevo.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => { void activeOpposition.refetch(); void oppositions.refetch(); }}>Reintentar</Button>
      </Card>
    );
  }

  const options = oppositions.data ?? [];
  const changing = Boolean(activeOpposition.data);
  return (
    <div className="space-y-4 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Oposición</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{changing ? "Cambiar oposición" : "Elige tu oposición"}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Solo necesitamos saber qué oposición preparas. Tus tests y tu progreso quedan separados por oposición.
        </p>
      </header>

      {options.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">No hay oposiciones disponibles en este momento.</Card>
      ) : (
        <div className="space-y-3" data-tour="opposition-selector">
          {options.map((opposition) => {
            const current = activeOpposition.data?.id === opposition.id;
            const selecting = selectingId === opposition.id;
            return (
              <button
                key={opposition.id}
                type="button"
                disabled={Boolean(selectingId) || current}
                onClick={() => void choose(opposition)}
                className="w-full rounded-2xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent disabled:cursor-default disabled:opacity-70"
              >
                <span className="flex items-start gap-3">
                  <BookMarked className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-semibold leading-snug">
                      {opposition.name}
                      {current ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">Activa</span> : null}
                    </span>
                    {opposition.description ? <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{opposition.description}</span> : null}
                  </span>
                  {selecting ? <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" /> : current ? <Check className="h-5 w-5 shrink-0 text-primary" /> : null}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {changing ? <Button variant="ghost" className="w-full" onClick={() => navigate({ to: "/ajustes" })}>Cancelar</Button> : null}
    </div>
  );
}

function LoadingOppositions() {
  return <div className="flex min-h-56 items-center justify-center" role="status"><Loader2 className="h-6 w-6 animate-spin text-primary" /><span className="sr-only">Cargando oposiciones</span></div>;
}
