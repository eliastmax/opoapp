import type { V4SourceRef, V4StudyContentPackage } from "../v4-content-package";
import type { FactoryCoverageResult } from "./coverage";
import type { FactoryQuestionQualityIssue, FactoryQuestionQualityReport } from "./question-quality";
import type {
  ContentFactoryJob,
  FactoryQuestionAssignment,
  FactoryStudyContent,
  ProposedConcept,
  ProposedStudyUnit,
} from "./types";
import type {
  FactoryArtifactRef,
  FactoryException,
  FactoryExceptionSubject,
  FactoryExceptionType,
  FactoryGovernancePacket,
} from "./fast-pipeline-types";

function stableToken(value: string) {
  return value.trim().toLocaleLowerCase("en").replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
}

export function stableFactoryExceptionId(
  type: FactoryExceptionType,
  subject: FactoryExceptionSubject,
  discriminator = "default",
) {
  return `fx:${type}:${subject.kind}:${stableToken(subject.id)}:${stableToken(discriminator)}`;
}

function dedupeArtifacts(artifacts: FactoryArtifactRef[]) {
  const byKey = new Map<string, FactoryArtifactRef>();
  for (const artifact of artifacts) byKey.set(`${artifact.kind}:${artifact.id}`, artifact);
  return [...byKey.values()];
}

export function artifactsAffectedBySubject(subject: FactoryExceptionSubject): FactoryArtifactRef[] {
  const common: FactoryArtifactRef[] = [
    { kind: "qa", id: "topic" },
    { kind: "v4_package", id: "topic" },
    { kind: "governance_packet", id: "topic" },
  ];
  switch (subject.kind) {
    case "unit":
      return dedupeArtifacts([
        { kind: "unit", id: subject.id },
        { kind: "coverage", id: subject.id },
        ...common,
      ]);
    case "concept":
      return dedupeArtifacts([
        { kind: "concept", id: subject.id },
        { kind: "coverage", id: subject.id },
        { kind: "generation_slot", id: subject.id },
        { kind: "flashcard", id: subject.id },
        ...common,
      ]);
    case "mapping":
      return dedupeArtifacts([
        { kind: "mapping", id: subject.id },
        { kind: "coverage", id: subject.id },
        { kind: "generation_slot", id: subject.id },
        ...common,
      ]);
    case "question":
      return dedupeArtifacts([
        { kind: "question", id: subject.id },
        { kind: "v2_package", id: "topic" },
        ...common,
      ]);
    case "flashcard":
      return dedupeArtifacts([{ kind: "flashcard", id: subject.id }, ...common]);
    default:
      return dedupeArtifacts([{ kind: "topic", id: subject.id }, ...common]);
  }
}

function canonical(value: string) {
  return value.trim().toLocaleLowerCase("es");
}

function refUsesDocument(ref: V4SourceRef, document: string) {
  const needle = canonical(document);
  return canonical(`${ref.label} ${ref.reference}`).includes(needle);
}

function refHasPage(ref: V4SourceRef) {
  if (ref.pageStart != null && Number.isInteger(ref.pageStart) && ref.pageStart > 0) return true;
  return /\bpp?\.?\s*\d+/i.test(ref.reference);
}

