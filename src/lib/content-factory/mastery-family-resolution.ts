import type { V4SourceRef, V4StudyContentPackage } from "../v4-content-package";
import { normalizeText } from "../similarity";
import { stableConceptCode, stableUnitCode } from "./codes";
import { artifactsAffectedBySubject, stableFactoryExceptionId } from "./exceptions";
import type { FactoryException, FactoryStructuralDraft } from "./fast-pipeline-types";
import type {
  SemanticConceptProposal,
  SemanticConceptStudyScaffold,
  SemanticMappingProposal,
  SemanticProposalMeta,
  SemanticSourceSpan,
  SemanticTopicDraft,
  SemanticUnitProposal,
} from "./semantic-draft";
import type {
  ContentFactoryJob,
  FactoryEvidenceDimension,
  FactoryProposalConfidence,
  FactoryQuestionAssignment,
  FactoryQuestionMetadata,
  ProposedConcept,
  ProposedStudyUnit,
} from "./types";

export const CONTENT_FACTORY_MASTERY_FAMILY_VERSION = "1.0" as const;

/**
 * QUESTION FACET: local V2 descriptors for the particular way a question probes knowledge.
 * They are evidence for semantic resolution, never canonical mastery identity by themselves.
 */
export type FactoryQuestionFacet = {
  questionCode: string;
  conceptLabel: string | null;
  learningObjective: string | null;
  perspective: string | null;
  trapType: string | null;
  pedagogicalLevel: string | null;
};

/**
 * SOURCE SCOPE: canonical candidate space used to bound semantic work.
 * Shared article/subpart/span narrows the search but never proves concept identity.
 */
export type FactorySourceScope = {
  unitCode: string;
  unitTitle: string;
  sections: string[];
  articles: string[];
  pageStart: number | null;
  pageEnd: number | null;
  sourceRefs: V4SourceRef[];
};

export type ConceptFamilyPacketQuestion = FactoryQuestionFacet & {
  stem: string | null;
  sourceReference: string | null;
  documentReference: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  apartado: string | null;
  subapartado: string | null;
};

export type ConceptFamilyRawClusterHint = {
  conceptCode: string;
  questionCodes: string[];
  confidence: FactoryProposalConfidence;
};

/**
 * Factory-generated work packet. It deliberately contains no proposed mastery map.
 * A semantic operation must resolve families from canonical text + included V2 facets.
 */
export type ConceptFamilyResolutionWorkPacket = {
  kind: "concept_family_resolution";
  packetId: string;
  unit: { code: string; title: string; position: number };
  sourceScope: FactorySourceScope;
  canonicalSourceText: string;
  sourceSpans: SemanticSourceSpan[];
  questions: ConceptFamilyPacketQuestion[];
  rawClusterHints: ConceptFamilyRawClusterHint[];
  constraints: string[];
};

/** MASTERY CONCEPT semantic output produced by the agent operation. */
export type MasteryFamilySemanticOutput = {
  provisionalFamilyId: string;
  title: string;
  masteryStatement: string;
  questionCodes: string[];
  sourceRefs: V4SourceRef[];
  includedFacets: string[];
  excludedNearbyFamilyReason: string;
  confidence: FactoryProposalConfidence;
  rationale: string;
};

export type MasteryFamilyBoundaryGuard = {
  type: "overmerge" | "undermerge";
  familyIds: string[];
  questionCodes: string[];
  explanation: string;
  proposal: string;
};

export type ConceptFamilyResolutionOperationResult = {
  families: MasteryFamilySemanticOutput[];
  guards?: MasteryFamilyBoundaryGuard[];
};

export type MasteryFamilyValidationIssue = {
  code:
    | "duplicate_family_id"
    | "missing_family_field"
    | "unknown_question"
    | "lost_question"
    | "multiple_primary"
    | "source_leakage"
    | "missing_source_trace"
    | "unit_incoherence"
    | "invalid_guard"
    | "anchor_conflict";
  message: string;
  packetId?: string;
  familyId?: string;
  questionCode?: string;
};

export type ResolvedMasteryFamily = MasteryFamilySemanticOutput & {
  code: string;
  unitCode: string;
  position: number;
  packetId: string;
};

