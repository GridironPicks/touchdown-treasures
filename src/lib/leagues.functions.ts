import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createSchema = z.object({
  name: z.string().min(1).max(60),
  settings: z.record(z.unknown()).default({}),
});

const joinSchema = z.object({
  code: z.string().min(1).max(10).toUpperCase(),
});

const leagueIdSchema = z.object({
  leagueId: z.string().uuid(),
});

export type LeagueSettings = Record<string, string | number | boolean | null>;

export type League = {
  id: string;
  name: string;
  owner_id: string;
  join_code: string;
  settings: LeagueSettings;
  is_global_pool: boolean;
  role: "owner" | "member";
  created_at: string;
};

function toSettings(value: unknown): LeagueSettings {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const out: LeagueSettings = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null) {
      out[k] = v;
    }
  }
  return out;
}

function toLeague(row: any): League | null {
  const l = row?.leagues ?? row;
  if (!l) return null;
  return {
    id: l.id,
    name: l.name,
    owner_id: l.owner_id,
    join_code: l.join_code,
    settings: toSettings(l.settings),
    is_global_pool: l.is_global_pool,
    role: row.role as "owner" | "member",
    created_at: l.created_at,
  };
}

export const listMyLeagues = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("league_memberships")
      .select("role, leagues(id, name, owner_id, join_code, settings, is_global_pool, created_at)")
      .eq("user_id", context.userId)
      .order("created_at", { referencedTable: "leagues", ascending: true });
    if (error) throw error;

    return ((data ?? []).map(toLeague).filter(Boolean) as League[]);
  });

export const createLeague = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: leagueId, error } = await context.supabase.rpc("create_league", {
      _name: data.name,
      _owner_id: context.userId,
      _settings: data.settings,
    });
    if (error) throw error;
    return { leagueId: leagueId as string };
  });

export const joinLeague = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => joinSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: leagueId, error } = await context.supabase.rpc("join_league_by_code", {
      _code: data.code,
      _user_id: context.userId,
    });
    if (error) throw error;
    return { leagueId: leagueId as string };
  });

export const leaveLeague = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => leagueIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: list, error: listError } = await context.supabase
      .from("league_memberships")
      .select("league_id")
      .eq("user_id", context.userId);
    if (listError) throw listError;
    if ((list ?? []).length <= 1) {
      throw new Error("You can't leave your only league");
    }

    const { error } = await context.supabase
      .from("league_memberships")
      .delete()
      .eq("league_id", data.leagueId)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const getLeague = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => leagueIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: membership, error: membershipError } = await context.supabase
      .from("league_memberships")
      .select("role, leagues(id, name, owner_id, join_code, settings, is_global_pool, created_at)")
      .eq("user_id", context.userId)
      .eq("league_id", data.leagueId)
      .maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) throw new Error("League not found or you're not a member");

    const league = toLeague(membership);
    if (!league) throw new Error("League not found");
    return league;
  });
