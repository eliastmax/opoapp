// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import { evaluateConceptMastery, type ConceptQuestionEvidence } from "../concept-mastery";
import { auditV4ConceptCoverage } from "../v4-content-coverage";
import { validateV4StudyContentPackage, type V4StudyContentPackage } from "../v4-content-package";
import { validateV4ConceptCheckRequest } from "../v4-concept-check";
import type { V4SourceCapacity } from "../v4-source-capacity";

const capacity = (ceiling: 1 | 2 | 3): V4SourceCapacity => ({
  status: "source_limited",
  sourceSupportedCeiling: ceiling,
  reason: `Canonical source supports ${ceiling} independent dimension(s).`,
});

function q(
  questionId: string,
  sessionId: string,
  answeredAt: string,
  correct = true,
  extra: Partial<ConceptQuestionEvidence> = {},
): ConceptQuestionEvidence {
  return { questionId, sessionId, answeredAt, correct, ...extra };
}

describe("V4 source-limited mastery", () => {
  test("keeps the standard 4/3/70%/2-session policy unchanged", () => {
    const evidence = [
      q("q1", "s1", "2026-01-01T10:00:00Z"),
      q("q2", "s1", "2026-01-01T10:01:00Z"),
      q("q3", "s2", "2026-01-02T10:00:00Z"),
      q("q4", "s2", "2026-01-02T10:01:00Z", false),
    ];
    const result = evaluateConceptMastery({ questionEvidence: evidence });
    expect(result.state).toBe("consolidating");
    expect(result.distinctQuestions).toBe(4);
    expect(result.safeCorrectQuestions).toBe(3);
    expect(result.safeAccuracy).toBe(0.75);
    expect(result.distinctSessions).toBe(2);
  });

  test("ceiling 1 needs two safe sessions and delayed 3d/7d checks", () => {
    const cap = capacity(1);
    const first = [q("q1", "s1", "2026-01-01T10:00:00Z")];
    const once = evaluateConceptMastery({ sourceCapacity: cap, questionEvidence: first });
    expect(once.state).not.toBe("consolidating");
    expect(once.distinctQuestions).toBe(1);

    const twoSessions = [...first, q("q1", "s2", "2026-01-02T10:00:00Z")];
    const consolidated = evaluateConceptMastery({ sourceCapacity: cap, questionEvidence: twoSessions });
    expect(consolidated.state).toBe("consolidating");
    expect(consolidated.distinctQuestions).toBe(1);
    expect(consolidated.distinctSessions).toBe(2);

    const threeDay = [...twoSessions, q("q1", "s3", "2026-01-05T10:00:00Z", true, { retentionCheckpointDays: 3 })];
    expect(evaluateConceptMastery({ sourceCapacity: cap, questionEvidence: threeDay }).state).toBe("consolidating");

    const sevenDay = [...threeDay, q("q1", "s4", "2026-01-09T10:00:00Z", true, { retentionCheckpointDays: 7 })];
    const retained = evaluateConceptMastery({ sourceCapacity: cap, questionEvidence: sevenDay });
    expect(retained.state).toBe("retained");
    expect(retained.distinctQuestions).toBe(1);
    expect(retained.retentionChecksPassed).toBe(2);
  });

  test("ceiling 1 doubt is unsafe and a latest failure raises attention without inflating diversity", () => {
    const cap = capacity(1);
    const doubt = evaluateConceptMastery({
      sourceCapacity: cap,
      questionEvidence: [
        q("q1", "s1", "2026-01-01T10:00:00Z"),
        q("q1", "s2", "2026-01-02T10:00:00Z", true, { markedDoubt: true }),
      ],
    });
    expect(doubt.distinctQuestions).toBe(1);
    expect(doubt.safeCorrectQuestions).toBe(0);
    expect(doubt.needsAttention).toBe(true);

    const failed = evaluateConceptMastery({
      previousState: "retained",
      sourceCapacity: cap,
      questionEvidence: [
        q("q1", "s1", "2026-01-01T10:00:00Z"),
        q("q1", "s2", "2026-01-02T10:00:00Z"),
        q("q1", "s3", "2026-01-09T10:00:00Z", false),
      ],
    });
    expect(failed.needsAttention).toBe(true);
    expect(failed.distinctQuestions).toBe(1);
    expect(failed.state).toBe("consolidating");
  });

  test("ceiling 2 requires both distinct questions and two sessions, then rotates both for retention", () => {
    const cap = capacity(2);
    const oneQuestion = [q("q1", "s1", "2026-01-01T10:00:00Z"), q("q1", "s2", "2026-01-02T10:00:00Z")];
    expect(evaluateConceptMastery({ sourceCapacity: cap, questionEvidence: oneQuestion }).state).not.toBe("consolidating");

    const base = [q("q1", "s1", "2026-01-01T10:00:00Z"), q("q2", "s2", "2026-01-02T10:00:00Z")];
    expect(evaluateConceptMastery({ sourceCapacity: cap, questionEvidence: base }).state).toBe("consolidating");

    const retained = evaluateConceptMastery({
      sourceCapacity: cap,
      questionEvidence: [
        ...base,
        q("q1", "r3", "2026-01-05T10:00:00Z", true, { retentionCheckpointDays: 3 }),
        q("q2", "r7", "2026-01-09T10:00:00Z", true, { retentionCheckpointDays: 7 }),
      ],
    });
    expect(retained.state).toBe("retained");
  });

  test("ceiling 3 requires exactly the three independent questions and never a fourth", () => {
    const cap = capacity(3);
    const evidence = [
      q("q1", "s1", "2026-01-01T10:00:00Z"),
      q("q2", "s1", "2026-01-01T10:01:00Z"),
      q("q3", "s2", "2026-01-02T10:00:00Z"),
    ];
    const result = evaluateConceptMastery({ sourceCapacity: cap, questionEvidence: evidence });
    expect(result.state).toBe("consolidating");
    expect(result.distinctQuestions).toBe(3);
    expect(result.safeCorrectQuestions).toBe(3);
    expect(result.safeAccuracy).toBe(1);
  });
});

