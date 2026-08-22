export type RecoveryUrlState = {
  hasRecoveryProof: boolean;
  invalidReason: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  code: string | null;
};

export function readRecoveryUrlState(url: Pick<Location, "hash" | "search">): RecoveryUrlState {
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const search = new URLSearchParams(url.search);
  const value = (key: string) => hash.get(key) ?? search.get(key);
  const invalidReason = value("error_code") ?? value("error");
  const accessToken = value("access_token");
  const refreshToken = value("refresh_token");
  const code = value("code");
  return {
    hasRecoveryProof:
      (value("type") === "recovery" && Boolean(accessToken) && Boolean(refreshToken)) ||
      Boolean(code),
    invalidReason,
    accessToken,
    refreshToken,
    code,
  };
}
