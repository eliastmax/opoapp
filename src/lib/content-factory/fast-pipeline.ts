import type { V4StudyContentPackage } from "../v4-content-package";
import { calculateFactoryCoverage, type FactoryCoverageResult } from "./coverage";
import { planDirectedQuestionGeneration } from "./generation-plan";
import { proposePreliminaryConceptMap } from "./analyze-existing-bank";
import { buildContentFactoryPortableOutput } from "./package-builder";
import { auditGeneratedQuestionCandidates } from "./question-quality";
import {
  artifactsAffectedBySubject,
  buildFactoryGovernancePacket,
  classifyFastPipelineExceptions,
  stableFactoryExceptionId,
} from "./exceptions";
import type {
  ContentFactoryJob,
  FactoryGates,
  FactoryGeneratedQuestionCandidate,
  FactoryQuestionAssignment,
  FactoryQuestionMetadata,
  FactoryStudyContent,
  ProposedConcept,
  ProposedStudyUnit,
} from "./types";
import type {
  FactoryArtifactRef,
  FactoryException,
  FactoryFastPipelineInput,
  FactoryFastPipelineOperations,
  FactoryFastPipelineRun,
  FactoryGateDecision,
  FactoryGovernanceDecision,
  FactoryGovernanceDecisions,
  FactoryPhaseResult,
  FactoryRegenerationReport,
  FactoryStructuralDraft,
  FactoryTopicDraft,
} from "./fast-pipeline-types";
import { CONTENT_FACTORY_FAST_PIPELINE_VERSION } from "./fast-pipeline-types";

const DEFAULT_GATES: FactoryGates = {
  conceptMap: { status: "pending" },
  editorialQuality: { status: "pending" },
};

function cloneGates(gates?: FactoryGates): FactoryGates {
  return {
    conceptMap: { ...(gates?.conceptMap ?? DEFAULT_GATES.conceptMap) },
    editorialQuality: { ...(gates?.editorialQuality ?? DEFAULT_GATES.editorialQuality) },
  };
}

function structuralFromPackage(pkg: V4StudyContentPackage): FactoryStructuralDraft {
  return {
    units: pkg.units.map((unit) => ({
      code: unit.code,
      title: unit.title,
      position: unit.position,
      sourceSubtopicName: unit.sourceSubtopicName,
      sourceRefs: unit.sourceRefs,
    })),
    concepts: pkg.concepts.map((concept) => ({ ...concept, confidence: "high" as const })),
    assignments: pkg.questionMappings.map((mapping) => ({ ...mapping, confidence: "high" as const })),
  };
}

function contentFromPackage(pkg: V4StudyContentPackage): FactoryStudyContent {
  return {
    units: pkg.units.map((unit) => ({ ...unit })),
    concepts: pkg.concepts.map((concept) => ({ ...concept, confidence: "high" as const })),
    flashcards: pkg.flashcards.map((card) => ({ ...card })),
  };
}

function candidateMetadata(candidate: FactoryGeneratedQuestionCandidate): FactoryQuestionMetadata {
  const row = candidate.v2;
  const numeric = (value: unknown) => {
    const numberValue = Number(value);
    return Number.isInteger(numberValue) ? numberValue : null;
  };
  return {
    code: String(row.codigo ?? "").trim(),
    active: true,
    stem: String(row.pregunta ?? "").trim(),
    apartado: String(row.apartado ?? "").trim() || null,
    subapartado: String(row.subapartado ?? "").trim() || null,
    conceptLabel: String(row.concepto ?? "").trim() || null,
    learningObjective: String(row.objetivo_aprendizaje ?? "").trim() || null,
    perspective: String(row.perspectiva ?? "").trim() || null,
    trapType: String(row.tipo_trampa ?? "").trim() || null,
    sourceReference: String(row.referencia_fuente ?? "").trim() || null,
    documentReference: String(row.documento_referencia ?? "").trim() || null,
    pageStart: numeric(row.pagina_inicio),
    pageEnd: numeric(row.pagina_fin),
  };
}

function candidateAssignment(candidate: FactoryGeneratedQuestionCandidate): FactoryQuestionAssignment {
  return {
    questionCode: String(candidate.v2.codigo ?? "").trim(),
    primaryConceptCode: candidate.conceptCode,
    confidence: "high",
    rationale: "Generated inside the concept coverage slot by Content Factory.",
  };
}

