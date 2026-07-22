import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Loader2, LogOut, RotateCcw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/ajustes")({
  component: AjustesPage,
});

function AjustesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.user!.id)
        .maybeSingle();
      return { email: user.user!.email ?? "", nombre: data?.nombre ?? "" };
    },
  });

  async function logout() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function resetStatistics() {
    if (resetting) return;
    setResetting(true);
    const { data, error } = await supabase.rpc("reset_learning_progress");
    if (error) {
      toast.error(error.message);
      setResetting(false);
      return;
    }

    await qc.invalidateQueries();
    const result = data?.[0];
    toast.success(
      result
        ? `Progreso reiniciado: ${result.deleted_tests} tests eliminados`
        : "Progreso reiniciado",
    );
    setResetting(false);
    setConfirmReset(false);
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
      <Card className="space-y-3 border-destructive/15 bg-destructive/5 p-4">
        <div>
          <div className="font-medium">Datos de estudio</div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Borra tests, estadísticas, fallos y dudas para empezar de cero. Tus preguntas se
            conservan.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setConfirmReset(true)}
        >
          <RotateCcw className="h-4 w-4" /> Reiniciar estadísticas
        </Button>
      </Card>
      <Button onClick={logout} variant="outline" className="w-full h-12">
        <LogOut className="w-4 h-4 mr-2" /> Cerrar sesión
      </Button>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reiniciar todas tus estadísticas?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán definitivamente tus tests, progreso, fallos y dudas. La cuenta, las
              materias y todas las preguntas importadas se conservarán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void resetStatistics();
              }}
              disabled={resetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sí, empezar de cero"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
