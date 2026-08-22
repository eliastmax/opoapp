export type ErrorCategory =
  | "invalid_credentials" | "email_unconfirmed" | "already_registered"
  | "invalid_password" | "session_expired" | "rate_limited" | "invalid_recovery"
  | "network" | "empty_pool" | "invalid_opposition" | "incomplete_profile"
  | "unauthorized" | "temporarily_unavailable" | "unknown";

export type UserFacingError = { category: ErrorCategory; message: string; retryable: boolean };

function technical(error: unknown) {
  if (!error || typeof error !== "object") return { message: String(error ?? ""), code: "" };
  const value = error as { message?: string; code?: string; status?: number };
  return { message: value.message ?? "", code: value.code ?? "", status: value.status };
}

export function toUserFacingError(error: unknown): UserFacingError {
  const value = technical(error);
  const text = `${value.code} ${value.message}`.toLowerCase();
  if (/invalid login credentials|invalid_credentials/.test(text)) return { category: "invalid_credentials", message: "El email o la contraseña no son correctos.", retryable: true };
  if (/email not confirmed|email_not_confirmed/.test(text)) return { category: "email_unconfirmed", message: "Confirma tu correo antes de entrar.", retryable: true };
  if (/already registered|user_already_exists|already been registered/.test(text)) return { category: "already_registered", message: "No se ha podido crear la cuenta. Prueba a iniciar sesión o recuperar la contraseña.", retryable: false };
  if (/weak_password|password.*(short|least|characters)|same_password/.test(text)) return { category: "invalid_password", message: "Usa una contraseña nueva de al menos 8 caracteres.", retryable: true };
  if (/rate limit|over_email_send_rate_limit|too many requests|429/.test(text)) return { category: "rate_limited", message: "Has hecho demasiados intentos. Espera un poco y vuelve a probar.", retryable: true };
  if (/otp_expired|invalid.*(token|otp)|token.*(expired|invalid)|flow_state/.test(text)) return { category: "invalid_recovery", message: "El enlace ya no es válido o ha caducado. Solicita uno nuevo.", retryable: false };
  if (/jwt expired|session.*expired|refresh_token|invalid claim|not authenticated/.test(text)) return { category: "session_expired", message: "Tu sesión ha caducado. Vuelve a iniciar sesión.", retryable: false };
  if (/failed to fetch|network|load failed|fetch failed/.test(text)) return { category: "network", message: "No hay conexión con el servicio. Comprueba Internet y reintenta.", retryable: true };
  if (/empty pool|no questions|pool vacío/.test(text)) return { category: "empty_pool", message: "No hay preguntas disponibles para esta selección.", retryable: true };
  if (/active opposition|required opposition|not enrolled|opposition/.test(text)) return { category: "invalid_opposition", message: "La oposición seleccionada no está disponible. Revísala en tu perfil.", retryable: false };
  if (/profile.*(incomplete|required)|preparation.*required/.test(text)) return { category: "incomplete_profile", message: "Completa primero tu perfil de preparación.", retryable: false };
  if (value.status === 401 || value.status === 403 || /42501|permission denied|unauthorized/.test(text)) return { category: "unauthorized", message: "No tienes permiso para realizar esta acción.", retryable: false };
  if (value.status && value.status >= 500) return { category: "temporarily_unavailable", message: "El servicio no está disponible ahora mismo. Reintenta en unos instantes.", retryable: true };
  return { category: "unknown", message: "No se ha podido completar la acción. Reintenta en unos instantes.", retryable: true };
}