function coverageWithGenerated(input: {
  job: ContentFactoryJob;
  concepts: ProposedConcept[];
  assignments: FactoryQuestionAssignment[];
  generatedQuestions: FactoryGeneratedQuestionCandidate[];
}): FactoryCoverageResult {
  return calculateFactoryCoverage({
    questions: [
      ...(input.job.existingQuestions ?? []),
      ...input.generatedQuestions.map(candidateMetadata),
    ],
    concepts: input.concepts,
    assignments: [
      ...input.assignments,
      ...input.generatedQuestions.map(candidateAssignment),
    ],
    threshold: input.job.coverageThreshold,
  });
}

function allArtifactRefs(draft: FactoryTopicDraft): FactoryArtifactRef[] {
  return [
    ...draft.units.map((unit) => ({ kind: "unit" as const, id: unit.code })),
    ...draft.concepts.map((concept) => ({ kind: "concept" as const, id: concept.code })),
    ...draft.assignments.map((mapping) => ({ kind: "mapping" as const, id: mapping.questionCode })),
    ...draft.generatedQuestions.map((candidate) => ({
      kind: "question" as const,
      id: String(candidate.v2.codigo ?? "").trim(),
    })),
    ...(draft.content?.flashcards ?? []).map((card) => ({ kind: "flashcard" as const, id: card.code })),
  ];
}

function dedupeArtifacts(artifacts: FactoryArtifactRef[]) {
  const map = new Map<string, FactoryArtifactRef>();
  for (const artifact of artifacts) map.set(`${artifact.kind}:${artifact.id}`, artifact);
  return [...map.values()];
}

function decisionResolvesException(decision: FactoryGovernanceDecision) {
  return decision.resolution !== "reject";
}

function applyGateDecisions(gates: FactoryGates, decisions?: FactoryGateDecision[]) {
  for (const decision of decisions ?? []) {
    gates[decision.gate] = {
      status: decision.status,
      reviewedBy: decision.reviewedBy,
      reviewedAt: decision.reviewedAt,
      notes: decision.notes,
    };
  }
}

function patchConcept(concept: ProposedConcept, patch: Record<string, unknown>) {
  return { ...concept, ...(patch as Partial<ProposedConcept>) };
}

function patchAssignment(assignment: FactoryQuestionAssignment, patch: Record<string, unknown>) {
  return { ...assignment, ...(patch as Partial<FactoryQuestionAssignment>) };
}

function patchUnit(unit: ProposedStudyUnit, patch: Record<string, unknown>) {
  return { ...unit, ...(patch as Partial<ProposedStudyUnit>) };
}

function patchCandidate(candidate: FactoryGeneratedQuestionCandidate, patch: Record<string, unknown>) {
  const candidatePatch = patch as Partial<FactoryGeneratedQuestionCandidate> & { v2?: Record<string, unknown> };
  return {
    ...candidate,
    ...candidatePatch,
    v2: candidatePatch.v2 ? { ...candidate.v2, ...candidatePatch.v2 } : candidate.v2,
  };
}