export type MasteryFamilyValidationReport = {
  valid: boolean;
  issues: MasteryFamilyValidationIssue[];
  families: ResolvedMasteryFamily[];
  mappings: FactoryQuestionAssignment[];
  units: ProposedStudyUnit[];
  guards: MasteryFamilyBoundaryGuard[];
  overmergeGuards: MasteryFamilyBoundaryGuard[];
  undermergeGuards: MasteryFamilyBoundaryGuard[];
  questionCount: number;
  mappedQuestionCount: number;
  multiplePrimaryCount: number;
  lostQuestionCount: number;
};

export type MasteryFamilyResolutionRun = {
  version: typeof CONTENT_FACTORY_MASTERY_FAMILY_VERSION;
  mode: "semantic_resolution" | "approved_replay";
  packets: ConceptFamilyResolutionWorkPacket[];
  operationCount: number;
  validation: MasteryFamilyValidationReport | null;
  semanticDraft: SemanticTopicDraft | null;
  approvedStructure: V4StudyContentPackage | null;
};

function clean(value?: string | null) {
  const result = value?.trim();
  return result ? result : null;
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function sourceRef(span: SemanticSourceSpan): V4SourceRef {
  return {
    label: span.document,
    reference: clean(span.reference) ?? [span.document, clean(span.article), clean(span.heading)].filter(Boolean).join(", "),
    pageStart: span.pageStart ?? null,
    pageEnd: span.pageEnd ?? null,
  };
}

function refKey(ref: V4SourceRef) {
  return `${normalizeText(ref.label)}|${normalizeText(ref.reference)}|${ref.pageStart ?? ""}|${ref.pageEnd ?? ""}`;
}

function spansOverlapQuestion(question: FactoryQuestionMetadata, span: SemanticSourceSpan) {
  const qStart = question.pageStart ?? question.pageEnd;
  const qEnd = question.pageEnd ?? question.pageStart;
  const sStart = span.pageStart ?? span.pageEnd;
  const sEnd = span.pageEnd ?? span.pageStart;
  if (qStart == null || qEnd == null || sStart == null || sEnd == null) return false;
  return qStart <= sEnd && sStart <= qEnd;
}

function canonicalQuestion(question: FactoryQuestionMetadata, document: string) {
  const explicit = clean(question.documentReference);
  return explicit == null || normalizeText(explicit) === normalizeText(document);
}

function unitTitle(question: FactoryQuestionMetadata, fallback: string) {
  return clean(question.apartado) ?? clean(question.subapartado) ?? fallback;
}

function firstQuestionCode(questions: FactoryQuestionMetadata[], title: string, fallback: string) {
  return questions
    .filter((question) => unitTitle(question, fallback) === title)
    .map((question) => question.code)
    .sort((a, b) => a.localeCompare(b, "es"))[0] ?? title;
}

function sectionsOf(spans: SemanticSourceSpan[]) {
  return unique(spans.flatMap((span) => [clean(span.heading), ...(span.sectionPath ?? []).map(clean)].filter((item): item is string => item != null)));
}

function articlesOf(spans: SemanticSourceSpan[]) {
  return unique(spans.map((span) => clean(span.article)).filter((item): item is string => item != null));
}

function pageBounds(spans: SemanticSourceSpan[]) {
  const starts = spans.flatMap((span) => span.pageStart == null ? [] : [span.pageStart]);
  const ends = spans.flatMap((span) => span.pageEnd == null ? [] : [span.pageEnd]);
  return {
    pageStart: starts.length > 0 ? Math.min(...starts) : null,
    pageEnd: ends.length > 0 ? Math.max(...ends) : null,
  };
}

function questionPacketRow(question: FactoryQuestionMetadata): ConceptFamilyPacketQuestion {
  return {
    questionCode: question.code,
    stem: clean(question.stem),
    conceptLabel: clean(question.conceptLabel),
    learningObjective: clean(question.learningObjective),
    perspective: clean(question.perspective),
    trapType: clean(question.trapType),
    pedagogicalLevel: clean(question.pedagogicalLevel),
    sourceReference: clean(question.sourceReference),
    documentReference: clean(question.documentReference),
    pageStart: question.pageStart ?? null,
    pageEnd: question.pageEnd ?? null,
    apartado: clean(question.apartado),
    subapartado: clean(question.subapartado),
  };
}

function rawHintsForPacket(rawDraft: SemanticTopicDraft | undefined, questionCodes: Set<string>) {
  if (!rawDraft) return [];
  return rawDraft.conceptProposals
    .map((proposal): ConceptFamilyRawClusterHint | null => {
      const matched = proposal.meta.affectedQuestionCodes.filter((code) => questionCodes.has(code));
      if (matched.length === 0) return null;
      return {
        conceptCode: proposal.concept.code,
        questionCodes: [...matched].sort((a, b) => a.localeCompare(b, "es")),
        confidence: proposal.meta.confidence,
      };
    })
    .filter((hint): hint is ConceptFamilyRawClusterHint => hint !== null);
}

/**
 * Builds one semantic candidate-space packet per source-backed study unit. The unit is a
 * manageable scope, not a mastery answer: the operation may split one article or combine
 * adjacent articles when the canonical text supports one teachable nucleus.
 */
export function buildConceptFamilyResolutionPackets(input: {
  job: ContentFactoryJob;
  canonicalSource: SemanticSourceSpan[];
  existingQuestions?: FactoryQuestionMetadata[];
  rawDraft?: SemanticTopicDraft;
}): ConceptFamilyResolutionWorkPacket[] {
  const questions = (input.existingQuestions ?? input.job.existingQuestions ?? [])
    .filter((question) => question.active !== false)
    .filter((question) => canonicalQuestion(question, input.job.sourcePolicy?.document ?? input.canonicalSource[0]?.document ?? ""))
    .sort((a, b) => a.code.localeCompare(b.code, "es"));
  const fallback = input.job.topicTitle?.trim() || `Tema ${input.job.topicNumber}`;
  const titles = unique(questions.map((question) => unitTitle(question, fallback)))
    .sort((left, right) => firstQuestionCode(questions, left, fallback).localeCompare(firstQuestionCode(questions, right, fallback), "es"));

  return titles.map((title, index) => {
    const unitQuestions = questions.filter((question) => unitTitle(question, fallback) === title);
    const spans = input.canonicalSource
      .filter((span) => unitQuestions.some((question) => spansOverlapQuestion(question, span)))
      .sort((a, b) => (a.pageStart ?? Number.MAX_SAFE_INTEGER) - (b.pageStart ?? Number.MAX_SAFE_INTEGER) || a.id.localeCompare(b.id, "es"));
    const refs = [...new Map(spans.map((span) => [refKey(sourceRef(span)), sourceRef(span)])).values()];
    const bounds = pageBounds(spans);
    const unitCode = stableUnitCode(input.job.codePrefix, index + 1);
    const questionCodes = new Set(unitQuestions.map((question) => question.code));
    return {
      kind: "concept_family_resolution" as const,
      packetId: `${input.job.codePrefix}-FAMILY-P${String(index + 1).padStart(2, "0")}`,
      unit: { code: unitCode, title, position: index + 1 },
      sourceScope: {
        unitCode,
        unitTitle: title,
        sections: sectionsOf(spans),
        articles: articlesOf(spans),
        pageStart: bounds.pageStart,
        pageEnd: bounds.pageEnd,
        sourceRefs: refs,
      },
      canonicalSourceText: spans.map((span) => clean(span.text)).filter((text): text is string => text != null).join("\n\n"),
      sourceSpans: spans,
      questions: unitQuestions.map(questionPacketRow),
      rawClusterHints: rawHintsForPacket(input.rawDraft, questionCodes),
      constraints: [
        "QUESTION FACET fields describe how one question probes knowledge; they are not mastery identity.",
        "SOURCE SCOPE fields bound candidate space; same article, subpart or span is not concept identity.",
        "Group different perspectives only when they test the same teachable and retainable mastery nucleus.",
        "Split when answering one group requires learning materially additional canonical content.",
        "Use only canonicalSourceText, sourceSpans and V2 metadata included in this packet.",
      ],
    };
  });
}

function familyMinimumQuestionCode(family: MasteryFamilySemanticOutput) {
  return [...family.questionCodes].sort((a, b) => a.localeCompare(b, "es"))[0] ?? family.provisionalFamilyId;
}

function issue(input: MasteryFamilyValidationIssue) {
  return input;
}

function guardIsValid(guard: MasteryFamilyBoundaryGuard, knownFamilies: Set<string>, knownQuestions: Set<string>) {
  if (!guard.explanation.trim() || !guard.proposal.trim()) return false;
  if (guard.type === "overmerge" && guard.familyIds.length !== 1) return false;
  if (guard.type === "undermerge" && guard.familyIds.length < 2) return false;
  if (guard.familyIds.some((familyId) => !knownFamilies.has(familyId))) return false;
  if (guard.questionCodes.length === 0 || guard.questionCodes.some((code) => !knownQuestions.has(code))) return false;
  return true;
}

/**
 * Deterministic post-semantic validation. It validates the agent's family resolution;
 * it does not recreate the semantic map lexically.
 */
export function validateMasteryFamilyResolution(input: {
  job: ContentFactoryJob;
  packets: ConceptFamilyResolutionWorkPacket[];
  operationResults: ConceptFamilyResolutionOperationResult[];
  approvedStructure?: V4StudyContentPackage;
}): MasteryFamilyValidationReport {
  const issues: MasteryFamilyValidationIssue[] = [];
  const familyRows: Array<{ packet: ConceptFamilyResolutionWorkPacket; family: MasteryFamilySemanticOutput }> = [];
  const guards: MasteryFamilyBoundaryGuard[] = [];
  const familyIds = new Set<string>();

  input.packets.forEach((packet, packetIndex) => {
    const result = input.operationResults[packetIndex] ?? { families: [] };
    for (const family of result.families) {
      if (familyIds.has(family.provisionalFamilyId)) {
        issues.push(issue({ code: "duplicate_family_id", packetId: packet.packetId, familyId: family.provisionalFamilyId, message: `Duplicate family id ${family.provisionalFamilyId}.` }));
      }
      familyIds.add(family.provisionalFamilyId);
      if (!family.provisionalFamilyId.trim() || !family.title.trim() || !family.masteryStatement.trim() || !family.rationale.trim() || !family.excludedNearbyFamilyReason.trim() || family.questionCodes.length === 0) {
        issues.push(issue({ code: "missing_family_field", packetId: packet.packetId, familyId: family.provisionalFamilyId, message: "Mastery family output is missing a required semantic field." }));
      }
      familyRows.push({ packet, family });
    }
    guards.push(...(result.guards ?? []));
  });

  const knownQuestions = new Set(input.packets.flatMap((packet) => packet.questions.map((question) => question.questionCode)));
  const ownership = new Map<string, string[]>();
  const packetByFamily = new Map(familyRows.map(({ packet, family }) => [family.provisionalFamilyId, packet]));

  for (const { packet, family } of familyRows) {
    const allowedQuestions = new Set(packet.questions.map((question) => question.questionCode));
    const allowedRefs = new Set(packet.sourceScope.sourceRefs.map(refKey));
    if (family.sourceRefs.length === 0) {
      issues.push(issue({ code: "missing_source_trace", packetId: packet.packetId, familyId: family.provisionalFamilyId, message: `${family.provisionalFamilyId} has no canonical source refs.` }));
    }
    if (family.sourceRefs.some((ref) => !allowedRefs.has(refKey(ref)))) {
      issues.push(issue({ code: "source_leakage", packetId: packet.packetId, familyId: family.provisionalFamilyId, message: `${family.provisionalFamilyId} cites source evidence outside its canonical packet.` }));
    }
    for (const questionCode of unique(family.questionCodes)) {
      if (!allowedQuestions.has(questionCode)) {
        issues.push(issue({ code: "unit_incoherence", packetId: packet.packetId, familyId: family.provisionalFamilyId, questionCode, message: `${questionCode} is outside the family's unit packet.` }));
      }
      if (!knownQuestions.has(questionCode)) {
        issues.push(issue({ code: "unknown_question", packetId: packet.packetId, familyId: family.provisionalFamilyId, questionCode, message: `${questionCode} is not part of the Factory job.` }));
      }
      const owners = ownership.get(questionCode) ?? [];
      owners.push(family.provisionalFamilyId);
      ownership.set(questionCode, owners);
    }
  }

  for (const questionCode of knownQuestions) {
    const owners = ownership.get(questionCode) ?? [];
    if (owners.length === 0) issues.push(issue({ code: "lost_question", questionCode, message: `${questionCode} has no primary mastery family.` }));
    if (owners.length > 1) issues.push(issue({ code: "multiple_primary", questionCode, message: `${questionCode} belongs to multiple primary mastery families: ${owners.join(", ")}.` }));
  }

  const approvedMapping = new Map(input.approvedStructure?.questionMappings.map((mapping) => [mapping.questionCode, mapping.primaryConceptCode]) ?? []);
  if (approvedMapping.size > 0) {
    for (const [questionCode, approvedConcept] of approvedMapping) {
      const owners = ownership.get(questionCode);
      if (!owners || owners.length !== 1) continue;
      const packet = packetByFamily.get(owners[0]);
      if (!packet) continue;
      const anchoredQuestions = [...approvedMapping.entries()].filter(([, concept]) => concept === approvedConcept).map(([code]) => code);
      const currentFamily = familyRows.find(({ family }) => family.provisionalFamilyId === owners[0])?.family;
      if (currentFamily && anchoredQuestions.some((code) => knownQuestions.has(code) && !currentFamily.questionCodes.includes(code))) {
        issues.push(issue({ code: "anchor_conflict", packetId: packet.packetId, familyId: owners[0], questionCode, message: `${questionCode} conflicts with approved mastery anchor ${approvedConcept}.` }));
      }
    }
  }

  for (const guard of guards) {
    if (!guardIsValid(guard, familyIds, knownQuestions)) {
      issues.push(issue({ code: "invalid_guard", message: `Invalid ${guard.type} guard: ${guard.explanation || "<missing explanation>"}.` }));
    }
  }

  const sortedFamilies = [...familyRows].sort((left, right) =>
    left.packet.unit.position - right.packet.unit.position ||
    familyMinimumQuestionCode(left.family).localeCompare(familyMinimumQuestionCode(right.family), "es") ||
    left.family.title.localeCompare(right.family.title, "es"),
  );
  const families: ResolvedMasteryFamily[] = sortedFamilies.map(({ packet, family }, index) => ({
    ...family,
    questionCodes: unique(family.questionCodes).sort((a, b) => a.localeCompare(b, "es")),
    sourceRefs: [...new Map(family.sourceRefs.map((ref) => [refKey(ref), ref])).values()],
    code: stableConceptCode(input.job.codePrefix, index + 1),
    unitCode: packet.unit.code,
    position: index + 1,
    packetId: packet.packetId,
  }));
  const codeByFamilyId = new Map(families.map((family) => [family.provisionalFamilyId, family.code]));
  const mappings: FactoryQuestionAssignment[] = families.flatMap((family) => family.questionCodes.map((questionCode) => ({
    questionCode,
    primaryConceptCode: family.code,
    confidence: family.confidence,
    rationale: `Mastery family semantic operation ${family.provisionalFamilyId}: ${family.rationale}`,
  }))).sort((a, b) => a.questionCode.localeCompare(b.questionCode, "es"));
  void codeByFamilyId;

  const units: ProposedStudyUnit[] = input.packets.map((packet) => ({
    code: packet.unit.code,
    title: packet.unit.title,
    position: packet.unit.position,
    sourceSubtopicName: packet.unit.title,
    sourceRefs: packet.sourceScope.sourceRefs,
    observations: ["Factory.7 source scope; mastery identity is resolved semantically inside the packet."],
  }));
  const multiplePrimaryCount = [...knownQuestions].filter((code) => (ownership.get(code)?.length ?? 0) > 1).length;
  const lostQuestionCount = [...knownQuestions].filter((code) => (ownership.get(code)?.length ?? 0) === 0).length;
  const overmergeGuards = guards.filter((guard) => guard.type === "overmerge");
  const undermergeGuards = guards.filter((guard) => guard.type === "undermerge");

  return {
    valid: issues.length === 0,
    issues,
    families,
    mappings,
    units,
    guards,
    overmergeGuards,
    undermergeGuards,
    questionCount: knownQuestions.size,
    mappedQuestionCount: [...knownQuestions].filter((code) => (ownership.get(code)?.length ?? 0) === 1).length,
    multiplePrimaryCount,
    lostQuestionCount,
  };
}

function evidenceDimensions(questions: ConceptFamilyPacketQuestion[]): FactoryEvidenceDimension[] {
  const haystack = normalizeText(questions.map((question) => [question.perspective, question.trapType, question.learningObjective].filter(Boolean).join(" ")).join(" "));
  const dimensions = new Set<FactoryEvidenceDimension>(["rule"]);
  if (/excepcion|salvo|except/.test(haystack)) dimensions.add("exception");
  if (/plazo|dias|meses|dies a quo|cronologia|orden temporal/.test(haystack)) dimensions.add("deadline");
  if (/requisit|debe|debera|condicion/.test(haystack)) dimensions.add("requirement");
  if (/competenc|organo|quien/.test(haystack)) dimensions.add("competence");
  if (/compar|contraste|diferenc/.test(haystack)) dimensions.add("contrast");
  if (/caso practico|aplicacion|cambio condicion/.test(haystack)) dimensions.add("mini_case");
  return [...dimensions];
}

function sentenceCandidates(text: string) {
  return unique(text.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter((sentence) => sentence.length >= 20));
}

function familyException(input: {
  family: ResolvedMasteryFamily;
  guard: MasteryFamilyBoundaryGuard;
  codeByFamilyId: Map<string, string>;
}): FactoryException {
  const conceptCode = input.codeByFamilyId.get(input.guard.familyIds[0]) ?? input.family.code;
  const subject = { kind: "concept", id: conceptCode } as const;
  return {
    id: stableFactoryExceptionId("concept_boundary", subject, `family-${input.guard.type}-${input.guard.familyIds.join("-")}`),
    type: "concept_boundary",
    blocker: true,
    severity: "error",
    confidence: "high",
    subject,
    explanation: input.guard.explanation,
    recommendation: input.guard.proposal,
    alternatives: [input.guard.proposal],
    affectedArtifacts: artifactsAffectedBySubject(subject),
  };
}

/** Converts validated semantic families into the existing Semantic Accelerator contract. */
export function buildSemanticTopicDraftFromMasteryFamilies(input: {
  job: ContentFactoryJob;
  canonicalSource: SemanticSourceSpan[];
  packets: ConceptFamilyResolutionWorkPacket[];
  validation: MasteryFamilyValidationReport;
}): SemanticTopicDraft {
  if (!input.validation.valid) throw new Error("Mastery family resolution must pass deterministic validation before building a SemanticTopicDraft.");
  const packetById = new Map(input.packets.map((packet) => [packet.packetId, packet]));
  const concepts: ProposedConcept[] = input.validation.families.map((family) => ({
    code: family.code,
    unitCode: family.unitCode,
    title: family.title,
    description: family.masteryStatement,
    position: family.position,
    sourceRefs: family.sourceRefs,
    confidence: family.confidence,
    observations: [`Factory.7 mastery family ${family.provisionalFamilyId}: ${family.rationale}`],
  }));
  const unitProposals: SemanticUnitProposal[] = input.validation.units.map((unit) => ({
    unit,
    meta: {
      confidence: "high",
      reason: "Source-backed unit scope used only as semantic candidate space.",
      evidence: { spanIds: [], sourceRefs: unit.sourceRefs, signals: ["source_scope"] },
      affectedQuestionCodes: input.packets.find((packet) => packet.unit.code === unit.code)?.questions.map((question) => question.questionCode) ?? [],
    },
  }));
  const conceptProposals: SemanticConceptProposal[] = input.validation.families.map((family) => {
    const packet = packetById.get(family.packetId)!;
    const spanKeys = new Set(family.sourceRefs.map(refKey));
    const spanIds = packet.sourceSpans.filter((span) => spanKeys.has(refKey(sourceRef(span)))).map((span) => span.id);
    const meta: SemanticProposalMeta = {
      confidence: family.confidence,
      reason: family.rationale,
      evidence: { spanIds, sourceRefs: family.sourceRefs, signals: ["mastery_family_resolution"] },
      affectedQuestionCodes: family.questionCodes,
    };
    return { concept: concepts.find((concept) => concept.code === family.code)!, meta };
  });
  const familyByConcept = new Map(input.validation.families.map((family) => [family.code, family]));
  const mappingProposals: SemanticMappingProposal[] = input.validation.mappings.map((mapping) => {
    const family = familyByConcept.get(mapping.primaryConceptCode)!;
    return {
      mapping,
      meta: {
        confidence: mapping.confidence ?? family.confidence,
        reason: mapping.rationale ?? family.rationale,
        evidence: { spanIds: [], sourceRefs: family.sourceRefs, signals: ["mastery_family_primary"] },
        affectedQuestionCodes: [mapping.questionCode],
      },
      candidateConceptCodes: [mapping.primaryConceptCode],
      hybrid: false,
    };
  });
  const studyScaffolds: SemanticConceptStudyScaffold[] = input.validation.families.map((family) => {
    const packet = packetById.get(family.packetId)!;
    const familyQuestions = packet.questions.filter((question) => family.questionCodes.includes(question.questionCode));
    const allowedRefs = new Set(family.sourceRefs.map(refKey));
    const spans = packet.sourceSpans.filter((span) => allowedRefs.has(refKey(sourceRef(span))));
    const sentences = sentenceCandidates(spans.map((span) => clean(span.text) ?? "").join(" "));
    const direct = sentences[0] ?? family.masteryStatement;
    const contrast = sentences[1] ?? family.masteryStatement;
    return {
      conceptCode: family.code,
      sourceSpanIds: spans.map((span) => span.id),
      summaryInputs: spans.map((span) => clean(span.text)).filter((text): text is string => text != null),
      essentialEvidence: sentences.slice(0, 6),
      examKeyCandidates: sentences.slice(0, 6),
      trapSignals: unique(familyQuestions.flatMap((question) => [question.trapType, question.perspective].filter((value): value is string => value != null))),
      confusionCandidateConceptCodes: [],
      flashcardSeeds: [
        { kind: "direct", focus: family.title, evidenceText: direct, sourceSpanIds: spans.map((span) => span.id) },
        { kind: "contrast", focus: family.excludedNearbyFamilyReason, evidenceText: contrast, sourceSpanIds: spans.map((span) => span.id) },
      ],
      generationDimensions: evidenceDimensions(familyQuestions),
    };
  });
  const codeByFamilyId = new Map(input.validation.families.map((family) => [family.provisionalFamilyId, family.code]));
  const semanticExceptions = input.validation.guards.map((guard) => {
    const family = input.validation.families.find((candidate) => guard.familyIds.includes(candidate.provisionalFamilyId))!;
    return familyException({ family, guard, codeByFamilyId });
  });
  const highConfidenceConcepts = concepts.filter((concept) => concept.confidence === "high").length;
  const structuralDraft: FactoryStructuralDraft = {
    units: input.validation.units,
    concepts,
    assignments: input.validation.mappings,
  };

  return {
    version: "1.0",
    topic: {
      oppositionCode: input.job.oppositionCode,
      topicNumber: input.job.topicNumber,
      topicTitle: input.job.topicTitle,
      codePrefix: input.job.codePrefix,
    },
    sourcePolicy: {
      canonicalOnly: true,
      document: input.job.sourcePolicy?.document ?? input.canonicalSource[0]?.document ?? "",
    },
    units: input.validation.units,
    concepts,
    mappings: input.validation.mappings,
    unitProposals,
    conceptProposals,
    mappingProposals,
    studyScaffolds,
    semanticExceptions,
    metrics: {
      highConfidenceUnits: input.validation.units.length,
      highConfidenceConcepts,
      automaticMappings: input.validation.mappings.length,
      doubtfulMappings: input.validation.mappings.filter((mapping) => mapping.confidence === "low").length,
      doubtfulConceptBoundaries: input.validation.guards.length,
      sourceIssues: 0,
      totalExceptions: semanticExceptions.length,
      blockers: semanticExceptions.filter((exception) => exception.blocker).length,
    },
    structuralDraft,
  };
}

/**
 * Executes exactly one semantic operation per generated packet. Approved V4 content bypasses
 * reinterpretation completely: approved structures are replayed, not rediscovered.
 */
export function runMasteryFamilyResolution(input: {
  job: ContentFactoryJob;
  canonicalSource: SemanticSourceSpan[];
  existingQuestions?: FactoryQuestionMetadata[];
  rawDraft?: SemanticTopicDraft;
  approvedStructure?: V4StudyContentPackage;
  resolvePacket: (packet: ConceptFamilyResolutionWorkPacket) => ConceptFamilyResolutionOperationResult;
}): MasteryFamilyResolutionRun {
  if (input.approvedStructure) {
    return {
      version: CONTENT_FACTORY_MASTERY_FAMILY_VERSION,
      mode: "approved_replay",
      packets: [],
      operationCount: 0,
      validation: null,
      semanticDraft: null,
      approvedStructure: input.approvedStructure,
    };
  }
  const packets = buildConceptFamilyResolutionPackets(input);
  const operationResults = packets.map((packet) => input.resolvePacket(packet));
  const validation = validateMasteryFamilyResolution({
    job: input.job,
    packets,
    operationResults,
  });
  const semanticDraft = validation.valid
    ? buildSemanticTopicDraftFromMasteryFamilies({
        job: input.job,
        canonicalSource: input.canonicalSource,
        packets,
        validation,
      })
    : null;
  return {
    version: CONTENT_FACTORY_MASTERY_FAMILY_VERSION,
    mode: "semantic_resolution",
    packets,
    operationCount: packets.length,
    validation,
    semanticDraft,
    approvedStructure: null,
  };
}
