// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import {
  AUXILIAR_OPPOSITION_ID,
  AUXILIAR_T11_TOPIC_ID,
  ELI42_CLEANUP_PACKAGE_ID,
  ELI42_EXECUTE_CONFIRMATION,
  ELI43_PROBE_PACKAGE_ID,
  assertSafeCliArgs,
  buildMaintenancePackage,
  redactSensitiveText,
} from "../auxiliar-maintenance-executor";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260824204500_eli43_auxiliar_authenticated_maintenance.sql", import.meta.url),
  "utf8",
);
const cli = readFileSync(new URL("../../cli/eli43-auxiliar-maintenance.ts", import.meta.url), "utf8");

describe("ELI-43 Auxiliar authenticated maintenance executor", () => {
  it("builds only the three operator commands over the closed package allowlist", () => {
    expect(buildMaintenancePackage("probe")).toEqual({
      package_id: ELI43_PROBE_PACKAGE_ID,
      mode: "probe",
      opposition_id: AUXILIAR_OPPOSITION_ID,
    });
    expect(buildMaintenancePackage("eli42-preflight")).toEqual({
      package_id: ELI42_CLEANUP_PACKAGE_ID,
      mode: "preflight",
      opposition_id: AUXILIAR_OPPOSITION_ID,
      topic_id: AUXILIAR_T11_TOPIC_ID,
    });
    expect(buildMaintenancePackage("eli42-execute")).toEqual({
      package_id: ELI42_CLEANUP_PACKAGE_ID,
      mode: "execute",
      opposition_id: AUXILIAR_OPPOSITION_ID,
      topic_id: AUXILIAR_T11_TOPIC_ID,
      confirmation: ELI42_EXECUTE_CONFIRMATION,
    });
  });

  it("refuses credential, JWT and privileged-key CLI arguments", () => {
    for (const arg of ["--password=x", "--jwt=x", "--token=x", "--service-role=x", "--secret=x"]) {
      expect(() => assertSafeCliArgs(["probe", arg])).toThrow();
    }
    expect(() => assertSafeCliArgs(["probe"])).not.toThrow();
  });

  it("redacts API-key, JWT and credential-shaped log content", () => {
    const input = "token=abc eyJabc.def.ghi sb_secret_abcdefghijklmnopqrstuvwxyz password=hunter2";
    const output = redactSensitiveText(input);
    expect(output).not.toContain("abc.def.ghi");
    expect(output).not.toContain("sb_secret_");
    expect(output).not.toContain("hunter2");
    expect(output).toContain("[REDACTED]");
  });

  it("uses a SECURITY INVOKER RPC with real-auth and Auxiliar-admin guards", () => {
    expect(migration).toContain("security invoker");
    expect(migration).toContain("v_user_id uuid := (select auth.uid())");
    expect(migration).toContain("v_active_opposition_id uuid := public.current_active_opposition_id()");
    expect(migration).toContain("current_user <> 'authenticated'");
    expect(migration).toContain("administrator.user_id = v_user_id");
    expect(migration).toContain(`'${AUXILIAR_OPPOSITION_ID}'::uuid`);
    expect(migration).toContain(`'${AUXILIAR_T11_TOPIC_ID}'::uuid`);
  });

  it("keeps the RPC closed to anon/service role and exposes no generic SQL surface", () => {
    expect(migration).toContain(
      "revoke all on function public.execute_auxiliar_maintenance(jsonb) from public, anon, service_role",
    );
    expect(migration).toContain(
      "grant execute on function public.execute_auxiliar_maintenance(jsonb) to authenticated",
    );
    expect(migration).toContain(ELI43_PROBE_PACKAGE_ID);
    expect(migration).toContain(ELI42_CLEANUP_PACKAGE_ID);
    expect(migration).not.toMatch(/execute\s+immediate|p_sql|sql_text|query_text/i);
  });

  it("does not weaken RLS/triggers or reuse the Celador Factory identity", () => {
    expect(migration).not.toMatch(/disable\s+(?:row\s+level\s+security|trigger)/i);
    expect(migration).not.toMatch(/set\s+role|request\.jwt\.claims|service_role\s+key/i);
    expect(migration).not.toContain("factory_catalog_executor");
    expect(migration).not.toContain("00000000-0000-4000-8000-000000000002");
  });

  it("requires exact ELI-42 pre/post state and exact execution confirmation", () => {
    expect(migration).toContain("v_t11_active <> 200");
    expect(migration).toContain("v_oos_active <> 20");
    expect(migration).toContain("v_inscope_primary <> 180");
    expect(migration).toContain(ELI42_EXECUTE_CONFIRMATION);
    expect(migration).toContain("v_t11_active <> 180");
    expect(migration).toContain("v_level_aprendizaje <> 60");
    expect(migration).toContain("v_answer_a <> 45");
    expect(migration).toContain("postcondition mismatch; transaction rolled back");
  });

  it("keeps operator credentials runtime-only and hidden", () => {
    expect(cli).toContain("persistSession: false");
    expect(cli).toContain("autoRefreshToken: false");
    expect(cli).toContain("detectSessionInUrl: false");
    expect(cli).toContain("stdin.setRawMode(true)");
    expect(cli).toContain("signInWithPassword");
    expect(cli).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|service_role/i);
    expect(cli).not.toMatch(/writeFile|appendFile|localStorage|sessionStorage/i);
  });
});
