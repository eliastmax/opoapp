import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ActiveOpposition } from "@/lib/active-opposition";

export const activeOppositionQueryKey = ["active-opposition"] as const;

export function useActiveOpposition() {
  return useQuery({
    queryKey: activeOppositionQueryKey,
    queryFn: async (): Promise<ActiveOpposition | null> => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw userError ?? new Error("Sesión no válida");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("active_opposition_id")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile?.active_opposition_id) return null;

      const { data: opposition, error: oppositionError } = await supabase
        .from("oppositions")
        .select("id, code, name, description")
        .eq("id", profile.active_opposition_id)
        .eq("published", true)
        .maybeSingle();
      if (oppositionError) throw oppositionError;
      if (!opposition) throw new Error("La oposición activa no está disponible");

      return opposition;
    },
    staleTime: 60_000,
  });
}
