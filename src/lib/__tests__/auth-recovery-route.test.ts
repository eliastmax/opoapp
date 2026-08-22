// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { readRecoveryUrlState } from "../recovery-session";

const auth = readFileSync(new URL("../../routes/auth.tsx", import.meta.url), "utf8");
const recovery = readFileSync(new URL("../../routes/auth_.recovery.tsx", import.meta.url), "utf8");
const routeTree = readFileSync(new URL("../../routeTree.gen.ts", import.meta.url), "utf8");

describe("dedicated password recovery route", () => {
  it("keeps normal authenticated users on the post-auth route", () => {
    expect(auth).toContain("if (data.session)");
    expect(auth).toContain("postAuthRoute(data.session.user.id)");
  });

  it("never runs the normal login redirect on the recovery route", () => {
    expect(recovery).toContain('createFileRoute("/auth_/recovery")');
    expect(recovery).not.toContain("beforeLoad");
    expect(recovery).not.toContain('to: "/inicio"');
    expect(routeTree).toContain("path: '/auth/recovery'");
    expect(routeTree).toContain("getParentRoute: () => rootRouteImport");
  });

  it("recognizes implicit recovery proof without a query marker", () => {
    expect(
      readRecoveryUrlState({
        hash: "#access_token=access&refresh_token=refresh&type=recovery",
        search: "",
      }),
    ).toEqual({
      hasRecoveryProof: true,
      invalidReason: null,
      accessToken: "access",
      refreshToken: "refresh",
      code: null,
    });
    expect(readRecoveryUrlState({ hash: "", search: "?code=pkce-code" }).hasRecoveryProof).toBe(
      true,
    );
  });

  it("fails closed for expired and reused links", () => {
    expect(
      readRecoveryUrlState({ hash: "#error=access_denied&error_code=otp_expired", search: "" }),
    ).toEqual({
      hasRecoveryProof: false,
      invalidReason: "otp_expired",
      accessToken: null,
      refreshToken: null,
      code: null,
    });
    expect(readRecoveryUrlState({ hash: "", search: "" }).hasRecoveryProof).toBe(false);
  });

  it("consumes the callback before deciding whether recovery is invalid", () => {
    expect(recovery).toContain('event === "PASSWORD_RECOVERY"');
    expect(recovery).toContain("supabase.auth.setSession");
    expect(recovery).toContain("supabase.auth.exchangeCodeForSession");
    expect(recovery).not.toContain("supabase.auth.getSession");
    expect(recovery).toContain("updateUser({ password })");
    expect(recovery).toContain("Enlace no válido o caducado");
  });

  it("preserves signup verification", () => {
    expect(auth).toContain("if (!data.session)");
    expect(auth).toContain("Revisa tu correo");
    expect(auth).toContain("supabase.auth.resend");
  });
});