describe("V4 source-limited coverage and package contract", () => {
  test("primary below ceiling is actionable; equality is complete source_limited; above ceiling is invalid", () => {
    const cap = capacity(2);
    const one = auditV4ConceptCoverage({
      questions: [{ id: "q1" }], concepts: [{ id: "c1", sourceCapacity: cap }],
      mappings: [{ questionId: "q1", conceptId: "c1", role: "primary" }],
    });
    expect(one.underCoveredConceptIds).toEqual(["c1"]);
    expect(one.conceptCoverage[0]).toMatchObject({ status: "coverage_gap", actionableMissingPrimaryQuestions: 1, missingPrimaryQuestions: 3 });

    const two = auditV4ConceptCoverage({
      questions: [{ id: "q1" }, { id: "q2" }], concepts: [{ id: "c1", sourceCapacity: cap }],
      mappings: ["q1", "q2"].map((questionId) => ({ questionId, conceptId: "c1", role: "primary" as const })),
    });
    expect(two.underCoveredConceptIds).toEqual([]);
    expect(two.nominalUnderCoveredConceptIds).toEqual(["c1"]);
    expect(two.conceptCoverage[0]).toMatchObject({ status: "source_limited", actionableMissingPrimaryQuestions: 0, missingPrimaryQuestions: 2, sourceSupportedCeiling: 2 });

    expect(() => auditV4ConceptCoverage({
      questions: [{ id: "q1" }, { id: "q2" }, { id: "q3" }], concepts: [{ id: "c1", sourceCapacity: cap }],
      mappings: ["q1", "q2", "q3"].map((questionId) => ({ questionId, conceptId: "c1", role: "primary" as const })),
    })).toThrow("exceeds sourceSupportedCeiling");
  });

  test("legacy package omits sourceCapacity while source_limited package validates it", () => {
    const base: V4StudyContentPackage = {
      version: "4.0", oppositionCode: "test", topicNumber: 1,
      units: [{ code: "U1", title: "Unit", position: 1, estimatedMinutes: 5, studySummary: "Summary", examKeys: [], confusions: [], traps: [], mnemonics: [], sourceRefs: [{ label: "Source", reference: "p. 1" }] }],
      concepts: [{ code: "C1", unitCode: "U1", title: "Concept", description: "", position: 1 }],
      questionMappings: ["Q1", "Q2", "Q3", "Q4"].map((questionCode) => ({ questionCode, primaryConceptCode: "C1" })),
      flashcards: [{ code: "F1", conceptCode: "C1", type: "direct", prompt: "Prompt", answer: "Answer", position: 1 }],
    };
    expect(validateV4StudyContentPackage(base).valid).toBe(true);

    const limited: V4StudyContentPackage = {
      ...base,
      concepts: [{ ...base.concepts[0], sourceCapacity: capacity(2) }],
      questionMappings: base.questionMappings.slice(0, 2),
    };
    const validation = validateV4StudyContentPackage(limited);
    expect(validation.valid).toBe(true);
    expect(validation.coverage.underCoveredConceptIds).toEqual([]);
    expect(validation.coverage.conceptCoverage[0].status).toBe("source_limited");
  });

  test("source_review_required cannot cross the production V4 package boundary", () => {
    const pkg = {
      version: "4.0", oppositionCode: "test", topicNumber: 1,
      units: [{ code: "U1", title: "Unit", position: 1, estimatedMinutes: 5, studySummary: "Summary", examKeys: [], confusions: [], traps: [], mnemonics: [], sourceRefs: [{ label: "Source", reference: "p. 1" }] }],
      concepts: [{ code: "C1", unitCode: "U1", title: "Concept", description: "", position: 1, sourceCapacity: { status: "source_review_required", reason: "ambiguous" } }],
      questionMappings: [], flashcards: [],
    } as unknown as V4StudyContentPackage;
    expect(validateV4StudyContentPackage(pkg).errors.some((issue) => issue.code === "invalid_source_capacity")).toBe(true);
  });
});

describe("V4 source-limited check request contract", () => {
  test("ceiling 1 permits one-question verify while standard verify remains 2..4", () => {
    expect(validateV4ConceptCheckRequest({ conceptId: "c1", questionCount: 1, mode: "verify" }).ok).toBe(false);
    expect(validateV4ConceptCheckRequest({ conceptId: "c1", questionCount: 1, mode: "verify", sourceCapacity: capacity(1) }).ok).toBe(true);
    expect(validateV4ConceptCheckRequest({ conceptId: "c1", questionCount: 2, mode: "verify", sourceCapacity: capacity(1) }).ok).toBe(false);
  });
});
