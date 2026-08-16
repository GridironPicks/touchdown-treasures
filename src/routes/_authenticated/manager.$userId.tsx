import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, EyeOff } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Mascot } from "@/components/Mascot";
import { BadgeRow } from "@/components/BadgeRow";
import { BadgeGlossary } from "@/components/BadgeGlossary";
import { TeamLogo } from "@/components/TeamLogo";
import { getHeadToHead, getManagerBadges } from "@/lib/awards.functions";
import { SEASON, teamShort, type Game, type SeasonType } from "@/lib/league";
import { useLeague } from "@/lib/league-context";
import { slateLabel } from "@/lib/slate";


type ManagerSearch = { type?: SeasonType; week?: number };

export const Route = createFileRoute("/_authenticated/manager/$userId")({
  validateSearch: (search: Record<string, unknown>): ManagerSearch => {
    const type = search["type"] === "pre" || search["type"] === "reg" ? search["type"] : undefined;
    const weekRaw = Number(search["week"]);
    const week = Number.isFinite(weekRaw) && weekRaw > 0 ? weekRaw : undefined;
    return type && week ? { type, week } : {};
  },
  head: () => ({
    meta: [
      { title: "Manager Picks — Gridiron Confidence" },
      {
        name: "description",
        content: "View a league manager's confidence picks once the week's deadline has passed.",
      },
      { property: "og:title", content: "Manager Picks — Gridiron Confidence" },
      {
        property: "og:description",
        content: "Every manager's confidence board, revealed after the weekly lock.",
      },
    ],
  }),
  component: ManagerPage,
});

function ManagerPage() {
  const { userId } = Route.useParams();
  const search = Route.useSearch();
  const seasonType: SeasonType = search.type ?? "reg";
  const week = search.week ?? 1;
  const { activeLeague } = useLeague();

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["manager-picks", activeLeague?.id, userId, seasonType, week],
    enabled: !!activeLeague,
    queryFn: async () => {
      if (!activeLeague) return { picks: [], games: [], tiebreaker: null, revealed: false };
      const [picks, games, tb, revealed] = await Promise.all([
        supabase
          .from("picks")
          .select("*")
          .eq("user_id", userId)
          .eq("league_id", activeLeague.id)
          .eq("season", SEASON)
          .eq("season_type", seasonType)
          .eq("week", week),
        supabase
          .from("games")
          .select("*")
          .eq("season", SEASON)
          .eq("season_type", seasonType)
          .eq("week", week)
          .order("kickoff"),
        supabase
          .from("tiebreakers")
          .select("*")
          .eq("user_id", userId)
          .eq("league_id", activeLeague.id)
          .eq("season", SEASON)
          .eq("season_type", seasonType)
          .eq("week", week)
          .maybeSingle(),
        supabase.rpc("picks_revealed", {
          _season: SEASON,
          _season_type: seasonType,
          _week: week,
          _league_id: activeLeague.id,
        }),
      ]);
      if (games.error) throw games.error;
      return {
        picks: picks.data ?? [],
        games: (games.data ?? []) as Game[],
        tiebreaker: tb.data,
        revealed: revealed.data === true,
      };
    },
    refetchInterval: 60_000,
  });

  const revealed = data?.revealed ?? false;
  const rows = (data?.picks ?? [])
    .map((p) => ({ pick: p, game: data?.games.find((g) => g.id === p.game_id) }))
    .sort((a, b) => (b.pick.confidence ?? 0) - (a.pick.confidence ?? 0));

  const fetchBadges = useServerFn(getManagerBadges);
  const { data: badgeRows = [] } = useQuery({
    queryKey: ["badges", activeLeague?.id, seasonType],
    enabled: !!activeLeague,
    queryFn: () => fetchBadges({ data: { leagueId: activeLeague!.id, seasonType } }),
  });
  const myBadges = badgeRows
    .filter((b) => b.user_id === userId)
    .map((b) => ({ badge: b.badge, week: b.week, detail: b.detail }));

  const fetchH2H = useServerFn(getHeadToHead);
  const { data: h2hRows = [] } = useQuery({
    queryKey: ["head-to-head", activeLeague?.id, seasonType],
    enabled: !!activeLeague,
    queryFn: () => fetchH2H({ data: { leagueId: activeLeague!.id, seasonType } }),
  });
  const { data: meId = null } = useQuery({
    queryKey: ["me-id"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });
  const h2hRecord =
    meId && meId !== userId
      ? h2hRows.find((r) => r.user_id === meId && r.opponent_id === userId) ?? null
      : null;


  return (
    <div className="space-y-5">
      <Link
        to="/picks"
        search={{ type: seasonType, week }}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} /> Back to picks
      </Link>

      <header className="field-panel flex items-center gap-3 rounded-2xl p-5">
        <Mascot mascot={profile?.mascot ?? "eagle"} color={profile?.primary_color ?? "#00E676"} />
        <div>
          <h1 className="stadium-heading text-2xl">{profile?.team_name ?? "Manager"}</h1>
          <p className="text-sm text-muted-foreground">
            {profile?.display_name} · {slateLabel({ seasonType, week })}
          </p>
        </div>
      </header>

      <section className="field-panel rounded-2xl p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="stadium-heading text-lg">Trophy case</h2>
          <BadgeGlossary />
        </div>
        {myBadges.length === 0 ? (
          <p className="text-sm text-muted-foreground">No awards earned yet this season.</p>
        ) : (
          <BadgeRow rows={myBadges} size="md" />
        )}
        {h2hRecord && (
          <p className="mt-4 text-sm text-muted-foreground">
            Your head-to-head record vs {profile?.team_name ?? "this manager"}:{" "}
            <span className="font-semibold text-foreground">
              {h2hRecord.wins}-{h2hRecord.losses}
              {h2hRecord.ties ? `-${h2hRecord.ties}` : ""}
            </span>
          </p>
        )}
      </section>


      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading picks…</p>
      ) : !revealed ? (
        <section className="field-panel flex items-center gap-3 rounded-2xl p-6">
          <EyeOff className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Picks are hidden until the week&apos;s deadline passes or every manager has submitted.
          </p>
        </section>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">This manager did not submit picks this week.</p>
      ) : (
        <ul className="field-panel divide-y divide-border overflow-hidden rounded-2xl">
          {rows.map(({ pick, game }) => {
            const final = game?.status === "final";
            const winner =
              final && game
                ? (game.home_score ?? 0) >= (game.away_score ?? 0)
                  ? game.home_team
                  : game.away_team
                : null;
            const correct = winner ? winner === pick.picked_team : null;
            return (
              <li key={pick.id} className="flex items-center gap-3 px-4 py-3">
                <span className="stadium-heading w-8 text-xl text-primary">{pick.confidence}</span>
                <TeamLogo team={pick.picked_team} size={26} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{teamShort(pick.picked_team)}</p>
                  {game && (
                    <p className="truncate text-xs text-muted-foreground">
                      {teamShort(game.away_team)} @ {teamShort(game.home_team)}
                      {final ? ` · ${game.away_score}-${game.home_score}` : ""}
                    </p>
                  )}
                </div>
                {correct !== null && (
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                      correct ? "bg-primary/15 text-primary" : "bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    {correct ? `+${pick.confidence}` : "0"}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {revealed && data?.tiebreaker && (
        <p className="text-sm text-muted-foreground">
          Tiebreaker prediction: <span className="font-semibold text-foreground">{data.tiebreaker.predicted_total}</span> combined points
        </p>
      )}
    </div>
  );
}
