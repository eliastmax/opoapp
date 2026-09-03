import { supabase } from "@/integrations/supabase/client";

export async function postAuthRoute(userId: string): Promise<"/inicio" | "/preparacion"> {
  const profile = await supabase
    .from("profiles")
    .select("active_opposition_id")
    .eq("id", userId)
    .maybeSingle();

  return profile.data?.active_opposition_id ? "/inicio" : "/preparacion";
}
