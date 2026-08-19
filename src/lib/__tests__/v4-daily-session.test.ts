// @ts-expect-error bun:test is provided by the Bun test runtime
import { describe, expect, test } from "bun:test";
import { buildV4DailySessionDebrief, dailySessionPlanFromTodayPlan } from "../v4-daily-session";

describe("V4 daily session", () => {
  test("serializes the Today plan without inventing new work", () => {
    const result = dailySessionPlanFromTodayPlan({
      localDate: "2026-08-19T18:00:00+02:00",
      plan: {
        status: "ready",
        availableMinutes: 20,
        plannedMinutes: 13,
        unusedMinutes: 7,
        nextDueOn: null,
        blocks: [
          {
            kind: "advance",
            label: "Avanzar",
            minutes: 8,
            topicId: "t18",
            topicNumber: 18,
            topicName: "Procedimiento administrativo",
            studyUnitId: "u7",
            studyUnitCode: "SMS-T18-U07",
            studyUnitTitle: "Silencio administrativo",
            conceptId: null,
            conceptCode: null,
            conceptTitle: null,
            targetQuestions: 0,
            retentionCheckpointDays: null,
            reasonCode: "roadmap_study_unit",
            reason: "Encaja con la hoja de ruta.",
          },
          {
            kind: "verify",
            label: "Comprobar",
            minutes: 5,
            topicId: "t18",
            topicNumber: 18,
            topicName: "Procedimiento administrativo",
            studyUnitId: "u7",
            studyUnitCode: "SMS-T18-U07",
            studyUnitTitle: "Silencio administrativo",
            conceptId: "c14",
            conceptCode: "SMS-T18-C14",
            conceptTitle: "Regla y excepciones",
            targetQuestions: 2,
            retentionCheckpointDays: null,
            reasonCode: "start_verification",
            reason: "Necesitamos preguntas distintas.",
          },
        ],
      },
    });

    expect(result.localDate).toBe("2026-08-19");
    expect(result.availableMinutes).toBe(20);
    expect(result.blocks).toHaveLength(2);
    expect(result.blocks[1]).toMatchObject({ kind: "verify", conceptId: "c14", targetQuestions: 2 });
  });

  test("reports genuine concept improvement and newly retained concepts", () => {
    const result = buildV4DailySessionDebrief({
      sessionStatus: "completed",
      blockStatuses: ["completed", "completed", "completed"],
      concepts: [
        {
          beforeState: "seen",
          afterState: "consolidating",
          neededAttentionBefore: false,
          needsAttentionAfter: false,
        },
        {
          beforeState: "consolidating",
          afterState: "retained",
          neededAttentionBefore: true,
          needsAttentionAfter: false,
        },
      ],
    });

    expect(result).toMatchObject({
      status: "complete",
      completedBlocks: 3,
      improvedConcepts: 2,
      newlyRetainedConcepts: 1,
      attentionResolved: 1,
      attentionRemaining: 0,
      messageCode: "session_complete",
    });
  });

  test("keeps attention visible without framing a completed session as failure", () => {
    const result = buildV4DailySessionDebrief({
      sessionStatus: "completed",
      blockStatuses: ["completed", "completed"],
      concepts: [
        {
          beforeState: "consolidating",
          afterState: "consolidating",
          neededAttentionBefore: false,
          needsAttentionAfter: true,
        },
      ],
    });

    expect(result.messageCode).toBe("session_complete_attention");
    expect(result.attentionRemaining).toBe(1);
  });

  test("closing early is neutral and preserves unfinished work without debt language", () => {
    const result = buildV4DailySessionDebrief({
      sessionStatus: "closed_early",
      blockStatuses: ["completed", "skipped", "planned"],
      concepts: [],
    });

    expect(result).toMatchObject({
      status: "closed_early",
      completedBlocks: 1,
      skippedBlocks: 1,
      messageCode: "session_closed_early",
    });
  });
});
