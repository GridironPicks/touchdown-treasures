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
      league_memberships: {
        Row: {
          created_at: string
          id: string
          league_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          league_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          league_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_memberships_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          created_at: string
          id: string
          is_global_pool: boolean
          join_code: string
          name: string
          owner_id: string
          settings: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_global_pool?: boolean
          join_code: string
          name: string
          owner_id: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_global_pool?: boolean
          join_code?: string
          name?: string
          owner_id?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          league_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          league_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          league_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      picks: {
        Row: {
          confidence: number
          created_at: string
          game_id: string
          id: string
          league_id: string
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
          league_id: string
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
          league_id?: string
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
          {
            foreignKeyName: "picks_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
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
      survivor_picks: {
        Row: {
          created_at: string
          id: string
          league_id: string
          season: number
          team: string
          user_id: string
          week: number
        }
        Insert: {
          created_at?: string
          id?: string
          league_id: string
          season: number
          team: string
          user_id: string
          week: number
        }
        Update: {
          created_at?: string
          id?: string
          league_id?: string
          season?: number
          team?: string
          user_id?: string
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "survivor_picks_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      tiebreakers: {
        Row: {
          created_at: string
          id: string
          league_id: string
          predicted_total: number
          season: number
          season_type: Database["public"]["Enums"]["season_type"]
          user_id: string
          week: number
        }
        Insert: {
          created_at?: string
          id?: string
          league_id: string
          predicted_total: number
          season: number
          season_type?: Database["public"]["Enums"]["season_type"]
          user_id: string
          week: number
        }
        Update: {
          created_at?: string
          id?: string
          league_id?: string
          predicted_total?: number
          season?: number
          season_type?: Database["public"]["Enums"]["season_type"]
          user_id?: string
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "tiebreakers_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      leaderboard: {
        Row: {
          display_name: string | null
          league_id: string | null
          mascot: string | null
          primary_color: string | null
          season_points: number | null
          team_name: string | null
          user_id: string | null
          weeks_played: number | null
        }
        Relationships: [
          {
            foreignKeyName: "picks_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      preseason_leaderboard: {
        Row: {
          display_name: string | null
          league_id: string | null
          mascot: string | null
          primary_color: string | null
          season_points: number | null
          team_name: string | null
          user_id: string | null
          weeks_played: number | null
        }
        Relationships: [
          {
            foreignKeyName: "picks_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_scores: {
        Row: {
          league_id: string | null
          points: number | null
          season: number | null
          season_type: Database["public"]["Enums"]["season_type"] | null
          user_id: string | null
          week: number | null
        }
        Relationships: [
          {
            foreignKeyName: "picks_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_league: {
        Args: { _name: string; _owner_id: string; _settings?: Json }
        Returns: string
      }
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
      generate_join_code: { Args: never; Returns: string }
      join_league_by_code: {
        Args: { _code: string; _user_id: string }
        Returns: string
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
      picks_revealed:
        | {
            Args: {
              _season: number
              _season_type: Database["public"]["Enums"]["season_type"]
              _week: number
            }
            Returns: boolean
          }
        | {
            Args: {
              _league_id?: string
              _season: number
              _season_type: Database["public"]["Enums"]["season_type"]
              _week: number
            }
            Returns: boolean
          }
      survivor_board:
        | {
            Args: { _season: number }
            Returns: {
              display_name: string
              mascot: string
              primary_color: string
              result: string
              revealed: boolean
              team: string
              team_name: string
              user_id: string
              week: number
            }[]
          }
        | {
            Args: { _league_id?: string; _season: number }
            Returns: {
              display_name: string
              mascot: string
              primary_color: string
              result: string
              revealed: boolean
              team: string
              team_name: string
              user_id: string
              week: number
            }[]
          }
      week_submission_status:
        | {
            Args: {
              _season: number
              _season_type: Database["public"]["Enums"]["season_type"]
              _week: number
            }
            Returns: {
              display_name: string
              mascot: string
              pick_count: number
              primary_color: string
              submitted: boolean
              team_name: string
              user_id: string
            }[]
          }
        | {
            Args: {
              _league_id?: string
              _season: number
              _season_type: Database["public"]["Enums"]["season_type"]
              _week: number
            }
            Returns: {
              display_name: string
              mascot: string
              pick_count: number
              primary_color: string
              submitted: boolean
              team_name: string
              user_id: string
            }[]
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
