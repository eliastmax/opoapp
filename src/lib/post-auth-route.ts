import { supabase } from "@/integrations/supabase/client";

export async function postAuthRoute(userId: string): Promise<"/inicio" | "/preparacion"> {
  const profile = await supabase
    .from("profiles")
    .select("active_opposition_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile.data?.active_opposition_id) return "/preparacion";

  const preparation = await supabase
    .from("preparation_profiles")
    .select("status")
    .eq("user_id", userId)
    .eq("opposition_id", profile.data.active_opposition_id)
    .maybeSingle();
  return preparation.data?.status === "completed" ? "/inicio" : "/preparacion";
}
