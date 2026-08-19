import type { V4SourceRef } from "../v4-content-package";
import type { ContentFactoryJob, FactoryGateStatus, FactoryGates } from "./types";

export type FactoryValidationIssue = {
  code: string;
  message: string;
};

export type FactoryValidationResult = {
  valid: boolean;
  errors: FactoryValidationIssue[];
  warnings: FactoryValidationIssue[];
};

export type FactoryPipelineState = {
  structural: FactoryValidationResult;
  generation: {
    allowed: boolean;
    blockers: FactoryValidationIssue[];
  };
  importReadiness: {
    ready: boolean;
    blockers: FactoryValidationIssue[];
  };
};

const GATE_STATUSES = new Set<FactoryGateStatus>(["pending", "approved", "rejected"]);

function validSourceRef(source: V4SourceRef) {
  if (!source.label.trim() || !source.reference.trim()) return false;
  if (source.pageStart != null && (!Number.isInteger(source.pageStart) || source.pageStart < 1)) return false;
  if (source.pageEnd != null && (!Number.isInteger(source.pageEnd) || source.pageEnd < 1)) return false;
  return !(source.pageStart != null && source.pageEnd != null && source.pageEnd < source.pageStart);
}

export function validateContentFactoryJob(job: ContentFactoryJob): FactoryValidationResult {
  const errors: FactoryValidationIssue[] = [];
  const warnings: FactoryValidationIssue[] = [];
  if (job.version !== "1.0") errors.push({ code: "invalid_version", message: "Unsupported Content Factory job version." });
  if (!job.oppositionCode.trim()) errors.push({ code: "missing_opposition", message: "oppositionCode is required." });
  if (!Number.isInteger(job.topicNumber) || job.topicNumber < 1) errors.push({ code: "invalid_topic", message: "topicNumber must be positive." });
  if (!job.codePrefix.trim()) errors.push({ code: "missing_code_prefix", message: "codePrefix is required." });
  if (job.source.length === 0 || job.source.some((source) => !validSourceRef(source))) {
    errors.push({ code: "invalid_source", message: "At least one valid source reference is required." });
  }
  if (job.coverageThreshold != null && (!Number.isInteger(job.coverageThreshold) || job.coverageThreshold < 1)) {
    errors.push({ code: "invalid_threshold", message: "coverageThreshold must be a positive integer." });
  }
  if (job.mode === "existing_bank" && (job.existingQuestions?.length ?? 0) === 0) {
    warnings.push({ code: "empty_existing_bank", message: "existing_bank has no questions to analyze." });
  }
  if (job.mode === "greenfield" && (job.existingQuestions?.length ?? 0) > 0) {
    warnings.push({ code: "greenfield_with_questions", message: "greenfield normally starts without existing questions." });
  }
  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Distinguishes three different questions that were previously conflated:
 * whether the gate object is structurally legitimate, whether generation may
 * proceed, and whether an otherwise valid package is allowed to become import-ready.
 *
 * A normal editorial work-in-progress such as Gate 1 approved + Gate 2 pending is
 * structurally valid and generation-enabled; it is simply not import-ready yet.
 */
export function evaluateFactoryPipelineState(gates: FactoryGates): FactoryPipelineState {
  const structuralErrors: FactoryValidationIssue[] = [];
  const conceptMapStatus = gates.conceptMap?.status as FactoryGateStatus | undefined;
  const editorialQualityStatus = gates.editorialQuality?.status as FactoryGateStatus | undefined;

  if (!conceptMapStatus || !GATE_STATUSES.has(conceptMapStatus)) {
    structuralErrors.push({ code: "invalid_gate_1_status", message: "Gate 1 has an unsupported status." });
  }
  if (!editorialQualityStatus || !GATE_STATUSES.has(editorialQualityStatus)) {
    structuralErrors.push({ code: "invalid_gate_2_status", message: "Gate 2 has an unsupported status." });
  }

  const generationBlockers: FactoryValidationIssue[] = [];
  if (conceptMapStatus === "pending") {
    generationBlockers.push({ code: "gate_1_pending", message: "Gate 1 conceptual map approval is required before generation." });
  } else if (conceptMapStatus === "rejected") {
    generationBlockers.push({ code: "gate_1_rejected", message: "Gate 1 conceptual map was rejected and must be revised before generation." });
  } else if (conceptMapStatus !== "approved") {
    generationBlockers.push({ code: "gate_1_invalid", message: "Gate 1 conceptual map status is invalid." });
  }

  const importBlockers = [...generationBlockers];
  if (editorialQualityStatus === "pending") {
    importBlockers.push({ code: "gate_2_pending", message: "Gate 2 editorial quality approval is required before import-ready output." });
  } else if (editorialQualityStatus === "rejected") {
    importBlockers.push({ code: "gate_2_rejected", message: "Gate 2 editorial quality was rejected and must be revised before import-ready output." });
  } else if (editorialQualityStatus !== "approved") {
    importBlockers.push({ code: "gate_2_invalid", message: "Gate 2 editorial quality status is invalid." });
  }

  const structurallyValid = structuralErrors.length === 0;
  return {
    structural: { valid: structurallyValid, errors: structuralErrors, warnings: [] },
    generation: {
      allowed: structurallyValid && generationBlockers.length === 0,
      blockers: generationBlockers,
    },
    importReadiness: {
      ready: structurallyValid && importBlockers.length === 0,
      blockers: importBlockers,
    },
  };
}

/** @deprecated Prefer evaluateFactoryPipelineState() so pending gates are not confused with invalid structure. */
export function validateFactoryGates(gates: FactoryGates): FactoryValidationResult {
  return evaluateFactoryPipelineState(gates).structural;
}

export function generationAllowed(gates: FactoryGates) {
  return evaluateFactoryPipelineState(gates).generation.allowed;
}

export function importReadyAllowed(gates: FactoryGates) {
  return evaluateFactoryPipelineState(gates).importReadiness.ready;
}
