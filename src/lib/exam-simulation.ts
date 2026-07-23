export const SIMULATION_QUESTION_COUNTS = [30, 50, 100] as const;
export const SIMULATION_DURATIONS = [30, 60, 90, 120] as const;

export function examDeadline(startedAt: string, durationMinutes: number): number {
  return new Date(startedAt).getTime() + durationMinutes * 60_000;
}

export function remainingExamSeconds(
  startedAt: string,
  durationMinutes: number,
  now: number,
): number {
  return Math.max(0, Math.ceil((examDeadline(startedAt, durationMinutes) - now) / 1_000));
}

export function formatExamTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3_600);
  const minutes = Math.floor((safeSeconds % 3_600) / 60);
  const seconds = safeSeconds % 60;
  const minuteSeconds = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
  return hours > 0 ? `${hours}:${minuteSeconds}` : minuteSeconds;
}

export function elapsedExamMinutes(
  startedAt: string,
  finishedAt: string | null,
  durationMinutes: number | null,
): number | null {
  if (!finishedAt || !durationMinutes) return null;
  const elapsed = Math.max(
    0,
    Math.ceil((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 60_000),
  );
  return Math.min(elapsed, durationMinutes);
}
