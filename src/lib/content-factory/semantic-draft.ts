import type { V4SourceRef, V4StudyContentPackage } from "../v4-content-package";
import { jaccard, normalizeText } from "../similarity";
import { extractLegalArticleNumbers } from "./analyze-existing-bank";
import { stableConceptCode, stableUnitCode } from "./codes";
import { artifactsAffectedBySubject, stableFactoryExceptionId } from "./exceptions";
import { runContentFactoryTopic } from "./fast-pipeline";
import type {
  FactoryException,
  FactoryFastPipelineInput,
  FactoryFastPipelineOperations,
  FactoryFastPipelineRun,
  FactoryStructuralDraft,
} from "./fast-pipeline-types";
import type {
  ContentFactoryJob,
  FactoryEvidenceDimension,
  FactoryProposalConfidence,
  FactoryQuestionAssignment,
  FactoryQuestionMetadata,
  ProposedConcept,
  ProposedStudyUnit,
} from "./types";

export const CONTENT_FACTORY_SEMANTIC_DRAFT_VERSION = "1.0" as const;

export type SemanticSourceSpan = {
  id: string;
  document: string;
  reference?: string;
  heading?: string;
  sectionPath?: string[];
  article?: string | null;
  text?: string;
  pageStart?: number | null;
  pageEnd?: number | null;
};

export type SemanticDraftPolicy = {
  canonicalOnly: true;
  document: string;
  minimumConceptQuestionsForHighConfidence?: number;
};

export type SemanticEvidence = {
  spanIds: string[];
  sourceRefs: V4SourceRef[];
  signals: string[];
};

export type SemanticProposalMeta = {
  confidence: FactoryProposalConfidence;
  reason: string;
  evidence: SemanticEvidence;
  affectedQuestionCodes: string[];
};

export type SemanticUnitProposal = {
  unit: ProposedStudyUnit;
  meta: SemanticProposalMeta;
};

export type SemanticConceptProposal = {
  concept: ProposedConcept;
  meta: SemanticProposalMeta;
};

export type SemanticMappingProposal = {
  mapping: FactoryQuestionAssignment;
  meta: SemanticProposalMeta;
  candidateConceptCodes: string[];
  hybrid: boolean;
};

export type SemanticFlashcardSeed = {
  kind: "direct" | "contrast" | "number_or_deadline" | "exception" | "mini_case";
  focus: string;
  evidenceText: string;
  sourceSpanIds: string[];
};

export type SemanticConceptStudyScaffold = {
  conceptCode: string;
  sourceSpanIds: string[];
  summaryInputs: string[];
  essentialEvidence: string[];
  examKeyCandidates: string[];
  trapSignals: string[];
  confusionCandidateConceptCodes: string[];
  flashcardSeeds: SemanticFlashcardSeed[];
  generationDimensions: FactoryEvidenceDimension[];
};

export type SemanticDraftMetrics = {
  highConfidenceUnits: number;
  highConfidenceConcepts: number;
  automaticMappings: number;
  doubtfulMappings: number;
  doubtfulConceptBoundaries: number;
  sourceIssues: number;
  totalExceptions: number;
  blockers: number;
};

export type SemanticTopicDraft = {
  version: typeof CONTENT_FACTORY_SEMANTIC_DRAFT_VERSION;
  topic: {
    oppositionCode: string;
    topicNumber: number;
    topicTitle?: string;
    codePrefix: string;
  };
  sourcePolicy: SemanticDraftPolicy;
  units: ProposedStudyUnit[];
  concepts: ProposedConcept[];
  mappings: FactoryQuestionAssignment[];
  unitProposals: SemanticUnitProposal[];
  conceptProposals: SemanticConceptProposal[];
  mappingProposals: SemanticMappingProposal[];
  studyScaffolds: SemanticConceptStudyScaffold[];
  semanticExceptions: FactoryException[];
  metrics: SemanticDraftMetrics;
  structuralDraft: FactoryStructuralDraft;
};

export type BuildSemanticTopicDraftInput = {
  job: ContentFactoryJob;
  canonicalSource: SemanticSourceSpan[];
  existingQuestions?: FactoryQuestionMetadata[];
  approvedAnchors?: V4StudyContentPackage;
  existingV4?: V4StudyContentPackage;
  policy?: Partial<SemanticDraftPolicy>;
};

type QuestionWork = {
  question: FactoryQuestionMetadata;
  canonical: boolean;
  evidenceSpans: SemanticSourceSpan[];
  unitKey: string;
  unitLabel: string;
  conceptLabel: string;
  objective: string;
  subpart: string;
  articleNumbers: number[];
};

type ConceptCluster = {
  questionIndexes: number[];
  unitKey: string;
  title: string;
  sourceSpans: SemanticSourceSpan[];
  firstQuestionCode: string;
  minPage: number;
};

function clean(value?: string | null) {
  return value?.trim() ?? "";
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function stableSortStrings(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b, "es"));
}

function pageStart(span: SemanticSourceSpan) {
  return span.pageStart ?? Number.MAX_SAFE_INTEGER;
}

function pageEnd(span: SemanticSourceSpan) {
  return span.pageEnd ?? span.pageStart ?? Number.MIN_SAFE_INTEGER;
}

function spansOverlapPages(question: FactoryQuestionMetadata, span: SemanticSourceSpan) {
  if (question.pageStart == null && question.pageEnd == null) return false;
  if (span.pageStart == null && span.pageEnd == null) return false;
  const qStart = question.pageStart ?? question.pageEnd!;
  const qEnd = question.pageEnd ?? question.pageStart!;
  return qStart <= pageEnd(span) && pageStart(span) <= qEnd;
}

