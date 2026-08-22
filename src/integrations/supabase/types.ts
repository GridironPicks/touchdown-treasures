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
      fantasy_lineup_slots: {
        Row: {
          created_at: string
          id: string
          league_id: string
          lineup_id: string
          player_id: string
          season: number
          season_type: Database["public"]["Enums"]["season_type"]
          slot: string
          user_id: string
          week: number
        }
        Insert: {
          created_at?: string
          id?: string
          league_id: string
          lineup_id: string
          player_id: string
          season: number
          season_type?: Database["public"]["Enums"]["season_type"]
          slot: string
          user_id: string
          week: number
        }
        Update: {
          created_at?: string
          id?: string
          league_id?: string
          lineup_id?: string
          player_id?: string
          season?: number
          season_type?: Database["public"]["Enums"]["season_type"]
          slot?: string
          user_id?: string
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "fantasy_lineup_slots_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_lineup_slots_lineup_id_fkey"
            columns: ["lineup_id"]
            isOneToOne: false
            referencedRelation: "fantasy_lineups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_lineup_slots_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "fantasy_players"
            referencedColumns: ["id"]
          },
        ]
      }
      fantasy_lineups: {
        Row: {
          captain_slot: string | null
          created_at: string
          id: string
          league_id: string
          season: number
          season_type: Database["public"]["Enums"]["season_type"]
          updated_at: string
          user_id: string
          week: number
        }
        Insert: {
          captain_slot?: string | null
          created_at?: string
          id?: string
          league_id: string
          season: number
          season_type?: Database["public"]["Enums"]["season_type"]
          updated_at?: string
          user_id: string
          week: number
        }
        Update: {
          captain_slot?: string | null
          created_at?: string
          id?: string
          league_id?: string
          season?: number
          season_type?: Database["public"]["Enums"]["season_type"]
          updated_at?: string
          user_id?: string
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "fantasy_lineups_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      fantasy_player_stats: {
        Row: {
          espn_id: string
          id: string
          is_final: boolean
          line: string | null
          points: number
          season: number
          season_type: Database["public"]["Enums"]["season_type"]
          updated_at: string
          week: number
        }
        Insert: {
          espn_id: string
          id?: string
          is_final?: boolean
          line?: string | null
          points?: number
          season: number
          season_type?: Database["public"]["Enums"]["season_type"]
          updated_at?: string
          week: number
        }
        Update: {
          espn_id?: string
          id?: string
          is_final?: boolean
          line?: string | null
          points?: number
          season?: number
          season_type?: Database["public"]["Enums"]["season_type"]
          updated_at?: string
          week?: number
        }
        Relationships: []
      }
      fantasy_players: {
        Row: {
          cost: number
          espn_id: string
          headshot: string | null
          id: string
          name: string
          opponent: string | null
          position: string
          season: number
          season_type: Database["public"]["Enums"]["season_type"]
          team: string
          updated_at: string
          week: number
        }
        Insert: {
          cost?: number
          espn_id: string
          headshot?: string | null
          id?: string
          name: string
          opponent?: string | null
          position: string
          season: number
          season_type?: Database["public"]["Enums"]["season_type"]
          team: string
          updated_at?: string
          week: number
        }
        Update: {
          cost?: number
          espn_id?: string
          headshot?: string | null
          id?: string
          name?: string
          opponent?: string | null
          position?: string
          season?: number
          season_type?: Database["public"]["Enums"]["season_type"]
          team?: string
          updated_at?: string
          week?: number
        }
        Relationships: []
      }
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
      notification_log: {
        Row: {
          created_at: string
          dedupe_key: string
          id: string
          kind: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dedupe_key: string
          id?: string
          kind: string
          user_id: string
        }
        Update: {
          created_at?: string
          dedupe_key?: string
          id?: string
          kind?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          chat: boolean
          consent_version: string | null
          consented_at: string | null
          deadlines: boolean
          results: boolean
          survivor: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          chat?: boolean
          consent_version?: string | null
          consented_at?: string | null
          deadlines?: boolean
          results?: boolean
          survivor?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          chat?: boolean
          consent_version?: string | null
          consented_at?: string | null
          deadlines?: boolean
          results?: boolean
          survivor?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_label: string | null
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_label?: string | null
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_label?: string | null
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_id?: string
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
      fantasy_board: {
        Args: {
          _league_id: string
          _season: number
          _season_type: Database["public"]["Enums"]["season_type"]
          _week: number
        }
        Returns: {
          display_name: string
          is_captain: boolean
          mascot: string
          pl_cost: number
          pl_name: string
          pl_points: number
          pl_pos: string
          pl_team: string
          primary_color: string
          revealed: boolean
          slot: string
          team_name: string
          user_id: string
        }[]
      }
      fantasy_pool: {
        Args: {
          _league_id: string
          _season: number
          _season_type: Database["public"]["Enums"]["season_type"]
          _week: number
        }
        Returns: {
          claimed_by: string
          claimed_team: string
          pl_cost: number
          pl_espn_id: string
          pl_headshot: string
          pl_id: string
          pl_name: string
          pl_opp: string
          pl_points: number
          pl_pos: string
          pl_team: string
        }[]
      }
      fantasy_standings: {
        Args: {
          _league_id: string
          _season: number
          _season_type: Database["public"]["Enums"]["season_type"]
        }
        Returns: {
          display_name: string
          mascot: string
          primary_color: string
          team_name: string
          total: number
          user_id: string
          weeks_played: number
          wins: number
        }[]
      }
      fantasy_weekly_totals: {
        Args: {
          _league_id: string
          _season: number
          _season_type: Database["public"]["Enums"]["season_type"]
        }
        Returns: {
          filled: number
          points: number
          user_id: string
          week: number
        }[]
      }
      generate_join_code: { Args: never; Returns: string }
      head_to_head: {
        Args: {
          _league_id: string
          _season: number
          _season_type: Database["public"]["Enums"]["season_type"]
        }
        Returns: {
          losses: number
          opponent_id: string
          ties: number
          user_id: string
          wins: number
        }[]
      }
      is_league_member: {
        Args: { _league_id: string; _user_id: string }
        Returns: boolean
      }
      is_league_owner: {
        Args: { _league_id: string; _user_id: string }
        Returns: boolean
      }
      join_league_by_code: {
        Args: { _code: string; _user_id: string }
        Returns: string
      }
      league_week_winners: {
        Args: {
          _league_id: string
          _season: number
          _season_type: Database["public"]["Enums"]["season_type"]
        }
        Returns: {
          points: number
          user_id: string
          week: number
        }[]
      }
      league_weekly_points: {
        Args: {
          _league_id: string
          _season: number
          _season_type: Database["public"]["Enums"]["season_type"]
        }
        Returns: {
          correct_count: number
          field_size: number
          place: number
          points: number
          tiebreak_diff: number
          user_id: string
          week: number
        }[]
      }
      manager_badges: {
        Args: {
          _league_id: string
          _season: number
          _season_type: Database["public"]["Enums"]["season_type"]
        }
        Returns: {
          badge: string
          detail: string
          user_id: string
          week: number
        }[]
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
      regenerate_join_code: { Args: { _league_id: string }; Returns: string }
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
      transfer_league_ownership: {
        Args: { _league_id: string; _new_owner: string }
        Returns: boolean
      }
      week_highlights: {
        Args: {
          _league_id: string
          _season: number
          _season_type: Database["public"]["Enums"]["season_type"]
          _week: number
        }
        Returns: {
          kind: string
          mascot: string
          matchup: string
          picked_team: string
          points: number
          primary_color: string
          team_name: string
          user_id: string
        }[]
      }
      week_live_standings: {
        Args: {
          _league_id: string
          _season: number
          _season_type: Database["public"]["Enums"]["season_type"]
          _week: number
        }
        Returns: {
          banked: number
          correct_count: number
          display_name: string
          live: number
          mascot: string
          max_possible: number
          primary_color: string
          remaining: number
          team_name: string
          user_id: string
        }[]
      }
      week_open_picks: {
        Args: {
          _league_id: string
          _season: number
          _season_type: Database["public"]["Enums"]["season_type"]
          _week: number
        }
        Returns: {
          external_id: string
          home_team: string
          picked_team: string
          points: number
          user_id: string
        }[]
      }
      week_recap: {
        Args: {
          _league_id: string
          _season: number
          _season_type: Database["public"]["Enums"]["season_type"]
          _week: number
        }
        Returns: {
          correct_count: number
          decided_by: string
          display_name: string
          mascot: string
          place: number
          points: number
          predicted_total: number
          primary_color: string
          submitted_at: string
          team_name: string
          tiebreak_diff: number
          user_id: string
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
