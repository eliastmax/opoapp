import type { V4SourceRef } from "../v4-content-package";
import type { ContentFactoryJob, FactoryGates } from "./types";

export type FactoryValidationIssue = {
  code: string;
  message: string;
};

export type FactoryValidationResult = {
  valid: boolean;
  errors: FactoryValidationIssue[];
  warnings: FactoryValidationIssue[];
};

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

export function validateFactoryGates(gates: FactoryGates): FactoryValidationResult {
  const errors: FactoryValidationIssue[] = [];
  if (gates.conceptMap.status !== "approved") {
    errors.push({ code: "gate_1_not_approved", message: "Gate 1 conceptual map approval is required before generation/output." });
  }
  if (gates.editorialQuality.status !== "approved") {
    errors.push({ code: "gate_2_not_approved", message: "Gate 2 editorial quality approval is required before import-ready output." });
  }
  return { valid: errors.length === 0, errors, warnings: [] };
}

export function generationAllowed(gates: FactoryGates) {
  return gates.conceptMap.status === "approved";
}

export function importReadyAllowed(gates: FactoryGates) {
  return gates.conceptMap.status === "approved" && gates.editorialQuality.status === "approved";
}