function sourceRef(span: SemanticSourceSpan): V4SourceRef {
  return {
    label: span.document,
    reference: clean(span.reference) || [span.document, clean(span.article), clean(span.heading)].filter(Boolean).join(", "),
    pageStart: span.pageStart ?? null,
    pageEnd: span.pageEnd ?? null,
  };
}

function sourceRefs(spans: SemanticSourceSpan[]) {
  const byKey = new Map<string, V4SourceRef>();
  for (const span of spans) {
    const ref = sourceRef(span);
    byKey.set(`${ref.label}|${ref.reference}|${ref.pageStart ?? ""}|${ref.pageEnd ?? ""}`, ref);
  }
  return [...byKey.values()];
}

function normalizedArticles(value: string) {
  return extractLegalArticleNumbers(value).sort((a, b) => a - b);
}

function spanArticles(span: SemanticSourceSpan) {
  return normalizedArticles(`${clean(span.article)} ${clean(span.reference)}`);
}

function intersects(left: number[], right: number[]) {
  const set = new Set(left);
  return right.some((value) => set.has(value));
}

function textContainsNormalized(container: string, candidate: string) {
  const left = normalizeText(container);
  const right = normalizeText(candidate);
  return right.length >= 4 && left.includes(right);
}

function evidenceSpansForQuestion(question: FactoryQuestionMetadata, spans: SemanticSourceSpan[]) {
  const sourceArticles = normalizedArticles(clean(question.sourceReference));
  const sectionSignals = [question.subapartado, question.apartado].map(clean).filter(Boolean);
  const byPage = spans.filter((span) => spansOverlapPages(question, span));
  if (byPage.length > 0) return byPage;
  const byArticle = sourceArticles.length > 0
    ? spans.filter((span) => intersects(sourceArticles, spanArticles(span)))
    : [];
  if (byArticle.length > 0) return byArticle;
  const bySection = sectionSignals.length > 0
    ? spans.filter((span) => {
        const haystack = `${clean(span.heading)} ${(span.sectionPath ?? []).join(" ")}`;
        return sectionSignals.some((signal) => textContainsNormalized(haystack, signal) || textContainsNormalized(signal, haystack));
      })
    : [];
  return bySection;
}