export function applyFactoryGovernanceDecisions(input: {
  previousRun: FactoryFastPipelineRun;
  decisions: FactoryGovernanceDecisions;
}): {
  gates: FactoryGates;
  draft: FactoryTopicDraft;
  resolvedExceptionIds: string[];
  affectedConceptCodes: string[];
  invalidatedArtifacts: FactoryArtifactRef[];
  decisionIds: string[];
} {
  const gates = cloneGates(input.previousRun.gates);
  applyGateDecisions(gates, input.decisions.gates);

  let units = input.previousRun.draft.units.map((unit) => ({ ...unit }));
  let concepts = input.previousRun.draft.concepts.map((concept) => ({ ...concept }));
  let assignments = input.previousRun.draft.assignments.map((assignment) => ({ ...assignment }));
  let generatedQuestions = input.previousRun.draft.generatedQuestions.map((candidate) => ({
    ...candidate,
    dimensions: [...candidate.dimensions],
    v2: { ...candidate.v2 },
  }));
  let content = input.previousRun.draft.content
    ? {
        units: input.previousRun.draft.content.units.map((unit) => ({ ...unit })),
        concepts: input.previousRun.draft.content.concepts.map((concept) => ({ ...concept })),
        flashcards: input.previousRun.draft.content.flashcards.map((card) => ({ ...card })),
      }
    : null;

  const resolved = new Set(input.previousRun.resolvedExceptionIds);
  const affectedConceptCodes = new Set<string>();
  const invalidatedArtifacts: FactoryArtifactRef[] = [];
  const decisionIds: string[] = [];

  for (const decision of input.decisions.exceptions ?? []) {
    const exception = input.previousRun.exceptionQueue.find((item) => item.id === decision.exceptionId);
    if (!exception) continue;
    decisionIds.push(decision.exceptionId);
    if (decisionResolvesException(decision)) resolved.add(decision.exceptionId);
    if (decision.resolution === "reject") continue;

    invalidatedArtifacts.push(...exception.affectedArtifacts);
    const patch = decision.optionalPatch ?? {};

    if (exception.subject.kind === "concept") {
      const index = concepts.findIndex((concept) => concept.code === exception.subject.id);
      if (index >= 0 && Object.keys(patch).length > 0) concepts[index] = patchConcept(concepts[index], patch);
      affectedConceptCodes.add(exception.subject.id);
    }

    if (exception.subject.kind === "mapping") {
      const index = assignments.findIndex((assignment) => assignment.questionCode === exception.subject.id);
      if (index >= 0) {
        const previousPrimary = assignments[index].primaryConceptCode;
        affectedConceptCodes.add(previousPrimary);
        if (Object.keys(patch).length > 0) assignments[index] = patchAssignment(assignments[index], patch);
        if (!Object.prototype.hasOwnProperty.call(patch, "confidence")) {
          assignments[index] = { ...assignments[index], confidence: "high" };
        }
        affectedConceptCodes.add(assignments[index].primaryConceptCode);
        invalidatedArtifacts.push(
          { kind: "coverage", id: previousPrimary },
          { kind: "coverage", id: assignments[index].primaryConceptCode },
          { kind: "generation_slot", id: previousPrimary },
          { kind: "generation_slot", id: assignments[index].primaryConceptCode },
        );
      }
    }

    if (exception.subject.kind === "unit") {
      const index = units.findIndex((unit) => unit.code === exception.subject.id);
      if (index >= 0 && Object.keys(patch).length > 0) units[index] = patchUnit(units[index], patch);
      for (const concept of concepts.filter((concept) => concept.unitCode === exception.subject.id)) {
        affectedConceptCodes.add(concept.code);
      }
    }

    if (exception.subject.kind === "question") {
      const index = generatedQuestions.findIndex(
        (candidate) => String(candidate.v2.codigo ?? "").trim() === exception.subject.id,
      );
      if (index >= 0) {
        affectedConceptCodes.add(generatedQuestions[index].conceptCode);
        if (Object.keys(patch).length > 0) generatedQuestions[index] = patchCandidate(generatedQuestions[index], patch);
        affectedConceptCodes.add(generatedQuestions[index].conceptCode);
      }
    }
  }

  if (content) {
    const conceptByCode = new Map(concepts.map((concept) => [concept.code, concept]));
    content.concepts = content.concepts.map((concept) => conceptByCode.get(concept.code) ?? concept);
    const unitByCode = new Map(units.map((unit) => [unit.code, unit]));
    content.units = content.units.map((unit) => {
      const structural = unitByCode.get(unit.code);
      return structural ? { ...unit, title: structural.title, position: structural.position } : unit;
    });
  }

  return {
    gates,
    draft: { units, concepts, assignments, content, generatedQuestions },
    resolvedExceptionIds: [...resolved].sort(),
    affectedConceptCodes: [...affectedConceptCodes].sort(),
    invalidatedArtifacts: dedupeArtifacts(invalidatedArtifacts),
    decisionIds,
  };
}

function structuralSeed(input: FactoryFastPipelineInput): FactoryStructuralDraft {
  if (input.previousRun) {
    return {
      units: input.previousRun.draft.units,
      concepts: input.previousRun.draft.concepts,
      assignments: input.previousRun.draft.assignments,
    };
  }
  if (input.draft?.units && input.draft?.concepts && input.draft?.assignments) {
    return {
      units: input.draft.units,
      concepts: input.draft.concepts,
      assignments: input.draft.assignments,
    };
  }
  if (input.existingV4Content) return structuralFromPackage(input.existingV4Content);
  if (input.operations?.buildStructuralDraft) {
    return input.operations.buildStructuralDraft({
      job: input.job,
      existingV4Content: input.existingV4Content,
      approvedAnchors: input.approvedAnchors,
    });
  }
  if (input.job.mode === "existing_bank") {
    const preliminary = proposePreliminaryConceptMap(input.job);
    return {
      units: preliminary.units,
      concepts: preliminary.concepts,
      assignments: preliminary.assignments,
    };
  }
  return { units: [], concepts: [], assignments: [] };
}

