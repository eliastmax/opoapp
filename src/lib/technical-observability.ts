import { reportLovableError } from "./lovable-error-reporting";
import { toUserFacingError } from "./user-facing-error";

export type TechnicalEvent = "auth_error" | "rpc_error" | "test_answer_save_error" | "unexpected_app_error";

export function captureTechnicalEvent(event: TechnicalEvent, error: unknown, context: { operation: string; oppositionId?: string | null }) {
  const normalized = toUserFacingError(error);
  const safe = {
    event,
    operation: context.operation,
    route: typeof window === "undefined" ? "server" : window.location.pathname,
    error_category: normalized.category,
    release: import.meta.env.VITE_APP_RELEASE || undefined,
    timestamp: new Date().toISOString(),
    authenticated: event === "auth_error" ? "unknown" : true,
    opposition_id: context.oppositionId || undefined,
  };
  console.error(`[${event}]`, safe);
  reportLovableError(error, safe);
}
