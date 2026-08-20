// @ts-expect-error bun:test is provided by Bun
import { expect, test } from "bun:test";
import { canonicalPageTextToSemanticSourceSpans } from "../content-factory/canonical-source-ingest";
import { buildSemanticTopicDraft } from "../content-factory/semantic-draft";
import type { ContentFactoryJob, FactoryQuestionMetadata } from "../content-factory/types";
import { topic20CanonicalPageText } from "../content-factory/consumers/topic-20-canonical-page-text";
import { topic20SemanticInputPart1 } from "../content-factory/consumers/topic-20-semantic-input-part1";
import { topic20SemanticInputPart2 } from "../content-factory/consumers/topic-20-semantic-input-part2";
import { topic20SemanticInputPart3 } from "../content-factory/consumers/topic-20-semantic-input-part3";
import { topic20SemanticInputPart4 } from "../content-factory/consumers/topic-20-semantic-input-part4";

const rows = [...topic20SemanticInputPart1, ...topic20SemanticInputPart2, ...topic20SemanticInputPart3, ...topic20SemanticInputPart4];
const questions: FactoryQuestionMetadata[] = rows.map(([code, apartado, subapartado, conceptLabel, learningObjective, perspective, trapType, sourceReference, documentReference, pageStart, pageEnd]) => ({ code, active: true, apartado, subapartado, conceptLabel, learningObjective, perspective, trapType, sourceReference, documentReference, pageStart, pageEnd }));
const job: ContentFactoryJob = { version: "1.0", oppositionCode: "auxiliar-administrativo-sms", topicNumber: 20, mode: "existing_bank", codePrefix: "SMS-T20", coverageThreshold: 4, source: [{ label: "Temario_new.pdf", reference: "T20" }], sourcePolicy: { canonicalOnly: true, document: "Temario_new.pdf", externalVerificationAllowed: false }, existingQuestions: questions };
const spans = canonicalPageTextToSemanticSourceSpans(topic20CanonicalPageText, { document: "Temario_new.pdf", codePrefix: "SMS-T20", referencePrefix: "T20" });

test("Factory.6 keeps T20 semantic structure and mapping confidence stable", () => {
  const draft = buildSemanticTopicDraft({ job, canonicalSource: spans, existingQuestions: questions });
  expect(draft.concepts).toHaveLength(30);
  expect(draft.concepts.map((concept) => concept.code)).toEqual(Array.from({ length: 30 }, (_, index) => `SMS-T20-C${String(index + 1).padStart(2, "0")}`));
  expect(draft.mappings).toHaveLength(220);
  expect(draft.mappingProposals.filter((proposal) => proposal.meta.confidence === "high")).toHaveLength(32);
  expect(draft.mappingProposals.filter((proposal) => proposal.meta.confidence === "medium")).toHaveLength(188);
  expect(draft.mappingProposals.filter((proposal) => proposal.meta.confidence === "low")).toHaveLength(0);
});
