// @ts-expect-error bun:test is provided by Bun
import { expect, test } from "bun:test";
import { canonicalPageTextToSemanticSourceSpans } from "../content-factory/canonical-source-ingest";
import {
  buildSemanticTopicDraft,
} from "../content-factory/semantic-draft";
import {
  topic20ApprovedV4,
  topic20ContentFactoryJob,
  topic20ExistingQuestions,
  topic20SemanticDraftRun1B,
} from "../content-factory/consumers/topic-20-semantic-benchmark";
import { topic20CanonicalPageText } from "../content-factory/consumers/topic-20-canonical-page-text";
import { jaccard, normalizeText } from "../similarity";

const spans = canonicalPageTextToSemanticSourceSpans(topic20CanonicalPageText, {
  document: "Temario_new.pdf",
  codePrefix: "SMS-T20",
  referencePrefix: "T20 raw semantic safety",
});

const approvedPrimary = new Map(
  topic20ApprovedV4.questionMappings.map((mapping) => [mapping.questionCode, mapping.primaryConceptCode]),
);
const questionByCode = new Map(topic20ExistingQuestions.map((question) => [question.code, question]));

function semanticallyClearlyIncoherent(leftCode: string, rightCode: string) {
  const left = questionByCode.get(leftCode)!;
  const right = questionByCode.get(rightCode)!;
  const leftLabel = normalizeText(left.conceptLabel ?? "");
  const rightLabel = normalizeText(right.conceptLabel ?? "");
  const leftObjective = normalizeText(left.learningObjective ?? "");
  const rightObjective = normalizeText(right.learningObjective ?? "");
  if (leftLabel && leftLabel === rightLabel) return false;
  if (leftObjective && leftObjective === rightObjective) return false;
  return jaccard(leftLabel, rightLabel) < 0.25 && jaccard(leftObjective, rightObjective) < 0.25;
}

test("Factory.6 T20 approved replay preserves the reviewed 30-concept structure and mappings", () => {
  expect(topic20ApprovedV4.concepts).toHaveLength(30);
  expect(topic20ApprovedV4.questionMappings).toHaveLength(226);
  expect(topic20SemanticDraftRun1B.concepts).toHaveLength(30);
  expect(topic20SemanticDraftRun1B.concepts.map((concept) => concept.code)).toEqual(
    Array.from({ length: 30 }, (_, index) => `SMS-T20-C${String(index + 1).padStart(2, "0")}`),
  );
  expect(topic20SemanticDraftRun1B.mappings).toHaveLength(220);
  for (const mapping of topic20SemanticDraftRun1B.mappings) {
    expect(mapping.primaryConceptCode).toBe(approvedPrimary.get(mapping.questionCode));
  }
  expect(topic20SemanticDraftRun1B.semanticExceptions.filter((row) => row.type === "anchor_conflict")).toHaveLength(0);
});

test("Factory.6 T20 raw semantic safety prevents catastrophic overmerge without demanding historical rediscovery", () => {
  const raw = buildSemanticTopicDraft({
    job: topic20ContentFactoryJob,
    canonicalSource: spans,
    existingQuestions: topic20ExistingQuestions,
  });

  expect(raw.mappings).toHaveLength(topic20ExistingQuestions.length);
  expect(new Set(raw.mappings.map((mapping) => mapping.questionCode)).size).toBe(topic20ExistingQuestions.length);
  expect(raw.mappingProposals.filter((proposal) => proposal.meta.confidence === "low")).toHaveLength(0);

  const incoherentPairs: string[] = [];
  for (const proposal of raw.conceptProposals) {
    const codes = proposal.meta.affectedQuestionCodes;
    for (let left = 0; left < codes.length; left += 1) {
      for (let right = left + 1; right < codes.length; right += 1) {
        if (semanticallyClearlyIncoherent(codes[left], codes[right])) {
          incoherentPairs.push(`${codes[left]}|${codes[right]}|${proposal.concept.code}`);
        }
      }
    }
  }
  expect(incoherentPairs).toEqual([]);

  // Raw safety is read-only and cannot mutate the approved production fixture.
  expect(topic20ApprovedV4.concepts).toHaveLength(30);
  expect(topic20ApprovedV4.questionMappings).toHaveLength(226);
});
