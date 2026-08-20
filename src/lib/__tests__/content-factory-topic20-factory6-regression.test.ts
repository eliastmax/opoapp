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

test("Factory.6 keeps approved T20 semantic count stable", () => {
  const draft = buildSemanticTopicDraft({ job, canonicalSource: spans, existingQuestions: questions });
  console.log("FACTORY6_T20_CLUSTERS", JSON.stringify(draft.conceptProposals.map((p) => ({ code: p.concept.code, title: p.concept.title, q: p.meta.affectedQuestionCodes, signals: p.meta.evidence.signals }))));
  expect(draft.concepts.length).toBe(30);
});
