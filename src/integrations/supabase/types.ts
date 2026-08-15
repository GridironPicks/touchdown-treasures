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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      games: {
        Row: {
          away_score: number | null
          away_team: string
          created_at: string
          external_id: string | null
          home_score: number | null
          home_team: string
          id: string
          is_tiebreaker_game: boolean
          kickoff: string
          season: number
          season_type: Database["public"]["Enums"]["season_type"]
          status: string
          week: number
        }
        Insert: {
          away_score?: number | null
          away_team: string
          created_at?: string
          external_id?: string | null
          home_score?: number | null
          home_team: string
          id?: string
          is_tiebreaker_game?: boolean
          kickoff: string
          season: number
          season_type?: Database["public"]["Enums"]["season_type"]
          status?: string
          week: number
        }
        Update: {
          away_score?: number | null
          away_team?: string
          created_at?: string
          external_id?: string | null
          home_score?: number | null
          home_team?: string
          id?: string
          is_tiebreaker_game?: boolean
          kickoff?: string
          season?: number
          season_type?: Database["public"]["Enums"]["season_type"]
          status?: string
          week?: number
        }
        Relationships: []
      }
      picks: {
        Row: {
          confidence: number
          created_at: string
          game_id: string
          id: string
          picked_team: string
          season: number
          season_type: Database["public"]["Enums"]["season_type"]
          user_id: string
          week: number
        }
        Insert: {
          confidence: number
          created_at?: string
          game_id: string
          id?: string
          picked_team: string
          season: number
          season_type?: Database["public"]["Enums"]["season_type"]
          user_id: string
          week: number
        }
        Update: {
          confidence?: number
          created_at?: string
          game_id?: string
          id?: string
          picked_team?: string
          season?: number
          season_type?: Database["public"]["Enums"]["season_type"]
          user_id?: string
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "picks_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          mascot: string
          primary_color: string
          team_name: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          mascot?: string
          primary_color?: string
          team_name?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          mascot?: string
          primary_color?: string
          team_name?: string
        }
        Relationships: []
      }
      tiebreakers: {
        Row: {
          created_at: string
          id: string
          predicted_total: number
          season: number
          season_type: Database["public"]["Enums"]["season_type"]
          user_id: string
          week: number
        }
        Insert: {
          created_at?: string
          id?: string
          predicted_total: number
          season: number
          season_type?: Database["public"]["Enums"]["season_type"]
          user_id: string
          week: number
        }
        Update: {
          created_at?: string
          id?: string
          predicted_total?: number
          season?: number
          season_type?: Database["public"]["Enums"]["season_type"]
          user_id?: string
          week?: number
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard: {
        Row: {
          display_name: string | null
          mascot: string | null
          primary_color: string | null
          season_points: number | null
          team_name: string | null
          user_id: string | null
          weeks_played: number | null
        }
        Relationships: []
      }
      preseason_leaderboard: {
        Row: {
          display_name: string | null
          mascot: string | null
          primary_color: string | null
          season_points: number | null
          team_name: string | null
          user_id: string | null
          weeks_played: number | null
        }
        Relationships: []
      }
      weekly_scores: {
        Row: {
          points: number | null
          season: number | null
          season_type: Database["public"]["Enums"]["season_type"] | null
          user_id: string | null
          week: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_slate: {
        Args: { _season: number }
        Returns: {
          season_type: Database["public"]["Enums"]["season_type"]
          week: number
        }[]
      }
      current_week: {
        Args: {
          _season: number
          _season_type?: Database["public"]["Enums"]["season_type"]
        }
        Returns: number
      }
      picks_deadline: {
        Args: {
          _season: number
          _season_type?: Database["public"]["Enums"]["season_type"]
          _week: number
        }
        Returns: string
      }
      picks_open_at: {
        Args: {
          _season: number
          _season_type?: Database["public"]["Enums"]["season_type"]
          _week: number
        }
        Returns: string
      }
    }
    Enums: {
      season_type: "pre" | "reg"
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
      season_type: ["pre", "reg"],
    },
  },
} as const
