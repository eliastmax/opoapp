export type V4SourceLimitedCapacity = {
  status: "source_limited";
  sourceSupportedCeiling: number;
  reason: string;
};

/** Production-safe source capacity metadata. Editorial review states never cross this boundary. */
export type V4SourceCapacity = V4SourceLimitedCapacity;

export type V4SourceCapacityValidation =
  | { valid: true; value: V4SourceLimitedCapacity }
  | { valid: false; error: string };

export function validateV4SourceCapacity(value: unknown): V4SourceCapacityValidation {
  if (!value || typeof value !== "object") {
    return { valid: false, error: "sourceCapacity must be an object." };
  }

  const candidate = value as Partial<V4SourceLimitedCapacity> & { status?: unknown };
  if (candidate.status !== "source_limited") {
    return { valid: false, error: "Only source_limited may be persisted in a V4 package." };
  }
  if (
    !Number.isInteger(candidate.sourceSupportedCeiling) ||
    (candidate.sourceSupportedCeiling ?? 0) < 1 ||
    (candidate.sourceSupportedCeiling ?? 0) > 3
  ) {
    return { valid: false, error: "sourceSupportedCeiling must be an integer from 1 to 3." };
  }
  if (typeof candidate.reason !== "string" || candidate.reason.trim().length === 0) {
    return { valid: false, error: "sourceCapacity.reason must be a non-empty string." };
  }

  return {
    valid: true,
    value: {
      status: "source_limited",
      sourceSupportedCeiling: candidate.sourceSupportedCeiling as number,
      reason: candidate.reason.trim(),
    },
  };
}

export function sourceLimitedRetentionDistinctQuestions(capacity: V4SourceLimitedCapacity) {
  return Math.min(2, capacity.sourceSupportedCeiling);
}
