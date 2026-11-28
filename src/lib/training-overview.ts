import { format, startOfDay, subDays } from "date-fns";
import {
  hasLearnerAttention,
  testsFirstStateTotals,
  type TestsFirstProgressRow,
} from "./tests-first-progress";

export function percent(count: number, total: number) {
  return total > 0 ? Math.round((count / total) * 100) : null;
}

export function coverage(rows: TestsFirstProgressRow[]) {
  const states = testsFirstStateTotals(rows);
  return {
    states,
    total: rows.length,
    worked: rows.length - states.not_evaluated,
    mastered: states.mastered,
  };
}

export type Coverage = ReturnType<typeof coverage>;

export function priorityKnowledge(rows: TestsFirstProgressRow[]) {
  return rows
    .filter(hasLearnerAttention)
    .sort(
      (a, b) =>
        Number(b.learner_state === "needs_reinforcement") -
          Number(a.learner_state === "needs_reinforcement") ||
        b.doubt_answers - a.doubt_answers ||
        (a.safe_accuracy ?? Infinity) - (b.safe_accuracy ?? Infinity) ||
        a.concept_title.localeCompare(b.concept_title, "es"),
    );
}

export function recommendKnowledge(rows: TestsFirstProgressRow[]) {
  const available = (row: TestsFirstProgressRow) => row.active_primary_question_count >= 3;
  const priority = priorityKnowledge(rows).find(available);
  const next =
    priority ?? rows.find((row) => row.learner_state === "not_evaluated" && available(row));
  if (!next) return null;
  return {
    row: next,
    questionCount: Math.min(5, next.active_primary_question_count),
    reason: priority ? "reinforce" : "evaluate",
  } as const;
}

export type CompletedTraining = {
  id: string;
  aciertos: number;
  fallos: number;
  fecha_finalizacion: string | null;
};

export function activityDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function activityWindow(now: Date) {
  return Array.from({ length: 7 }, (_, i) => startOfDay(subDays(now, 6 - i)));
}

export function trainingActivity(tests: CompletedTraining[], now: Date) {
  const byDate = new Map<string, CompletedTraining[]>();
  for (const test of tests) {
    if (!test.fecha_finalizacion) continue;
    const key = activityDate(new Date(test.fecha_finalizacion));
    const day = byDate.get(key) ?? [];
    day.push(test);
    byDate.set(key, day);
  }

  const days = activityWindow(now).map((date) => ({
    date,
    count: byDate.get(activityDate(date))?.length ?? 0,
  }));
  const week = days.flatMap(({ date }) => byDate.get(activityDate(date)) ?? []);
  const correct = week.reduce((total, test) => total + test.aciertos, 0);
  const answered = correct + week.reduce((total, test) => total + test.fallos, 0);
  let date = byDate.has(activityDate(now)) ? now : subDays(now, 1);
  let streak = 0;
  while (byDate.has(activityDate(date))) {
    streak++;
    date = subDays(date, 1);
  }
  return {
    days,
    streak,
    gapDate: activityDate(date),
    tests: week.length,
    answered,
    correct,
    accuracy: percent(correct, answered),
  };
}
