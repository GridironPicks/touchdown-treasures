import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { refreshSlateScores } from "@/lib/scores.functions";
import { useMemo, useState } from "react";
import { Flame, ScrollText, Trophy } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Mascot } from "@/components/Mascot";
import { SlatePicker } from "@/components/SlatePicker";
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

type Board = "reg" | "pre" | "week";

function LeaderboardPage() {
  const [board, setBoard] = useState<Board>("reg");
  const { data: slates = [] } = useSlates();
  const fallback = useMemo(() => defaultSlate(slates), [slates]);
  const [picked, setPicked] = useState<Slate | null>(null);
  const slate = picked ?? fallback;
  const { activeLeague } = useLeague();

  const refreshScores = useServerFn(refreshSlateScores);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["leaderboard", activeLeague?.id, board, slate?.seasonType, slate?.week],
    enabled: (!!activeLeague && board !== "week") || (!!activeLeague && !!slate),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (!activeLeague) return [];
      if (slate) {
        try {
          await refreshScores({ data: { seasonType: slate.seasonType, week: slate.week } });
        } catch {
          /* keep showing stored standings */
        }
      }
      if (board === "week") {
        const [scores, profiles] = await Promise.all([
          supabase
            .from("weekly_scores")
            .select("*")
            .eq("league_id", activeLeague.id)
            .eq("season", SEASON)
            .eq("season_type", slate!.seasonType)
            .eq("week", slate!.week),
          supabase.from("profiles").select("*"),
        ]);
        if (scores.error) throw scores.error;
        if (profiles.error) throw profiles.error;
        return (scores.data ?? [])
          .map((s) => {
            const p = (profiles.data ?? []).find((x) => x.id === s.user_id);
            return {
              user_id: s.user_id,
              display_name: p?.display_name ?? "Manager",
              team_name: p?.team_name ?? "Unnamed Squad",
              mascot: p?.mascot ?? "eagle",
              primary_color: p?.primary_color ?? "#00E676",
              season_points: s.points ?? 0,
              weeks_played: null as number | null,
            };
          })
          .sort((a, b) => (b.season_points ?? 0) - (a.season_points ?? 0));
      }
      const { data, error } = await supabase
        .from(board === "pre" ? "preseason_leaderboard" : "leaderboard")
        .select("*")
        .eq("league_id", activeLeague.id)
        .order("season_points", { ascending: false });
      if (error) throw error;
      return data ?? [];
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

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="stadium-heading text-3xl">Season Standings</h1>
          <p className="text-sm text-muted-foreground">
            {board === "pre"
              ? "2026 preseason · free-play practice points"
              : board === "week"
                ? `2026 ${slate ? slateLabel(slate) : ""} · points scored this week`
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
        {(["reg", "pre", "week"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setBoard(key)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              board === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {key === "reg" ? "Regular season" : key === "pre" ? "Preseason" : "By week"}
          </button>
        ))}
      </div>

      {board === "week" && (
        <SlatePicker slates={slates} value={slate} onChange={setPicked} />
      )}

      {board === "week" && activeLeague && slate && (
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
            {board === "week" ? "No scored picks for this week yet." : "No managers yet."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row, i) => {
              const streak = streaks[row.user_id as string] ?? 0;
              const onFire = streak >= 2;
              return (
              <li key={row.user_id} className="flex items-center gap-3 px-4 py-3">
                <span className="stadium-heading w-6 text-lg text-muted-foreground">{i + 1}</span>
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

