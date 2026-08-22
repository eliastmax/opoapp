export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      concepts: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          opposition_id: string
          position: number
          source_capacity_reason: string | null
          source_capacity_status: string | null
          source_supported_ceiling: number | null
          study_unit_id: string
          title: string
          topic_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          opposition_id: string
          position?: number
          source_capacity_reason?: string | null
          source_capacity_status?: string | null
          source_supported_ceiling?: number | null
          study_unit_id: string
          title: string
          topic_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          opposition_id?: string
          position?: number
          source_capacity_reason?: string | null
          source_capacity_status?: string | null
          source_supported_ceiling?: number | null
          study_unit_id?: string
          title?: string
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concepts_opposition_id_fkey"
            columns: ["opposition_id"]
            isOneToOne: false
            referencedRelation: "oppositions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concepts_unit_topic_fk"
            columns: ["opposition_id", "topic_id", "study_unit_id"]
            isOneToOne: false
            referencedRelation: "study_units"
            referencedColumns: ["opposition_id", "topic_id", "id"]
          },
        ]
      }
      flashcard_reviews: {
        Row: {
          correct: boolean
          flashcard_id: string
          id: string
          known_streak_after: number
          next_review_at: string | null
          opposition_id: string
          rating: string
          reviewed_at: string
          scheduled_delay_minutes: number | null
          user_id: string
        }
        Insert: {
          correct: boolean
          flashcard_id: string
          id?: string
          known_streak_after?: number
          next_review_at?: string | null
          opposition_id: string
          rating: string
          reviewed_at?: string
          scheduled_delay_minutes?: number | null
          user_id: string
        }
        Update: {
          correct?: boolean
          flashcard_id?: string
          id?: string
          known_streak_after?: number
          next_review_at?: string | null
          opposition_id?: string
          rating?: string
          reviewed_at?: string
          scheduled_delay_minutes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_reviews_card_fk"
            columns: ["opposition_id", "flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["opposition_id", "id"]
          },
          {
            foreignKeyName: "flashcard_reviews_opposition_id_fkey"
            columns: ["opposition_id"]
            isOneToOne: false
            referencedRelation: "oppositions"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          active: boolean
          answer: string
          card_type: string
          code: string
          concept_id: string
          created_at: string
          created_by: string | null
          id: string
          opposition_id: string
          position: number
          prompt: string
          source_refs: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          answer: string
          card_type?: string
          code: string
          concept_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          opposition_id: string
          position?: number
          prompt: string
          source_refs?: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          answer?: string
          card_type?: string
          code?: string
          concept_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          opposition_id?: string
          position?: number
          prompt?: string
          source_refs?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_opposition_concept_fk"
            columns: ["opposition_id", "concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["opposition_id", "id"]
          },
          {
            foreignKeyName: "flashcards_opposition_id_fkey"
            columns: ["opposition_id"]
            isOneToOne: false
            referencedRelation: "oppositions"
            referencedColumns: ["id"]
          },
        ]
      }
      opposition_admins: {
        Row: {
          created_at: string
          opposition_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          opposition_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          opposition_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opposition_admins_opposition_id_fkey"
            columns: ["opposition_id"]
            isOneToOne: false
            referencedRelation: "oppositions"
            referencedColumns: ["id"]
          },
        ]
      }
      oppositions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          published: boolean
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          published?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          published?: boolean
        }
        Relationships: []
      }
      preparation_profiles: {
        Row: {
          completed_at: string | null
          created_at: string
          current_step: string
          current_topic_id: string | null
          exam_precision: string | null
          exam_value: string | null
          opposition_id: string
          practice_days: number[]
          questions_per_session: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_step?: string
          current_topic_id?: string | null
          exam_precision?: string | null
          exam_value?: string | null
          opposition_id: string
          practice_days?: number[]
          questions_per_session?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_step?: string
          current_topic_id?: string | null
          exam_precision?: string | null
          exam_value?: string | null
          opposition_id?: string
          practice_days?: number[]
          questions_per_session?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preparation_profiles_membership_fkey"
            columns: ["user_id", "opposition_id"]
            isOneToOne: true
            referencedRelation: "user_oppositions"
            referencedColumns: ["user_id", "opposition_id"]
          },
          {
            foreignKeyName: "preparation_profiles_opposition_topic_fkey"
            columns: ["opposition_id", "current_topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["opposition_id", "id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_opposition_id: string | null
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          active_opposition_id?: string | null
          created_at?: string
          id: string
          nombre?: string
        }
        Update: {
          active_opposition_id?: string | null
          created_at?: string
          id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_opposition_id_fkey"
            columns: ["active_opposition_id"]
            isOneToOne: false
            referencedRelation: "oppositions"
            referencedColumns: ["id"]
          },
        ]
      }
      product_tour_states: {
        Row: {
          completed_at: string
          completion_kind: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          completion_kind: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          completion_kind?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      question_concepts: {
        Row: {
          concept_id: string
          created_at: string
          created_by: string | null
          opposition_id: string
          question_id: string
          role: string
          topic_id: string
        }
        Insert: {
          concept_id: string
          created_at?: string
          created_by?: string | null
          opposition_id: string
          question_id: string
          role?: string
          topic_id: string
        }
        Update: {
          concept_id?: string
          created_at?: string
          created_by?: string | null
          opposition_id?: string
          question_id?: string
          role?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_concepts_concept_topic_fk"
            columns: ["opposition_id", "topic_id", "concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["opposition_id", "topic_id", "id"]
          },
          {
            foreignKeyName: "question_concepts_opposition_id_fkey"
            columns: ["opposition_id"]
            isOneToOne: false
            referencedRelation: "oppositions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_concepts_question_topic_fk"
            columns: ["opposition_id", "topic_id", "question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["opposition_id", "topic_id", "id"]
          },
        ]
      }
      question_incidents: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          question_id: string
          reason: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          question_id: string
          reason: string
          status?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          question_id?: string
          reason?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_incidents_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      question_statistics: {
        Row: {
          answered_count: number
          appearances_count: number
          correct_count: number
          current_correct_streak: number
          current_incorrect_streak: number
          doubt_count: number
          incorrect_count: number
          last_answered_at: string | null
          last_correct_at: string | null
          last_doubted_at: string | null
          last_incorrect_at: string | null
          last_seen_at: string | null
          next_review_at: string | null
          question_id: string
          retention_level: number
          updated_at: string
          user_id: string
        }
        Insert: {
          answered_count?: number
          appearances_count?: number
          correct_count?: number
          current_correct_streak?: number
          current_incorrect_streak?: number
          doubt_count?: number
          incorrect_count?: number
          last_answered_at?: string | null
          last_correct_at?: string | null
          last_doubted_at?: string | null
          last_incorrect_at?: string | null
          last_seen_at?: string | null
          next_review_at?: string | null
          question_id: string
          retention_level?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          answered_count?: number
          appearances_count?: number
          correct_count?: number
          current_correct_streak?: number
          current_incorrect_streak?: number
          doubt_count?: number
          incorrect_count?: number
          last_answered_at?: string | null
          last_correct_at?: string | null
          last_doubted_at?: string | null
          last_incorrect_at?: string | null
          last_seen_at?: string | null
          next_review_at?: string | null
          question_id?: string
          retention_level?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_statistics_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          activa: boolean
          apartado: string | null
          codigo: string
          concepto: string | null
          created_at: string
          dificultad: Database["public"]["Enums"]["dificultad_enum"]
          dificultad_conceptual:
            | Database["public"]["Enums"]["dificultad_enum"]
            | null
          dificultad_examen:
            | Database["public"]["Enums"]["dificultad_enum"]
            | null
          documento_referencia: string | null
          explicacion: string
          frecuencia_historica: string | null
          id: string
          nivel_pedagogico: string | null
          objetivo_aprendizaje: string | null
          opcion_a: string
          opcion_b: string
          opcion_c: string
          opcion_d: string
          opposition_id: string
          pagina_fin: number | null
          pagina_inicio: number | null
          perspectiva: string | null
          pregunta: string
          referencia_fuente: string
          respuesta_correcta: Database["public"]["Enums"]["respuesta_enum"]
          subject_id: string
          subtopic_id: string | null
          tipo_trampa: string | null
          topic_id: string
          user_id: string
        }
        Insert: {
          activa?: boolean
          apartado?: string | null
          codigo: string
          concepto?: string | null
          created_at?: string
          dificultad: Database["public"]["Enums"]["dificultad_enum"]
          dificultad_conceptual?:
            | Database["public"]["Enums"]["dificultad_enum"]
            | null
          dificultad_examen?:
            | Database["public"]["Enums"]["dificultad_enum"]
            | null
          documento_referencia?: string | null
          explicacion?: string
          frecuencia_historica?: string | null
          id?: string
          nivel_pedagogico?: string | null
          objetivo_aprendizaje?: string | null
          opcion_a: string
          opcion_b: string
          opcion_c: string
          opcion_d: string
          opposition_id: string
          pagina_fin?: number | null
          pagina_inicio?: number | null
          perspectiva?: string | null
          pregunta: string
          referencia_fuente?: string
          respuesta_correcta: Database["public"]["Enums"]["respuesta_enum"]
          subject_id: string
          subtopic_id?: string | null
          tipo_trampa?: string | null
          topic_id: string
          user_id: string
        }
        Update: {
          activa?: boolean
          apartado?: string | null
          codigo?: string
          concepto?: string | null
          created_at?: string
          dificultad?: Database["public"]["Enums"]["dificultad_enum"]
          dificultad_conceptual?:
            | Database["public"]["Enums"]["dificultad_enum"]
            | null
          dificultad_examen?:
            | Database["public"]["Enums"]["dificultad_enum"]
            | null
          documento_referencia?: string | null
          explicacion?: string
          frecuencia_historica?: string | null
          id?: string
          nivel_pedagogico?: string | null
          objetivo_aprendizaje?: string | null
          opcion_a?: string
          opcion_b?: string
          opcion_c?: string
          opcion_d?: string
          opposition_id?: string
          pagina_fin?: number | null
          pagina_inicio?: number | null
          perspectiva?: string | null
          pregunta?: string
          referencia_fuente?: string
          respuesta_correcta?: Database["public"]["Enums"]["respuesta_enum"]
          subject_id?: string
          subtopic_id?: string | null
          tipo_trampa?: string | null
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_opposition_id_fkey"
            columns: ["opposition_id"]
            isOneToOne: false
            referencedRelation: "oppositions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_opposition_subject_fk"
            columns: ["opposition_id", "subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["opposition_id", "id"]
          },
          {
            foreignKeyName: "questions_opposition_subtopic_fk"
            columns: ["opposition_id", "subtopic_id"]
            isOneToOne: false
            referencedRelation: "subtopics"
            referencedColumns: ["opposition_id", "id"]
          },
          {
            foreignKeyName: "questions_opposition_topic_fk"
            columns: ["opposition_id", "topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["opposition_id", "id"]
          },
          {
            foreignKeyName: "questions_owner_subject_fk"
            columns: ["user_id", "subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "questions_owner_subtopic_fk"
            columns: ["user_id", "subtopic_id"]
            isOneToOne: false
            referencedRelation: "subtopics"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "questions_owner_topic_fk"
            columns: ["user_id", "topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_subtopic_id_fkey"
            columns: ["subtopic_id"]
            isOneToOne: false
            referencedRelation: "subtopics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      study_content_imports: {
        Row: {
          concept_count: number
          contract_version: string
          flashcard_count: number
          id: string
          imported_at: string
          imported_by: string | null
          opposition_id: string
          question_mapping_count: number
          source_revision: string | null
          topic_id: string
          unit_count: number
        }
        Insert: {
          concept_count: number
          contract_version: string
          flashcard_count: number
          id?: string
          imported_at?: string
          imported_by?: string | null
          opposition_id: string
          question_mapping_count: number
          source_revision?: string | null
          topic_id: string
          unit_count: number
        }
        Update: {
          concept_count?: number
          contract_version?: string
          flashcard_count?: number
          id?: string
          imported_at?: string
          imported_by?: string | null
          opposition_id?: string
          question_mapping_count?: number
          source_revision?: string | null
          topic_id?: string
          unit_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "study_content_imports_opposition_id_fkey"
            columns: ["opposition_id"]
            isOneToOne: false
            referencedRelation: "oppositions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_content_imports_opposition_topic_fk"
            columns: ["opposition_id", "topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["opposition_id", "id"]
          },
        ]
      }
      study_unit_progress: {
        Row: {
          completed_at: string | null
          completion_count: number
          first_opened_at: string | null
          last_opened_at: string | null
          opposition_id: string
          study_unit_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completion_count?: number
          first_opened_at?: string | null
          last_opened_at?: string | null
          opposition_id: string
          study_unit_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completion_count?: number
          first_opened_at?: string | null
          last_opened_at?: string | null
          opposition_id?: string
          study_unit_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_unit_progress_opposition_id_fkey"
            columns: ["opposition_id"]
            isOneToOne: false
            referencedRelation: "oppositions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_unit_progress_unit_fk"
            columns: ["opposition_id", "study_unit_id"]
            isOneToOne: false
            referencedRelation: "study_units"
            referencedColumns: ["opposition_id", "id"]
          },
        ]
      }
      study_units: {
        Row: {
          active: boolean
          code: string
          confusions: Json
          created_at: string
          created_by: string | null
          estimated_minutes: number
          exam_keys: Json
          id: string
          mnemonics: Json
          opposition_id: string
          position: number
          source_refs: Json
          study_summary: string
          subtopic_id: string | null
          title: string
          topic_id: string
          traps: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          confusions?: Json
          created_at?: string
          created_by?: string | null
          estimated_minutes?: number
          exam_keys?: Json
          id?: string
          mnemonics?: Json
          opposition_id: string
          position?: number
          source_refs?: Json
          study_summary?: string
          subtopic_id?: string | null
          title: string
          topic_id: string
          traps?: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          confusions?: Json
          created_at?: string
          created_by?: string | null
          estimated_minutes?: number
          exam_keys?: Json
          id?: string
          mnemonics?: Json
          opposition_id?: string
          position?: number
          source_refs?: Json
          study_summary?: string
          subtopic_id?: string | null
          title?: string
          topic_id?: string
          traps?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_units_opposition_id_fkey"
            columns: ["opposition_id"]
            isOneToOne: false
            referencedRelation: "oppositions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_units_opposition_subtopic_fk"
            columns: ["opposition_id", "subtopic_id"]
            isOneToOne: false
            referencedRelation: "subtopics"
            referencedColumns: ["opposition_id", "id"]
          },
          {
            foreignKeyName: "study_units_opposition_topic_fk"
            columns: ["opposition_id", "topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["opposition_id", "id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          opposition_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          opposition_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          opposition_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_opposition_id_fkey"
            columns: ["opposition_id"]
            isOneToOne: false
            referencedRelation: "oppositions"
            referencedColumns: ["id"]
          },
        ]
      }
      subtopics: {
        Row: {
          created_at: string
          id: string
          nombre: string
          opposition_id: string
          topic_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
          opposition_id: string
          topic_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
          opposition_id?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtopics_opposition_id_fkey"
            columns: ["opposition_id"]
            isOneToOne: false
            referencedRelation: "oppositions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subtopics_opposition_topic_fk"
            columns: ["opposition_id", "topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["opposition_id", "id"]
          },
          {
            foreignKeyName: "subtopics_owner_topic_fk"
            columns: ["user_id", "topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "subtopics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      test_answers: {
        Row: {
          correcta: boolean | null
          created_at: string
          id: string
          marked_doubt: boolean
          orden: number
          question_id: string
          respuesta_usuario:
            | Database["public"]["Enums"]["respuesta_enum"]
            | null
          test_id: string
          user_id: string
        }
        Insert: {
          correcta?: boolean | null
          created_at?: string
          id?: string
          marked_doubt?: boolean
          orden: number
          question_id: string
          respuesta_usuario?:
            | Database["public"]["Enums"]["respuesta_enum"]
            | null
          test_id: string
          user_id: string
        }
        Update: {
          correcta?: boolean | null
          created_at?: string
          id?: string
          marked_doubt?: boolean
          orden?: number
          question_id?: string
          respuesta_usuario?:
            | Database["public"]["Enums"]["respuesta_enum"]
            | null
          test_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_answers_owner_test_fk"
            columns: ["user_id", "test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "test_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_answers_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_question_selection: {
        Row: {
          algorithm_version: string
          base_weight: number
          created_at: string
          final_weight: number
          overlap_exception: boolean
          question_id: string
          retention_checkpoint_days: number | null
          selection_concept_id: string | null
          selection_group: string
          selection_order: number
          selection_reason: string
          test_id: string
          user_id: string
          was_in_previous_test: boolean
        }
        Insert: {
          algorithm_version?: string
          base_weight: number
          created_at?: string
          final_weight: number
          overlap_exception?: boolean
          question_id: string
          retention_checkpoint_days?: number | null
          selection_concept_id?: string | null
          selection_group: string
          selection_order: number
          selection_reason: string
          test_id: string
          user_id: string
          was_in_previous_test?: boolean
        }
        Update: {
          algorithm_version?: string
          base_weight?: number
          created_at?: string
          final_weight?: number
          overlap_exception?: boolean
          question_id?: string
          retention_checkpoint_days?: number | null
          selection_concept_id?: string | null
          selection_group?: string
          selection_order?: number
          selection_reason?: string
          test_id?: string
          user_id?: string
          was_in_previous_test?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "test_question_selection_owner_test_fk"
            columns: ["user_id", "test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "test_question_selection_question_concept_fk"
            columns: ["question_id", "selection_concept_id"]
            isOneToOne: false
            referencedRelation: "question_concepts"
            referencedColumns: ["question_id", "concept_id"]
          },
          {
            foreignKeyName: "test_question_selection_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          aciertos: number
          completado: boolean
          created_at: string
          exam_duration_minutes: number | null
          fallos: number
          fecha_finalizacion: string | null
          fecha_inicio: string
          id: string
          learning_stage: string | null
          numero_preguntas: number
          opposition_id: string
          porcentaje: number
          sin_responder: number
          stage_free_mode: boolean
          tipo: string
          user_id: string
        }
        Insert: {
          aciertos?: number
          completado?: boolean
          created_at?: string
          exam_duration_minutes?: number | null
          fallos?: number
          fecha_finalizacion?: string | null
          fecha_inicio?: string
          id?: string
          learning_stage?: string | null
          numero_preguntas: number
          opposition_id?: string
          porcentaje?: number
          sin_responder?: number
          stage_free_mode?: boolean
          tipo: string
          user_id: string
        }
        Update: {
          aciertos?: number
          completado?: boolean
          created_at?: string
          exam_duration_minutes?: number | null
          fallos?: number
          fecha_finalizacion?: string | null
          fecha_inicio?: string
          id?: string
          learning_stage?: string | null
          numero_preguntas?: number
          opposition_id?: string
          porcentaje?: number
          sin_responder?: number
          stage_free_mode?: boolean
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tests_opposition_id_fkey"
            columns: ["opposition_id"]
            isOneToOne: false
            referencedRelation: "oppositions"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_self_assessments: {
        Row: {
          assessed_at: string
          estimated_percentage: number | null
          opposition_id: string
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assessed_at?: string
          estimated_percentage?: number | null
          opposition_id: string
          topic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assessed_at?: string
          estimated_percentage?: number | null
          opposition_id?: string
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_self_assessments_opposition_topic_fkey"
            columns: ["opposition_id", "topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["opposition_id", "id"]
          },
          {
            foreignKeyName: "topic_self_assessments_profile_fkey"
            columns: ["user_id", "opposition_id"]
            isOneToOne: false
            referencedRelation: "preparation_profiles"
            referencedColumns: ["user_id", "opposition_id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          id: string
          nombre: string
          numero: number
          opposition_id: string
          subject_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
          numero: number
          opposition_id: string
          subject_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
          numero?: number
          opposition_id?: string
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_opposition_id_fkey"
            columns: ["opposition_id"]
            isOneToOne: false
            referencedRelation: "oppositions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_opposition_subject_fk"
            columns: ["opposition_id", "subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["opposition_id", "id"]
          },
          {
            foreignKeyName: "topics_owner_subject_fk"
            columns: ["user_id", "subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_concept_mastery: {
        Row: {
          concept_id: string
          distinct_questions: number
          distinct_sessions: number
          evaluated_at: string
          last_evidence_at: string | null
          needs_attention: boolean
          next_review_on: string | null
          opposition_id: string
          reason_code: string
          retention_checks_passed: number
          safe_accuracy: number | null
          safe_correct_questions: number
          state: string
          user_id: string
        }
        Insert: {
          concept_id: string
          distinct_questions?: number
          distinct_sessions?: number
          evaluated_at?: string
          last_evidence_at?: string | null
          needs_attention?: boolean
          next_review_on?: string | null
          opposition_id: string
          reason_code?: string
          retention_checks_passed?: number
          safe_accuracy?: number | null
          safe_correct_questions?: number
          state?: string
          user_id: string
        }
        Update: {
          concept_id?: string
          distinct_questions?: number
          distinct_sessions?: number
          evaluated_at?: string
          last_evidence_at?: string | null
          needs_attention?: boolean
          next_review_on?: string | null
          opposition_id?: string
          reason_code?: string
          retention_checks_passed?: number
          safe_accuracy?: number | null
          safe_correct_questions?: number
          state?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_concept_mastery_concept_fk"
            columns: ["opposition_id", "concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["opposition_id", "id"]
          },
          {
            foreignKeyName: "user_concept_mastery_opposition_id_fkey"
            columns: ["opposition_id"]
            isOneToOne: false
            referencedRelation: "oppositions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_oppositions: {
        Row: {
          enrolled_at: string
          opposition_id: string
          user_id: string
        }
        Insert: {
          enrolled_at?: string
          opposition_id: string
          user_id: string
        }
        Update: {
          enrolled_at?: string
          opposition_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_oppositions_opposition_id_fkey"
            columns: ["opposition_id"]
            isOneToOne: false
            referencedRelation: "oppositions"
            referencedColumns: ["id"]
          },
        ]
      }
      v4_daily_session_blocks: {
        Row: {
          completed_at: string | null
          concept_id: string | null
          created_at: string
          id: string
          kind: string
          label: string
          linked_test_id: string | null
          mastery_state_before: string | null
          needs_attention_before: boolean
          opposition_id: string
          planned_minutes: number
          position: number
          reason: string
          reason_code: string
          retention_checkpoint_days: number | null
          session_id: string
          started_at: string | null
          status: string
          study_unit_id: string
          target_questions: number
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          concept_id?: string | null
          created_at?: string
          id?: string
          kind: string
          label: string
          linked_test_id?: string | null
          mastery_state_before?: string | null
          needs_attention_before?: boolean
          opposition_id: string
          planned_minutes: number
          position: number
          reason?: string
          reason_code: string
          retention_checkpoint_days?: number | null
          session_id: string
          started_at?: string | null
          status?: string
          study_unit_id: string
          target_questions?: number
          topic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          concept_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          label?: string
          linked_test_id?: string | null
          mastery_state_before?: string | null
          needs_attention_before?: boolean
          opposition_id?: string
          planned_minutes?: number
          position?: number
          reason?: string
          reason_code?: string
          retention_checkpoint_days?: number | null
          session_id?: string
          started_at?: string | null
          status?: string
          study_unit_id?: string
          target_questions?: number
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "v4_daily_session_blocks_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v4_daily_session_blocks_opposition_id_fkey"
            columns: ["opposition_id"]
            isOneToOne: false
            referencedRelation: "oppositions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v4_daily_session_blocks_session_fk"
            columns: ["user_id", "session_id"]
            isOneToOne: false
            referencedRelation: "v4_daily_sessions"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "v4_daily_session_blocks_study_unit_id_fkey"
            columns: ["study_unit_id"]
            isOneToOne: false
            referencedRelation: "study_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v4_daily_session_blocks_test_fk"
            columns: ["user_id", "linked_test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["user_id", "id"]
          },
          {
            foreignKeyName: "v4_daily_session_blocks_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      v4_daily_sessions: {
        Row: {
          available_minutes: number
          completed_at: string | null
          created_at: string
          id: string
          local_date: string
          opposition_id: string
          planned_minutes: number
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          available_minutes: number
          completed_at?: string | null
          created_at?: string
          id?: string
          local_date: string
          opposition_id: string
          planned_minutes?: number
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          available_minutes?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          local_date?: string
          opposition_id?: string
          planned_minutes?: number
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "v4_daily_sessions_opposition_id_fkey"
            columns: ["opposition_id"]
            isOneToOne: false
            referencedRelation: "oppositions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_doubt_questions: {
        Row: {
          dificultad: Database["public"]["Enums"]["dificultad_enum"] | null
          last_reviewed_at: string | null
          question_id: string | null
          subtopic_id: string | null
          topic_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_subtopic_id_fkey"
            columns: ["subtopic_id"]
            isOneToOne: false
            referencedRelation: "subtopics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      active_failed_questions: {
        Row: {
          dificultad: Database["public"]["Enums"]["dificultad_enum"] | null
          last_answered_at: string | null
          question_id: string | null
          subtopic_id: string | null
          topic_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_subtopic_id_fkey"
            columns: ["subtopic_id"]
            isOneToOne: false
            referencedRelation: "subtopics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_retention_state: {
        Args: {
          p_answered_at: string
          p_correct: boolean
          p_current_level: number
          p_current_next_review_at: string
          p_marked_doubt: boolean
        }
        Returns: {
          next_review_at: string
          retention_level: number
        }[]
      }
      close_my_v4_daily_session_early: {
        Args: { p_session_id: string }
        Returns: Json
      }
      complete_my_v4_daily_block: {
        Args: { p_block_id: string; p_linked_test_id?: string }
        Returns: Json
      }
      complete_my_v4_study_unit: {
        Args: { p_study_unit_id: string }
        Returns: Json
      }
      complete_test: {
        Args: { p_test_id: string }
        Returns: {
          aciertos: number
          fallos: number
          porcentaje: number
          sin_responder: number
        }[]
      }
      create_exam_simulation: {
        Args: { p_duration_minutes?: number; p_question_count?: number }
        Returns: {
          available_topic_count: number
          covered_topic_count: number
          duration_minutes: number
          selected_count: number
          test_id: string
        }[]
      }
      create_level_test: {
        Args: {
          p_difficulties?: Database["public"]["Enums"]["dificultad_enum"][]
          p_free_mode?: boolean
          p_learning_stage: string
          p_question_count?: number
          p_subtopic_ids?: string[]
          p_topic_id: string
        }
        Returns: {
          free_mode: boolean
          requested_stage: string
          selected_count: number
          test_id: string
          was_locked_override: boolean
        }[]
      }
      create_mixed_stage_test: {
        Args: {
          p_mode?: string
          p_question_count?: number
          p_subtopic_ids?: string[]
          p_topic_ids: string[]
        }
        Returns: {
          covered_stage_count: number
          covered_topic_count: number
          requested_topic_count: number
          selected_count: number
          test_id: string
        }[]
      }
      create_multi_topic_test: {
        Args: {
          p_free_mode?: boolean
          p_learning_stage: string
          p_mode?: string
          p_question_count?: number
          p_topic_ids: string[]
        }
        Returns: {
          covered_topic_count: number
          free_mode: boolean
          locked_topic_count: number
          requested_stage: string
          requested_topic_count: number
          selected_count: number
          test_id: string
        }[]
      }
      create_or_replace_my_v4_daily_session: {
        Args: {
          p_available_minutes: number
          p_blocks: Json
          p_local_date: string
        }
        Returns: string
      }
      create_recommended_test: {
        Args: { p_question_count?: number }
        Returns: {
          assessment_weight: number
          current_topic_count: number
          current_topic_id: string
          current_topic_name: string
          evidence_count: number
          fallback_count: number
          recommendation_reason: string
          recommendation_reason_code: string
          retention_new_count: number
          review_count: number
          selected_count: number
          test_id: string
          weak_count: number
        }[]
      }
      create_smart_test: {
        Args: {
          p_difficulties?: Database["public"]["Enums"]["dificultad_enum"][]
          p_question_count?: number
          p_subtopic_ids?: string[]
          p_topic_id: string
        }
        Returns: {
          overlap_count: number
          overlap_limit: number
          selected_count: number
          test_id: string
          used_overlap_exception: boolean
        }[]
      }
      create_v4_concept_check: {
        Args: {
          p_concept_id: string
          p_mode?: string
          p_question_count?: number
        }
        Returns: {
          active_primary_questions: number
          concept_code: string
          concept_id: string
          concept_title: string
          mode: string
          novel_for_concept_count: number
          previous_test_overlap_count: number
          retention_checkpoint_days: number
          reused_for_concept_count: number
          selected_count: number
          test_id: string
        }[]
      }
      current_active_opposition_id: { Args: never; Returns: string }
      get_initial_recommendation_context: {
        Args: never
        Returns: {
          assessment_weight: number
          estimated_percentage: number
          evidence_count: number
          observed_accuracy: number
          reason: string
          reason_code: string
          topic_id: string
          topic_name: string
        }[]
      }
      get_learning_stage_progress: {
        Args: never
        Returns: {
          consolidation_mastery: number
          consolidation_perspective_coverage: number
          consolidation_question_coverage: number
          consolidation_questions: number
          consolidation_seen: number
          consolidation_sessions: number
          consolidation_unlocked: boolean
          critical_concepts: number
          global_mastery: number
          learning_critical_concepts: number
          learning_mastery: number
          learning_perspective_coverage: number
          learning_question_coverage: number
          learning_questions: number
          learning_seen: number
          learning_sessions: number
          metric_version: string
          recommended_stage: string
          retention_evidence: number
          robustness_percentage: number
          stage_message: string
          subject_id: string
          subject_name: string
          topic_id: string
          topic_name: string
          topic_number: number
          tribunal_questions: number
          tribunal_unlocked: boolean
        }[]
      }
      get_my_v4_concept_evidence: {
        Args: { p_concept_id?: string }
        Returns: {
          active_flashcards: number
          active_primary_questions: number
          concept_code: string
          concept_id: string
          concept_title: string
          flashcard_evidence: Json
          previous_state: string
          question_evidence: Json
          study_unit_code: string
          study_unit_id: string
          study_unit_title: string
          unit_completed: boolean
        }[]
      }
      get_my_v4_daily_debrief: { Args: { p_session_id: string }; Returns: Json }
      get_my_v4_daily_session: { Args: { p_local_date: string }; Returns: Json }
      get_my_v4_flashcard_queue: {
        Args: { p_limit?: number; p_study_unit_id?: string }
        Returns: {
          answer: string
          concept_code: string
          concept_id: string
          concept_title: string
          due_reason: string
          flashcard_code: string
          flashcard_id: string
          known_streak: number
          last_rating: string
          last_reviewed_at: string
          next_review_at: string
          prompt: string
          study_unit_code: string
          study_unit_id: string
          study_unit_title: string
        }[]
      }
      get_question_bank_quality_report: { Args: never; Returns: Json }
      get_retention_review_summary: {
        Args: never
        Returns: {
          due_count: number
          next_review_at: string
          topic_id: string
        }[]
      }
      get_topic_progress_summary: {
        Args: never
        Returns: {
          active_doubts: number
          active_failures: number
          active_questions: number
          available_concepts: number
          available_perspectives: number
          completed_sessions: number
          coverage_percentage: number
          evidence_state: string
          first_activity_at: string
          last_activity_at: string
          latest_correct_questions: number
          mastery_percentage: number
          metric_version: string
          seen_concepts: number
          seen_perspectives: number
          subject_id: string
          subject_name: string
          topic_id: string
          topic_name: string
          topic_number: number
          unique_questions_seen: number
        }[]
      }
      get_verified_progress_summary: {
        Args: never
        Returns: {
          accuracy_change: number
          baseline_accuracy: number
          baseline_correct_count: number
          baseline_session_count: number
          comparable_question_count: number
          comparison_state: string
          corrected_failures_30d: number
          current_accuracy: number
          current_correct_count: number
          current_session_count: number
          metric_version: string
          retained_questions_30d: number
          topic_id: string
        }[]
      }
      get_weekly_roadmap: {
        Args: never
        Returns: {
          available_days: number[]
          completed_questions: number
          completed_sessions: number
          exam_guidance: string
          questions: number
          reason: string
          reason_code: string
          remaining_questions: number
          remaining_sessions: number
          scheduled_date: string
          slot_number: number
          target_questions: number
          target_sessions: number
          topic_id: string
          topic_name: string
          week_end: string
          week_start: string
        }[]
      }
      import_questions_batch: { Args: { payload: Json }; Returns: Json }
      import_v4_study_content: { Args: { p_package: Json }; Returns: Json }
      open_my_v4_study_unit: {
        Args: { p_study_unit_id: string }
        Returns: Json
      }
      prepare_my_v4_today_context: {
        Args: never
        Returns: {
          active_flashcards: number
          active_primary_questions: number
          concept_code: string
          concept_id: string
          concept_title: string
          distinct_questions: number
          distinct_sessions: number
          last_evidence_at: string
          needs_attention: boolean
          next_review_on: string
          reason_code: string
          retention_checks_passed: number
          roadmap_scheduled_date: string
          roadmap_slot: number
          safe_accuracy: number
          safe_correct_questions: number
          source_capacity_reason: string
          source_capacity_status: string
          source_supported_ceiling: number
          state: string
          study_unit_code: string
          study_unit_id: string
          study_unit_title: string
          topic_id: string
          topic_name: string
          topic_number: number
          unit_completed: boolean
          unit_estimated_minutes: number
          unit_position: number
        }[]
      }
      refresh_my_v4_concept_mastery: {
        Args: { p_concept_id?: string }
        Returns: {
          concept_id: string
          distinct_questions: number
          distinct_sessions: number
          evaluated_at: string
          last_evidence_at: string
          needs_attention: boolean
          next_review_on: string
          reason_code: string
          retention_checks_passed: number
          safe_accuracy: number
          safe_correct_questions: number
          state: string
        }[]
      }
      reset_learning_progress: {
        Args: never
        Returns: {
          deleted_statistics: number
          deleted_tests: number
        }[]
      }
      review_my_v4_flashcard: {
        Args: { p_flashcard_id: string; p_rating: string }
        Returns: Json
      }
      save_preparation_profile: {
        Args: {
          p_complete: boolean
          p_current_step: string
          p_current_topic_id: string
          p_exam_precision: string
          p_exam_value: string
          p_opposition_id: string
          p_practice_days: number[]
          p_questions_per_session: number
          p_topic_assessments: Json
        }
        Returns: undefined
      }
      set_active_opposition: {
        Args: { p_opposition_id: string }
        Returns: undefined
      }
      skip_my_v4_daily_block: { Args: { p_block_id: string }; Returns: Json }
      start_my_v4_daily_block: { Args: { p_block_id: string }; Returns: Json }
    }
    Enums: {
      dificultad_enum: "facil" | "medio" | "dificil"
      respuesta_enum: "A" | "B" | "C" | "D"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      dificultad_enum: ["facil", "medio", "dificil"],
      respuesta_enum: ["A", "B", "C", "D"],
    },
  },
} as const
