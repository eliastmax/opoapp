export const AUXILIAR_OPPOSITION_ID = "00000000-0000-4000-8000-000000000001" as const;
export const AUXILIAR_T11_TOPIC_ID = "2200545d-5c23-480b-a994-440c08c843b2" as const;
export const ELI43_PROBE_PACKAGE_ID = "eli43_harmless_probe_v1" as const;
export const ELI42_CLEANUP_PACKAGE_ID = "eli42_t11_oos_cleanup_v1" as const;
export const ELI42_EXECUTE_CONFIRMATION = "ELI42_T11_OOS_CLEANUP_V1" as const;

export type AuxiliarMaintenanceCommand = "probe" | "eli42-preflight" | "eli42-execute";

export type AuxiliarMaintenancePackage = Readonly<{
  package_id: typeof ELI43_PROBE_PACKAGE_ID | typeof ELI42_CLEANUP_PACKAGE_ID;
  mode: "probe" | "preflight" | "execute";
  opposition_id: typeof AUXILIAR_OPPOSITION_ID;
  topic_id?: typeof AUXILIAR_T11_TOPIC_ID;
  confirmation?: typeof ELI42_EXECUTE_CONFIRMATION;
}>;

const FORBIDDEN_CREDENTIAL_ARG = /(?:^|--)(?:jwt|token|password|service[-_]?role|secret)(?:=|$)/i;

export function assertSafeCliArgs(args: readonly string[]): void {
  const credentialArg = args.find((arg) => FORBIDDEN_CREDENTIAL_ARG.test(arg));
  if (credentialArg) {
    throw new Error("Credentials, JWTs and privileged keys are not accepted as CLI arguments.");
  }
}

export function buildMaintenancePackage(command: AuxiliarMaintenanceCommand): AuxiliarMaintenancePackage {
  if (command === "probe") {
    return {
      package_id: ELI43_PROBE_PACKAGE_ID,
      mode: "probe",
      opposition_id: AUXILIAR_OPPOSITION_ID,
    };
  }

  if (command === "eli42-preflight") {
    return {
      package_id: ELI42_CLEANUP_PACKAGE_ID,
      mode: "preflight",
      opposition_id: AUXILIAR_OPPOSITION_ID,
      topic_id: AUXILIAR_T11_TOPIC_ID,
    };
  }

  return {
    package_id: ELI42_CLEANUP_PACKAGE_ID,
    mode: "execute",
    opposition_id: AUXILIAR_OPPOSITION_ID,
    topic_id: AUXILIAR_T11_TOPIC_ID,
    confirmation: ELI42_EXECUTE_CONFIRMATION,
  };
}

export function redactSensitiveText(value: string): string {
  return value
    .replace(/sb_(?:secret|publishable)_[A-Za-z0-9._-]+/g, "[REDACTED_API_KEY]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED_JWT]")
    .replace(/(password|passwd|token|authorization|apikey)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]");
}

export function isMaintenanceCommand(value: string): value is AuxiliarMaintenanceCommand {
  return value === "probe" || value === "eli42-preflight" || value === "eli42-execute";
}