function contentSeed(input: FactoryFastPipelineInput, structural: FactoryStructuralDraft): FactoryStudyContent | null {
  if (input.previousRun?.draft.content) return input.previousRun.draft.content;
  if (input.draft?.content) return input.draft.content;
  if (input.existingV4Content) return contentFromPackage(input.existingV4Content);
  if (input.operations?.buildStudyContent) {
    return input.operations.buildStudyContent({
      job: input.job,
      structuralDraft: structural,
      previousContent: null,
    });
  }
  return null;
}

function technicalException(input: {
  job: ContentFactoryJob;
  discriminator: string;
  explanation: string;
  recommendation: string;
}): FactoryException {
  const subject = { kind: "topic", id: `${input.job.oppositionCode}-T${input.job.topicNumber}` } as const;
  return {
    id: stableFactoryExceptionId("coverage_anomaly", subject, input.discriminator),
    type: "coverage_anomaly",
    blocker: true,
    severity: "error",
    confidence: "high",
    subject,
    explanation: input.explanation,
    recommendation: input.recommendation,
    affectedArtifacts: artifactsAffectedBySubject(subject),
  };
}

function decisionTraceFromExceptions(exceptions: FactoryException[]) {
  return exceptions.map((exception) => ({
    id: `trace:${exception.id}`,
    provisional: true,
    confidence: exception.confidence,
    reason: exception.explanation,
    subject: exception.subject,
    affectedArtifacts: exception.affectedArtifacts,
  }));
}

function initialPhases(): FactoryPhaseResult[] {
  return [
    { phase: "ingest", status: "complete" },
    { phase: "analyze", status: "complete" },
    { phase: "structural_draft", status: "complete" },
  ];
}