function sameJson(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function issueExceptionType(issue: FactoryQuestionQualityIssue): FactoryExceptionType {
  switch (issue.code) {
    case "duplicate_stem":
    case "duplicate_existing_stem":
    case "near_duplicate_stem":
    case "near_duplicate_existing_stem":
      return "near_duplicate";
    case "missing_source":
    case "non_canonical_source":
    case "invalid_pages":
      return "source_traceability";
    case "missing_dimension":
    case "repeated_evidence_dimension":
      return "generation_dimension";
    case "undesired_all_none_option":
    case "gross_length_clue":
    case "duplicate_options":
    case "answer_key_imbalance":
      return "weak_distractor";
    default:
      return "coverage_anomaly";
  }
}

function anchorMaps(packageValue?: V4StudyContentPackage) {
  return {
    units: new Map(packageValue?.units.map((unit) => [unit.code, unit]) ?? []),
    concepts: new Map(packageValue?.concepts.map((concept) => [concept.code, concept]) ?? []),
    mappings: new Map(packageValue?.questionMappings.map((mapping) => [mapping.questionCode, mapping]) ?? []),
    flashcards: new Map(packageValue?.flashcards.map((card) => [card.code, card]) ?? []),
  };
}

function assignmentMatchesAnchor(
  assignment: FactoryQuestionAssignment,
  anchor: ReturnType<typeof anchorMaps>["mappings"],
) {
  const anchored = anchor.get(assignment.questionCode);
  if (!anchored) return false;
  return anchored.primaryConceptCode === assignment.primaryConceptCode &&
    sameJson(anchored.secondaryConceptCodes ?? [], assignment.secondaryConceptCodes ?? []);
}

function conceptMatchesAnchor(concept: ProposedConcept, anchor: ReturnType<typeof anchorMaps>["concepts"]) {
  const anchored = anchor.get(concept.code);
  if (!anchored) return false;
  return anchored.unitCode === concept.unitCode &&
    anchored.title === concept.title &&
    anchored.description === concept.description &&
    anchored.position === concept.position &&
    sameJson(anchored.sourceCapacity ?? null, concept.sourceCapacity?.status === "source_review_required" ? null : concept.sourceCapacity ?? null);
}

function addException(target: Map<string, FactoryException>, exception: FactoryException) {
  if (!target.has(exception.id)) target.set(exception.id, exception);
}

function createException(input: Omit<FactoryException, "id"> & { discriminator?: string }): FactoryException {
  return {
    ...input,
    id: stableFactoryExceptionId(input.type, input.subject, input.discriminator),
  };
}

export function classifyFastPipelineExceptions(input: {
  job: ContentFactoryJob;
  units: ProposedStudyUnit[];
  concepts: ProposedConcept[];
  assignments: FactoryQuestionAssignment[];
  content: FactoryStudyContent | null;
  coverage: FactoryCoverageResult | null;
  questionQa: FactoryQuestionQualityReport | null;
  approvedAnchors?: V4StudyContentPackage;
  resolvedExceptionIds?: Iterable<string>;
  extra?: FactoryException[];
}): FactoryException[] {
  const exceptions = new Map<string, FactoryException>();
  const anchors = anchorMaps(input.approvedAnchors);
  const resolved = new Set(input.resolvedExceptionIds ?? []);

  for (const concept of input.concepts) {
    const anchored = conceptMatchesAnchor(concept, anchors.concepts);
    if (!anchored && (concept.overlapCandidates?.length ?? 0) > 0) {
      const subject = { kind: "concept", id: concept.code } as const;
      addException(exceptions, createException({
        type: "concept_boundary",
        blocker: true,
        severity: "warning",
        confidence: concept.confidence ?? "medium",
        subject,
        explanation: `${concept.code} has possible overlap/boundary candidates: ${(concept.overlapCandidates ?? []).join(", ")}.`,
        recommendation: "Review the split/merge boundary using only the canonical source before production approval.",
        alternatives: concept.overlapCandidates,
        affectedArtifacts: artifactsAffectedBySubject(subject),
      }));
    } else if (!anchored && concept.confidence && concept.confidence !== "high") {
      const subject = { kind: "concept", id: concept.code } as const;
      addException(exceptions, createException({
        type: "concept_boundary",
        blocker: true,
        severity: concept.confidence === "low" ? "error" : "warning",
        confidence: concept.confidence,
        subject,
        explanation: `${concept.code} is provisional with ${concept.confidence} confidence.`,
        recommendation: "Confirm the proposed concept boundary or provide a targeted concept patch.",
        affectedArtifacts: artifactsAffectedBySubject(subject),
        discriminator: "confidence",
      }));
    }

    if (concept.sourceCapacity?.status === "source_review_required" || concept.sourceReviewRequired === true) {
      const subject = { kind: "concept", id: concept.code } as const;
      addException(exceptions, createException({
        type: "source_review_required",
        blocker: true,
        severity: "error",
        confidence: concept.confidence ?? "low",
        subject,
        explanation: concept.sourceCapacity?.status === "source_review_required"
          ? concept.sourceCapacity.reason
          : `${concept.code} is marked source_review_required.`,
        recommendation: "Resolve from the canonical source or leave blocked; never fill externally.",
        affectedArtifacts: artifactsAffectedBySubject(subject),
      }));
    }

    if (concept.sourceCapacity?.status === "source_limited") {
      const anchoredCapacity = anchors.concepts.get(concept.code)?.sourceCapacity;
      const alreadyApproved = anchoredCapacity?.status === "source_limited" &&
        anchoredCapacity.sourceSupportedCeiling === concept.sourceCapacity.sourceSupportedCeiling &&
        anchoredCapacity.reason === concept.sourceCapacity.reason;
      if (!alreadyApproved) {
        const subject = { kind: "concept", id: concept.code } as const;
        addException(exceptions, createException({
          type: "source_limited_candidate",
          blocker: true,
          severity: "warning",
          confidence: concept.confidence ?? "medium",
          subject,
          explanation: `${concept.code} proposes source_limited ceiling ${concept.sourceCapacity.sourceSupportedCeiling}: ${concept.sourceCapacity.reason}`,
          recommendation: "Governance must explicitly accept the source-supported ceiling; do not manufacture questions to reach the nominal threshold.",
          affectedArtifacts: artifactsAffectedBySubject(subject),
        }));
      }
    }
  }

  for (const assignment of input.assignments) {
    const anchored = assignmentMatchesAnchor(assignment, anchors.mappings);
    if (!anchored && assignment.confidence && assignment.confidence !== "high") {
      const subject = { kind: "mapping", id: assignment.questionCode } as const;
      addException(exceptions, createException({
        type: "mapping_ambiguity",
        blocker: true,
        severity: assignment.confidence === "low" ? "error" : "warning",
        confidence: assignment.confidence,
        subject,
        explanation: assignment.rationale || `${assignment.questionCode} has a provisional primary mapping.`,
        recommendation: `Confirm ${assignment.primaryConceptCode} as primary or patch the primary concept.`,
        alternatives: assignment.secondaryConceptCodes,
        affectedArtifacts: artifactsAffectedBySubject(subject),
      }));
    }
  }

  if (input.approvedAnchors) {
    for (const unit of input.content?.units ?? []) {
      const anchored = anchors.units.get(unit.code);
      if (anchored && !sameJson(anchored, unit)) {
        const subject = { kind: "unit", id: unit.code } as const;
        addException(exceptions, createException({
          type: "anchor_conflict",
          blocker: true,
          severity: "error",
          confidence: "low",
          subject,
          explanation: `${unit.code} differs from an approved unit anchor.`,
          recommendation: "Confirm the intentional change or restore the approved anchor.",
          affectedArtifacts: artifactsAffectedBySubject(subject),
        }));
      }
    }
    for (const concept of input.concepts) {
      const anchored = anchors.concepts.get(concept.code);
      if (anchored && !conceptMatchesAnchor(concept, anchors.concepts)) {
        const subject = { kind: "concept", id: concept.code } as const;
        addException(exceptions, createException({
          type: "anchor_conflict",
          blocker: true,
          severity: "error",
          confidence: "low",
          subject,
          explanation: `${concept.code} differs from an approved concept anchor.`,
          recommendation: "Confirm the intentional change or restore the approved anchor.",
          affectedArtifacts: artifactsAffectedBySubject(subject),
        }));
      }
    }
    for (const assignment of input.assignments) {
      const anchored = anchors.mappings.get(assignment.questionCode);
      if (anchored && !assignmentMatchesAnchor(assignment, anchors.mappings)) {
        const subject = { kind: "mapping", id: assignment.questionCode } as const;
        addException(exceptions, createException({
          type: "anchor_conflict",
          blocker: true,
          severity: "error",
          confidence: "low",
          subject,
          explanation: `${assignment.questionCode} mapping conflicts with its approved anchor.`,
          recommendation: "Confirm the remap explicitly; coverage for both old and new concepts must be regenerated.",
          alternatives: [anchored.primaryConceptCode, assignment.primaryConceptCode],
          affectedArtifacts: artifactsAffectedBySubject(subject),
        }));
      }
    }
    for (const card of input.content?.flashcards ?? []) {
      const anchored = anchors.flashcards.get(card.code);
      if (anchored && !sameJson(anchored, card)) {
        const subject = { kind: "flashcard", id: card.code } as const;
        addException(exceptions, createException({
          type: "anchor_conflict",
          blocker: true,
          severity: "error",
          confidence: "low",
          subject,
          explanation: `${card.code} differs from an approved flashcard anchor.`,
          recommendation: "Confirm the targeted card change or restore the approved anchor.",
          affectedArtifacts: artifactsAffectedBySubject(subject),
        }));
      }
    }
  }

  if (input.coverage) {
    for (const row of input.coverage.factoryConceptCoverage) {
      if (row.status === "coverage_gap" && row.actionableMissingPrimaryQuestions > 0) {
        const subject = { kind: "concept", id: row.conceptId } as const;
        addException(exceptions, createException({
          type: "coverage_anomaly",
          blocker: true,
          severity: "error",
          confidence: "high",
          subject,
          explanation: `${row.conceptId} still has ${row.actionableMissingPrimaryQuestions} actionable primary-question gap(s) after provisional generation.`,
          recommendation: "Generate only the remaining source-supported dimensions and rerun QA.",
          affectedArtifacts: artifactsAffectedBySubject(subject),
          discriminator: "actionable-gap",
        }));
      }
    }
    for (const code of input.coverage.mappingQa.unmappedQuestionCodes) {
      const subject = { kind: "mapping", id: code } as const;
      addException(exceptions, createException({
        type: "coverage_anomaly",
        blocker: true,
        severity: "error",
        confidence: "high",
        subject,
        explanation: `${code} has no primary concept.`,
        recommendation: "Assign exactly one primary concept from the approved/provisional map.",
        affectedArtifacts: artifactsAffectedBySubject(subject),
        discriminator: "unmapped",
      }));
    }
    for (const code of input.coverage.mappingQa.duplicatePrimaryQuestionCodes) {
      const subject = { kind: "mapping", id: code } as const;
      addException(exceptions, createException({
        type: "coverage_anomaly",
        blocker: true,
        severity: "error",
        confidence: "high",
        subject,
        explanation: `${code} has multiple primary concepts.`,
        recommendation: "Keep exactly one diagnostic primary; retain other concepts only as secondary when justified.",
        affectedArtifacts: artifactsAffectedBySubject(subject),
        discriminator: "multiple-primary",
      }));
    }
    for (const invalid of input.coverage.mappingQa.invalidConceptMappings) {
      const subject = { kind: "mapping", id: invalid.questionCode } as const;
      addException(exceptions, createException({
        type: "coverage_anomaly",
        blocker: true,
        severity: "error",
        confidence: "high",
        subject,
        explanation: `${invalid.questionCode} maps to unknown concept ${invalid.conceptCode}.`,
        recommendation: "Repair the mapping before package validation.",
        affectedArtifacts: artifactsAffectedBySubject(subject),
        discriminator: `unknown-${invalid.conceptCode}`,
      }));
    }
  }

  for (const issue of input.questionQa?.issues ?? []) {
    const subject = { kind: "question", id: issue.questionCode ?? "batch" } as const;
    const type = issueExceptionType(issue);
    addException(exceptions, createException({
      type,
      blocker: true,
      severity: issue.severity === "error" ? "error" : "warning",
      confidence: issue.severity === "error" ? "low" : "medium",
      subject,
      explanation: issue.message,
      recommendation: issue.severity === "error"
        ? "Correct the candidate from the canonical source and rerun adversarial QA."
        : "Review the heuristic signal; accept it only if the question remains diagnostically strong.",
      alternatives: issue.relatedQuestionCode ? [issue.relatedQuestionCode] : undefined,
      affectedArtifacts: artifactsAffectedBySubject(subject),
      discriminator: issue.code,
    }));
  }

  const canonicalDocument = input.job.sourcePolicy?.canonicalOnly
    ? input.job.sourcePolicy.document.trim()
    : null;
  if (canonicalDocument && input.content) {
    for (const unit of input.content.units) {
      const exactAnchor = sameJson(anchors.units.get(unit.code), unit);
      if (exactAnchor) continue;
      const canonicalRefs = unit.sourceRefs.filter((ref) => refUsesDocument(ref, canonicalDocument));
      if (canonicalRefs.length === 0 || !canonicalRefs.some(refHasPage)) {
        const subject = { kind: "unit", id: unit.code } as const;
        addException(exceptions, createException({
          type: "source_traceability",
          blocker: true,
          severity: "error",
          confidence: "low",
          subject,
          explanation: `${unit.code} lacks complete canonical-source/page traceability to ${canonicalDocument}.`,
          recommendation: "Attach a canonical source reference with page evidence; do not supplement from external sources.",
          affectedArtifacts: artifactsAffectedBySubject(subject),
          discriminator: "unit-source",
        }));
      }
    }
    for (const concept of input.concepts) {
      const exactAnchor = conceptMatchesAnchor(concept, anchors.concepts);
      if (exactAnchor) continue;
      const refs = concept.sourceRefs ?? [];
      const canonicalRefs = refs.filter((ref) => refUsesDocument(ref, canonicalDocument));
      if (canonicalRefs.length === 0 || !canonicalRefs.some(refHasPage)) {
        const subject = { kind: "concept", id: concept.code } as const;
        addException(exceptions, createException({
          type: "source_traceability",
          blocker: true,
          severity: "error",
          confidence: "low",
          subject,
          explanation: `${concept.code} lacks complete canonical-source/page traceability to ${canonicalDocument}.`,
          recommendation: "Trace the concept boundary to the canonical source before production approval.",
          affectedArtifacts: artifactsAffectedBySubject(subject),
          discriminator: "concept-source",
        }));
      }
    }
    for (const card of input.content.flashcards) {
      const exactAnchor = sameJson(anchors.flashcards.get(card.code), card);
      if (exactAnchor) continue;
      const refs = card.sourceRefs ?? [];
      const canonicalRefs = refs.filter((ref) => refUsesDocument(ref, canonicalDocument));
      if (canonicalRefs.length === 0 || !canonicalRefs.some(refHasPage)) {
        const subject = { kind: "flashcard", id: card.code } as const;
        addException(exceptions, createException({
          type: "source_traceability",
          blocker: true,
          severity: "error",
          confidence: "low",
          subject,
          explanation: `${card.code} lacks complete canonical-source/page traceability to ${canonicalDocument}.`,
          recommendation: "Attach canonical source/page evidence before production approval.",
          affectedArtifacts: artifactsAffectedBySubject(subject),
          discriminator: "card-source",
        }));
      }
    }
  }

  for (const extra of input.extra ?? []) addException(exceptions, extra);
  return [...exceptions.values()]
    .filter((exception) => !resolved.has(exception.id))
    .sort((a, b) => Number(b.blocker) - Number(a.blocker) || a.type.localeCompare(b.type) || a.id.localeCompare(b.id));
}

export function buildFactoryGovernancePacket(input: {
  job: ContentFactoryJob;
  units: ProposedStudyUnit[];
  concepts: ProposedConcept[];
  assignments: FactoryQuestionAssignment[];
  generatedQuestions: FactoryGovernancePacket["auditPack"]["generatedQuestions"];
  coverage: FactoryCoverageResult | null;
  exceptions: FactoryException[];
}): FactoryGovernancePacket {
  const exceptionConceptCodes = new Set<string>();
  for (const exception of input.exceptions) {
    if (exception.subject.kind === "concept") exceptionConceptCodes.add(exception.subject.id);
    for (const artifact of exception.affectedArtifacts) {
      if (artifact.kind === "concept") exceptionConceptCodes.add(artifact.id);
    }
  }
  const highConfidenceConceptsWithoutSpecificReview = input.concepts.filter(
    (concept) => (concept.confidence ?? "high") === "high" && !exceptionConceptCodes.has(concept.code),
  ).length;
  const standardReady = input.coverage?.factoryConceptCoverage.filter((row) => row.status === "ready").length ?? 0;
  const sourceLimited = input.coverage?.factoryConceptCoverage.filter((row) => row.status === "source_limited").length ?? 0;
  const sourceReviewRequired = input.coverage?.factoryConceptCoverage.filter((row) => row.status === "source_review_required").length ?? 0;
  const actionableCoverageGaps = input.coverage?.factoryConceptCoverage.filter(
    (row) => row.status === "coverage_gap" && row.actionableMissingPrimaryQuestions > 0,
  ).length ?? 0;

  return {
    title: `${input.job.oppositionCode} · Tema ${input.job.topicNumber}`,
    summary: {
      existingBankQuestions: (input.job.existingQuestions ?? []).filter((question) => question.active !== false).length,
      units: input.units.length,
      concepts: input.concepts.length,
      standardReady,
      sourceLimited,
      sourceReviewRequired,
      actionableCoverageGaps,
      generatedQuestions: input.generatedQuestions.length,
      blockers: input.exceptions.filter((exception) => exception.blocker).length,
      reviewRecommended: input.exceptions.filter((exception) => !exception.blocker).length,
      highConfidenceConceptsWithoutSpecificReview,
    },
    exceptions: input.exceptions,
    auditPack: {
      units: input.units,
      concepts: input.concepts,
      assignments: input.assignments,
      generatedQuestions: input.generatedQuestions,
    },
  };
}

export function renderFactoryGovernancePacketMarkdown(packet: FactoryGovernancePacket) {
  const s = packet.summary;
  const lines = [
    `# ${packet.title}`,
    "",
    `Banco existente: ${s.existingBankQuestions}`,
    `Unidades: ${s.units}`,
    `Conceptos: ${s.concepts}`,
    `Standard ready: ${s.standardReady}`,
    `Source-limited: ${s.sourceLimited}`,
    `Source-review-required: ${s.sourceReviewRequired}`,
    `Coverage gaps accionables: ${s.actionableCoverageGaps}`,
    `Preguntas nuevas: ${s.generatedQuestions}`,
    "",
    "## Excepciones",
    "",
    `- Blockers: ${s.blockers}`,
    `- Review recommended: ${s.reviewRecommended}`,
    `- Conceptos high-confidence sin revisión específica: ${s.highConfidenceConceptsWithoutSpecificReview}`,
  ];
  if (packet.exceptions.length === 0) {
    lines.push("", "Sin excepciones específicas.");
  } else {
    lines.push(
      "",
      ...packet.exceptions.map((exception) =>
        `- **${exception.id}** · ${exception.type} · ${exception.blocker ? "BLOCKER" : "review"} · ${exception.confidence}: ${exception.explanation} Recomendación: ${exception.recommendation}`,
      ),
    );
  }
  lines.push("", "El mapa completo, preguntas y artefactos permanecen disponibles en `auditPack`.");
  return lines.join("\n");
}
