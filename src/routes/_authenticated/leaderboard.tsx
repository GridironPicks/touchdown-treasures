import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { refreshSlateScores } from "@/lib/scores.functions";
import { useMemo, useState } from "react";
import { Flame, ScrollText, Trophy } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Mascot } from "@/components/Mascot";
import { SlatePicker } from "@/components/SlatePicker";
import { BadgeRow } from "@/components/BadgeRow";
import { WinnerTrophy } from "@/components/WinnerTrophy";
import { HeadToHead } from "@/components/HeadToHead";
import { LivePoints } from "@/components/LivePoints";
import { getManagerBadges } from "@/lib/awards.functions";
import { SEASON } from "@/lib/league";
import { useLeague } from "@/lib/league-context";
import { defaultSlate, slateLabel, useSlates, type Slate } from "@/lib/slate";


export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "Season Standings — Gridiron Confidence" },
      {
        name: "description",
        content: "Cumulative confidence points, weekly wins and the 2026 championship trophy.",
      },
      { property: "og:title", content: "Season Standings — Gridiron Confidence" },
      {
        property: "og:description",
        content: "See who is chasing the 2026 NFL Championship trophy badge.",
      },
    ],
  }),
  component: LeaderboardPage,
});

type Mode = "week" | "season";

type Row = {
  user_id: string;
  display_name: string;
  team_name: string;
  mascot: string;
  primary_color: string;
  season_points: number;
  weeks_played: number | null;
  place: number;
};

