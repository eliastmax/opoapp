export type RecoveryUrlState = { hasRecoveryProof: boolean; invalidReason: string | null };

export function readRecoveryUrlState(url: Pick<Location, "hash" | "search">): RecoveryUrlState {
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const search = new URLSearchParams(url.search);
  const value = (key: string) => hash.get(key) ?? search.get(key);
  const invalidReason = value("error_code") ?? value("error");
  return {
    hasRecoveryProof: value("type") === "recovery" || Boolean(value("code")),
    invalidReason,
  };
}
