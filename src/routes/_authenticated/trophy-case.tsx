import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { BadgeGlossary } from "@/components/BadgeGlossary";
import { ManagerCabinet, type CabinetManager } from "@/components/TrophyCase";
import { getManagerBadges } from "@/lib/awards.functions";
import { SEASON, type SeasonType } from "@/lib/league";
import { useLeague } from "@/lib/league-context";
import { allPlayedWeeksSettled, defaultSlate, settledWeeks, useSlates } from "@/lib/slate";

export const Route = createFileRoute("/_authenticated/trophy-case")({
  head: () => ({
    meta: [
      { title: "Trophy Case — Gridiron Confidence" },
      {
        name: "description",
        content:
          "Every manager's weekly trophies and award medals on lit glass shelves in the league trophy case.",
      },
      { property: "og:title", content: "Trophy Case — Gridiron Confidence" },
      {
        property: "og:description",
        content: "Weekly win trophies, perfect weeks, bullseyes and hot streaks — all in one case.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrophyCasePage,
});

function TrophyCasePage() {
  const { activeLeague } = useLeague();
  const { data: slates = [] } = useSlates();
  // Show the slate the league is actually playing (preseason until week 1 arrives).
  const current = useMemo(() => defaultSlate(slates)?.seasonType ?? null, [slates]);
  const [override, setOverride] = useState<SeasonType | null>(null);
  const seasonType: SeasonType = override ?? current ?? "reg";
  const setSeasonType = setOverride;
  const fetchBadges = useServerFn(getManagerBadges);

  // Hardware is only official once every game of a week is final.
  const settled = useMemo(() => settledWeeks(slates, seasonType), [slates, seasonType]);
  const seasonSettled = useMemo(
    () => allPlayedWeeksSettled(slates, seasonType),
    [slates, seasonType],
  );
  const pendingWeek = useMemo(
    () => slates.find((s) => s.seasonType === seasonType && s.anyStarted && !s.allFinal) ?? null,
    [slates, seasonType],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["trophy-case", activeLeague?.id, seasonType, [...settled].join(","), seasonSettled],
    enabled: !!activeLeague,
    queryFn: async (): Promise<CabinetManager[]> => {
      if (!activeLeague) return [];
      const [weekly, winners, profiles, badgeRows] = await Promise.all([
        supabase.rpc("league_weekly_points", {
          _season: SEASON,
          _season_type: seasonType,
          _league_id: activeLeague.id,
        }),
        supabase.rpc("league_week_winners", {
          _season: SEASON,
          _season_type: seasonType,
          _league_id: activeLeague.id,
        }),
        supabase.from("profiles").select("*"),
        fetchBadges({ data: { leagueId: activeLeague.id, seasonType } }),
      ]);
      if (weekly.error) throw weekly.error;
      if (winners.error) throw winners.error;
      if (profiles.error) throw profiles.error;

      const map = new Map<string, CabinetManager>();
      const ensure = (userId: string) => {
        let m = map.get(userId);
        if (!m) {
          const p = (profiles.data ?? []).find((x) => x.id === userId);
          m = {
            user_id: userId,
            display_name: p?.display_name ?? "Manager",
            team_name: p?.team_name ?? "Unnamed Squad",
            mascot: p?.mascot ?? "eagle",
            primary_color: p?.primary_color ?? "#00E676",
            weekWins: [],
            badges: [],
            seasonPoints: 0,
          };
          map.set(userId, m);
        }
        return m;
      };

      for (const r of weekly.data ?? []) {
        if (!r.user_id || r.week === null || !settled.has(r.week)) continue;
        ensure(r.user_id).seasonPoints += r.points ?? 0;
      }
      for (const r of winners.data ?? []) {
        if (!r.user_id || r.week === null || !settled.has(r.week)) continue;
        ensure(r.user_id).weekWins.push(r.week);
      }
      for (const r of badgeRows) {
        const official = r.week === null ? seasonSettled : settled.has(r.week);
        if (!official) continue;
        ensure(r.user_id).badges.push({ badge: r.badge, week: r.week, detail: r.detail });
      }

      const rows = [...map.values()];
      for (const m of rows) m.weekWins.sort((a, b) => a - b);
      rows.sort(
        (a, b) =>
          b.weekWins.length - a.weekWins.length ||
          b.badges.length - a.badges.length ||
          b.seasonPoints - a.seasonPoints,
      );
      return rows;
    },
  });

  const managers = useMemo(() => data ?? [], [data]);
  const leader = useMemo(
    () => [...managers].sort((a, b) => b.seasonPoints - a.seasonPoints)[0] ?? null,
    [managers],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="stadium-heading text-3xl">
            <span className="chrome-text">Trophy</span> <span className="text-primary">Case</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            2026 {seasonType === "pre" ? "preseason" : "regular season"} hardware for{" "}
            {activeLeague?.name ?? "your league"}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="field-panel flex rounded-xl p-1">
            {(["pre", "reg"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSeasonType(t)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                  seasonType === t
                    ? "bg-secondary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "pre" ? "Preseason" : "Regular"}
              </button>
            ))}
          </div>
          <BadgeGlossary />
        </div>
      </header>

      {pendingWeek && (
        <p className="text-sm text-muted-foreground">
          {seasonType === "pre" ? "Preseason week" : "Week"} {pendingWeek.week} is still being
          played — its trophy and medals get engraved once every game is final.
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Polishing the silverware…</p>
      ) : managers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hardware yet — trophies show up once a week&apos;s games are all final.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {managers.map((m) => (
            <ManagerCabinet
              key={m.user_id}
              manager={m}
              seasonType={seasonType}
              isLeader={leader?.user_id === m.user_id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