function mostFrequent(values: string[]) {
  const counts = new Map<string, { value: string; count: number }>();
  for (const value of values.map(clean).filter(Boolean)) {
    const key = normalizeText(value);
    const current = counts.get(key);
    if (current) current.count += 1;
    else counts.set(key, { value, count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.value.length - b.value.length || a.value.localeCompare(b.value, "es"))[0]?.value ?? "";
}

function sourceUnitLabel(span?: SemanticSourceSpan) {
  return clean(span?.sectionPath?.[0]) || clean(span?.heading) || clean(span?.article) || "Fuente canónica";
}

function unitIdentity(question: FactoryQuestionMetadata, spans: SemanticSourceSpan[]) {
  const explicit = clean(question.apartado);
  if (explicit) return { key: normalizeText(explicit), label: explicit };
  const secondary = clean(question.subapartado);
  if (secondary) return { key: normalizeText(secondary), label: secondary };
  const label = sourceUnitLabel(spans[0]);
  return { key: normalizeText(label), label };
}

function canonicalQuestion(question: FactoryQuestionMetadata, policy: SemanticDraftPolicy) {
  const explicit = clean(question.documentReference);
  if (!explicit) return true;
  return normalizeText(explicit).includes(normalizeText(policy.document));
}

function buildQuestionWork(questions: FactoryQuestionMetadata[], spans: SemanticSourceSpan[], policy: SemanticDraftPolicy) {
  return questions.map((question): QuestionWork => {
    const evidenceSpans = evidenceSpansForQuestion(question, spans);
    const identity = unitIdentity(question, evidenceSpans);
    return {
      question,
      canonical: canonicalQuestion(question, policy),
      evidenceSpans,
      unitKey: identity.key,
      unitLabel: identity.label,
      conceptLabel: clean(question.conceptLabel),
      objective: clean(question.learningObjective),
      subpart: clean(question.subapartado),
      articleNumbers: normalizedArticles(clean(question.sourceReference)),
    };
  });
}

class UnionFind {
  private readonly parent: number[];
  constructor(size: number) { this.parent = Array.from({ length: size }, (_, index) => index); }
  find(value: number): number {
    const parent = this.parent[value];
    if (parent === value) return value;
    this.parent[value] = this.find(parent);
    return this.parent[value];
  }
  union(left: number, right: number) {
    const a = this.find(left);
    const b = this.find(right);
    if (a !== b) this.parent[b] = a;
  }
}

function sharedSpan(left: QuestionWork, right: QuestionWork) {
  const ids = new Set(left.evidenceSpans.map((span) => span.id));
  return right.evidenceSpans.some((span) => ids.has(span.id));
}

function shouldMerge(left: QuestionWork, right: QuestionWork) {
  if (left.unitKey !== right.unitKey) return false;
  const labelLeft = normalizeText(left.conceptLabel);
  const labelRight = normalizeText(right.conceptLabel);
  const objectiveLeft = normalizeText(left.objective);
  const objectiveRight = normalizeText(right.objective);
  const subLeft = normalizeText(left.subpart);
  const subRight = normalizeText(right.subpart);
  const sameLabel = labelLeft.length > 0 && labelLeft === labelRight;
  const sameObjective = objectiveLeft.length > 0 && objectiveLeft === objectiveRight;
  const sameSubpart = subLeft.length > 0 && subLeft === subRight;
  const sameSource = sharedSpan(left, right) || intersects(left.articleNumbers, right.articleNumbers);
  if (sameLabel || sameObjective) return true;
  if (sameSubpart && sameSource) return true;
  const labelSimilarity = labelLeft && labelRight ? jaccard(labelLeft, labelRight) : 0;
  const objectiveSimilarity = objectiveLeft && objectiveRight ? jaccard(objectiveLeft, objectiveRight) : 0;
  if (labelSimilarity >= 0.72 && (sameSource || sameSubpart)) return true;
  if (objectiveSimilarity >= 0.72 && sameSource) return true;
  return labelSimilarity >= 0.55 && objectiveSimilarity >= 0.55 && sameSource;
}

function conceptTitle(rows: QuestionWork[], spans: SemanticSourceSpan[]) {
  return mostFrequent(rows.map((row) => row.conceptLabel))
    || mostFrequent(rows.map((row) => row.objective))
    || mostFrequent(rows.map((row) => row.subpart))
    || clean(spans[0]?.heading)
    || clean(spans[0]?.article)
    || "Concepto provisional";
}

function clusterQuestions(rows: QuestionWork[]) {
  const eligibleIndexes = rows.map((row, index) => ({ row, index })).filter(({ row }) => row.canonical);
  const union = new UnionFind(rows.length);
  for (let left = 0; left < eligibleIndexes.length; left += 1) {
    for (let right = left + 1; right < eligibleIndexes.length; right += 1) {
      const a = eligibleIndexes[left];
      const b = eligibleIndexes[right];
      if (shouldMerge(a.row, b.row)) union.union(a.index, b.index);
    }
  }
  const groups = new Map<number, number[]>();
  for (const { index } of eligibleIndexes) {
    const root = union.find(index);
    groups.set(root, [...(groups.get(root) ?? []), index]);
  }
  return [...groups.values()];
}

function minPage(spans: SemanticSourceSpan[]) {
  return Math.min(...spans.map(pageStart), Number.MAX_SAFE_INTEGER);
}

function proposalConfidence(input: { questionCount: number; hasSource: boolean; labelCount: number; minimum: number }): FactoryProposalConfidence {
  if (!input.hasSource) return "low";
  if (input.questionCount >= input.minimum && input.labelCount <= 2) return "high";
  return "medium";
}

function semanticException(input: {
  type: FactoryException["type"];
  blocker: boolean;
  severity: FactoryException["severity"];
  confidence: FactoryProposalConfidence;
  subject: FactoryException["subject"];
  discriminator: string;
  explanation: string;
  recommendation: string;
  alternatives?: string[];
}): FactoryException {
  return {
    id: stableFactoryExceptionId(input.type, input.subject, input.discriminator),
    type: input.type,
    blocker: input.blocker,
    severity: input.severity,
    confidence: input.confidence,
    subject: input.subject,
    explanation: input.explanation,
    recommendation: input.recommendation,
    alternatives: input.alternatives,
    affectedArtifacts: artifactsAffectedBySubject(input.subject),
  };
}

function sentenceCandidates(text: string) {
  return unique(text.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter((sentence) => sentence.length >= 20));
}

function evidenceDimensions(text: string, questions: FactoryQuestionMetadata[]): FactoryEvidenceDimension[] {
  const normalized = normalizeText(`${text} ${questions.map((q) => `${clean(q.perspective)} ${clean(q.learningObjective)}`).join(" ")}`);
  const dimensions = new Set<FactoryEvidenceDimension>(["rule"]);
  if (/\bexcept|\bsalvo\b|\bexcepcion/.test(normalized)) dimensions.add("exception");
  if (/\bplazo\b|\bdias?\b|\bmeses?\b|\banos?\b/.test(normalized)) dimensions.add("deadline");
  if (/\brequisit|\bdebera\b|\bdebe\b|\bnecesari/.test(normalized)) dimensions.add("requirement");
  if (/\bcompetenc|\bcompetente\b|\borgano\b/.test(normalized)) dimensions.add("competence");
  if (/\befect|\bproduce\b|\bimplica/.test(normalized)) dimensions.add("effect");
  if (/\binteresad|\bpersona\b|\badministracion\b/.test(normalized)) dimensions.add("subject");
  if (/\bcaso\b|\bsupuesto\b/.test(normalized)) dimensions.add("mini_case");
  return [...dimensions];
}

function studyScaffoldForConcept(input: {
  concept: ProposedConcept;
  clusterRows: QuestionWork[];
  spans: SemanticSourceSpan[];
  concepts: ProposedConcept[];
}): SemanticConceptStudyScaffold {
  const sentences = unique(input.spans.flatMap((span) => sentenceCandidates(clean(span.text))));
  const examKeys = sentences.filter((sentence) => /\b(plazo|debe|deberá|podrá|salvo|excepto|competente|requisit|efecto)/i.test(sentence));
  const neighbors = input.concepts
    .filter((concept) => concept.code !== input.concept.code && concept.unitCode === input.concept.unitCode)
    .filter((concept) => jaccard(concept.title, input.concept.title) >= 0.3)
    .map((concept) => concept.code);
  const sourceSpanIds = input.spans.map((span) => span.id);
  const flashcardEvidence = (examKeys.length > 0 ? examKeys : sentences).slice(0, 2);
  return {
    conceptCode: input.concept.code,
    sourceSpanIds,
    summaryInputs: sentences.slice(0, 4),
    essentialEvidence: sentences.slice(0, 6),
    examKeyCandidates: (examKeys.length > 0 ? examKeys : sentences).slice(0, 4),
    trapSignals: stableSortStrings(unique(input.clusterRows.map((row) => clean(row.question.trapType)).filter(Boolean))),
    confusionCandidateConceptCodes: neighbors,
    flashcardSeeds: flashcardEvidence.map((evidenceText, index) => ({
      kind: /\b(plazo|dias?|meses?|anos?)\b/i.test(normalizeText(evidenceText)) ? "number_or_deadline" : index === 1 && neighbors.length > 0 ? "contrast" : "direct",
      focus: input.concept.title,
      evidenceText,
      sourceSpanIds,
    })),
    generationDimensions: evidenceDimensions(sentences.join(" "), input.clusterRows.map((row) => row.question)),
  };
}

function anchorUnits(input: BuildSemanticTopicDraftInput) {
  const packages = [input.approvedAnchors, input.existingV4].filter(Boolean) as V4StudyContentPackage[];
  return packages.flatMap((pkg) => pkg.units);
}

function anchorConcepts(input: BuildSemanticTopicDraftInput) {
  const packages = [input.approvedAnchors, input.existingV4].filter(Boolean) as V4StudyContentPackage[];
  return packages.flatMap((pkg) => pkg.concepts);
}

function anchorMappings(input: BuildSemanticTopicDraftInput) {
  const packages = [input.approvedAnchors, input.existingV4].filter(Boolean) as V4StudyContentPackage[];
  return new Map(packages.flatMap((pkg) => pkg.questionMappings).map((mapping) => [mapping.questionCode, mapping]));
}

function codeForUnit(title: string, position: number, input: BuildSemanticTopicDraftInput) {
  const matching = anchorUnits(input).filter((unit) => normalizeText(unit.title) === normalizeText(title));
  return matching.length === 1 ? matching[0].code : stableUnitCode(input.job.codePrefix, position);
}

function codeForConcept(title: string, unitCode: string, position: number, input: BuildSemanticTopicDraftInput) {
  const matching = anchorConcepts(input).filter((concept) => normalizeText(concept.title) === normalizeText(title));
  if (matching.length === 1) return matching[0].code;
  return stableConceptCode(input.job.codePrefix, position);
}

function buildGreenfield(input: BuildSemanticTopicDraftInput, spans: SemanticSourceSpan[], policy: SemanticDraftPolicy): SemanticTopicDraft {
  const unitGroups = new Map<string, SemanticSourceSpan[]>();
  for (const span of spans) {
    const label = sourceUnitLabel(span);
    const key = normalizeText(label);
    unitGroups.set(key, [...(unitGroups.get(key) ?? []), span]);
  }
  const orderedGroups = [...unitGroups.entries()].sort((a, b) => minPage(a[1]) - minPage(b[1]) || a[0].localeCompare(b[0], "es"));
  const unitProposals: SemanticUnitProposal[] = orderedGroups.map(([key, group], index) => {
    const title = sourceUnitLabel(group[0]);
    const confidence: FactoryProposalConfidence = group.some((span) => (span.sectionPath?.length ?? 0) > 0 || clean(span.heading)) ? "high" : "medium";
    const unit: ProposedStudyUnit = { code: codeForUnit(title, index + 1, input), title, position: index + 1, sourceRefs: sourceRefs(group) };
    return { unit, meta: { confidence, reason: "Derived from canonical source hierarchy; greenfield has no bank signal to confirm finer boundaries.", evidence: { spanIds: group.map((span) => span.id), sourceRefs: unit.sourceRefs, signals: [key] }, affectedQuestionCodes: [] } };
  });
  const concepts: ProposedConcept[] = [];
  const conceptProposals: SemanticConceptProposal[] = [];
  let conceptPosition = 0;
  for (const unitProposal of unitProposals) {
    const unitSpanIds = new Set(unitProposal.meta.evidence.spanIds);
    const unitSpans = spans.filter((span) => unitSpanIds.has(span.id));
    for (const span of unitSpans) {
      conceptPosition += 1;
      const title = clean(span.heading) || clean(span.article) || `Concepto ${conceptPosition}`;
      const confidence: FactoryProposalConfidence = clean(span.article) || clean(span.heading) ? "medium" : "low";
      const concept: ProposedConcept = {
        code: codeForConcept(title, unitProposal.unit.code, conceptPosition, input),
        unitCode: unitProposal.unit.code,
        title,
        description: "Propuesta provisional derivada exclusivamente de la estructura de la fuente canónica.",
        position: conceptPosition,
        confidence,
        sourceRefs: [sourceRef(span)],
      };
      concepts.push(concept);
      conceptProposals.push({ concept, meta: { confidence, reason: "Greenfield concept seed from a canonical heading/article span; bank evidence is unavailable.", evidence: { spanIds: [span.id], sourceRefs: [sourceRef(span)], signals: [clean(span.article), clean(span.heading)].filter(Boolean) }, affectedQuestionCodes: [] } });
    }
  }
  const semanticExceptions = conceptProposals.filter((proposal) => proposal.meta.confidence === "low").map((proposal) => semanticException({
    type: "concept_boundary", blocker: true, severity: "error", confidence: "low", subject: { kind: "concept", id: proposal.concept.code }, discriminator: "greenfield-weak-structure",
    explanation: "The canonical representation does not expose enough heading/article structure to justify this concept boundary confidently.",
    recommendation: "Review only this boundary against the canonical source; do not supplement it from external material.",
  }));
  const studyScaffolds = concepts.map((concept) => {
    const spanIds = new Set(conceptProposals.find((proposal) => proposal.concept.code === concept.code)?.meta.evidence.spanIds ?? []);
    return studyScaffoldForConcept({ concept, clusterRows: [], spans: spans.filter((span) => spanIds.has(span.id)), concepts });
  });
  const units = unitProposals.map((proposal) => proposal.unit);
  const metrics: SemanticDraftMetrics = {
    highConfidenceUnits: unitProposals.filter((proposal) => proposal.meta.confidence === "high").length,
    highConfidenceConcepts: 0,
    automaticMappings: 0,
    doubtfulMappings: 0,
    doubtfulConceptBoundaries: semanticExceptions.filter((exception) => exception.type === "concept_boundary").length,
    sourceIssues: 0,
    totalExceptions: semanticExceptions.length,
    blockers: semanticExceptions.filter((exception) => exception.blocker).length,
  };
  return { version: CONTENT_FACTORY_SEMANTIC_DRAFT_VERSION, topic: { oppositionCode: input.job.oppositionCode, topicNumber: input.job.topicNumber, topicTitle: input.job.topicTitle, codePrefix: input.job.codePrefix }, sourcePolicy: policy, units, concepts, mappings: [], unitProposals, conceptProposals, mappingProposals: [], studyScaffolds, semanticExceptions, metrics, structuralDraft: { units, concepts, assignments: [] } };
}

export function buildSemanticTopicDraft(input: BuildSemanticTopicDraftInput): SemanticTopicDraft {
  const policy: SemanticDraftPolicy = {
    canonicalOnly: true,
    document: input.policy?.document ?? input.job.sourcePolicy?.document ?? "",
    minimumConceptQuestionsForHighConfidence: input.policy?.minimumConceptQuestionsForHighConfidence ?? 2,
  };
  if (!clean(policy.document)) throw new Error("Semantic Draft Builder requires an explicit canonical document.");
  const canonicalSpans = input.canonicalSource.filter((span) => normalizeText(span.document) === normalizeText(policy.document));
  const sourceExceptions: FactoryException[] = input.canonicalSource
    .filter((span) => normalizeText(span.document) !== normalizeText(policy.document))
    .map((span) => semanticException({
      type: "source_traceability", blocker: true, severity: "error", confidence: "low", subject: { kind: "topic", id: `${input.job.codePrefix}:canonical-source` }, discriminator: span.id,
      explanation: `Source span ${span.id} references ${span.document}, outside canonical document ${policy.document}.`,
      recommendation: "Exclude the span from semantic inference unless Governance changes the canonical-source policy.",
    }));
  const questions = input.existingQuestions ?? input.job.existingQuestions ?? [];
  if (questions.length === 0) return buildGreenfield(input, canonicalSpans, policy);
  const work = buildQuestionWork(questions.filter((question) => question.active !== false), canonicalSpans, policy);
  const semanticExceptions: FactoryException[] = [...sourceExceptions];
  for (const row of work) {
    if (!row.canonical) {
      semanticExceptions.push(semanticException({
        type: "source_review_required", blocker: true, severity: "error", confidence: "low", subject: { kind: "question", id: row.question.code }, discriminator: "non-canonical-document",
        explanation: `${row.question.code} cites ${clean(row.question.documentReference) || "an unspecified source"}, not canonical document ${policy.document}.`,
        recommendation: "Quarantine this question from semantic mapping until the canonical source itself supports it.",
      }));
    } else if (row.evidenceSpans.length === 0) {
      semanticExceptions.push(semanticException({
        type: "source_traceability", blocker: false, severity: "warning", confidence: "medium", subject: { kind: "question", id: row.question.code }, discriminator: "no-source-span-match",
        explanation: `${row.question.code} is canonical by document metadata but cannot be tied to a precise canonical span by page/article/section signals.`,
        recommendation: "Review this source span before treating the mapping as high-confidence.",
      }));
    }
  }
  const canonicalWork = work.filter((row) => row.canonical);
  const unitGroups = new Map<string, QuestionWork[]>();
  for (const row of canonicalWork) unitGroups.set(row.unitKey, [...(unitGroups.get(row.unitKey) ?? []), row]);
  const orderedUnits = [...unitGroups.entries()].sort((a, b) => {
    const pageA = minPage(a[1].flatMap((row) => row.evidenceSpans));
    const pageB = minPage(b[1].flatMap((row) => row.evidenceSpans));
    return pageA - pageB || a[1][0].question.code.localeCompare(b[1][0].question.code, "es") || a[0].localeCompare(b[0], "es");
  });
  const unitCodeByKey = new Map<string, string>();
  const unitProposals: SemanticUnitProposal[] = orderedUnits.map(([key, rows], index) => {
    const title = mostFrequent(rows.map((row) => row.unitLabel)) || sourceUnitLabel(rows.flatMap((row) => row.evidenceSpans)[0]);
    const spans = unique(rows.flatMap((row) => row.evidenceSpans).map((span) => span.id)).map((id) => canonicalSpans.find((span) => span.id === id)!).filter(Boolean);
    const hasSource = spans.length > 0;
    const confidence: FactoryProposalConfidence = hasSource && rows.length >= 2 ? "high" : hasSource ? "medium" : "low";
    const code = codeForUnit(title, index + 1, input);
    unitCodeByKey.set(key, code);
    const refs = sourceRefs(spans.length > 0 ? spans : canonicalSpans.slice(0, 1));
    const unit: ProposedStudyUnit = { code, title, position: index + 1, sourceRefs: refs };
    return { unit, meta: { confidence, reason: hasSource ? "V2 section signals and canonical spans converge on the same unit boundary." : "Unit boundary comes from V2 section metadata without a precise canonical span match.", evidence: { spanIds: spans.map((span) => span.id), sourceRefs: refs, signals: stableSortStrings(unique(rows.flatMap((row) => [row.unitLabel, ...row.articleNumbers.map(String)]).filter(Boolean))) }, affectedQuestionCodes: rows.map((row) => row.question.code).sort() } };
  });

  const clusterIndexes = clusterQuestions(work);
  const rawClusters: ConceptCluster[] = clusterIndexes.map((indexes) => {
    const rows = indexes.map((index) => work[index]);
    const spans = unique(rows.flatMap((row) => row.evidenceSpans).map((span) => span.id)).map((id) => canonicalSpans.find((span) => span.id === id)!).filter(Boolean);
    return { questionIndexes: indexes, unitKey: rows[0].unitKey, title: conceptTitle(rows, spans), sourceSpans: spans, firstQuestionCode: rows.map((row) => row.question.code).sort()[0], minPage: minPage(spans) };
  }).sort((a, b) => {
    const unitA = unitProposals.findIndex((proposal) => proposal.unit.code === unitCodeByKey.get(a.unitKey));
    const unitB = unitProposals.findIndex((proposal) => proposal.unit.code === unitCodeByKey.get(b.unitKey));
    return unitA - unitB || a.minPage - b.minPage || a.firstQuestionCode.localeCompare(b.firstQuestionCode, "es") || a.title.localeCompare(b.title, "es");
  });

  const conceptProposals: SemanticConceptProposal[] = [];
  const clusterConceptCode = new Map<ConceptCluster, string>();
  rawClusters.forEach((cluster, index) => {
    const rows = cluster.questionIndexes.map((questionIndex) => work[questionIndex]);
    const distinctLabels = unique(rows.map((row) => normalizeText(row.conceptLabel)).filter(Boolean));
    const confidence = proposalConfidence({ questionCount: rows.length, hasSource: cluster.sourceSpans.length > 0, labelCount: distinctLabels.length, minimum: policy.minimumConceptQuestionsForHighConfidence ?? 2 });
    const unitCode = unitCodeByKey.get(cluster.unitKey) ?? unitProposals[0]?.unit.code ?? stableUnitCode(input.job.codePrefix, 1);
    const code = codeForConcept(cluster.title, unitCode, index + 1, input);
    clusterConceptCode.set(cluster, code);
    const refs = sourceRefs(cluster.sourceSpans);
    const concept: ProposedConcept = {
      code,
      unitCode,
      title: cluster.title,
      description: "Propuesta semántica provisional derivada de señales V2 y spans de la fuente canónica; el contenido sustantivo debe generarse únicamente desde esas evidencias.",
      position: index + 1,
      confidence,
      sourceRefs: refs,
    };
    conceptProposals.push({ concept, meta: { confidence, reason: confidence === "high" ? "Multiple V2 items converge on the same semantic label/objective and canonical source scope." : cluster.sourceSpans.length > 0 ? "Canonical source is present but the concept has limited or mixed bank evidence." : "The concept lacks a precise canonical source span and requires review.", evidence: { spanIds: cluster.sourceSpans.map((span) => span.id), sourceRefs: refs, signals: stableSortStrings(unique(rows.flatMap((row) => [row.conceptLabel, row.objective, row.subpart, ...row.articleNumbers.map(String)]).filter(Boolean))) }, affectedQuestionCodes: rows.map((row) => row.question.code).sort() } });
  });
  const concepts = conceptProposals.map((proposal) => proposal.concept);

  const clusterByQuestionIndex = new Map<number, ConceptCluster>();
  for (const cluster of rawClusters) for (const index of cluster.questionIndexes) clusterByQuestionIndex.set(index, cluster);
  const mappingProposals: SemanticMappingProposal[] = [];
  const anchoredMappings = anchorMappings(input);
  for (let index = 0; index < work.length; index += 1) {
    const row = work[index];
    if (!row.canonical) continue;
    const cluster = clusterByQuestionIndex.get(index);
    if (!cluster) continue;
    const recommended = clusterConceptCode.get(cluster)!;
    const candidates = concepts.filter((concept) => concept.unitCode === unitCodeByKey.get(row.unitKey)).map((concept) => {
      const titleScore = row.conceptLabel ? jaccard(row.conceptLabel, concept.title) : 0;
      const objectiveScore = row.objective ? jaccard(row.objective, concept.title) : 0;
      const proposal = conceptProposals.find((item) => item.concept.code === concept.code)!;
      const shared = proposal.meta.evidence.spanIds.some((spanId) => row.evidenceSpans.some((span) => span.id === spanId));
      const score = (titleScore >= 0.9 ? 4 : titleScore >= 0.55 ? 2 : 0) + (objectiveScore >= 0.65 ? 2 : 0) + (shared ? 3 : 0) + (concept.code === recommended ? 2 : 0);
      return { concept, score };
    }).sort((a, b) => b.score - a.score || a.concept.code.localeCompare(b.concept.code, "es"));
    const top = candidates[0];
    const second = candidates[1];
    const hybrid = Boolean(top && second && top.score >= 5 && second.score >= top.score - 1);
    const hasSource = row.evidenceSpans.length > 0;
    const confidence: FactoryProposalConfidence = !hasSource ? "low" : hybrid ? "medium" : (top?.score ?? 0) >= 7 ? "high" : "medium";
    const primary = top?.concept.code ?? recommended;
    const mapping: FactoryQuestionAssignment = { questionCode: row.question.code, primaryConceptCode: primary, confidence, rationale: `Semantic Builder: ${hasSource ? "canonical span matched" : "no precise canonical span"}; ${hybrid ? "multiple credible concept candidates" : "single recommended primary"}.` };
    const candidateConceptCodes = candidates.filter((candidate) => candidate.score >= Math.max(4, (top?.score ?? 0) - 1)).map((candidate) => candidate.concept.code);
    mappingProposals.push({ mapping, meta: { confidence, reason: mapping.rationale ?? "Semantic mapping proposal.", evidence: { spanIds: row.evidenceSpans.map((span) => span.id), sourceRefs: sourceRefs(row.evidenceSpans), signals: [row.conceptLabel, row.objective, row.subpart, clean(row.question.perspective)].filter(Boolean) }, affectedQuestionCodes: [row.question.code] }, candidateConceptCodes, hybrid });
    if (hybrid) {
      semanticExceptions.push(semanticException({ type: "mapping_ambiguity", blocker: false, severity: "warning", confidence: "medium", subject: { kind: "mapping", id: row.question.code }, discriminator: candidateConceptCodes.join("-"), explanation: `${row.question.code} has more than one credible primary concept from V2/source signals: ${candidateConceptCodes.join(", ")}.`, recommendation: `Keep ${primary} provisionally and review only this primary boundary.`, alternatives: candidateConceptCodes.slice(1).map((code) => `Use ${code} as primary.`) }));
    }
    if (confidence === "low") {
      semanticExceptions.push(semanticException({ type: "source_traceability", blocker: true, severity: "error", confidence: "low", subject: { kind: "mapping", id: row.question.code }, discriminator: "low-confidence-primary", explanation: `${row.question.code} cannot be assigned to a primary with sufficient canonical traceability.`, recommendation: "Review the canonical span before accepting any primary mapping." }));
    }
    const anchor = anchoredMappings.get(row.question.code);
    if (anchor && anchor.primaryConceptCode !== primary) {
      semanticExceptions.push(semanticException({ type: "anchor_conflict", blocker: true, severity: "error", confidence: "low", subject: { kind: "mapping", id: row.question.code }, discriminator: `${anchor.primaryConceptCode}-${primary}`, explanation: `${row.question.code} is anchored to ${anchor.primaryConceptCode} but the semantic proposal recommends ${primary}.`, recommendation: "Preserve the approved anchor unless Governance explicitly changes it.", alternatives: [`Use semantic proposal ${primary}.`] }));
    }
  }

  for (const proposal of conceptProposals) {
    const labels = proposal.meta.evidence.signals.filter((signal) => !/^\d+$/.test(signal));
    if (proposal.meta.confidence === "low") {
      semanticExceptions.push(semanticException({ type: "concept_boundary", blocker: true, severity: "error", confidence: "low", subject: { kind: "concept", id: proposal.concept.code }, discriminator: "insufficient-source-evidence", explanation: `${proposal.concept.code} lacks enough canonical evidence for a safe concept boundary.`, recommendation: "Review this concept boundary against the canonical source only." }));
    } else if (labels.length >= 4) {
      const cohesion = labels.slice(1).reduce((sum, label) => sum + jaccard(labels[0], label), 0) / Math.max(1, labels.length - 1);
      if (cohesion < 0.25 && proposal.meta.affectedQuestionCodes.length >= 2) {
        semanticExceptions.push(semanticException({ type: "concept_boundary", blocker: false, severity: "warning", confidence: "medium", subject: { kind: "concept", id: proposal.concept.code }, discriminator: "mixed-signals", explanation: `${proposal.concept.code} groups materially different V2 labels/objectives despite a shared source scope.`, recommendation: "Review whether this cluster should split; continue provisionally with the current boundary." }));
      }
    }
  }

  for (const left of concepts) {
    for (const right of concepts) {
      if (left.code >= right.code || left.unitCode !== right.unitCode) continue;
      const similarity = jaccard(left.title, right.title);
      const leftSpans = new Set(conceptProposals.find((proposal) => proposal.concept.code === left.code)?.meta.evidence.spanIds ?? []);
      const overlap = (conceptProposals.find((proposal) => proposal.concept.code === right.code)?.meta.evidence.spanIds ?? []).some((id) => leftSpans.has(id));
      if (similarity >= 0.78 && overlap) {
        semanticExceptions.push(semanticException({ type: "concept_boundary", blocker: false, severity: "warning", confidence: "medium", subject: { kind: "concept", id: left.code }, discriminator: right.code, explanation: `${left.code} and ${right.code} have highly overlapping labels and canonical evidence.`, recommendation: "Review only this split/merge boundary; keep both concepts provisionally until decided.", alternatives: [`Merge ${right.code} into ${left.code}.`] }));
      }
    }
  }

  const mappings = mappingProposals.map((proposal) => proposal.mapping);
  const studyScaffolds = rawClusters.map((cluster) => {
    const conceptCode = clusterConceptCode.get(cluster)!;
    const concept = concepts.find((item) => item.code === conceptCode)!;
    return studyScaffoldForConcept({ concept, clusterRows: cluster.questionIndexes.map((index) => work[index]), spans: cluster.sourceSpans, concepts });
  });
  const units = unitProposals.map((proposal) => proposal.unit);
  const dedupedExceptions = [...new Map(semanticExceptions.map((exception) => [exception.id, exception])).values()].sort((a, b) => a.id.localeCompare(b.id, "es"));
  const metrics: SemanticDraftMetrics = {
    highConfidenceUnits: unitProposals.filter((proposal) => proposal.meta.confidence === "high").length,
    highConfidenceConcepts: conceptProposals.filter((proposal) => proposal.meta.confidence === "high").length,
    automaticMappings: mappingProposals.filter((proposal) => proposal.meta.confidence === "high" && !proposal.hybrid).length,
    doubtfulMappings: mappingProposals.filter((proposal) => proposal.meta.confidence !== "high" || proposal.hybrid).length,
    doubtfulConceptBoundaries: dedupedExceptions.filter((exception) => exception.type === "concept_boundary").length,
    sourceIssues: dedupedExceptions.filter((exception) => exception.type === "source_review_required" || exception.type === "source_traceability").length,
    totalExceptions: dedupedExceptions.length,
    blockers: dedupedExceptions.filter((exception) => exception.blocker).length,
  };
  return { version: CONTENT_FACTORY_SEMANTIC_DRAFT_VERSION, topic: { oppositionCode: input.job.oppositionCode, topicNumber: input.job.topicNumber, topicTitle: input.job.topicTitle, codePrefix: input.job.codePrefix }, sourcePolicy: policy, units, concepts, mappings, unitProposals, conceptProposals, mappingProposals, studyScaffolds, semanticExceptions: dedupedExceptions, metrics, structuralDraft: { units, concepts, assignments: mappings } };
}

export function runContentFactoryTopicFromSemanticDraft(input: Omit<FactoryFastPipelineInput, "draft" | "extraExceptions"> & { semanticDraft: SemanticTopicDraft; operations?: FactoryFastPipelineOperations }): FactoryFastPipelineRun {
  return runContentFactoryTopic({
    ...input,
    draft: {
      units: input.semanticDraft.units,
      concepts: input.semanticDraft.concepts,
      assignments: input.semanticDraft.mappings,
      content: null,
      generatedQuestions: [],
    },
    extraExceptions: input.semanticDraft.semanticExceptions,
    operations: input.operations,
  });
}

export type SemanticGoldenBenchmark = {
  goldenUnits: number;
  proposedUnits: number;
  unitTitleMatches: number;
  goldenConcepts: number;
  proposedConcepts: number;
  conceptTitleMatches: number;
  goldenMappings: number;
  proposedMappings: number;
  exactCodeMappingMatches: number;
  semanticTitleMappingMatches: number;
  exceptions: number;
  blockers: number;
};

export function benchmarkSemanticDraftAgainstGolden(draft: SemanticTopicDraft, golden: Pick<V4StudyContentPackage, "units" | "concepts" | "questionMappings">): SemanticGoldenBenchmark {
  const goldenUnitTitles = new Set(golden.units.map((unit) => normalizeText(unit.title)));
  const goldenConceptByCode = new Map(golden.concepts.map((concept) => [concept.code, concept]));
  const proposedConceptByCode = new Map(draft.concepts.map((concept) => [concept.code, concept]));
  const goldenConceptTitles = new Set(golden.concepts.map((concept) => normalizeText(concept.title)));
  const goldenMappings = new Map(golden.questionMappings.map((mapping) => [mapping.questionCode, mapping.primaryConceptCode]));
  let exactCodeMappingMatches = 0;
  let semanticTitleMappingMatches = 0;
  for (const mapping of draft.mappings) {
    const goldenCode = goldenMappings.get(mapping.questionCode);
    if (!goldenCode) continue;
    if (goldenCode === mapping.primaryConceptCode) exactCodeMappingMatches += 1;
    const goldenTitle = goldenConceptByCode.get(goldenCode)?.title;
    const proposedTitle = proposedConceptByCode.get(mapping.primaryConceptCode)?.title;
    if (goldenTitle && proposedTitle && normalizeText(goldenTitle) === normalizeText(proposedTitle)) semanticTitleMappingMatches += 1;
  }
  return {
    goldenUnits: golden.units.length,
    proposedUnits: draft.units.length,
    unitTitleMatches: draft.units.filter((unit) => goldenUnitTitles.has(normalizeText(unit.title))).length,
    goldenConcepts: golden.concepts.length,
    proposedConcepts: draft.concepts.length,
    conceptTitleMatches: draft.concepts.filter((concept) => goldenConceptTitles.has(normalizeText(concept.title))).length,
    goldenMappings: golden.questionMappings.length,
    proposedMappings: draft.mappings.length,
    exactCodeMappingMatches,
    semanticTitleMappingMatches,
    exceptions: draft.semanticExceptions.length,
    blockers: draft.semanticExceptions.filter((exception) => exception.blocker).length,
  };
}
