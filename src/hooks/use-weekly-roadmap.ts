import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { WeeklyRoadmapRow } from "@/lib/weekly-roadmap";

export const weeklyRoadmapQueryKey = ["weekly-roadmap"] as const;

export function useWeeklyRoadmap() {
  return useQuery({
    queryKey: weeklyRoadmapQueryKey,
    queryFn: async (): Promise<WeeklyRoadmapRow[]> => {
      const { data, error } = await supabase.rpc("get_weekly_roadmap");
      if (error) throw error;
      return data ?? [];
    },
  });
}
