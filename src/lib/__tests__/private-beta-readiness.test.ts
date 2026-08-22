// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { toUserFacingError } from "../user-facing-error";

const auth = readFileSync(new URL("../../routes/auth.tsx", import.meta.url), "utf8");
const recovery = readFileSync(new URL("../../routes/password-recovery.tsx", import.meta.url), "utf8");
const importer = readFileSync(new URL("../../routes/_authenticated/importar.tsx", import.meta.url), "utf8");
const questions = readFileSync(new URL("../../routes/_authenticated/preguntas.tsx", import.meta.url), "utf8");
const settings = readFileSync(new URL("../../routes/_authenticated/ajustes.tsx", import.meta.url), "utf8");

describe("private beta readiness contracts", () => {
  it("translates technical auth failures without leaking their raw message", () => {
    expect(toUserFacingError(new Error("Invalid login credentials")).message).toBe("El email o la contraseña no son correctos.");
    expect(toUserFacingError(new Error("SQL select * from auth.users")).message).not.toContain("SQL");
  });
  it("keeps signup on a verification state when Supabase returns no session", () => {
    expect(auth).toContain("if (!data.session)"); expect(auth).toContain("Revisa tu correo"); expect(auth).toContain("supabase.auth.resend");
  });
  it("provides password recovery and accessible labels", () => {
    expect(auth).toContain("resetPasswordForEmail"); expect(auth).toContain("/password-recovery");
    expect(recovery).toContain('event !== "PASSWORD_RECOVERY"'); expect(recovery).toContain("updateUser({ password })");
    for (const id of ["login-email", "login-password", "signup-name"]) expect(auth).toContain(`id=\"${id}\"`);
    for (const id of ["recovery-new-password", "recovery-confirm-password"]) expect(recovery).toContain(`id=\"${id}\"`);
  });
  it("guards both curator routes and hides the curator CTA for learners", () => {
    expect(importer).toContain("beforeLoad: requireOppositionAdmin"); expect(questions).toContain("beforeLoad: requireOppositionAdmin"); expect(settings).toContain("isAdmin && <Link");
  });
  it("describes shared catalog and private study state accurately", () => {
    expect(settings).toContain("catálogo compartido"); expect(settings).not.toContain("Tus preguntas se");
  });
});
