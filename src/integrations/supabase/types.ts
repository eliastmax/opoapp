export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string;
          id: string;
          nombre: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          nombre?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          nombre?: string;
        };
        Relationships: [];
      };
      question_statistics: {
        Row: {
          answered_count: number;
          appearances_count: number;
          correct_count: number;
          current_correct_streak: number;
          current_incorrect_streak: number;
          doubt_count: number;
          incorrect_count: number;
          last_answered_at: string | null;
          last_correct_at: string | null;
          last_doubted_at: string | null;
          last_incorrect_at: string | null;
          last_seen_at: string | null;
          next_review_at: string | null;
          question_id: string;
          retention_level: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          answered_count?: number;
          appearances_count?: number;
          correct_count?: number;
          current_correct_streak?: number;
          current_incorrect_streak?: number;
          doubt_count?: number;
          incorrect_count?: number;
          last_answered_at?: string | null;
          last_correct_at?: string | null;
          last_doubted_at?: string | null;
          last_incorrect_at?: string | null;
          last_seen_at?: string | null;
          next_review_at?: string | null;
          question_id: string;
          retention_level?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          answered_count?: number;
          appearances_count?: number;
          correct_count?: number;
          current_correct_streak?: number;
          current_incorrect_streak?: number;
          doubt_count?: number;
          incorrect_count?: number;
          last_answered_at?: string | null;
          last_correct_at?: string | null;
          last_doubted_at?: string | null;
          last_incorrect_at?: string | null;
          last_seen_at?: string | null;
          next_review_at?: string | null;
          question_id?: string;
          retention_level?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "question_statistics_owner_question_fk";
            columns: ["user_id", "question_id"];
            isOneToOne: true;
            referencedRelation: "questions";
            referencedColumns: ["user_id", "id"];
          },
        ];
      };
      questions: {
        Row: {
          activa: boolean;
          apartado: string | null;
          codigo: string;
          concepto: string | null;
          created_at: string;
          dificultad: Database["public"]["Enums"]["dificultad_enum"];
          dificultad_conceptual: Database["public"]["Enums"]["dificultad_enum"] | null;
          dificultad_examen: Database["public"]["Enums"]["dificultad_enum"] | null;
          documento_referencia: string | null;
          explicacion: string;
          frecuencia_historica: string | null;
          id: string;
          nivel_pedagogico: string | null;
          objetivo_aprendizaje: string | null;
          opcion_a: string;
          opcion_b: string;
          opcion_c: string;
          opcion_d: string;
          pagina_fin: number | null;
          pagina_inicio: number | null;
          perspectiva: string | null;
          pregunta: string;
          referencia_fuente: string;
          respuesta_correcta: Database["public"]["Enums"]["respuesta_enum"];
          subject_id: string;
          subtopic_id: string | null;
          tipo_trampa: string | null;
          topic_id: string;
          user_id: string;
        };
        Insert: {
          activa?: boolean;
          apartado?: string | null;
          codigo: string;
          concepto?: string | null;
          created_at?: string;
          dificultad: Database["public"]["Enums"]["dificultad_enum"];
          dificultad_conceptual?: Database["public"]["Enums"]["dificultad_enum"] | null;
          dificultad_examen?: Database["public"]["Enums"]["dificultad_enum"] | null;
          documento_referencia?: string | null;
          explicacion?: string;
          frecuencia_historica?: string | null;
          id?: string;
          nivel_pedagogico?: string | null;
          objetivo_aprendizaje?: string | null;
          opcion_a: string;
          opcion_b: string;
          opcion_c: string;
          opcion_d: string;
          pagina_fin?: number | null;
          pagina_inicio?: number | null;
          perspectiva?: string | null;
          pregunta: string;
          referencia_fuente?: string;
          respuesta_correcta: Database["public"]["Enums"]["respuesta_enum"];
          subject_id: string;
          subtopic_id?: string | null;
          tipo_trampa?: string | null;
          topic_id: string;
          user_id: string;
        };
        Update: {
          activa?: boolean;
          apartado?: string | null;
          codigo?: string;
          concepto?: string | null;
          created_at?: string;
          dificultad?: Database["public"]["Enums"]["dificultad_enum"];
          dificultad_conceptual?: Database["public"]["Enums"]["dificultad_enum"] | null;
          dificultad_examen?: Database["public"]["Enums"]["dificultad_enum"] | null;
          documento_referencia?: string | null;
          explicacion?: string;
          frecuencia_historica?: string | null;
          id?: string;
          nivel_pedagogico?: string | null;
          objetivo_aprendizaje?: string | null;
          opcion_a?: string;
          opcion_b?: string;
          opcion_c?: string;
          opcion_d?: string;
          pagina_fin?: number | null;
          pagina_inicio?: number | null;
          perspectiva?: string | null;
          pregunta?: string;
          referencia_fuente?: string;
          respuesta_correcta?: Database["public"]["Enums"]["respuesta_enum"];
          subject_id?: string;
          subtopic_id?: string | null;
          tipo_trampa?: string | null;
          topic_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "questions_owner_subject_fk";
            columns: ["user_id", "subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "questions_owner_subtopic_fk";
            columns: ["user_id", "subtopic_id"];
            isOneToOne: false;
            referencedRelation: "subtopics";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "questions_owner_topic_fk";
            columns: ["user_id", "topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "questions_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "questions_subtopic_id_fkey";
            columns: ["subtopic_id"];
            isOneToOne: false;
            referencedRelation: "subtopics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "questions_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
        ];
      };
      subjects: {
        Row: {
          created_at: string;
          descripcion: string | null;
          id: string;
          nombre: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          descripcion?: string | null;
          id?: string;
          nombre: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          descripcion?: string | null;
          id?: string;
          nombre?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      subtopics: {
        Row: {
          created_at: string;
          id: string;
          nombre: string;
          topic_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          nombre: string;
          topic_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          nombre?: string;
          topic_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subtopics_owner_topic_fk";
            columns: ["user_id", "topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "subtopics_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
        ];
      };
      test_answers: {
        Row: {
          correcta: boolean | null;
          created_at: string;
          id: string;
          marked_doubt: boolean;
          orden: number;
          question_id: string;
          respuesta_usuario: Database["public"]["Enums"]["respuesta_enum"] | null;
          test_id: string;
          user_id: string;
        };
        Insert: {
          correcta?: boolean | null;
          created_at?: string;
          id?: string;
          marked_doubt?: boolean;
          orden: number;
          question_id: string;
          respuesta_usuario?: Database["public"]["Enums"]["respuesta_enum"] | null;
          test_id: string;
          user_id: string;
        };
        Update: {
          correcta?: boolean | null;
          created_at?: string;
          id?: string;
          marked_doubt?: boolean;
          orden?: number;
          question_id?: string;
          respuesta_usuario?: Database["public"]["Enums"]["respuesta_enum"] | null;
          test_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "test_answers_owner_question_fk";
            columns: ["user_id", "question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "test_answers_owner_test_fk";
            columns: ["user_id", "test_id"];
            isOneToOne: false;
            referencedRelation: "tests";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "test_answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "test_answers_test_id_fkey";
            columns: ["test_id"];
            isOneToOne: false;
            referencedRelation: "tests";
            referencedColumns: ["id"];
          },
        ];
      };
      test_question_selection: {
        Row: {
          algorithm_version: string;
          base_weight: number;
          created_at: string;
          final_weight: number;
          overlap_exception: boolean;
          question_id: string;
          selection_group: string;
          selection_order: number;
          selection_reason: string;
          test_id: string;
          user_id: string;
          was_in_previous_test: boolean;
        };
        Insert: {
          algorithm_version?: string;
          base_weight: number;
          created_at?: string;
          final_weight: number;
          overlap_exception?: boolean;
          question_id: string;
          selection_group: string;
          selection_order: number;
          selection_reason: string;
          test_id: string;
          user_id: string;
          was_in_previous_test?: boolean;
        };
        Update: {
          algorithm_version?: string;
          base_weight?: number;
          created_at?: string;
          final_weight?: number;
          overlap_exception?: boolean;
          question_id?: string;
          selection_group?: string;
          selection_order?: number;
          selection_reason?: string;
          test_id?: string;
          user_id?: string;
          was_in_previous_test?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "test_question_selection_owner_question_fk";
            columns: ["user_id", "question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "test_question_selection_owner_test_fk";
            columns: ["user_id", "test_id"];
            isOneToOne: false;
            referencedRelation: "tests";
            referencedColumns: ["user_id", "id"];
          },
        ];
      };
      tests: {
        Row: {
          aciertos: number;
          completado: boolean;
          created_at: string;
          exam_duration_minutes: number | null;
          fallos: number;
          fecha_finalizacion: string | null;
          fecha_inicio: string;
          id: string;
          learning_stage: string | null;
          numero_preguntas: number;
          porcentaje: number;
          sin_responder: number;
          stage_free_mode: boolean;
          tipo: string;
          user_id: string;
        };
        Insert: {
          aciertos?: number;
          completado?: boolean;
          created_at?: string;
          exam_duration_minutes?: number | null;
          fallos?: number;
          fecha_finalizacion?: string | null;
          fecha_inicio?: string;
          id?: string;
          learning_stage?: string | null;
          numero_preguntas: number;
          porcentaje?: number;
          sin_responder?: number;
          stage_free_mode?: boolean;
          tipo: string;
          user_id: string;
        };
        Update: {
          aciertos?: number;
          completado?: boolean;
          created_at?: string;
          exam_duration_minutes?: number | null;
          fallos?: number;
          fecha_finalizacion?: string | null;
          fecha_inicio?: string;
          id?: string;
          learning_stage?: string | null;
          numero_preguntas?: number;
          porcentaje?: number;
          sin_responder?: number;
          stage_free_mode?: boolean;
          tipo?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      topics: {
        Row: {
          created_at: string;
          id: string;
          nombre: string;
          numero: number;
          subject_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          nombre: string;
          numero: number;
          subject_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          nombre?: string;
          numero?: number;
          subject_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "topics_owner_subject_fk";
            columns: ["user_id", "subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "topics_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      active_doubt_questions: {
        Row: {
          dificultad: Database["public"]["Enums"]["dificultad_enum"] | null;
          last_reviewed_at: string | null;
          question_id: string | null;
          subtopic_id: string | null;
          topic_id: string | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "questions_subtopic_id_fkey";
            columns: ["subtopic_id"];
            isOneToOne: false;
            referencedRelation: "subtopics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "questions_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "test_answers_owner_question_fk";
            columns: ["user_id", "question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "test_answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
        ];
      };
      active_failed_questions: {
        Row: {
          dificultad: Database["public"]["Enums"]["dificultad_enum"] | null;
          last_answered_at: string | null;
          question_id: string | null;
          subtopic_id: string | null;
          topic_id: string | null;
          user_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "questions_subtopic_id_fkey";
            columns: ["subtopic_id"];
            isOneToOne: false;
            referencedRelation: "subtopics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "questions_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "test_answers_owner_question_fk";
            columns: ["user_id", "question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["user_id", "id"];
          },
          {
            foreignKeyName: "test_answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      complete_test: {
        Args: { p_test_id: string };
        Returns: {
          aciertos: number;
          fallos: number;
          porcentaje: number;
          sin_responder: number;
        }[];
      };
      calculate_retention_state: {
        Args: {
          p_answered_at: string;
          p_correct: boolean | null;
          p_current_level: number;
          p_current_next_review_at: string | null;
          p_marked_doubt: boolean;
        };
        Returns: {
          next_review_at: string | null;
          retention_level: number;
        }[];
      };
      create_smart_test: {
        Args: {
          p_difficulties?: Database["public"]["Enums"]["dificultad_enum"][];
          p_question_count?: number;
          p_subtopic_ids?: string[];
          p_topic_id: string;
        };
        Returns: {
          overlap_count: number;
          overlap_limit: number;
          selected_count: number;
          test_id: string;
          used_overlap_exception: boolean;
        }[];
      };
      create_recommended_test: {
        Args: { p_question_count?: number };
        Returns: {
          current_topic_count: number;
          current_topic_id: string | null;
          current_topic_name: string | null;
          fallback_count: number;
          retention_new_count: number;
          review_count: number;
          selected_count: number;
          test_id: string;
          weak_count: number;
        }[];
      };
      create_level_test: {
        Args: {
          p_difficulties?: Database["public"]["Enums"]["dificultad_enum"][];
          p_free_mode?: boolean;
          p_learning_stage: string;
          p_question_count?: number;
          p_subtopic_ids?: string[];
          p_topic_id: string;
        };
        Returns: {
          free_mode: boolean;
          requested_stage: string;
          selected_count: number;
          test_id: string;
          was_locked_override: boolean;
        }[];
      };
      create_exam_simulation: {
        Args: {
          p_duration_minutes?: number;
          p_question_count?: number;
        };
        Returns: {
          available_topic_count: number;
          covered_topic_count: number;
          duration_minutes: number;
          selected_count: number;
          test_id: string;
        }[];
      };
      create_multi_topic_test: {
        Args: {
          p_free_mode?: boolean;
          p_learning_stage: string;
          p_mode?: string;
          p_question_count?: number;
          p_topic_ids: string[];
        };
        Returns: {
          covered_topic_count: number;
          free_mode: boolean;
          locked_topic_count: number;
          requested_stage: string;
          requested_topic_count: number;
          selected_count: number;
          test_id: string;
        }[];
      };
      get_learning_stage_progress: {
        Args: never;
        Returns: {
          consolidation_mastery: number | null;
          consolidation_perspective_coverage: number;
          consolidation_question_coverage: number;
          consolidation_questions: number;
          consolidation_seen: number;
          consolidation_sessions: number;
          consolidation_unlocked: boolean;
          critical_concepts: number;
          global_mastery: number | null;
          learning_critical_concepts: number;
          learning_mastery: number | null;
          learning_perspective_coverage: number;
          learning_question_coverage: number;
          learning_questions: number;
          learning_seen: number;
          learning_sessions: number;
          metric_version: string;
          recommended_stage: string;
          retention_evidence: number;
          robustness_percentage: number | null;
          stage_message: string;
          subject_id: string;
          subject_name: string;
          topic_id: string;
          topic_name: string;
          topic_number: number;
          tribunal_questions: number;
          tribunal_unlocked: boolean;
        }[];
      };
      get_retention_review_summary: {
        Args: never;
        Returns: {
          due_count: number;
          next_review_at: string | null;
          topic_id: string;
        }[];
      };
      get_topic_progress_summary: {
        Args: never;
        Returns: {
          active_doubts: number;
          active_failures: number;
          active_questions: number;
          available_concepts: number;
          available_perspectives: number;
          completed_sessions: number;
          coverage_percentage: number;
          evidence_state: string;
          first_activity_at: string | null;
          last_activity_at: string | null;
          latest_correct_questions: number;
          mastery_percentage: number | null;
          metric_version: string;
          seen_concepts: number;
          seen_perspectives: number;
          subject_id: string;
          subject_name: string;
          topic_id: string;
          topic_name: string;
          topic_number: number;
          unique_questions_seen: number;
        }[];
      };
      get_verified_progress_summary: {
        Args: never;
        Returns: {
          accuracy_change: number | null;
          baseline_accuracy: number | null;
          baseline_correct_count: number;
          baseline_session_count: number;
          comparable_question_count: number;
          comparison_state: string;
          corrected_failures_30d: number;
          current_accuracy: number | null;
          current_correct_count: number;
          current_session_count: number;
          metric_version: string;
          retained_questions_30d: number;
          topic_id: string;
        }[];
      };
      import_questions_batch: { Args: { payload: Json }; Returns: Json };
      reset_learning_progress: {
        Args: never;
        Returns: {
          deleted_statistics: number;
          deleted_tests: number;
        }[];
      };
    };
    Enums: {
      dificultad_enum: "facil" | "medio" | "dificil";
      respuesta_enum: "A" | "B" | "C" | "D";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      dificultad_enum: ["facil", "medio", "dificil"],
      respuesta_enum: ["A", "B", "C", "D"],
    },
  },
} as const;
