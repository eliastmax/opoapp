import type { ConceptMasteryState } from "./concept-mastery";
import type { V4TodayBlockKind } from "./v4-today-plan";

export type V4DailyBlock = {
  id: string;
  position: number;
  kind: V4TodayBlockKind;
  label: string;
  plannedMinutes: number;
  topicId: string;
  studyUnitId: string;
  conceptId: string | null;
  targetQuestions: number;
  retentionCheckpointDays: number | null;
  reasonCode: string;
  reason: string;
  status: "planned" | "in_progress" | "completed" | "skipped";
  masteryStateBefore: ConceptMasteryState | null;
  needsAttentionBefore: boolean;
  linkedTestId: string | null;
  startedAt: string | null;
  completedAt: string | null;
};

export type V4DailySession = {
  id: string;
  localDate: string;
  availableMinutes: number;
  plannedMinutes: number;
  status: "active" | "completed" | "closed_early";
  startedAt: string;
  completedAt: string | null;
  blocks: V4DailyBlock[];
};

export type V4LearnerConceptContent = {
  learnerTitle: string;
  introduction: string;
  mainContent: string;
  memoryKeys: string[];
  example: string | null;
  confusions: string[];
  learnerSourceRefs: string[];
};

export type V4StudyUnitPayload = {
  unit: {
    id: string;
    code: string;
    topicId: string;
    title: string;
    position: number;
    estimatedMinutes: number;
    studySummary: string;
    examKeys: unknown;
    confusions: unknown;
    traps: unknown;
    mnemonics: unknown;
    sourceRefs: unknown;
  };
  progress: {
    firstOpenedAt: string;
    lastOpenedAt: string;
    completedAt: string | null;
    completionCount: number;
  };
  concepts: Array<{
    id: string;
    code: string;
    title: string;
    description: string;
    position: number;
    activePrimaryQuestions: number;
    // Optional because the tutorial preview still uses the legacy direct catalog loader.
    learnerContent?: V4LearnerConceptContent | null;
  }>;
  flashcards: Array<{
    id: string;
    code: string;
    conceptId: string;
    cardType: string;
    prompt: string;
    answer: string;
    position: number;
    sourceRefs: unknown;
  }>;
};

export type V4DailyDebrief = {
  sessionId: string;
  status: "active" | "completed" | "closed_early";
  completedBlocks: number;
  totalBlocks: number;
  skippedBlocks: number;
  improvedConcepts: number;
  newlyRetainedConcepts: number;
  attentionResolved: number;
  attentionRemaining: number;
  testsCompleted: number;
  questionsAnswered: number;
  correctAnswers: number;
  wrongAnswers: number;
  doubtsMarked: number;
  flashcardsReviewed: number;
  flashcardsKnown: number;
  flashcardsUnsure: number;
  flashcardsMissed: number;
  nextDueOn: string | null;
  messageCode: string;
};

export const MASTERY_LABELS: Record<ConceptMasteryState, string> = {
  unseen: "No trabajado",
  seen: "Visto",
  verifying: "En comprobación",
  consolidating: "Consolidando",
  retained: "Retenido",
};

export const BLOCK_COPY: Record<
  V4TodayBlockKind,
  { action: string; purpose: string; next: string }
> = {
  review: {
    action: "Repasar",
    purpose: "Recupera lo aprendido sin apoyo.",
    next: "Después seguiremos con el siguiente bloque.",
  },
  repair: {
    action: "Corregir",
    purpose: "Aclara un fallo o una duda reciente.",
    next: "Después comprobaremos que quedó claro.",
  },
  advance: {
    action: "Estudiar",
    purpose: "Comprende una unidad nueva y sus ideas clave.",
    next: "Después intentarás recordarla sin mirar.",
  },
  verify: {
    action: "Comprobar",
    purpose: "Demuestra lo que sabes con preguntas distintas.",
    next: "Después OpoTest ajustará tu siguiente paso.",
  },
};

export function localDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function asTextList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;
          return String(record.text ?? record.label ?? record.value ?? "");
        }
        return "";
      })
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) return [value];
  return [];
}

export function formatDueDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long" }).format(
    new Date(`${value.slice(0, 10)}T12:00:00`),
  );
}