function LeaderboardPage() {
  const [mode, setMode] = useState<Mode>("week");
  const { data: slates = [] } = useSlates();
  const fallback = useMemo(() => defaultSlate(slates), [slates]);
  const [picked, setPicked] = useState<Slate | null>(null);
  const slate = picked ?? fallback;
  const { activeLeague } = useLeague();
  const board = slate?.seasonType ?? "reg";

  const refreshScores = useServerFn(refreshSlateScores);

  const { data: rows = [], isLoading } = useQuery<Row[]>({
    queryKey: ["leaderboard", activeLeague?.id, mode, slate?.seasonType, slate?.week],
    enabled: !!activeLeague && !!slate,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (!activeLeague || !slate) return [];
      try {
        await refreshScores({ data: { seasonType: slate.seasonType, week: slate.week } });
      } catch {
        /* keep showing stored standings */
      }
      const profilesQuery = supabase.from("profiles").select("*");

      if (mode === "week") {
        const [weekly, profiles] = await Promise.all([
          supabase.rpc("league_weekly_points", {
            _season: SEASON,
            _season_type: slate.seasonType,
            _league_id: activeLeague.id,
          }),
          profilesQuery,
        ]);
        if (weekly.error) throw weekly.error;
        if (profiles.error) throw profiles.error;
        return (weekly.data ?? [])
          .filter((r) => r.week === slate.week)
          .map((r) => {
            const p = (profiles.data ?? []).find((x) => x.id === r.user_id);
            return {
              user_id: r.user_id,
              display_name: p?.display_name ?? "Manager",
              team_name: p?.team_name ?? "Unnamed Squad",
              mascot: p?.mascot ?? "eagle",
              primary_color: p?.primary_color ?? "#00E676",
              season_points: r.points ?? 0,
              weeks_played: null,
              place: r.place ?? 0,
            } satisfies Row;
          })
          .sort((a, b) => a.place - b.place || b.season_points - a.season_points);
      }

      const { data, error } = await supabase
        .from(slate.seasonType === "pre" ? "preseason_leaderboard" : "leaderboard")
        .select("*")
        .eq("league_id", activeLeague.id)
        .order("season_points", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any, i: number) => ({
        user_id: r.user_id as string,
        display_name: r.display_name ?? "Manager",
        team_name: r.team_name ?? "Unnamed Squad",
        mascot: r.mascot ?? "eagle",
        primary_color: r.primary_color ?? "#00E676",
        season_points: r.season_points ?? 0,
        weeks_played: r.weeks_played ?? 0,
        place: i + 1,
      }));
    },
    refetchInterval: () => {
      const info = slates.find((s) => s.seasonType === slate?.seasonType && s.week === slate?.week);
      const live = info ? info.anyStarted && !info.allFinal : false;
      return live ? 60_000 : false;
    },
  });


  const streakType = board === "pre" ? "pre" : "reg";
  const { data: streaks = {} } = useQuery({
    queryKey: ["streaks", activeLeague?.id, streakType],
    enabled: !!activeLeague,
    queryFn: async () => {
      if (!activeLeague) return {};
      // One winner per completed week, decided by the shared tiebreaker ladder.
      const { data, error } = await supabase.rpc("league_week_winners", {
        _season: SEASON,
        _season_type: streakType,
        _league_id: activeLeague.id,
      });
      if (error) throw error;
      const winnersByWeek = new Map<number, string>();
      for (const r of data ?? []) {
        if (r.week !== null && r.user_id) winnersByWeek.set(r.week, r.user_id);
      }
      const weeks = [...winnersByWeek.keys()].sort((a, b) => b - a);
      const result: Record<string, number> = {};
      for (const [i, w] of weeks.entries()) {
        const uid = winnersByWeek.get(w)!;
        // Only extend a streak that is still unbroken from the newest week back.
        if ((result[uid] ?? 0) === i) result[uid] = i + 1;
      }
      return result;
    },
    refetchInterval: () => {
      const info = slates.find((s) => s.seasonType === slate?.seasonType && s.week === slate?.week);
      const live = info ? info.anyStarted && !info.allFinal : false;
      return live ? 60_000 : false;
    },
  });

  const fetchBadges = useServerFn(getManagerBadges);
  const { data: badgeRows = [] } = useQuery({
    queryKey: ["badges", activeLeague?.id, streakType],
    enabled: !!activeLeague,
    queryFn: () =>
      fetchBadges({ data: { leagueId: activeLeague!.id, seasonType: streakType } }),
  });

  const badgesByUser = useMemo(() => {
    const map: Record<string, { badge: string; week: number | null; detail: string | null }[]> = {};
    for (const r of badgeRows) {
      (map[r.user_id] ??= []).push({ badge: r.badge, week: r.week, detail: r.detail });
    }
    return map;
  }, [badgeRows]);

  const { data: meId = null } = useQuery({
    queryKey: ["me-id"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });


  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="stadium-heading text-3xl">Standings</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "week"
              ? `2026 ${slate ? slateLabel(slate) : ""} · points scored this week`
              : board === "pre"
                ? "2026 preseason · cumulative practice points"
                : "2026 season · cumulative confidence points"}
          </p>
        </div>
        <Link
          to="/recap"
          search={slate ? { st: slate.seasonType, wk: slate.week } : {}}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ScrollText size={15} className="text-primary" /> Weekly recap
        </Link>
      </header>


      <div className="field-panel inline-flex rounded-xl p-1">
        {(["week", "season"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              mode === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {key === "week" ? "By week" : "Season total"}
          </button>
        ))}
      </div>

      <SlatePicker slates={slates} value={slate} onChange={setPicked} />

      {mode === "week" && activeLeague && slate && (
        <LivePoints
          leagueId={activeLeague.id}
          seasonType={slate.seasonType}
          week={slate.week}
          meId={meId}
        />
      )}


      <section className="field-panel overflow-hidden rounded-2xl">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading standings…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            {mode === "week" ? "No scored picks for this week yet." : "No managers yet."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row, i) => {
              const streak = streaks[row.user_id as string] ?? 0;
              const onFire = streak >= 2;
              const place = mode === "week" ? (row.place || i + 1) : i + 1;
              const weekChampion = mode === "week" && place === 1 && (row.season_points ?? 0) > 0;

              return (
              <li
                key={row.user_id}
                className={`flex items-center gap-3 px-4 py-3 ${weekChampion ? "trophy-row" : ""}`}
              >
                {weekChampion ? (
                  <WinnerTrophy size="md" label={`Winner of ${slate ? slateLabel(slate) : "the week"}`} />
                ) : (
                  <span className="stadium-heading w-6 text-lg text-muted-foreground">{i + 1}</span>
                )}
                <span className="relative">
                  <Mascot mascot={row.mascot ?? "eagle"} color={row.primary_color} size="sm" />
                  {onFire && (
                    <span
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.8)]"
                      title={`${streak}-week win streak`}
                    >
                      <Flame size={12} />
                    </span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 truncate font-semibold">
                    {row.team_name}
                    {onFire && (
                      <span className="flex items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                        <Flame size={10} /> {streak}W
                      </span>
                    )}
                    <BadgeRow rows={badgesByUser[row.user_id as string] ?? []} limit={4} />
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{row.display_name}</p>
                </div>

                {board === "reg" && i === 0 && (row.season_points ?? 0) > 0 && (
                  <span className="trophy-badge flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase">
                    <Trophy size={13} /> 2026
                  </span>
                )}

                <div className="text-right">
                  <p className="stadium-heading text-xl text-primary">{row.season_points ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {board === "week" ? "pts" : `${row.weeks_played ?? 0} wks scored`}
                  </p>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </section>

      {activeLeague && <HeadToHead leagueId={activeLeague.id} seasonType={streakType} />}

    </div>
  );
}

