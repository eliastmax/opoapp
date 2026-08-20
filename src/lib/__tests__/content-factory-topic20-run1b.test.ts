// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import {
  topic20CanonicalSourceRun1B,
  topic20Run1BPreMaterializationMetrics,
  topic20SemanticDraftRun1B,
  topic20WorkPacketsRun1B,
} from "../content-factory/consumers/topic-20-run1b";

describe("Content Factory Topic 20 RUN 1B canonical retry", () => {
  test("ingests the supplied CanonicalPageText[] through Factory.5 with no manual spans", () => {
    expect(topic20Run1BPreMaterializationMetrics.canonicalPages).toBe(37);
    expect(topic20Run1BPreMaterializationMetrics.canonicalSha256).toBe("96768192445fa7da87e09d265b0b578737d38ffca2559f22225ea49ac4cebe2a");
    expect(topic20CanonicalSourceRun1B.length).toBeGreaterThan(0);
    expect(topic20CanonicalSourceRun1B.every((span) => Boolean(span.text?.trim()))).toBe(true);
    expect(topic20SemanticDraftRun1B.mappings).toHaveLength(220);
  });

  test("Factory.5 removes confidence-only and missing-operation blockers when packets are executable", () => {
    expect(topic20Run1BPreMaterializationMetrics.confidenceOnlyBlockers).toBe(0);
    expect(topic20Run1BPreMaterializationMetrics.missingStudyContentBlockers).toBe(0);
    expect(topic20Run1BPreMaterializationMetrics.missingQuestionGeneratorBlockers).toBe(0);
    expect(topic20WorkPacketsRun1B.executableStudyContent).toBe(true);
    expect(topic20WorkPacketsRun1B.executableQuestions).toBe(true);
  });

  test("prints the exact pre-materialization RUN1B work to execute", () => {
    console.info("TOPIC20_RUN1B_PRE_METRICS", JSON.stringify(topic20Run1BPreMaterializationMetrics));
    console.info("TOPIC20_RUN1B_SPANS", JSON.stringify(topic20CanonicalSourceRun1B.map((span) => ({
      id: span.id,
      article: span.article,
      heading: span.heading,
      pageStart: span.pageStart,
      pageEnd: span.pageEnd,
      textLength: span.text?.length ?? 0,
    }))));
    console.info("TOPIC20_RUN1B_CONCEPTS", JSON.stringify(topic20SemanticDraftRun1B.conceptProposals.map((row) => ({
      code: row.concept.code,
      unitCode: row.concept.unitCode,
      title: row.concept.title,
      confidence: row.meta.confidence,
    }))));
    console.info("TOPIC20_RUN1B_QUESTION_PACKETS", JSON.stringify(topic20WorkPacketsRun1B.questions.map((packet) => ({
      questionCode: packet.questionCode,
      conceptCode: packet.conceptCode,
      unitCode: packet.unitCode,
      dimension: packet.dimension,
      sourceRefs: packet.sourceRefs,
      sourceSpanIds: packet.sourceSpans.map((span) => span.id),
      existingQuestionCodes: packet.existingQuestions.map((question) => question.code),
      traps: packet.traps,
    }))));
    console.info("TOPIC20_RUN1B_STUDY_PACKETS", JSON.stringify(topic20WorkPacketsRun1B.studyContent.map((packet) => ({
      conceptCode: packet.conceptCode,
      unitCode: packet.unitCode,
      conceptTitle: packet.conceptTitle,
      sourceSpanIds: packet.sourceSpans.map((span) => span.id),
      generationDimensions: packet.generationDimensions,
      traps: packet.traps,
      confusions: packet.confusions,
    }))));
  });
});
