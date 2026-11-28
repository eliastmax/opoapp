import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { TestsFirstProgressRow } from "@/lib/tests-first-progress";
import {
  activityDate,
  activityWindow,
  trainingActivity,
  type CompletedTraining,
} from "@/lib/training-overview";
import { toUserFacingError } from "@/lib/user-facing-error";

export function useTrainingProgress(userId: string, oppositionId?: string) {
  return useQuery({
    queryKey: ["tests-first-concept-progress", userId, oppositionId],
    enabled: Boolean(oppositionId),
    queryFn: async () => {
      const result = await supabase.rpc("get_my_tests_first_concept_progress");
      if (result.error) throw result.error;
      return (result.data ?? []) as TestsFirstProgressRow[];
    },
  });
}

export function useTrainingTopics(oppositionId?: string) {
  return useQuery({
    queryKey: ["training-topics", oppositionId],
    enabled: Boolean(oppositionId),
    queryFn: async () => {
      const result = await supabase
        .from("topics")
        .select("id, numero, nombre")
        .eq("opposition_id", oppositionId!)
        .order("numero")
        .order("id");
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

export function useTrainingActivity(userId: string, oppositionId?: string) {
  const day = activityDate(new Date());
  return useQuery({
    queryKey: ["training-activity", userId, oppositionId, day],
    enabled: Boolean(oppositionId),
    queryFn: async () => {
      const now = new Date();
      const weekStart = activityDate(activityWindow(now)[0]);
      const pageSize = 200;
      const tests: CompletedTraining[] = [];
      for (let offset = 0; ; offset += pageSize) {
        const result = await supabase
          .from("tests")
          .select("id, aciertos, fallos, fecha_finalizacion")
          .eq("user_id", userId)
          .eq("opposition_id", oppositionId!)
          .eq("completado", true)
          .lte("fecha_finalizacion", now.toISOString())
          .order("fecha_finalizacion", { ascending: false })
          .order("id", { ascending: false })
          .range(offset, offset + pageSize - 1);
        if (result.error) throw result.error;
        tests.push(...result.data);
        const summary = trainingActivity(tests, now);
        const lastDate = result.data.at(-1)?.fecha_finalizacion;
        if (
          result.data.length < pageSize ||
          (lastDate &&
            activityDate(new Date(lastDate)) < weekStart &&
            activityDate(new Date(lastDate)) < summary.gapDate)
        ) {
          return summary;
        }
      }
    },
  });
}

export function useConceptTraining() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async ({
      conceptId,
      questionCount,
    }: {
      conceptId: string;
      questionCount: number;
    }) => {
      const result = await supabase.rpc("create_tests_first_concept_test", {
        p_concept_ids: [conceptId],
        p_question_count: questionCount,
      });
      if (result.error) throw result.error;
      if (!result.data?.[0]) throw new Error("No se pudo crear el entrenamiento");
      return result.data[0];
    },
    onSuccess: (test) =>
      navigate({
        to: "/test/$id",
        params: { id: test.test_id },
        search: { block: undefined, session: undefined },
      }),
    onError: (error) => toast.error(toUserFacingError(error).message),
  });
}
