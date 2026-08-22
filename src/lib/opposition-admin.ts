import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export async function requireOppositionAdmin() {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw redirect({ to: "/auth", search: { recovery: false } });
  const { data: profile } = await supabase.from("profiles").select("active_opposition_id").eq("id", user.user.id).maybeSingle();
  if (!profile?.active_opposition_id) throw redirect({ to: "/ajustes", replace: true });
  const { data, error } = await supabase.from("opposition_admins").select("opposition_id").eq("user_id", user.user.id).eq("opposition_id", profile.active_opposition_id).limit(1);
  if (error || !data?.length) throw redirect({ to: "/ajustes", replace: true });
}
