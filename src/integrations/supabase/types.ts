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
      analyses: {
        Row: {
          app_id: string | null
          code_understanding: Json | null
          created_at: string | null
          fix_prompts: Json | null
          gaps: Json | null
          id: string
          intent_match_score: number | null
          security_issues: Json | null
          smart_questions: Json | null
          status: string | null
          summary: string | null
          unknown_features: Json | null
          user_answers: Json | null
          user_id: string | null
          what_works: Json | null
        }
        Insert: {
          app_id?: string | null
          code_understanding?: Json | null
          created_at?: string | null
          fix_prompts?: Json | null
          gaps?: Json | null
          id?: string
          intent_match_score?: number | null
          security_issues?: Json | null
          smart_questions?: Json | null
          status?: string | null
          summary?: string | null
          unknown_features?: Json | null
          user_answers?: Json | null
          user_id?: string | null
          what_works?: Json | null
        }
        Update: {
          app_id?: string | null
          code_understanding?: Json | null
          created_at?: string | null
          fix_prompts?: Json | null
          gaps?: Json | null
          id?: string
          intent_match_score?: number | null
          security_issues?: Json | null
          smart_questions?: Json | null
          status?: string | null
          summary?: string | null
          unknown_features?: Json | null
          user_answers?: Json | null
          user_id?: string | null
          what_works?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "analyses_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      apps: {
        Row: {
          app_name: string | null
          created_at: string | null
          github_owner: string | null
          github_repo_name: string | null
          github_repo_url: string | null
          id: string
          platform: string | null
          status: string | null
          supabase_anon_key: string | null
          supabase_url: string | null
          user_id: string | null
        }
        Insert: {
          app_name?: string | null
          created_at?: string | null
          github_owner?: string | null
          github_repo_name?: string | null
          github_repo_url?: string | null
          id?: string
          platform?: string | null
          status?: string | null
          supabase_anon_key?: string | null
          supabase_url?: string | null
          user_id?: string | null
        }
        Update: {
          app_name?: string | null
          created_at?: string | null
          github_owner?: string | null
          github_repo_name?: string | null
          github_repo_url?: string | null
          id?: string
          platform?: string | null
          status?: string | null
          supabase_anon_key?: string | null
          supabase_url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          plan: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          plan?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          plan?: string | null
        }
        Relationships: []
      }
      scan_limits: {
        Row: {
          id: string
          scan_count: number | null
          scan_date: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          scan_count?: number | null
          scan_date?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          scan_count?: number | null
          scan_date?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      scan_sessions: {
        Row: {
          concern_text: string | null
          created_at: string
          duplicate_of: string | null
          id: string
          payment_type: string | null
          plan_at_scan: string | null
          project_type: string | null
          repo_name: string | null
          repo_size_bytes: number | null
          report_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          concern_text?: string | null
          created_at?: string
          duplicate_of?: string | null
          id?: string
          payment_type?: string | null
          plan_at_scan?: string | null
          project_type?: string | null
          repo_name?: string | null
          repo_size_bytes?: number | null
          report_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          concern_text?: string | null
          created_at?: string
          duplicate_of?: string | null
          id?: string
          payment_type?: string | null
          plan_at_scan?: string | null
          project_type?: string | null
          repo_name?: string | null
          repo_size_bytes?: number | null
          report_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      scan_usage: {
        Row: {
          created_at: string | null
          id: string
          scan_count: number | null
          user_id: string | null
          week_start: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          scan_count?: number | null
          user_id?: string | null
          week_start?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          scan_count?: number | null
          user_id?: string | null
          week_start?: string | null
        }
        Relationships: []
      }
      scan_usage_monthly: {
        Row: {
          created_at: string | null
          id: string
          month_start: string
          scan_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          month_start?: string
          scan_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          month_start?: string
          scan_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_my_account: { Args: never; Returns: undefined }
      get_user_plan: { Args: { _user_id: string }; Returns: string }
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
