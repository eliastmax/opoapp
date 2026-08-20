import { HEADERS_V2 } from "../csv-parser";
import type { V4SourceRef } from "../v4-content-package";
import { calculateFactoryCoverage } from "./coverage";
import { planDirectedQuestionGeneration } from "./generation-plan";
import type { SemanticSourceSpan, SemanticTopicDraft } from "./semantic-draft";
import type {
  ContentFactoryJob,
  FactoryEvidenceDimension,
  FactoryQuestionGenerationSlot,
  FactoryQuestionMetadata,
} from "./types";

export type FactoryPacketSourceSpan = {
  id: string;
  document: string;
  reference: string;
  pageStart: number | null;
  pageEnd: number | null;
  heading?: string;
  article?: string | null;
  sectionPath?: string[];
  text: string;
};

export type FactoryPacketQuestionContext = Pick<
  FactoryQuestionMetadata,
  | "code"
  | "stem"
  | "conceptLabel"
  | "learningObjective"
  | "perspective"
  | "trapType"
  | "sourceReference"
  | "pageStart"
  | "pageEnd"
>;

export type FactoryStudyContentWorkPacket = {
  kind: "study_content";
  conceptCode: string;
  unitCode: string;
  conceptTitle: string;
  sourceSpans: FactoryPacketSourceSpan[];
  sourceRefs: V4SourceRef[];
  generationDimensions: FactoryEvidenceDimension[];
  existingQuestions: FactoryPacketQuestionContext[];
  traps: string[];
  confusions: string[];
  outputSchema: {
    summary: "string";
    essentials: "string[]";
    examKeys: "string[]";
    traps: "string[]";
    confusions: "string[]";
  };
  qaConstraints: string[];
  executable: boolean;
};

export type FactoryFlashcardWorkPacket = {
  kind: "flashcards";
  conceptCode: string;
  unitCode: string;
  sourceSpans: FactoryPacketSourceSpan[];
  sourceRefs: V4SourceRef[];
  seeds: {
    kind: string;
    focus: string;
    evidenceText: string;
  }[];
  existingQuestions: FactoryPacketQuestionContext[];
  outputSchema: {
    minimumCards: number;
    fields: readonly ["code", "conceptCode", "type", "prompt", "answer", "position", "sourceRefs"];
  };
  qaConstraints: string[];
  executable: boolean;
};

export type FactoryQuestionGenerationWorkPacket = {
  kind: "question_gap";
  questionCode: string;
  conceptCode: string;
  unitCode: string;
  dimension: FactoryEvidenceDimension;
  sourceSpans: FactoryPacketSourceSpan[];
  sourceRefs: V4SourceRef[];
  existingQuestions: FactoryPacketQuestionContext[];
  traps: string[];
  diversityConstraints: string[];
  outputSchema: {
    format: "V2_25_FIELDS";
    headers: typeof HEADERS_V2;
  };
  qaConstraints: string[];
  executable: boolean;
};

export type SemanticFactoryWorkPacketBundle = {
  studyContent: FactoryStudyContentWorkPacket[];
  flashcards: FactoryFlashcardWorkPacket[];
  questions: FactoryQuestionGenerationWorkPacket[];
  generationSlots: FactoryQuestionGenerationSlot[];
  missingCanonicalTextConceptCodes: string[];
  executableStudyContent: boolean;
  executableQuestions: boolean;
};

