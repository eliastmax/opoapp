// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { readRecoveryUrlState } from "../recovery-session";

const auth = readFileSync(new URL("../../routes/auth.tsx", import.meta.url), "utf8");
const recovery = readFileSync(new URL("../../routes/password-recovery.tsx", import.meta.url), "utf8");

describe("dedicated password recovery route", () => {
  it("keeps normal authenticated users on the post-auth route", () => {
    expect(auth).toContain("if (data.session)");
    expect(auth).toContain("postAuthRoute(data.session.user.id)");
  });

  it("never runs the normal login redirect on the recovery route", () => {
    expect(recovery).toContain('createFileRoute("/password-recovery")');
    expect(recovery).not.toContain("beforeLoad");
    expect(recovery).not.toContain('to: "/inicio"');
  });

  it("recognizes implicit recovery proof without a query marker", () => {
    expect(readRecoveryUrlState({ hash: "#access_token=token&type=recovery", search: "" })).toEqual({ hasRecoveryProof: true, invalidReason: null });
  });

  it("fails closed for expired and reused links", () => {
    expect(readRecoveryUrlState({ hash: "#error=access_denied&error_code=otp_expired", search: "" })).toEqual({ hasRecoveryProof: false, invalidReason: "otp_expired" });
    expect(readRecoveryUrlState({ hash: "", search: "" }).hasRecoveryProof).toBe(false);
  });

  it("updates the password only after PASSWORD_RECOVERY or recovery proof plus session", () => {
    expect(recovery).toContain('event !== "PASSWORD_RECOVERY"');
    expect(recovery).toContain("data.session && urlState.hasRecoveryProof");
    expect(recovery).toContain("updateUser({ password })");
    expect(recovery).toContain("Enlace no válido o caducado");
  });

  it("preserves signup verification", () => {
    expect(auth).toContain("if (!data.session)");
    expect(auth).toContain("Revisa tu correo");
    expect(auth).toContain("supabase.auth.resend");
  });
});
