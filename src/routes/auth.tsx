import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PreAuthIntro } from "@/components/pre-auth-intro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, Loader2, MailCheck } from "lucide-react";
import { toUserFacingError } from "@/lib/user-facing-error";
import { captureTechnicalEvent } from "@/lib/technical-observability";
import { postAuthRoute } from "@/lib/post-auth-route";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search.mode === "login" || search.mode === "signup" ? search.mode : "intro",
  }),
  beforeLoad: async () => { const { data } = await supabase.auth.getSession(); if (data.session) { const target = await postAuthRoute(data.session.user.id); throw redirect({ to: target }); } },
  component: AuthPage,
});
type View = "intro" | "forms" | "verify" | "forgot";
type AuthTab = "login" | "signup";

function AuthPage() {
  const navigate = useNavigate();
  const { mode } = Route.useSearch();
  const [view, setView] = useState<View>(mode === "intro" ? "intro" : "forms");
  const [authTab, setAuthTab] = useState<AuthTab>(mode === "signup" ? "signup" : "login");
  const [loading, setLoading] = useState(false); const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState(""); const [message, setMessage] = useState<string | null>(null); const [cooldown, setCooldown] = useState(0);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (message) errorRef.current?.focus(); }, [message]);
  useEffect(() => { if (!cooldown) return; const timer = window.setInterval(() => setCooldown((v) => Math.max(0, v - 1)), 1000); return () => clearInterval(timer); }, [cooldown]);
  useEffect(() => { if (mode === "intro") return; setView("forms"); setAuthTab(mode); setMessage(null); }, [mode]);
  function openForms(tab: AuthTab) { void navigate({ to: "/auth", search: { mode: tab }, replace: true }); }
  function fail(operation: string, error: unknown) { captureTechnicalEvent("auth_error", error, { operation }); setMessage(toUserFacingError(error).message); }
  async function login(e: React.FormEvent) { e.preventDefault(); setLoading(true); setMessage(null); const { data, error } = await supabase.auth.signInWithPassword({ email, password }); setLoading(false); if (error) return fail("login", error); navigate({ to: await postAuthRoute(data.user.id) }); }
  async function signup(e: React.FormEvent) { e.preventDefault(); setMessage(null); if (password.length < 8) return setMessage("La contraseña debe tener al menos 8 caracteres."); setLoading(true); const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { nombre }, emailRedirectTo: `${window.location.origin}/auth?mode=login` } }); setLoading(false); if (error) return fail("signup", error); if (!data.session) { setCooldown(60); setView("verify"); return; } navigate({ to: await postAuthRoute(data.user!.id) }); }
  async function resend() { if (cooldown || loading) return; setLoading(true); setMessage(null); const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${window.location.origin}/auth?mode=login` } }); setLoading(false); if (error) return fail("resend_confirmation", error); setCooldown(60); }
  async function requestRecovery(e: React.FormEvent) { e.preventDefault(); setLoading(true); setMessage(null); const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/recovery` }); setLoading(false); if (error) return fail("request_password_recovery", error); setMessage("Si existe una cuenta con ese email, recibirás un enlace para cambiar la contraseña."); }
  const feedback = message && <p ref={errorRef} tabIndex={-1} role="status" id="auth-feedback" className="text-sm text-muted-foreground">{message}</p>;
  if (view === "intro") return <PreAuthIntro onCreateAccount={() => openForms("signup")} onLogin={() => openForms("login")} />;
  return <div className="min-h-screen flex items-center justify-center px-4 py-8"><div className="w-full max-w-md"><div className="text-center mb-6"><div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-3"><GraduationCap className="w-8 h-8" /></div><h1 className="text-2xl font-bold">OpoTest Study</h1></div><Card className="p-5">
    {view === "verify" ? <div className="space-y-4 text-center"><MailCheck className="mx-auto h-10 w-10 text-primary"/><h2 className="text-xl font-bold">Revisa tu correo</h2><p className="text-sm">La cuenta se ha creado. Hemos enviado un enlace a <strong>{email}</strong>. Confírmalo para poder entrar.</p>{feedback}<Button className="w-full" onClick={resend} disabled={loading || cooldown > 0}>{loading ? <Loader2 className="animate-spin"/> : cooldown ? `Reenviar en ${cooldown}s` : "Reenviar correo"}</Button><Button variant="ghost" className="w-full" onClick={() => { setView("forms"); setAuthTab("signup"); setEmail(""); setMessage(null); }}>Cambiar correo / volver</Button></div>
    : view === "forgot" ? <form onSubmit={requestRecovery} className="space-y-4"><h2 className="text-xl font-bold">Recuperar contraseña</h2><p className="text-sm text-muted-foreground">Te enviaremos un enlace seguro para crear una nueva.</p><Field id="recovery-email" label="Email"><Input id="recovery-email" name="email" type="email" autoComplete="email" required value={email} aria-describedby={message ? "auth-feedback" : undefined} onChange={(e) => setEmail(e.target.value)}/></Field>{feedback}<Button className="w-full" disabled={loading}>Enviar enlace</Button><Button type="button" variant="ghost" className="w-full" onClick={() => { setView("forms"); setAuthTab("login"); setMessage(null); }}>Volver</Button></form>
    : <Tabs value={authTab} onValueChange={(value) => { setAuthTab(value as AuthTab); setMessage(null); }}><TabsList className="grid grid-cols-2 w-full mb-4"><TabsTrigger value="login">Entrar</TabsTrigger><TabsTrigger value="signup">Crear cuenta</TabsTrigger></TabsList><TabsContent value="login"><form onSubmit={login} className="space-y-3"><Field id="login-email" label="Email"><Input id="login-email" name="email" type="email" autoComplete="email" required value={email} aria-describedby={message ? "auth-feedback" : undefined} onChange={(e) => setEmail(e.target.value)}/></Field><Field id="login-password" label="Contraseña"><Input id="login-password" type="password" autoComplete="current-password" required value={password} aria-describedby={message ? "auth-feedback" : undefined} onChange={(e) => setPassword(e.target.value)}/></Field>{feedback}<Button className="w-full h-12" disabled={loading}>Entrar</Button><Button type="button" variant="link" className="w-full" onClick={() => { setView("forgot"); setMessage(null); }}>¿Olvidaste tu contraseña?</Button></form></TabsContent><TabsContent value="signup"><form onSubmit={signup} className="space-y-3"><Field id="signup-name" label="Nombre"><Input id="signup-name" name="name" autoComplete="name" required value={nombre} onChange={(e) => setNombre(e.target.value)}/></Field><Field id="signup-email" label="Email"><Input id="signup-email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}/></Field><Field id="signup-password" label="Contraseña"><Input id="signup-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)}/></Field>{feedback}<Button className="w-full h-12" disabled={loading}>Crear cuenta</Button></form></TabsContent></Tabs>}
  </Card></div></div>;
}
function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) { return <div><Label htmlFor={id}>{label}</Label>{children}</div>; }
