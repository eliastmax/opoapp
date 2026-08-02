export const ASSESSMENT_OPTIONS = [
  { value: 0, label: "No lo he empezado" },
  { value: 25, label: "He tenido un primer contacto" },
  { value: 50, label: "Tengo una base" },
  { value: 75, label: "Lo llevo bastante bien" },
  { value: 100, label: "Me siento muy preparado" },
  { value: null, label: "No sé valorarlo" },
] as const;

export type TopicAssessmentValue = (typeof ASSESSMENT_OPTIONS)[number]["value"];

export type ExamTiming =
  | { precision: "exact"; value: string }
  | { precision: "month"; value: string }
  | { precision: "unknown"; value: null };

export type PreparationProfileDraft = {
  oppositionId: string;
  examTiming: ExamTiming | null;
  practiceDays: string[];
  questionsPerSession: number | null;
  topicAssessments: Record<string, TopicAssessmentValue>;
};

export type PreparationProfileStep = "opposition" | "exam" | "days" | "session" | "topics";

export const PREPARATION_PROFILE_STEPS: PreparationProfileStep[] = [
  "opposition",
  "exam",
  "days",
  "session",
  "topics",
];

export function preparationStepProgress(step: PreparationProfileStep) {
  const index = PREPARATION_PROFILE_STEPS.indexOf(step);
  return ((index + 1) / PREPARATION_PROFILE_STEPS.length) * 100;
}

export function assessedTopicCount(
  topicIds: string[],
  assessments: Record<string, TopicAssessmentValue>,
) {
  return topicIds.filter((id) => Object.prototype.hasOwnProperty.call(assessments, id)).length;
}

export function canContinuePreparationStep(
  step: PreparationProfileStep,
  draft: PreparationProfileDraft,
) {
  switch (step) {
    case "opposition":
      return Boolean(draft.oppositionId);
    case "exam":
      return draft.examTiming?.precision === "unknown" || Boolean(draft.examTiming?.value?.trim());
    case "days":
      return draft.practiceDays.length > 0;
    case "session":
      return draft.questionsPerSession !== null && draft.questionsPerSession > 0;
    case "topics":
      return true;
  }
}
