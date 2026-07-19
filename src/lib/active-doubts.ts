export type ActiveDoubtRow = {
  question_id: string | null;
};

/** Returns stable, unique question ids from the active-doubts database view. */
export function uniqueActiveDoubtIds(rows: ActiveDoubtRow[]): string[] {
  return Array.from(
    new Set(
      rows
        .map((row) => row.question_id)
        .filter((questionId): questionId is string => Boolean(questionId)),
    ),
  );
}

/** Keeps only candidates that are still active doubts, preserving order. */
export function keepActiveDoubtIds(candidateIds: string[], activeRows: ActiveDoubtRow[]): string[] {
  const activeIds = new Set(uniqueActiveDoubtIds(activeRows));
  return Array.from(new Set(candidateIds.filter((id) => activeIds.has(id))));
}
