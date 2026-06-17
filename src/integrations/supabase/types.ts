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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      proker_progress_logs: {
        Row: {
          created_at: string
          id: string
          log_date: string
          note: string | null
          proker_id: string
          progress: number
        }
        Insert: {
          created_at?: string
          id?: string
          log_date: string
          note?: string | null
          proker_id: string
          progress: number
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          note?: string | null
          proker_id?: string
          progress?: number
        }
        Relationships: [
          {
            foreignKeyName: "proker_progress_logs_proker_id_fkey"
            columns: ["proker_id"]
            isOneToOne: false
            referencedRelation: "prokers"
            referencedColumns: ["id"]
          }
        ]
      }
      meetings: {
        Row: {
          actual_participants: number | null
          created_at: string
          created_by_member_id: string | null
          division: string
          id: string
          meeting_notes: string | null
          planned_participants: number
          scheduled_at: string
          status: string
          topic: string
          updated_at: string
        }
        Insert: {
          actual_participants?: number | null
          created_at?: string
          created_by_member_id?: string | null
          division: string
          id?: string
          meeting_notes?: string | null
          planned_participants?: number
          scheduled_at: string
          status?: string
          topic: string
          updated_at?: string
        }
        Update: {
          actual_participants?: number | null
          created_at?: string
          created_by_member_id?: string | null
          division?: string
          id?: string
          meeting_notes?: string | null
          planned_participants?: number
          scheduled_at?: string
          status?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_created_by_member_id_fkey"
            columns: ["created_by_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          }
        ]
      }
      members: {
        Row: {
          id: string
          name: string
          faculty: string
          intake: number
          phone: string
          division: string
          position: string
          registered_at: string
        }
        Insert: {
          id?: string
          name: string
          faculty: string
          intake: number
          phone: string
          division: string
          position?: string
          registered_at?: string
        }
        Update: {
          id?: string
          name?: string
          faculty?: string
          intake?: number
          phone?: string
          division?: string
          position?: string
          registered_at?: string
        }
        Relationships: []
      }
      proker_internal_ratings: {
        Row: {
          id: string
          proker_id: string
          rater_name: string
          rater_division: string
          overall_rating: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          proker_id: string
          rater_name: string
          rater_division: string
          overall_rating: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          proker_id?: string
          rater_name?: string
          rater_division?: string
          overall_rating?: number
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proker_internal_ratings_proker_id_fkey"
            columns: ["proker_id"]
            isOneToOne: false
            referencedRelation: "prokers"
            referencedColumns: ["id"]
          }
        ]
      }
      berkelanjutan_entries: {
        Row: {
          id: string
          proker_id: string
          entry_date: string
          targeted_income: number | null
          actual_income: number | null
          messages_per_day: number | null
          messages_replied_per_day: number | null
          response_time_minutes: number | null
          posts_count: number | null
          total_reach: number | null
          new_followers: number | null
          content_notes: string | null
          meals_bought: number | null
          meals_given_out: number | null
          attendees: number | null
          location: string | null
          school_visited: string | null
          participants_count: number | null
          ppi_members_attendance: number | null
          visit_datetime: string | null
          notes: string | null
          custom_data: Json
          created_at: string
        }
        Insert: {
          id?: string
          proker_id: string
          entry_date?: string
          targeted_income?: number | null
          actual_income?: number | null
          messages_per_day?: number | null
          messages_replied_per_day?: number | null
          response_time_minutes?: number | null
          posts_count?: number | null
          total_reach?: number | null
          new_followers?: number | null
          content_notes?: string | null
          meals_bought?: number | null
          meals_given_out?: number | null
          attendees?: number | null
          location?: string | null
          school_visited?: string | null
          participants_count?: number | null
          ppi_members_attendance?: number | null
          visit_datetime?: string | null
          notes?: string | null
          custom_data?: Json
          created_at?: string
        }
        Update: {
          id?: string
          proker_id?: string
          entry_date?: string
          targeted_income?: number | null
          actual_income?: number | null
          messages_per_day?: number | null
          messages_replied_per_day?: number | null
          response_time_minutes?: number | null
          posts_count?: number | null
          total_reach?: number | null
          new_followers?: number | null
          content_notes?: string | null
          meals_bought?: number | null
          meals_given_out?: number | null
          attendees?: number | null
          location?: string | null
          school_visited?: string | null
          participants_count?: number | null
          ppi_members_attendance?: number | null
          visit_datetime?: string | null
          notes?: string | null
          custom_data?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "berkelanjutan_entries_proker_id_fkey"
            columns: ["proker_id"]
            isOneToOne: false
            referencedRelation: "prokers"
            referencedColumns: ["id"]
          }
        ]
      }
      ongoing_comments: {
        Row: {
          id: string
          proker_id: string
          commenter_name: string
          commenter_division: string | null
          comment_text: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          proker_id: string
          commenter_name: string
          commenter_division?: string | null
          comment_text: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          proker_id?: string
          commenter_name?: string
          commenter_division?: string | null
          comment_text?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ongoing_comments_proker_id_fkey"
            columns: ["proker_id"]
            isOneToOne: false
            referencedRelation: "prokers"
            referencedColumns: ["id"]
          }
        ]
      }
      prokers: {
        Row: {
          actual_peserta: number | null
          berkelanjutan_category: string | null
          berkelanjutan_notes: string | null
          collab_divisions: string[] | null
          completed_at: string | null
          created_at: string
          created_by_member_id: string | null
          current_zone: string
          description: string | null
          division: string
          engagement_data: Json | null
          id: string
          improvements: string | null
          is_berkelanjutan: boolean
          nama_proker: string
          notes: string | null
          progress: number
          promotion_data: Json | null
          red_zone: Json
          rating_data: Json | null
          status: string
          success_factors: string | null
          tanggal: string
          target_peserta: number
          type: string
          updated_at: string
          medium_zone: Json
          green_zone: Json
          lapak_ready: boolean
          custom_params: Json
        }
        Insert: {
          actual_peserta?: number | null
          berkelanjutan_category?: string | null
          berkelanjutan_notes?: string | null
          collab_divisions?: string[] | null
          completed_at?: string | null
          created_at?: string
          created_by_member_id?: string | null
          current_zone?: string
          description?: string | null
          division: string
          engagement_data?: Json | null
          id?: string
          improvements?: string | null
          is_berkelanjutan?: boolean
          nama_proker: string
          notes?: string | null
          progress?: number
          promotion_data?: Json | null
          red_zone?: Json
          rating_data?: Json | null
          status?: string
          success_factors?: string | null
          tanggal: string
          target_peserta?: number
          type: string
          updated_at?: string
          medium_zone?: Json
          green_zone?: Json
          lapak_ready?: boolean
          custom_params?: Json
        }
        Update: {
          actual_peserta?: number | null
          berkelanjutan_category?: string | null
          berkelanjutan_notes?: string | null
          collab_divisions?: string[] | null
          completed_at?: string | null
          created_at?: string
          created_by_member_id?: string | null
          current_zone?: string
          description?: string | null
          division?: string
          engagement_data?: Json | null
          id?: string
          improvements?: string | null
          is_berkelanjutan?: boolean
          nama_proker?: string
          notes?: string | null
          progress?: number
          promotion_data?: Json | null
          red_zone?: Json
          rating_data?: Json | null
          status?: string
          success_factors?: string | null
          tanggal?: string
          target_peserta?: number
          type?: string
          updated_at?: string
          medium_zone?: Json
          green_zone?: Json
          lapak_ready?: boolean
          custom_params?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
