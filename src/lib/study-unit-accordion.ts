export function toggleExclusiveUnit(currentUnitId: string | null, nextUnitId: string) {
  return currentUnitId === nextUnitId ? null : nextUnitId;
}

export function toggleSection(current: boolean) {
  return !current;
}
