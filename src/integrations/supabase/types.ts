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
      admin_notify_settings: {
        Row: {
          function_url: string
          id: number
        }
        Insert: {
          function_url: string
          id?: number
        }
        Update: {
          function_url?: string
          id?: number
        }
        Relationships: []
      }
      analyses: {
        Row: {
          app_id: string | null
          code_understanding: Json | null
          created_at: string | null
          files_scanned: number | null
          fix_prompts: Json | null
          gaps: Json | null
          homepage_signals: Json | null
          id: string
          intent_match_score: number | null
          landing_page_promises: Json | null
          legal_findings: Json | null
          scan_duration_seconds: number | null
          scan_type: string | null
          security_issues: Json | null
          security_score: number | null
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
          files_scanned?: number | null
          fix_prompts?: Json | null
          gaps?: Json | null
          homepage_signals?: Json | null
          id?: string
          intent_match_score?: number | null
          landing_page_promises?: Json | null
          legal_findings?: Json | null
          scan_duration_seconds?: number | null
          scan_type?: string | null
          security_issues?: Json | null
          security_score?: number | null
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
          files_scanned?: number | null
          fix_prompts?: Json | null
          gaps?: Json | null
          homepage_signals?: Json | null
          id?: string
          intent_match_score?: number | null
          landing_page_promises?: Json | null
          legal_findings?: Json | null
          scan_duration_seconds?: number | null
          scan_type?: string | null
          security_issues?: Json | null
          security_score?: number | null
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
          app_description: string | null
          app_name: string | null
          created_at: string | null
          github_owner: string | null
          github_repo_name: string | null
          github_repo_url: string | null
          id: string
          live_url: string | null
          platform: string | null
          status: string | null
          supabase_anon_key: string | null
          supabase_url: string | null
          user_id: string | null
        }
        Insert: {
          app_description?: string | null
          app_name?: string | null
          created_at?: string | null
          github_owner?: string | null
          github_repo_name?: string | null
          github_repo_url?: string | null
          id?: string
          live_url?: string | null
          platform?: string | null
          status?: string | null
          supabase_anon_key?: string | null
          supabase_url?: string | null
          user_id?: string | null
        }
        Update: {
          app_description?: string | null
          app_name?: string | null
          created_at?: string | null
          github_owner?: string | null
          github_repo_name?: string | null
          github_repo_url?: string | null
          id?: string
          live_url?: string | null
          platform?: string | null
          status?: string | null
          supabase_anon_key?: string | null
          supabase_url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_name: string
          body_markdown: string
          cover_image_url: string | null
          created_at: string
          created_by: string
          excerpt: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string
          body_markdown?: string
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          excerpt?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          body_markdown?: string
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          excerpt?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      finding_disputes: {
        Row: {
          analysis_id: string | null
          created_at: string
          finding_category: string | null
          finding_id: string | null
          finding_name: string | null
          id: string
          reason: string
          status: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          created_at?: string
          finding_category?: string | null
          finding_id?: string | null
          finding_name?: string | null
          id?: string
          reason: string
          status?: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          created_at?: string
          finding_category?: string | null
          finding_id?: string | null
          finding_name?: string | null
          id?: string
          reason?: string
          status?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      monitored_repos: {
        Row: {
          app_id: string
          branch: string
          created_at: string
          enabled: boolean
          id: string
          last_scan_at: string | null
          user_id: string
          webhook_secret: string
        }
        Insert: {
          app_id: string
          branch?: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_scan_at?: string | null
          user_id: string
          webhook_secret: string
        }
        Update: {
          app_id?: string
          branch?: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_scan_at?: string | null
          user_id?: string
          webhook_secret?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          id: string
          path: string
          referrer: string | null
          session_id: string | null
          user_id: string | null
          viewport: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          path: string
          referrer?: string | null
          session_id?: string | null
          user_id?: string | null
          viewport?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          referrer?: string | null
          session_id?: string | null
          user_id?: string | null
          viewport?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          payment_type: string
          status: string
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          payment_type: string
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          payment_type?: string
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
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
          pro_credits: number
          pro_until: string | null
          stripe_customer_id: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          plan?: string | null
          pro_credits?: number
          pro_until?: string | null
          stripe_customer_id?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          plan?: string | null
          pro_credits?: number
          pro_until?: string | null
          stripe_customer_id?: string | null
        }
        Relationships: []
      }
      report_feedback: {
        Row: {
          analysis_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      report_reviews: {
        Row: {
          analysis_id: string
          comment: string | null
          created_at: string
          finding_category: string | null
          finding_id: string
          finding_name: string | null
          finding_severity: string | null
          id: string
          updated_at: string
          user_id: string
          verdict: string
        }
        Insert: {
          analysis_id: string
          comment?: string | null
          created_at?: string
          finding_category?: string | null
          finding_id: string
          finding_name?: string | null
          finding_severity?: string | null
          id?: string
          updated_at?: string
          user_id: string
          verdict: string
        }
        Update: {
          analysis_id?: string
          comment?: string | null
          created_at?: string
          finding_category?: string | null
          finding_id?: string
          finding_name?: string | null
          finding_severity?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          verdict?: string
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
      scan_reminders: {
        Row: {
          id: string
          reminder_type: string
          sent_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          id?: string
          reminder_type?: string
          sent_at?: string
          user_id: string
          week_start?: string
        }
        Update: {
          id?: string
          reminder_type?: string
          sent_at?: string
          user_id?: string
          week_start?: string
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
          scan_ready_email_sent_at: string | null
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
          scan_ready_email_sent_at?: string | null
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
          scan_ready_email_sent_at?: string | null
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
      admin_activity_timeseries: {
        Args: { _days?: number }
        Returns: {
          day: string
          scans: number
          signups: number
        }[]
      }
      admin_delete_user: {
        Args: { _target_user_id: string }
        Returns: undefined
      }
      admin_feedback_stats: {
        Args: never
        Returns: {
          avg_rating: number
          five_star: number
          four_star: number
          one_star: number
          three_star: number
          total: number
          two_star: number
          with_comments: number
        }[]
      }
      admin_inactive_users: {
        Args: { _limit?: number }
        Returns: {
          app_count: number
          created_at: string
          email: string
          full_name: string
          id: string
          last_sign_in_at: string
        }[]
      }
      admin_list_report_feedback: {
        Args: { _limit?: number }
        Returns: {
          analysis_id: string
          comment: string
          created_at: string
          id: string
          rating: number
          scan_type: string
          updated_at: string
          user_email: string
          user_id: string
        }[]
      }
      admin_list_users: {
        Args: never
        Returns: {
          app_count: number
          created_at: string
          email: string
          full_name: string
          id: string
          last_sign_in_at: string
          plan: string
          pro_credits: number
          pro_until: string
          scan_count: number
        }[]
      }
      admin_notify_key_set: { Args: never; Returns: boolean }
      admin_plan_distribution: {
        Args: never
        Returns: {
          plan: string
          user_count: number
        }[]
      }
      admin_recent_scans: {
        Args: { _limit?: number }
        Returns: {
          created_at: string
          files_scanned: number
          id: string
          scan_duration_seconds: number
          scan_type: string
          status: string
          user_email: string
        }[]
      }
      admin_recent_signups: {
        Args: { _limit?: number }
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
        }[]
      }
      admin_set_notify_key: { Args: { _key: string }; Returns: undefined }
      admin_set_user_plan: {
        Args: { _plan: string; _target_user_id: string }
        Returns: undefined
      }
      admin_top_pages: {
        Args: { _days?: number; _limit?: number }
        Returns: {
          path: string
          unique_sessions: number
          views: number
        }[]
      }
      admin_top_referrers: {
        Args: { _days?: number; _limit?: number }
        Returns: {
          referrer: string
          views: number
        }[]
      }
      admin_top_scanners: {
        Args: { _limit?: number }
        Returns: {
          email: string
          full_name: string
          last_scan_at: string
          scan_count: number
          user_id: string
        }[]
      }
      admin_traffic_stats: {
        Args: never
        Returns: {
          unique_sessions_7d: number
          unique_visitors_7d: number
          views_30d: number
          views_7d: number
          views_today: number
        }[]
      }
      admin_traffic_timeseries: {
        Args: { _days?: number }
        Returns: {
          day: string
          unique_sessions: number
          views: number
        }[]
      }
      admin_user_stats: {
        Args: never
        Returns: {
          pro_users: number
          scans_this_week: number
          signups_this_week: number
          total_apps: number
          total_scans: number
          total_users: number
          waitlist_count: number
        }[]
      }
      admin_users_without_github: {
        Args: { _limit?: number }
        Returns: {
          app_count: number
          created_at: string
          email: string
          full_name: string
          id: string
          scan_count: number
        }[]
      }
      app_has_backend: { Args: { _app_id: string }; Returns: boolean }
      claim_scan_ready_email: { Args: { _report_id: string }; Returns: boolean }
      consume_pro_credit: { Args: { _user_id: string }; Returns: boolean }
      delete_my_account: { Args: never; Returns: undefined }
      get_user_plan: { Args: { _user_id: string }; Returns: string }
      has_pro_access: { Args: { _user_id: string }; Returns: boolean }
      is_blog_admin: { Args: never; Returns: boolean }
      notify_admin_event: {
        Args: { _event: string; _payload: Json }
        Returns: undefined
      }
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
