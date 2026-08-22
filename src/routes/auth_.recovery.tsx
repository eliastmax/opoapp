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

type RecoveryState = "processing" | "confirm" | "valid" | "invalid";

function PasswordRecoveryPage() {
  const navigate = useNavigate();
  // Capture recovery proof before the browser history is cleaned. A token_hash is
  // intentionally NOT verified on mount: email scanners may prefetch this page.
  const urlState = useMemo(() => readRecoveryUrlState(window.location), []);
  const [state, setState] = useState<RecoveryState>(
    urlState.tokenHash ? "confirm" : "processing",
  );
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

      // Once captured in memory, remove recovery credentials from browser history
      // and referrers. For token_hash callbacks this happens before any verification.
      if (urlState.hasRecoveryProof) {
        window.history.replaceState(window.history.state, "", window.location.pathname);
      }

      // Prefetch-safe flow: the email points to our app with the token hash in the
      // fragment. A GET/prefetch can render this page, but only a deliberate user
      // button press below performs the POST verification that consumes the token.
      if (urlState.tokenHash) {
        settle("confirm");
        return;
      }

      // Legacy implicit callback support.
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

      // PKCE callback support.
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

  async function confirmRecovery() {
    if (!urlState.tokenHash || loading) return;
    setLoading(true);
    setMessage(null);
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: urlState.tokenHash,
      type: "recovery",
    });
    setLoading(false);
    if (error) {
      captureTechnicalEvent("auth_error", error, { operation: "verify_password_recovery" });
      setMessage(toUserFacingError(error).message);
      setState("invalid");
      return;
    }
    setState(data.session ? "valid" : "invalid");
  }

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
          ) : state === "confirm" ? (
            <div className="space-y-4 text-center">
              <h2 className="text-xl font-bold">Cambiar contraseña</h2>
              <p className="text-sm text-muted-foreground">
                Por seguridad, confirma que quieres continuar. El enlace no se consume hasta que pulses el botón.
              </p>
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
              <Button className="w-full" disabled={loading} onClick={() => void confirmRecovery()}>
                {loading ? <Loader2 className="animate-spin" /> : "Confirmar y continuar"}
              </Button>
            </div>
          ) : state === "invalid" ? (
            <div className="space-y-4 text-center">
              <h2 className="text-xl font-bold">Enlace no válido o caducado</h2>
              <p className="text-sm text-muted-foreground">
                Solicita un enlace nuevo para cambiar tu contraseña.
              </p>
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
