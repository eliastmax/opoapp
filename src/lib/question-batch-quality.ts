export type AnswerKey = "A" | "B" | "C" | "D";

export type AnswerKeyDistribution = Record<AnswerKey, number>;

export function getAnswerKeyDistribution(keys: readonly AnswerKey[]): AnswerKeyDistribution {
  const counts: AnswerKeyDistribution = { A: 0, B: 0, C: 0, D: 0 };
  for (const key of keys) counts[key] += 1;
  return counts;
}

/**
 * Content-QA guard against answer-position leakage in batches whose options are
 * rendered in stored A/B/C/D order. Small batches are ignored because their
 * distribution is naturally noisy. For batches of 20+ questions, no answer key
 * may exceed 40% of the batch and the spread between the most and least common
 * key may not exceed 25% of the batch (rounded up).
 */
export function hasExtremeAnswerKeyImbalance(keys: readonly AnswerKey[]): boolean {
  if (keys.length < 20) return false;
  const counts = Object.values(getAnswerKeyDistribution(keys));
  const max = Math.max(...counts);
  const min = Math.min(...counts);
  return max > Math.ceil(keys.length * 0.4) || max - min > Math.ceil(keys.length * 0.25);
}
