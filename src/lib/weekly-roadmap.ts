import type { Database } from "@/integrations/supabase/types";

export type WeeklyRoadmapRow =
  Database["public"]["Functions"]["get_weekly_roadmap"]["Returns"][number];

export type WeeklyRoadmapViewState =
  | { status: "active"; rows: WeeklyRoadmapRow[] }
  | { status: "week_complete"; row: WeeklyRoadmapRow }
  | { status: "no_days_remaining"; row: WeeklyRoadmapRow }
  | { status: "no_questions_available"; row: WeeklyRoadmapRow }
  | { status: "empty" };

export function weeklyRoadmapViewState(rows: WeeklyRoadmapRow[]): WeeklyRoadmapViewState {
  const terminal = rows.find(
    (row) =>
      row.reason_code === "week_complete" ||
      row.reason_code === "no_days_remaining" ||
      row.reason_code === "no_questions_available",
  );

  if (terminal?.reason_code === "week_complete") {
    return { status: "week_complete", row: terminal };
  }

  if (terminal?.reason_code === "no_days_remaining") {
    return { status: "no_days_remaining", row: terminal };
  }

  if (terminal?.reason_code === "no_questions_available") {
    return { status: "no_questions_available", row: terminal };
  }

  const sessions = rows.filter((row) => row.scheduled_date && row.topic_name && row.questions > 0);
  return sessions.length > 0 ? { status: "active", rows: sessions } : { status: "empty" };
}

export function roadmapProgress(row: WeeklyRoadmapRow) {
  if (row.target_sessions <= 0) return 0;
  return Math.min(100, Math.round((row.completed_sessions / row.target_sessions) * 100));
}

export function formatRoadmapDate(date: string) {
  return new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric" }).format(
    new Date(`${date}T12:00:00`),
  );
}

export function isRoadmapToday(date: string | null) {
  if (!date) return false;
  const today = new Intl.DateTimeFormat("en-CA").format(new Date());
  return date === today;
}