export function runContentFactoryTopic(input: FactoryFastPipelineInput): FactoryFastPipelineRun {
  const runNumber: 1 | 2 = input.previousRun ? 2 : 1;
  const phases = initialPhases();
  const operations: FactoryFastPipelineOperations = input.operations ?? {};
  const approvedAnchors = input.approvedAnchors ?? input.existingV4Content;
  let gates = cloneGates(input.gates ?? input.previousRun?.gates);
  let structural = structuralSeed(input);
  let content = contentSeed(input, structural);
  let generatedSeed = input.previousRun?.draft.generatedQuestions ?? input.draft?.generatedQuestions ?? [];
  let resolvedExceptionIds = input.previousRun?.resolvedExceptionIds ?? [];
  let affectedConceptCodes: string[] = [];
  let invalidatedArtifacts: FactoryArtifactRef[] = [];
  let decisionIds: string[] = [];

  if (input.previousRun && input.decisions) {
    const applied = applyFactoryGovernanceDecisions({ previousRun: input.previousRun, decisions: input.decisions });
    gates = applied.gates;
    structural = {
      units: applied.draft.units,
      concepts: applied.draft.concepts,
      assignments: applied.draft.assignments,
    };
    content = applied.draft.content;
    generatedSeed = applied.draft.generatedQuestions;
    resolvedExceptionIds = applied.resolvedExceptionIds;
    affectedConceptCodes = applied.affectedConceptCodes;
    invalidatedArtifacts = applied.invalidatedArtifacts;
    decisionIds = applied.decisionIds;
    phases.push({ phase: "apply_decisions", status: "complete" });
  } else if (runNumber === 2) {
    phases.push({ phase: "apply_decisions", status: "skipped", note: "No governance decisions supplied." });
  }

  const extraExceptions: FactoryException[] = [];
  if (structural.units.length === 0 || structural.concepts.length === 0) {
    extraExceptions.push(technicalException({
      job: input.job,
      discriminator: "missing-structural-draft",
      explanation: "No structural draft is available. A pure TypeScript runner cannot infer legal/technical semantics directly from a source file without a canonical-source semantic provider.",
      recommendation: "Provide buildStructuralDraft (greenfield) or an approved/provisional draft, then rerun the same orchestration.",
    }));
  }

  if (!content && operations.buildStudyContent && structural.concepts.length > 0) {
    content = operations.buildStudyContent({
      job: input.job,
      structuralDraft: structural,
      previousContent: null,
      impactedConceptCodes: affectedConceptCodes.length > 0 ? affectedConceptCodes : undefined,
    });
  }
  if (!content) {
    extraExceptions.push(technicalException({
      job: input.job,
      discriminator: "missing-study-content",
      explanation: "The runner has a structural draft but no complete study-content/flashcard artifact to package.",
      recommendation: "Provide buildStudyContent so RUN 1 can continue provisionally instead of stopping at a human gate.",
    }));
  }

  const impacted = new Set(affectedConceptCodes);
  const removedGenerated = runNumber === 2 && impacted.size > 0
    ? generatedSeed.filter((candidate) => impacted.has(candidate.conceptCode))
    : [];
  const preservedGenerated = runNumber === 2 && impacted.size > 0
    ? generatedSeed.filter((candidate) => !impacted.has(candidate.conceptCode))
    : generatedSeed;

  let initialCoverage: FactoryCoverageResult | null = null;
  try {
    initialCoverage = coverageWithGenerated({
      job: input.job,
      concepts: structural.concepts,
      assignments: structural.assignments,
      generatedQuestions: preservedGenerated,
    });
  } catch (error) {
    extraExceptions.push(technicalException({
      job: input.job,
      discriminator: "coverage-calculation",
      explanation: error instanceof Error ? error.message : "Factory coverage calculation failed.",
      recommendation: "Resolve the mapping/source-capacity inconsistency before targeted generation.",
    }));
  }

  const usedQuestionCodes = [
    ...(input.job.existingQuestions ?? []).map((question) => question.code),
    ...preservedGenerated.map((candidate) => String(candidate.v2.codigo ?? "").trim()),
  ];
  const generationSlots = initialCoverage
    ? planDirectedQuestionGeneration({
        coverage: initialCoverage,
        codePrefix: input.job.codePrefix,
        usedQuestionCodes,
        conceptCodes: runNumber === 2 && impacted.size > 0 ? impacted : undefined,
      })
    : [];

  let newlyGenerated: FactoryGeneratedQuestionCandidate[] = [];
  if (generationSlots.length > 0 && operations.generateQuestions) {
    newlyGenerated = operations.generateQuestions({
      job: input.job,
      slots: generationSlots,
      concepts: structural.concepts,
      existingQuestions: input.job.existingQuestions,
      previousGeneratedQuestions: preservedGenerated,
    });
    const expected = new Map(generationSlots.map((slot) => [slot.questionCode, slot.conceptCode]));
    for (const candidate of newlyGenerated) {
      const code = String(candidate.v2.codigo ?? "").trim();
      if (expected.get(code) !== candidate.conceptCode) {
        extraExceptions.push(technicalException({
          job: input.job,
          discriminator: `generation-slot-${code || "missing-code"}`,
          explanation: `${code || "<missing code>"} was generated outside its planned concept slot.`,
          recommendation: "Regenerate the candidate inside the exact stable code/concept slot.",
        }));
      }
    }
  } else if (generationSlots.length > 0) {
    extraExceptions.push(technicalException({
      job: input.job,
      discriminator: "missing-question-generator",
      explanation: `${generationSlots.length} source-supported generation slot(s) remain but no generateQuestions operation was supplied.`,
      recommendation: "Provide a canonical-source question generator; do not fill gaps manually or from external sources.",
    }));
  }

  if (newlyGenerated.length > 0 && operations.hardenQuestions) {
    newlyGenerated = operations.hardenQuestions({
      job: input.job,
      candidates: newlyGenerated,
      concepts: structural.concepts,
    });
  }
  const generatedQuestions = [...preservedGenerated, ...newlyGenerated];
  phases.push({
    phase: "provisional_generation",
    status: generationSlots.length > 0 && newlyGenerated.length < generationSlots.length ? "blocked" : "provisional",
    note: `${generatedQuestions.length} generated question artifact(s); ${generationSlots.length} planned slot(s) in this run.`,
  });

  const questionQa = auditGeneratedQuestionCandidates({
    candidates: generatedQuestions,
    concepts: structural.concepts,
    existingQuestions: input.job.existingQuestions,
    canonicalDocument: input.job.sourcePolicy?.canonicalOnly ? input.job.sourcePolicy.document : undefined,
  });
  phases.push({ phase: "adversarial_qa", status: questionQa.valid ? "complete" : "blocked" });

  let finalCoverage: FactoryCoverageResult | null = null;
  try {
    finalCoverage = coverageWithGenerated({
      job: input.job,
      concepts: structural.concepts,
      assignments: structural.assignments,
      generatedQuestions,
    });
  } catch (error) {
    extraExceptions.push(technicalException({
      job: input.job,
      discriminator: "final-coverage-calculation",
      explanation: error instanceof Error ? error.message : "Final Factory coverage calculation failed.",
      recommendation: "Resolve the mapping/source-capacity inconsistency and rerun only affected artifacts.",
    }));
  }

  let portable = null;
  if (content) {
    const conceptByCode = new Map(structural.concepts.map((concept) => [concept.code, concept]));
    content = {
      ...content,
      concepts: content.concepts.map((concept) => conceptByCode.get(concept.code) ?? concept),
    };
    portable = buildContentFactoryPortableOutput({
      job: input.job,
      gates,
      content,
      assignments: structural.assignments,
      generatedQuestions,
    });
  }

  const exceptionQueue = classifyFastPipelineExceptions({
    job: input.job,
    units: structural.units,
    concepts: structural.concepts,
    assignments: structural.assignments,
    content,
    coverage: finalCoverage,
    questionQa,
    approvedAnchors,
    resolvedExceptionIds,
    extra: extraExceptions,
  });
  phases.push({ phase: "exception_classification", status: "complete" });

  const governancePacket = buildFactoryGovernancePacket({
    job: input.job,
    units: structural.units,
    concepts: structural.concepts,
    assignments: structural.assignments,
    generatedQuestions,
    coverage: finalCoverage,
    exceptions: exceptionQueue,
  });
  phases.push({ phase: "governance_packet", status: "complete" });

  if (runNumber === 2) {
    phases.push({
      phase: "targeted_regeneration",
      status: affectedConceptCodes.length > 0 ? "complete" : "skipped",
      note: affectedConceptCodes.length > 0
        ? `Regenerated scope: ${affectedConceptCodes.join(", ")}.`
        : "No artifact-impacting decision required regeneration.",
    });
  }

  const gateBlockers = [
    ...(gates.conceptMap.status === "approved" ? [] : [`gate:conceptMap:${gates.conceptMap.status}`]),
    ...(gates.editorialQuality.status === "approved" ? [] : [`gate:editorialQuality:${gates.editorialQuality.status}`]),
  ];
  const blockers = [
    ...gateBlockers,
    ...exceptionQueue.filter((exception) => exception.blocker).map((exception) => exception.id),
    ...(portable ? [] : ["portable_output_unavailable"]),
  ];
  const importReady = portable?.importReady === true && blockers.length === 0;
  const hasTechnicalBlocker = extraExceptions.length > 0 || portable?.validation.job.valid === false;
  const readiness = {
    state: importReady
      ? "import_ready" as const
      : hasTechnicalBlocker
        ? "blocked" as const
        : "governance_required" as const,
    importReady,
    blockers,
  };
  phases.push({ phase: "final_validation", status: importReady || !hasTechnicalBlocker ? "complete" : "blocked" });
  phases.push({ phase: "import_ready", status: importReady ? "complete" : "blocked" });

  const draft: FactoryTopicDraft = {
    units: structural.units,
    concepts: structural.concepts,
    assignments: structural.assignments,
    content,
    generatedQuestions,
  };
  const invalidatedKeys = new Set(invalidatedArtifacts.map((artifact) => `${artifact.kind}:${artifact.id}`));
  const preservedArtifacts = allArtifactRefs(input.previousRun?.draft ?? draft).filter(
    (artifact) => !invalidatedKeys.has(`${artifact.kind}:${artifact.id}`),
  );
  const regeneration: FactoryRegenerationReport | null = runNumber === 2
    ? {
        decisionIds,
        affectedConceptCodes,
        invalidatedArtifacts: dedupeArtifacts(invalidatedArtifacts),
        preservedArtifacts,
        recomputedCoverageConceptCodes: affectedConceptCodes,
        removedGeneratedQuestionCodes: removedGenerated.map((candidate) => String(candidate.v2.codigo ?? "").trim()).sort(),
        generatedQuestionCodes: newlyGenerated.map((candidate) => String(candidate.v2.codigo ?? "").trim()).sort(),
      }
    : null;

  const provisional = !importReady;
  return {
    version: CONTENT_FACTORY_FAST_PIPELINE_VERSION,
    runNumber,
    job: input.job,
    gates,
    phases,
    provisional,
    decisionTrace: decisionTraceFromExceptions(exceptionQueue),
    draft,
    initialCoverage,
    finalCoverage,
    generationSlots,
    questionQa,
    portable,
    exceptionQueue,
    governancePacket,
    readiness,
    regeneration,
    resolvedExceptionIds,
  };
}
