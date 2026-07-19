export type ActiveFailureRow = {
  question_id: string | null;
};

/**
 * Returns stable, unique question ids from the active-failures database view.
 * The view is already unique by user/question; the extra guard keeps test
 * creation safe if malformed or duplicated rows ever reach the client.
 */
export function uniqueActiveFailureIds(rows: ActiveFailureRow[]): string[] {
  return Array.from(
    new Set(
      rows
        .map((row) => row.question_id)
        .filter((questionId): questionId is string => Boolean(questionId)),
    ),
  );
}

/** Keeps only candidates that are still active failures, preserving order. */
export function keepActiveFailureIds(
  candidateIds: string[],
  activeRows: ActiveFailureRow[],
): string[] {
  const activeIds = new Set(uniqueActiveFailureIds(activeRows));
  return Array.from(new Set(candidateIds.filter((id) => activeIds.has(id))));
}
