import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Crown, Lock, Search, Star, Timer, Trophy, UserPlus, X, Zap } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Mascot } from "@/components/Mascot";
import { TeamLogo } from "@/components/TeamLogo";
import { SlatePicker } from "@/components/SlatePicker";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { refreshFantasySlate } from "@/lib/fantasy.functions";
import { SEASON, formatCountdown, teamShort, weekDeadline, weekOpensAt } from "@/lib/league";
import { useLeague } from "@/lib/league-context";
import { useSlates } from "@/lib/slate";

export const Route = createFileRoute("/_authenticated/fantasy")({
  head: () => ({
    meta: [
      { title: "Fantasy Lineup — Gridiron Confidence" },
      {
        name: "description",
        content:
          "Draft a 5-man weekly NFL lineup under a 15-star cap. Every player can only be owned by one manager in your league each week.",
      },
      { property: "og:title", content: "Fantasy Lineup — Gridiron Confidence" },
      {
        property: "og:description",
        content: "Draft-style weekly mini DFS: QB, RB, WR, TE and a FLEX, first come first served.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FantasyPage,
});

const SLOTS = ["QB", "RB", "WR", "TE", "FLEX"] as const;
type Slot = (typeof SLOTS)[number];
const CAP = 15;

const SLOT_ELIGIBLE: Record<Slot, string[]> = {
  QB: ["QB"],
  RB: ["RB"],
  WR: ["WR"],
  TE: ["TE"],
  FLEX: ["RB", "WR", "TE"],
};

type PoolRow = {
  pl_id: string;
  pl_espn_id: string;
  pl_name: string;
  pl_pos: string;
  pl_team: string;
  pl_opp: string | null;
  pl_cost: number;
  pl_headshot: string | null;
  claimed_by: string | null;
  claimed_team: string | null;
  pl_points: number;
};

type BoardRow = {
  user_id: string;
  display_name: string;
  team_name: string;
  mascot: string;
  primary_color: string;
  slot: string | null;
  is_captain: boolean | null;
  pl_name: string | null;
  pl_pos: string | null;
  pl_team: string | null;
  pl_cost: number | null;
  pl_points: number | null;
  revealed: boolean;
};

type StandingRow = {
  user_id: string;
  display_name: string;
  team_name: string;
  mascot: string;
  primary_color: string;
  total: number;
  weeks_played: number;
  wins: number;
};

function Stars({ cost }: { cost: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-primary" aria-label={`${cost} stars`}>
      {Array.from({ length: cost }).map((_, i) => (
        <Star key={i} size={11} className="fill-current" />
      ))}
    </span>
  );
}

function FantasyPage() {
  const queryClient = useQueryClient();
  const { activeLeague } = useLeague();
  const refresh = useServerFn(refreshFantasySlate);
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState<Slot>("QB");
  const [availableOnly, setAvailableOnly] = useState(true);
  const now = Date.now();

  const { data: slates = [] } = useSlates();

  // Default to the first slate that hasn't locked yet, so managers land on the
  // week they can actually draft instead of one already in progress.
  const suggested = useMemo(() => {
    const open = slates.find((s) => {
      const first = Math.min(...s.games.map((g) => new Date(g.kickoff).getTime()));
      const lock = s.seasonType === "reg" ? (s.deadline?.getTime() ?? first) : first;
      return lock > Date.now();
    });
    const fallback = slates.find((s) => !s.allFinal) ?? slates[slates.length - 1] ?? null;
    const chosen = open ?? fallback;
    return chosen ? { seasonType: chosen.seasonType, week: chosen.week } : null;
  }, [slates]);

  const [slate, setSlate] = useState<{ seasonType: "pre" | "reg"; week: number } | null>(null);
  useEffect(() => {
    if (!slate && suggested) setSlate(suggested);
  }, [slate, suggested]);

  const activeSlate =
    slates.find((s) => s.seasonType === slate?.seasonType && s.week === slate?.week) ?? null;
  const seasonType = activeSlate?.seasonType ?? "pre";
  const week = activeSlate?.week ?? 1;
  const games = useMemo(() => activeSlate?.games ?? [], [activeSlate]);


  const { data: me } = useQuery({
    queryKey: ["me-id"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });

  const deadline = useMemo(() => {
    if (games.length === 0) return null;
    if (seasonType === "reg") return weekDeadline(games);
    const first = Math.min(...games.map((g) => new Date(g.kickoff).getTime()));
    return new Date(first);
  }, [games, seasonType]);
  const opensAt = useMemo(
    () => (seasonType === "reg" ? weekOpensAt(games) : null),
    [games, seasonType],
  );
  const notOpenYet = opensAt ? now < opensAt.getTime() : false;
  const locked = notOpenYet || (deadline ? deadline.getTime() <= now : false);

  


  const slateKey = [activeLeague?.id, SEASON, seasonType, week] as const;

  // Keep the pool and live scoring fresh on mount, on focus, and on a timer.
  useEffect(() => {
    if (!activeSlate) return;
    let cancelled = false;
    const run = async () => {
      try {
        await refresh({ data: { seasonType, week } });
        if (cancelled) return;
        await queryClient.invalidateQueries({ queryKey: ["fantasy-pool"] });
        await queryClient.invalidateQueries({ queryKey: ["fantasy-board"] });
        await queryClient.invalidateQueries({ queryKey: ["fantasy-standings"] });
      } catch {
        /* provider hiccups are non-fatal */
      }
    };
    run();
    const timer = window.setInterval(run, 30_000);
    window.addEventListener("focus", run);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", run);
    };
  }, [activeSlate, seasonType, week, refresh, queryClient]);

  const { data: pool = [], isLoading: poolLoading } = useQuery({
    queryKey: ["fantasy-pool", ...slateKey],
    enabled: !!activeLeague,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fantasy_pool", {
        _season: SEASON,
        _season_type: seasonType,
        _week: week,
        _league_id: activeLeague!.id,
      });
      if (error) throw error;
      return (data ?? []) as PoolRow[];
    },
    refetchInterval: 30_000,
  });

  const { data: lineup } = useQuery({
    queryKey: ["fantasy-lineup", ...slateKey, me],
    enabled: !!activeLeague && !!me,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fantasy_lineups")
        .select("id, captain_slot")
        .eq("league_id", activeLeague!.id)
        .eq("season", SEASON)
        .eq("season_type", seasonType)
        .eq("week", week)
        .eq("user_id", me!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: mySlots = [] } = useQuery({
    queryKey: ["fantasy-slots", lineup?.id],
    enabled: !!lineup?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fantasy_lineup_slots")
        .select("id, slot, player_id")
        .eq("lineup_id", lineup!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: board = [] } = useQuery({
    queryKey: ["fantasy-board", ...slateKey],
    enabled: !!activeLeague,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fantasy_board", {
        _season: SEASON,
        _season_type: seasonType,
        _week: week,
        _league_id: activeLeague!.id,
      });
      if (error) throw error;
      return (data ?? []) as BoardRow[];
    },
    refetchInterval: 30_000,
  });

  const { data: standings = [] } = useQuery({
    queryKey: ["fantasy-standings", activeLeague?.id, SEASON, seasonType],
    enabled: !!activeLeague,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fantasy_standings", {
        _season: SEASON,
        _season_type: seasonType,
        _league_id: activeLeague!.id,
      });
      if (error) throw error;
      return (data ?? []) as StandingRow[];
    },
  });

  const playerById = useMemo(() => {
    const map = new Map<string, PoolRow>();
    for (const p of pool) map.set(p.pl_id, p);
    return map;
  }, [pool]);

  const slotMap = useMemo(() => {
    const map = new Map<Slot, { id: string; player: PoolRow | undefined }>();
    for (const s of mySlots) {
      map.set(s.slot as Slot, { id: s.id, player: playerById.get(s.player_id) });
    }
    return map;
  }, [mySlots, playerById]);

  const starsUsed = [...slotMap.values()].reduce((sum, s) => sum + (s.player?.pl_cost ?? 0), 0);
  const starsLeft = CAP - starsUsed;
  const filled = slotMap.size;


  const myLive = useMemo(() => {
    let total = 0;
    for (const [slot, s] of slotMap) {
      const mult = lineup?.captain_slot === slot ? 1.5 : 1;
      total += (s.player?.pl_points ?? 0) * mult;
    }
    return Math.round(total * 10) / 10;
  }, [slotMap, lineup]);

  async function invalidateAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["fantasy-pool"] }),
      queryClient.invalidateQueries({ queryKey: ["fantasy-lineup"] }),
      queryClient.invalidateQueries({ queryKey: ["fantasy-slots"] }),
      queryClient.invalidateQueries({ queryKey: ["fantasy-board"] }),
    ]);
  }

  const claim = useMutation({
    mutationFn: async ({ slot, player }: { slot: Slot; player: PoolRow }) => {
      if (!me || !activeLeague) throw new Error("You must be signed in");
      let lineupId = lineup?.id;
      if (!lineupId) {
        const { data, error } = await supabase
          .from("fantasy_lineups")
          .insert({
            league_id: activeLeague.id,
            user_id: me,
            season: SEASON,
            season_type: seasonType,
            week,
          })
          .select("id")
          .single();
        if (error) throw error;
        lineupId = data.id;
      }
      const existing = slotMap.get(slot);
      if (existing) {
        const { error } = await supabase
          .from("fantasy_lineup_slots")
          .delete()
          .eq("id", existing.id);
        if (error) throw error;
      }
      const { error } = await supabase.from("fantasy_lineup_slots").insert({
        lineup_id: lineupId,
        league_id: activeLeague.id,
        user_id: me,
        season: SEASON,
        season_type: seasonType,
        week,
        slot,
        player_id: player.pl_id,
      });
      if (error) {
        if (error.code === "23505") throw new Error(`${player.pl_name} was just claimed by another manager`);
        throw error;
      }
      return player;
    },
    onSuccess: async (player) => {
      toast.success(`${player.pl_name} drafted`);
      await invalidateAll();
    },
    onError: async (error) => {
      toast.error(error instanceof Error ? error.message : "Could not draft that player");
      await invalidateAll();
    },
  });

  const release = useMutation({
    mutationFn: async (slotRowId: string) => {
      const { error } = await supabase.from("fantasy_lineup_slots").delete().eq("id", slotRowId);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Player released back to the pool");
      await invalidateAll();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not release that player"),
  });

  const setCaptain = useMutation({
    mutationFn: async (slot: Slot) => {
      if (!lineup?.id) throw new Error("Draft a player first");
      const next = lineup.captain_slot === slot ? null : slot;
      const { error } = await supabase
        .from("fantasy_lineups")
        .update({ captain_slot: next, updated_at: new Date().toISOString() })
        .eq("id", lineup.id);
      if (error) throw error;
      return next;
    },
    onSuccess: async (next) => {
      toast.success(next ? `${next} is your captain (1.5x)` : "Captain cleared");
      await invalidateAll();
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not set your captain"),
  });

  const filteredPool = useMemo(() => {
    const term = search.trim().toLowerCase();
    return pool
      .filter((p) => SLOT_ELIGIBLE[posFilter].includes(p.pl_pos))
      .filter((p) => (availableOnly ? !p.claimed_by || p.claimed_by === me : true))
      .filter(
        (p) =>
          !term ||
          p.pl_name.toLowerCase().includes(term) ||
          p.pl_team.toLowerCase().includes(term),
      )
      .slice(0, 120);
  }, [pool, posFilter, availableOnly, search, me]);

  const boardManagers = useMemo(() => {
    const map = new Map<string, { row: BoardRow; slots: BoardRow[]; total: number }>();
    for (const r of board) {
      let entry = map.get(r.user_id);
      if (!entry) {
        entry = { row: r, slots: [], total: 0 };
        map.set(r.user_id, entry);
      }
      if (r.slot) {
        entry.slots.push(r);
        const mult = r.is_captain ? 1.5 : 1;
        entry.total += (r.pl_points ?? 0) * mult;
      }
    }
    return [...map.values()].sort((a, b) => b.total - a.total || a.row.team_name.localeCompare(b.row.team_name));
  }, [board]);

  if (!activeLeague) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SlatePicker slates={slates} value={slate} onChange={setSlate} />

      <header className="flex flex-wrap items-end justify-between gap-3">

        <div>
          <h1 className="stadium-heading flex items-center gap-2 text-3xl">
            <Zap className="text-primary" /> Fantasy Lineup
          </h1>
          <p className="text-sm text-muted-foreground">
            {seasonType === "pre" ? "Preseason " : ""}Week {week} · draft style — one manager per
            player
          </p>
        </div>
        <div className="text-right text-sm">
          {notOpenYet && opensAt ? (
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <Timer size={14} /> Opens in {formatCountdown(opensAt.getTime() - now)}
            </p>
          ) : deadline && !locked ? (
            <p className="flex items-center gap-1.5 text-primary">
              <Timer size={14} /> Locks in {formatCountdown(deadline.getTime() - now)}
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <Lock size={14} /> Lineups locked
            </p>
          )}
        </div>
      </header>

      <Tabs defaultValue="lineup">
        <TabsList className="w-full">
          <TabsTrigger value="lineup" className="flex-1">
            My Lineup
          </TabsTrigger>
          <TabsTrigger value="live" className="flex-1">
            Live
          </TabsTrigger>
          <TabsTrigger value="season" className="flex-1">
            Season
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex-1">
            Rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lineup" className="space-y-4 pt-4">


          <section className="field-panel rounded-2xl border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="stadium-heading text-lg">
                  {filled}/5 slots · {starsUsed}/{CAP} stars
                </p>
                <p className="text-xs text-muted-foreground">
                  {starsLeft} star{starsLeft === 1 ? "" : "s"} left · captain scores 1.5x
                </p>
              </div>
              <p className="text-right">
                <span className="stadium-heading text-2xl text-primary">{myLive.toFixed(1)}</span>
                <span className="block text-[11px] uppercase tracking-widest text-muted-foreground">
                  live pts
                </span>
              </p>
            </div>

            <ul className="mt-4 space-y-2">
              {SLOTS.map((slot) => {
                const entry = slotMap.get(slot);
                const player = entry?.player;
                const isCaptain = lineup?.captain_slot === slot;
                return (
                  <li
                    key={slot}
                    className={`flex items-center gap-3 rounded-xl border p-3 ${
                      isCaptain ? "border-primary/60" : "border-border"
                    }`}
                  >
                    <span className="w-12 shrink-0 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                      {slot}
                    </span>
                    {player ? (
                      <>
                        <TeamLogo team={player.pl_team} size={26} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{player.pl_name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {player.pl_pos} · {teamShort(player.pl_team)} {player.pl_opp ?? ""}
                          </p>
                        </div>
                        <Stars cost={player.pl_cost} />
                        <span className="w-12 text-right text-sm font-semibold text-primary">
                          {((player.pl_points ?? 0) * (isCaptain ? 1.5 : 1)).toFixed(1)}
                        </span>
                        <button
                          type="button"
                          aria-label={`Make ${slot} captain`}
                          disabled={locked || setCaptain.isPending}
                          onClick={() => setCaptain.mutate(slot)}
                          className={`rounded-lg border border-border p-1.5 ${
                            isCaptain ? "text-primary" : "text-muted-foreground"
                          }`}
                        >
                          <Crown size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Release ${player.pl_name}`}
                          disabled={locked || release.isPending}
                          onClick={() => release.mutate(entry!.id)}
                          className="rounded-lg border border-border p-1.5 text-muted-foreground"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => setPosFilter(slot)}
                        className="flex flex-1 items-center gap-2 text-left text-sm text-muted-foreground"
                      >
                        <UserPlus size={14} /> Empty — tap to draft a{" "}
                        {slot === "FLEX" ? "RB/WR/TE" : slot}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setPosFilter(slot)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-widest ${
                    posFilter === slot
                      ? "border-primary/60 bg-secondary text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {slot}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAvailableOnly((v) => !v)}
                className={`ml-auto rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                  availableOnly
                    ? "border-primary/60 bg-secondary text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                Available only
              </button>
            </div>

            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search player or team"
                className="pl-9"
              />
            </div>

            {poolLoading && (
              <p className="text-sm text-muted-foreground">Loading this week's player pool…</p>
            )}
            {!poolLoading && filteredPool.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No players match. The pool builds itself from this week's rosters — try again in a
                moment if it's empty.
              </p>
            )}

            <ul className="space-y-2">
              {filteredPool.map((p) => {
                const mine = p.claimed_by === me;
                const taken = !!p.claimed_by && !mine;
                const tooPricey = !taken && !mine && p.pl_cost > starsLeft + (slotMap.get(posFilter)?.player?.pl_cost ?? 0);
                return (
                  <li
                    key={p.pl_id}
                    className="field-panel flex items-center gap-3 rounded-xl p-3"
                  >
                    <TeamLogo team={p.pl_team} size={26} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.pl_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.pl_pos} · {teamShort(p.pl_team)} {p.pl_opp ?? ""}
                        {taken ? ` · rostered by ${p.claimed_team}` : mine ? " · yours" : ""}
                      </p>
                    </div>
                    <Stars cost={p.pl_cost} />
                    <Button
                      size="sm"
                      variant={taken || mine ? "secondary" : "default"}
                      disabled={locked || taken || mine || tooPricey || claim.isPending}
                      onClick={() => claim.mutate({ slot: posFilter, player: p })}
                    >
                      {taken ? "Taken" : mine ? "Yours" : tooPricey ? "Too rich" : "Draft"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>
        </TabsContent>

        <TabsContent value="live" className="space-y-3 pt-4">
          {boardManagers.length === 0 && (
            <p className="text-sm text-muted-foreground">No lineups in this league yet.</p>
          )}
          {boardManagers.map(({ row, slots, total }) => (
            <section key={row.user_id} className="field-panel rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <Mascot mascot={row.mascot} color={row.primary_color} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate stadium-heading text-base">{row.team_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{row.display_name}</p>
                </div>
                <p className="stadium-heading text-xl text-primary">{total.toFixed(1)}</p>
              </div>
              {slots.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">No lineup submitted.</p>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {slots.map((s, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-11 shrink-0 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {s.slot}
                      </span>
                      {s.revealed ? (
                        <>
                          <span className="min-w-0 flex-1 truncate">
                            {s.pl_name}
                            {s.is_captain ? " (C)" : ""}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {s.pl_team ? teamShort(s.pl_team) : ""}
                          </span>
                          <span className="w-12 text-right font-semibold text-primary">
                            {((s.pl_points ?? 0) * (s.is_captain ? 1.5 : 1)).toFixed(1)}
                          </span>
                        </>
                      ) : (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Lock size={12} /> Hidden until lock
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </TabsContent>

        <TabsContent value="season" className="space-y-3 pt-4">
          <ul className="space-y-2">
            {standings.map((s, i) => (
              <li key={s.user_id} className="field-panel flex items-center gap-3 rounded-xl p-3">
                <span className="w-6 text-center stadium-heading text-lg text-muted-foreground">
                  {i + 1}
                </span>
                <Mascot mascot={s.mascot} color={s.primary_color} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{s.team_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.weeks_played} week{s.weeks_played === 1 ? "" : "s"} ·{" "}
                    {s.wins} weekly win{s.wins === 1 ? "" : "s"}
                  </p>
                </div>
                {s.wins > 0 && <Trophy size={16} className="text-primary" />}
                <span className="stadium-heading text-lg text-primary">
                  {Number(s.total).toFixed(1)}
                </span>
              </li>
            ))}
          </ul>
          {standings.length === 0 && (
            <p className="text-sm text-muted-foreground">No fantasy results yet this season.</p>
          )}
        </TabsContent>

        <TabsContent value="rules" className="space-y-4 pt-4">
          <section className="field-panel rounded-2xl border border-border p-5">
            <h2 className="stadium-heading flex items-center gap-2 text-lg">
              <BookOpen className="text-primary" size={18} /> How to Play
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="font-semibold text-foreground">The Draft:</span> one manager can
                own a player each week. First click claims him. If another manager beats you to it,
                the app refreshes and shows he's taken.
              </li>
              <li>
                <span className="font-semibold text-foreground">Your Lineup:</span> fill 5 slots —
                QB, RB, WR, TE and FLEX (RB/WR/TE only). Every player comes from the teams playing
                in that week's slate.
              </li>
              <li>
                <span className="font-semibold text-foreground">Star Cap:</span> each player costs
                1–5 stars and you have 15 stars total. Mix expensive stars with cheap sleepers.
              </li>
              <li>
                <span className="font-semibold text-foreground">Captain:</span> tap the crown on
                any filled slot to make that player score 1.5x points.
              </li>
              <li>
                <span className="font-semibold text-foreground">Release:</span> before lock you can
                release a player and he goes straight back into the pool for anyone to grab.
              </li>
              <li>
                <span className="font-semibold text-foreground">Lock Times:</span> regular season
                lineups open Tuesday 12:00 AM ET and lock Wednesday 6:00 PM ET. Preseason lineups
                lock at the first kickoff of that week. No edits after lock.
              </li>
            </ul>
          </section>

          <section className="field-panel rounded-2xl border border-border p-5">
            <h2 className="stadium-heading text-lg">Scoring — Full PPR</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Live stats refresh every 30 seconds from ESPN box scores.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-3">
                <p className="text-sm font-semibold">Passing</p>
                <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                  <li>1 pt per 25 yards</li>
                  <li>4 pts per TD</li>
                  <li>-2 pts per interception</li>
                </ul>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-sm font-semibold">Rushing</p>
                <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                  <li>1 pt per 10 yards</li>
                  <li>6 pts per TD</li>
                </ul>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-sm font-semibold">Receiving</p>
                <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                  <li>1 pt per reception</li>
                  <li>1 pt per 10 yards</li>
                  <li>6 pts per TD</li>
                </ul>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-sm font-semibold">Turnovers</p>
                <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                  <li>-2 pts per fumble lost</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="field-panel rounded-2xl border border-border p-5">
            <h2 className="stadium-heading flex items-center gap-2 text-lg">
              <Trophy className="text-primary" size={18} /> Winning
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="font-semibold text-foreground">Weekly Winner:</span> the manager
                with the highest total PPR score wins the week.
              </li>
              <li>
                <span className="font-semibold text-foreground">Season Standings:</span> ranked by
                cumulative fantasy points, with weekly wins tracked as a tiebreaker.
              </li>
              <li>
                <span className="font-semibold text-foreground">Live Board:</span> everyone's lineup
                stays hidden until the slate locks, then the full league board is revealed.
              </li>
            </ul>
          </section>
        </TabsContent>
      </Tabs>

    </div>
  );
}
