import type { FactoryException } from "./fast-pipeline-types";

function hasConcreteAlternative(exception: FactoryException) {
  return (exception.alternatives ?? []).some((alternative) => alternative.trim().length > 0);
}

/**
 * Governance policy for CONTENT-FACTORY.5.
 *
 * Confidence is descriptive. An exception exists only when a material decision
 * remains. LOW stays blocking. MEDIUM survives only when the exception itself
 * carries a concrete structural/mapping alternative or belongs to a substantive
 * source/anchor/coverage/QA class.
 */
export function isMaterialFactoryException(exception: FactoryException) {
  if (exception.confidence === "low") return true;

  switch (exception.type) {
    case "concept_boundary":
      return hasConcreteAlternative(exception);
    case "mapping_ambiguity":
      return hasConcreteAlternative(exception);
    case "anchor_conflict":
    case "source_traceability":
    case "source_review_required":
    case "source_limited_candidate":
    case "near_duplicate":
    case "weak_distractor":
    case "generation_dimension":
    case "coverage_anomaly":
      return true;
    default:
      return true;
  }
}

export function pruneNonMaterialFactoryExceptions(exceptions: FactoryException[]) {
  return exceptions.filter(isMaterialFactoryException);
}
