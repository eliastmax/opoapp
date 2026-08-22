import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useOppositionAdmin() {
  return useQuery({ queryKey: ["opposition-admin"], queryFn: async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return false;
    const { data: profile } = await supabase.from("profiles").select("active_opposition_id").eq("id", user.user.id).maybeSingle();
    if (!profile?.active_opposition_id) return false;
    const { data, error } = await supabase.from("opposition_admins").select("opposition_id").eq("user_id", user.user.id).eq("opposition_id", profile.active_opposition_id).limit(1);
    if (error) throw error;
    return Boolean(data?.length);
  }, staleTime: 60_000 });
}
