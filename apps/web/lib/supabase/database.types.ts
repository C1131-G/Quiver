export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      arrow_corrections: {
        Row: {
          arrow_id: string;
          corrected_at: string;
          corrected_by: string | null;
          id: number;
          new_value: string;
          old_value: string;
          reason: string | null;
        };
        Insert: {
          arrow_id: string;
          corrected_at?: string;
          corrected_by?: string | null;
          id?: never;
          new_value: string;
          old_value: string;
          reason?: string | null;
        };
        Update: {
          arrow_id?: string;
          corrected_at?: string;
          corrected_by?: string | null;
          id?: never;
          new_value?: string;
          old_value?: string;
          reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "arrow_corrections_arrow_id_fkey";
            columns: ["arrow_id"];
            isOneToOne: false;
            referencedRelation: "arrows";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "arrow_corrections_corrected_by_fkey";
            columns: ["corrected_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      arrows: {
        Row: {
          arrow_no: number;
          created_at: string;
          end_id: string;
          id: string;
          is_ten_plus_x: boolean | null;
          is_x: boolean | null;
          points: number | null;
          updated_at: string;
          value: string;
        };
        Insert: {
          arrow_no: number;
          created_at?: string;
          end_id: string;
          id?: string;
          is_ten_plus_x?: boolean | null;
          is_x?: boolean | null;
          points?: number | null;
          updated_at?: string;
          value: string;
        };
        Update: {
          arrow_no?: number;
          created_at?: string;
          end_id?: string;
          id?: string;
          is_ten_plus_x?: boolean | null;
          is_x?: boolean | null;
          points?: number | null;
          updated_at?: string;
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: "arrows_end_id_fkey";
            columns: ["end_id"];
            isOneToOne: false;
            referencedRelation: "ends";
            referencedColumns: ["id"];
          },
        ];
      };
      athletes: {
        Row: {
          aai_no: string | null;
          category_id: number;
          created_at: string;
          created_by: string | null;
          distance_id: number;
          event_id: number;
          full_name: string;
          gender: Database["public"]["Enums"]["gender"];
          id: string;
          id_no: string;
          is_active: boolean;
          target_face_id: number;
          updated_at: string;
        };
        Insert: {
          aai_no?: string | null;
          category_id: number;
          created_at?: string;
          created_by?: string | null;
          distance_id: number;
          event_id: number;
          full_name: string;
          gender: Database["public"]["Enums"]["gender"];
          id?: string;
          id_no: string;
          is_active?: boolean;
          target_face_id: number;
          updated_at?: string;
        };
        Update: {
          aai_no?: string | null;
          category_id?: number;
          created_at?: string;
          created_by?: string | null;
          distance_id?: number;
          event_id?: number;
          full_name?: string;
          gender?: Database["public"]["Enums"]["gender"];
          id?: string;
          id_no?: string;
          is_active?: boolean;
          target_face_id?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "athletes_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "athletes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "athletes_distance_id_fkey";
            columns: ["distance_id"];
            isOneToOne: false;
            referencedRelation: "distances";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "athletes_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "athletes_target_face_id_fkey";
            columns: ["target_face_id"];
            isOneToOne: false;
            referencedRelation: "target_faces";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          id: number;
          is_active: boolean;
          name: string;
          sort_order: number;
        };
        Insert: {
          id?: never;
          is_active?: boolean;
          name: string;
          sort_order?: number;
        };
        Update: {
          id?: never;
          is_active?: boolean;
          name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      distances: {
        Row: {
          id: number;
          is_active: boolean;
          meters: number;
        };
        Insert: {
          id?: never;
          is_active?: boolean;
          meters: number;
        };
        Update: {
          id?: never;
          is_active?: boolean;
          meters?: number;
        };
        Relationships: [];
      };
      ends: {
        Row: {
          created_at: string;
          end_no: number;
          id: string;
          round_id: string;
        };
        Insert: {
          created_at?: string;
          end_no: number;
          id?: string;
          round_id: string;
        };
        Update: {
          created_at?: string;
          end_no?: number;
          id?: string;
          round_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ends_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: false;
            referencedRelation: "rounds";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          id: number;
          is_active: boolean;
          name: string;
          sort_order: number;
        };
        Insert: {
          id?: never;
          is_active?: boolean;
          name: string;
          sort_order?: number;
        };
        Update: {
          id?: never;
          is_active?: boolean;
          name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string;
          id: string;
          is_active: boolean;
          login_id: string;
          role: Database["public"]["Enums"]["app_role"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          full_name: string;
          id: string;
          is_active?: boolean;
          login_id: string;
          role: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string;
          id?: string;
          is_active?: boolean;
          login_id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      rounds: {
        Row: {
          arrows_per_end: number;
          created_at: string;
          distance_id: number;
          id: string;
          planned_ends: number;
          round_no: number;
          session_id: string;
          target_face_id: number;
        };
        Insert: {
          arrows_per_end: number;
          created_at?: string;
          distance_id: number;
          id?: string;
          planned_ends: number;
          round_no: number;
          session_id: string;
          target_face_id: number;
        };
        Update: {
          arrows_per_end?: number;
          created_at?: string;
          distance_id?: number;
          id?: string;
          planned_ends?: number;
          round_no?: number;
          session_id?: string;
          target_face_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "rounds_distance_id_fkey";
            columns: ["distance_id"];
            isOneToOne: false;
            referencedRelation: "distances";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rounds_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rounds_target_face_id_fkey";
            columns: ["target_face_id"];
            isOneToOne: false;
            referencedRelation: "target_faces";
            referencedColumns: ["id"];
          },
        ];
      };
      sessions: {
        Row: {
          athlete_id: string;
          category_id: number;
          completed_at: string | null;
          created_at: string;
          event_id: number;
          id: string;
          notes: string | null;
          scorer_id: string | null;
          session_date: string;
          session_type: Database["public"]["Enums"]["session_type"];
          started_at: string;
          status: Database["public"]["Enums"]["session_status"];
          title: string | null;
          updated_at: string;
          venue: Database["public"]["Enums"]["venue"];
        };
        Insert: {
          athlete_id: string;
          category_id: number;
          completed_at?: string | null;
          created_at?: string;
          event_id: number;
          id?: string;
          notes?: string | null;
          scorer_id?: string | null;
          session_date?: string;
          session_type: Database["public"]["Enums"]["session_type"];
          started_at?: string;
          status?: Database["public"]["Enums"]["session_status"];
          title?: string | null;
          updated_at?: string;
          venue: Database["public"]["Enums"]["venue"];
        };
        Update: {
          athlete_id?: string;
          category_id?: number;
          completed_at?: string | null;
          created_at?: string;
          event_id?: number;
          id?: string;
          notes?: string | null;
          scorer_id?: string | null;
          session_date?: string;
          session_type?: Database["public"]["Enums"]["session_type"];
          started_at?: string;
          status?: Database["public"]["Enums"]["session_status"];
          title?: string | null;
          updated_at?: string;
          venue?: Database["public"]["Enums"]["venue"];
        };
        Relationships: [
          {
            foreignKeyName: "sessions_athlete_id_fkey";
            columns: ["athlete_id"];
            isOneToOne: false;
            referencedRelation: "athletes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_scorer_id_fkey";
            columns: ["scorer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      target_faces: {
        Row: {
          diameter_cm: number;
          id: number;
          is_active: boolean;
          lowest_score: number;
          name: string;
          sort_order: number;
        };
        Insert: {
          diameter_cm: number;
          id?: never;
          is_active?: boolean;
          lowest_score?: number;
          name: string;
          sort_order?: number;
        };
        Update: {
          diameter_cm?: number;
          id?: never;
          is_active?: boolean;
          lowest_score?: number;
          name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      correct_arrow: {
        Args: { p_arrow_id: string; p_reason: string; p_value: string };
        Returns: {
          arrow_no: number;
          created_at: string;
          end_id: string;
          id: string;
          is_ten_plus_x: boolean | null;
          is_x: boolean | null;
          points: number | null;
          updated_at: string;
          value: string;
        };
        SetofOptions: {
          from: "*";
          to: "arrows";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      app_role: "admin" | "scorer";
      gender: "male" | "female";
      session_status: "in_progress" | "completed";
      session_type: "training" | "competition";
      venue: "indoor" | "outdoor";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
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
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
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
      app_role: ["admin", "scorer"],
      gender: ["male", "female"],
      session_status: ["in_progress", "completed"],
      session_type: ["training", "competition"],
      venue: ["indoor", "outdoor"],
    },
  },
} as const;
