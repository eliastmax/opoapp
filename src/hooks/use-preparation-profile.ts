import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  emptyPreparationProfileDraft,
  practiceDaysFromDatabase,
  practiceDaysToDatabase,
  type PreparationProfileDraft,
  type PreparationProfileStatus,
  type PreparationProfileStep,
  type TopicAssessmentValue,
} from "@/lib/preparation-profile";
import { activeOppositionQueryKey } from "@/hooks/use-active-opposition";

export type StoredPreparationProfile = {
  draft: PreparationProfileDraft;
  status: PreparationProfileStatus;
  currentStep: PreparationProfileStep;
  currentTopicId: string | null;
  completedAt: string | null;
  updatedAt: string;
};

export type SavePreparationProfileInput = {
  draft: PreparationProfileDraft;
  currentStep: PreparationProfileStep;
  currentTopicId: string | null;
  complete: boolean;
};

export const preparationProfileQueryKey = (oppositionId: string) => [
  "preparation-profile",
  oppositionId,
];

export function usePreparationProfile(oppositionId?: string) {
  return useQuery({
    queryKey: preparationProfileQueryKey(oppositionId ?? "none"),
    enabled: Boolean(oppositionId),
    queryFn: async (): Promise<StoredPreparationProfile | null> => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw userError ?? new Error("Sesión no válida");

      const { data: profile, error: profileError } = await supabase
        .from("preparation_profiles")
        .select(
          "opposition_id, exam_precision, exam_value, practice_days, questions_per_session, current_step, current_topic_id, status, completed_at, updated_at",
        )
        .eq("user_id", userData.user.id)
        .eq("opposition_id", oppositionId!)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile) return null;

      const { data: assessments, error: assessmentsError } = await supabase
        .from("topic_self_assessments")
        .select("topic_id, estimated_percentage")
        .eq("user_id", userData.user.id)
        .eq("opposition_id", oppositionId!);
      if (assessmentsError) throw assessmentsError;

      const topicAssessments = Object.fromEntries(
        (assessments ?? []).map((assessment) => [
          assessment.topic_id,
          assessment.estimated_percentage as TopicAssessmentValue,
        ]),
      );
      const examTiming = profile.exam_precision
        ? profile.exam_precision === "unknown"
          ? ({ precision: "unknown", value: null } as const)
          : {
              precision:
                profile.exam_precision === "exact" ? ("exact" as const) : ("month" as const),
              value: profile.exam_value ?? "",
            }
        : null;

      return {
        draft: {
          oppositionId: profile.opposition_id,
          examTiming,
          practiceDays: practiceDaysFromDatabase(profile.practice_days),
          questionsPerSession: profile.questions_per_session,
          topicAssessments,
        },
        status: profile.status as PreparationProfileStatus,
        currentStep: profile.current_step as PreparationProfileStep,
        currentTopicId: profile.current_topic_id,
        completedAt: profile.completed_at,
        updatedAt: profile.updated_at,
      };
    },
  });
}

export function useSavePreparationProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    scope: { id: "preparation-profile-save" },
    mutationFn: async ({
      draft,
      currentStep,
      currentTopicId,
      complete,
    }: SavePreparationProfileInput) => {
      const { error } = await supabase.rpc("save_preparation_profile", {
        p_opposition_id: draft.oppositionId,
        p_exam_precision: draft.examTiming?.precision ?? null,
        p_exam_value: draft.examTiming?.value ?? null,
        p_practice_days: practiceDaysToDatabase(draft.practiceDays),
        p_questions_per_session: draft.questionsPerSession,
        p_current_step: currentStep,
        p_current_topic_id: currentTopicId,
        p_topic_assessments: draft.topicAssessments,
        p_complete: complete,
      });
      if (error) throw error;
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: preparationProfileQueryKey(variables.draft.oppositionId),
        }),
        queryClient.invalidateQueries({ queryKey: activeOppositionQueryKey }),
        queryClient.invalidateQueries({ queryKey: ["topics"] }),
      ]);
    },
  });
}

export { emptyPreparationProfileDraft };