function clean(value?: string | null) {
  return value?.trim() ?? "";
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function sourceRef(span: SemanticSourceSpan): V4SourceRef {
  return {
    label: span.document,
    reference: clean(span.reference) || [span.document, clean(span.article), clean(span.heading)].filter(Boolean).join(", "),
    pageStart: span.pageStart ?? null,
    pageEnd: span.pageEnd ?? null,
  };
}

function packetSourceSpan(span: SemanticSourceSpan): FactoryPacketSourceSpan {
  return {
    id: span.id,
    document: span.document,
    reference: sourceRef(span).reference,
    pageStart: span.pageStart ?? null,
    pageEnd: span.pageEnd ?? null,
    heading: span.heading,
    article: span.article,
    sectionPath: span.sectionPath,
    text: clean(span.text),
  };
}

function contextQuestion(question: FactoryQuestionMetadata): FactoryPacketQuestionContext {
  return {
    code: question.code,
    stem: question.stem,
    conceptLabel: question.conceptLabel,
    learningObjective: question.learningObjective,
    perspective: question.perspective,
    trapType: question.trapType,
    sourceReference: question.sourceReference,
    pageStart: question.pageStart,
    pageEnd: question.pageEnd,
  };
}

function conceptContext(input: {
  semanticDraft: SemanticTopicDraft;
  canonicalSource: SemanticSourceSpan[];
  existingQuestions: FactoryQuestionMetadata[];
  conceptCode: string;
}) {
  const concept = input.semanticDraft.concepts.find((item) => item.code === input.conceptCode);
  if (!concept) throw new Error(`Unknown semantic concept ${input.conceptCode}.`);
  const scaffold = input.semanticDraft.studyScaffolds.find((item) => item.conceptCode === input.conceptCode);
  const spanIds = new Set(scaffold?.sourceSpanIds ?? []);
  const spans = input.canonicalSource.filter((span) => spanIds.has(span.id));
  const questionCodes = new Set(
    input.semanticDraft.mappings
      .filter((mapping) => mapping.primaryConceptCode === input.conceptCode)
      .map((mapping) => mapping.questionCode),
  );
  const relevantQuestions = input.existingQuestions
    .filter((question) => questionCodes.has(question.code))
    .map(contextQuestion);
  const refs = spans.map(sourceRef);
  const packetSpans = spans.map(packetSourceSpan);
  const executable = packetSpans.length > 0 && packetSpans.every((span) => span.text.length > 0);
  return { concept, scaffold, packetSpans, refs, relevantQuestions, executable };
}

function buildPacketBundle(input: {
  job: ContentFactoryJob;
  semanticDraft: SemanticTopicDraft;
  canonicalSource: SemanticSourceSpan[];
  generationSlots: FactoryQuestionGenerationSlot[];
  existingQuestions?: FactoryQuestionMetadata[];
}): SemanticFactoryWorkPacketBundle {
  const existingQuestions = input.existingQuestions ?? input.job.existingQuestions ?? [];
  const contexts = new Map(
    input.semanticDraft.concepts.map((concept) => [
      concept.code,
      conceptContext({
        semanticDraft: input.semanticDraft,
        canonicalSource: input.canonicalSource,
        existingQuestions,
        conceptCode: concept.code,
      }),
    ]),
  );

  const studyContent: FactoryStudyContentWorkPacket[] = input.semanticDraft.concepts.map((concept) => {
    const context = contexts.get(concept.code)!;
    return {
      kind: "study_content",
      conceptCode: concept.code,
      unitCode: concept.unitCode,
      conceptTitle: concept.title,
      sourceSpans: context.packetSpans,
      sourceRefs: context.refs,
      generationDimensions: context.scaffold?.generationDimensions ?? ["rule"],
      existingQuestions: context.relevantQuestions,
      traps: unique(context.relevantQuestions.map((question) => clean(question.trapType))),
      confusions: context.scaffold?.confusionCandidateConceptCodes ?? [],
      outputSchema: {
        summary: "string",
        essentials: "string[]",
        examKeys: "string[]",
        traps: "string[]",
        confusions: "string[]",
      },
      qaConstraints: [
        "Use only canonical source text included in this packet.",
        "Do not add legal rules, exceptions, deadlines or examples not supported by packet text.",
        "Preserve exact distinctions that affect exam answers.",
      ],
      executable: context.executable,
    };
  });

  const flashcards: FactoryFlashcardWorkPacket[] = input.semanticDraft.concepts.map((concept) => {
    const context = contexts.get(concept.code)!;
    return {
      kind: "flashcards",
      conceptCode: concept.code,
      unitCode: concept.unitCode,
      sourceSpans: context.packetSpans,
      sourceRefs: context.refs,
      seeds: (context.scaffold?.flashcardSeeds ?? []).map((seed) => ({
        kind: seed.kind,
        focus: seed.focus,
        evidenceText: seed.evidenceText,
      })),
      existingQuestions: context.relevantQuestions,
      outputSchema: {
        minimumCards: 2,
        fields: ["code", "conceptCode", "type", "prompt", "answer", "position", "sourceRefs"],
      },
      qaConstraints: [
        "Each answer must be recoverable directly from canonical packet text.",
        "Prefer direct recall and contrast over paraphrase trivia.",
        "Do not let flashcards create new mastery evidence dimensions by themselves.",
      ],
      executable: context.executable,
    };
  });

  const questions: FactoryQuestionGenerationWorkPacket[] = input.generationSlots.map((slot) => {
    const context = contexts.get(slot.conceptCode);
    if (!context) throw new Error(`Generation slot ${slot.questionCode} references unknown concept ${slot.conceptCode}.`);
    return {
      kind: "question_gap",
      questionCode: slot.questionCode,
      conceptCode: slot.conceptCode,
      unitCode: context.concept.unitCode,
      dimension: slot.dimension,
      sourceSpans: context.packetSpans,
      sourceRefs: context.refs,
      existingQuestions: context.relevantQuestions,
      traps: unique(context.relevantQuestions.map((question) => clean(question.trapType))),
      diversityConstraints: [
        `Cover the planned ${slot.dimension} dimension rather than repeating an already represented formulation.`,
        "Use four plausible options of comparable structure and length.",
        "Avoid literal or near-literal duplication of existing questions.",
        "Balance answer position against the generated batch.",
      ],
      outputSchema: {
        format: "V2_25_FIELDS",
        headers: HEADERS_V2,
      },
      qaConstraints: [
        "Use only canonical source text included in this packet.",
        "Keep the generated question bound to the supplied conceptCode and stable questionCode.",
        "Explanation and source/page metadata must be supported by packet source spans.",
      ],
      executable: context.executable,
    };
  });

  const missingCanonicalTextConceptCodes = input.semanticDraft.concepts
    .filter((concept) => !contexts.get(concept.code)?.executable)
    .map((concept) => concept.code)
    .sort();

  return {
    studyContent,
    flashcards,
    questions,
    generationSlots: input.generationSlots,
    missingCanonicalTextConceptCodes,
    executableStudyContent: studyContent.length > 0 && studyContent.every((packet) => packet.executable),
    executableQuestions: questions.length === 0 || questions.every((packet) => packet.executable),
  };
}

export function buildSemanticFactoryWorkPackets(input: {
  job: ContentFactoryJob;
  semanticDraft: SemanticTopicDraft;
  canonicalSource: SemanticSourceSpan[];
  generationSlots: FactoryQuestionGenerationSlot[];
  existingQuestions?: FactoryQuestionMetadata[];
}) {
  return buildPacketBundle(input);
}

/**
 * Prepares executable packets before Fast Pipeline operations are supplied.
 * Coverage and stable question slots remain deterministic; the agent then
 * executes only the packet payloads and returns typed artifacts to the runner.
 */
export function prepareSemanticFactoryWorkPackets(input: {
  job: ContentFactoryJob;
  semanticDraft: SemanticTopicDraft;
  canonicalSource: SemanticSourceSpan[];
}): SemanticFactoryWorkPacketBundle {
  const existingQuestions = input.job.existingQuestions ?? [];
  const coverage = calculateFactoryCoverage({
    questions: existingQuestions,
    concepts: input.semanticDraft.concepts,
    assignments: input.semanticDraft.mappings,
    threshold: input.job.coverageThreshold,
  });
  const generationSlots = planDirectedQuestionGeneration({
    coverage,
    codePrefix: input.job.codePrefix,
    usedQuestionCodes: existingQuestions.map((question) => question.code),
  });
  return buildPacketBundle({
    ...input,
    generationSlots,
    existingQuestions,
  });
}
