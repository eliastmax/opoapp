export type RecoveryUrlState = {
  hasRecoveryProof: boolean;
  invalidReason: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  code: string | null;
  tokenHash: string | null;
};

export function readRecoveryUrlState(url: Pick<Location, "hash" | "search">): RecoveryUrlState {
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const search = new URLSearchParams(url.search);
  const value = (key: string) => hash.get(key) ?? search.get(key);
  const invalidReason = value("error_code") ?? value("error");
  const accessToken = value("access_token");
  const refreshToken = value("refresh_token");
  const code = value("code");
  const tokenHash = value("token_hash");
  return {
    hasRecoveryProof:
      (value("type") === "recovery" && Boolean(accessToken) && Boolean(refreshToken)) ||
      (value("type") === "recovery" && Boolean(tokenHash)) ||
      Boolean(code),
    invalidReason,
    accessToken,
    refreshToken,
    code,
    tokenHash,
  };
}
