export const RECOMMENDED_SESSION_SIZES = [5, 10, 20] as const;

export type RecommendedSessionResult = {
  selected_count: number;
  review_count: number;
  current_topic_count: number;
  weak_count: number;
  retention_new_count: number;
  fallback_count: number;
  current_topic_name: string | null;
};

export function describeRecommendedSession(result: RecommendedSessionResult) {
  const parts = [
    result.review_count > 0 ? `${result.review_count} de repaso` : null,
    result.current_topic_count > 0 ? `${result.current_topic_count} del tema actual` : null,
    result.weak_count > 0 ? `${result.weak_count} de refuerzo` : null,
    result.retention_new_count > 0 ? `${result.retention_new_count} de retención o nuevas` : null,
    result.fallback_count > 0 ? `${result.fallback_count} de variedad` : null,
  ].filter(Boolean);

  return parts.length > 0
    ? `Sesión preparada: ${parts.join(", ")}.`
    : `Sesión preparada con ${result.selected_count} preguntas.`;
}
