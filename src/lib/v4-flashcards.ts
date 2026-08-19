export type V4FlashcardRating = "known" | "unsure" | "missed";

export type V4FlashcardSchedule = {
  rating: V4FlashcardRating;
  correct: boolean;
  knownStreakAfter: number;
  delayMinutes: number;
  delayDays: number | null;
};

export const V4_FLASHCARD_RATING_LABELS: Record<V4FlashcardRating, string> = {
  known: "La sabía",
  unsure: "Dudé",
  missed: "No la sabía",
};

const KNOWN_DELAYS_DAYS = [3, 7, 14, 30] as const;

/**
 * Flashcards are a memory aid, not mastery evidence. The schedule is intentionally
 * simple and explainable: known cards expand 3 → 7 → 14 → 30 days, uncertainty
 * returns tomorrow, and a miss is shown again after ten minutes.
 */
export function scheduleV4Flashcard(
  rating: V4FlashcardRating,
  previousKnownStreak = 0,
): V4FlashcardSchedule {
  const safePreviousStreak = Number.isFinite(previousKnownStreak)
    ? Math.max(0, Math.floor(previousKnownStreak))
    : 0;

  if (rating === "missed") {
    return {
      rating,
      correct: false,
      knownStreakAfter: 0,
      delayMinutes: 10,
      delayDays: null,
    };
  }

  if (rating === "unsure") {
    return {
      rating,
      correct: false,
      knownStreakAfter: 0,
      delayMinutes: 24 * 60,
      delayDays: 1,
    };
  }

  const knownStreakAfter = safePreviousStreak + 1;
  const delayDays = KNOWN_DELAYS_DAYS[Math.min(knownStreakAfter - 1, KNOWN_DELAYS_DAYS.length - 1)];

  return {
    rating,
    correct: true,
    knownStreakAfter,
    delayMinutes: delayDays * 24 * 60,
    delayDays,
  };
}
