import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { GraduationCap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { captureTechnicalEvent } from "@/lib/technical-observability";
import { postAuthRoute } from "@/lib/post-auth-route";
import { readRecoveryUrlState } from "@/lib/recovery-session";
import { toUserFacingError } from "@/lib/user-facing-error";

export const Route = createFileRoute("/auth_/recovery")({
  ssr: false,
  component: PasswordRecoveryPage,
});

type RecoveryState = "processing" | "valid" | "invalid";

function PasswordRecoveryPage() {
  const navigate = useNavigate();
  // Read the callback before the lazy Supabase client can consume or clean its URL.
  const urlState = useMemo(() => readRecoveryUrlState(window.location), []);
  const [state, setState] = useState<RecoveryState>("processing");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let active = true;

    const settle = (nextState: RecoveryState) => {
      if (active) setState(nextState);
    };

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") settle(session ? "valid" : "invalid");
    });

    async function consumeRecoveryCallback() {
      if (urlState.invalidReason) {
        settle("invalid");
        return;
      }

      // Once captured in memory, remove credentials from browser history and referrers.
      if (urlState.hasRecoveryProof) {
        window.history.replaceState(window.history.state, "", window.location.pathname);
      }

      if (urlState.accessToken && urlState.refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: urlState.accessToken,
          refresh_token: urlState.refreshToken,
        });
        if (error) {
          captureTechnicalEvent("auth_error", error, { operation: "consume_password_recovery" });
          settle("invalid");
          return;
        }
        settle(data.session ? "valid" : "invalid");
        return;
      }

      if (urlState.code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(urlState.code);
        if (error) {
          captureTechnicalEvent("auth_error", error, {
            operation: "exchange_password_recovery_code",
          });
          settle("invalid");
          return;
        }
        settle(data.session ? "valid" : "invalid");
        return;
      }

      // A normal authenticated session is not recovery authority. A valid callback
      // reaches one of the branches above or emits PASSWORD_RECOVERY.
      settle("invalid");
    }

    void consumeRecoveryCallback();
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [urlState]);

  useEffect(() => {
    if (message) errorRef.current?.focus();
  }, [message]);

  async function updatePassword(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (password.length < 8) return setMessage("La contraseña debe tener al menos 8 caracteres.");
    if (password !== confirmation) return setMessage("Las contraseñas no coinciden.");
    setLoading(true);
    const { data, error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      captureTechnicalEvent("auth_error", error, { operation: "update_password" });
      const translated = toUserFacingError(error);
      setMessage(translated.message);
      if (translated.category === "invalid_recovery" || translated.category === "session_expired")
        setState("invalid");
      return;
    }
    navigate({ to: await postAuthRoute(data.user.id), replace: true });
  }

  async function requestAnotherLink() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">OpoTest SMS</h1>
        </div>
        <Card className="p-5">
          {state === "processing" ? (
            <div className="space-y-3 text-center" role="status">
              <Loader2 className="mx-auto h-6 w-6 animate-spin" />
              <h2 className="text-xl font-bold">Comprobando enlace…</h2>
              <p className="text-sm text-muted-foreground">
                Estamos validando tu recuperación de contraseña.
              </p>
            </div>
          ) : state === "invalid" ? (
            <div className="space-y-4 text-center">
              <h2 className="text-xl font-bold">Enlace no válido o caducado</h2>
              <p className="text-sm text-muted-foreground">
                Solicita un enlace nuevo para cambiar tu contraseña.
              </p>
              <Button className="w-full" onClick={() => void requestAnotherLink()}>
                Solicitar otro enlace
              </Button>
            </div>
          ) : (
            <form onSubmit={updatePassword} className="space-y-4">
              <h2 className="text-xl font-bold">Nueva contraseña</h2>
              <div>
                <Label htmlFor="recovery-new-password">Nueva contraseña</Label>
                <Input
                  id="recovery-new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={password}
                  aria-describedby={message ? "recovery-feedback" : undefined}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="recovery-confirm-password">Confirmar contraseña</Label>
                <Input
                  id="recovery-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={confirmation}
                  aria-describedby={message ? "recovery-feedback" : undefined}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </div>
              {message && (
                <p
                  ref={errorRef}
                  tabIndex={-1}
                  role="alert"
                  id="recovery-feedback"
                  className="text-sm text-destructive"
                >
                  {message}
                </p>
              )}
              <Button className="w-full" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : "Guardar contraseña"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
