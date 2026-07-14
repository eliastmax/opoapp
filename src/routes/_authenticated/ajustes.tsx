import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Database } from "lucide-react";

export const Route = createFileRoute("/_authenticated/ajustes")({
  component: AjustesPage,
});

function AjustesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      const { data } = await supabase.from("profiles").select("*").eq("id", user.user!.id).maybeSingle();
      return { email: user.user!.email ?? "", nombre: data?.nombre ?? "" };
    },
  });

  async function logout() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="space-y-4">
      <header className="pt-2">
        <h1 className="text-2xl font-bold">Ajustes</h1>
      </header>
      <Card className="p-4">
        <div className="text-xs uppercase text-muted-foreground font-medium mb-1">Cuenta</div>
        <div className="text-base font-medium">{profile?.nombre || "—"}</div>
        <div className="text-sm text-muted-foreground">{profile?.email}</div>
      </Card>
      <Link to="/preguntas">
        <Card className="p-4 flex items-center gap-3 hover:bg-accent/50 transition-colors">
          <Database className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <div className="font-medium">Administrar preguntas</div>
            <div className="text-xs text-muted-foreground">Editar y desactivar</div>
          </div>
        </Card>
      </Link>
      <Button onClick={logout} variant="outline" className="w-full h-12">
        <LogOut className="w-4 h-4 mr-2" /> Cerrar sesión
      </Button>
    </div>
  );
}
