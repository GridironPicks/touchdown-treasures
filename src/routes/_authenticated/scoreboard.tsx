import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Radio } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { SlatePicker } from "@/components/SlatePicker";
import { TeamLogo } from "@/components/TeamLogo";
import { kickoffLabel, teamShort } from "@/lib/league";
import { getLiveScoreboard } from "@/lib/scoreboard.functions";
import type { LiveGame } from "@/lib/scoreboard.server";
import { defaultSlate, useSlates, type Slate } from "@/lib/slate";

export const Route = createFileRoute("/_authenticated/scoreboard")({
  head: () => ({
    meta: [
      { title: "Live Scoreboard — Gridiron Confidence" },
      {
        name: "description",
        content:
          "Every NFL game this week with live score, quarter, game clock, possession and down & distance, refreshed automatically.",
      },
      { property: "og:title", content: "Live Scoreboard — Gridiron Confidence" },
      {
        property: "og:description",
        content: "Live NFL scores, clock, quarter and possession for the whole slate.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScoreboardPage,
});

function statusLine(game: LiveGame): string {
  if (game.state === "pre") return kickoffLabel(game.kickoff);
  if (game.state === "post") return game.shortDetail || "Final";
  const detail = game.shortDetail || game.statusDetail;
  if (detail && /half|end of|delay/i.test(detail)) return detail;
  const quarter = game.period > 4 ? "OT" : `Q${game.period}`;
  return game.clock ? `${quarter} · ${game.clock}` : quarter;
}

function TeamRow({
  team,
  abbr,
  record,
  score,
  hasBall,
  leading,
  started,
}: {
  team: string;
  abbr: string;
  record: string | null;
  score: number | null;
  hasBall: boolean;
  leading: boolean;
  started: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <TeamLogo team={team} size={30} />
      <div className="min-w-0 flex-1">
        <div
          className={`flex items-center gap-1.5 truncate text-sm ${
            leading ? "font-bold text-foreground" : "font-medium text-muted-foreground"
          }`}
        >
          <span className="truncate">{teamShort(team)}</span>
          {hasBall && (
            <span
              aria-label="Has possession"
              title="Has possession"
              className="inline-block h-2 w-3 shrink-0 rounded-[40%] bg-gold"
            />
          )}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {abbr}
          {record ? ` · ${record}` : ""}
        </div>
      </div>
      <span
        className={`tabular-nums text-xl ${
          leading ? "font-extrabold text-foreground" : "font-semibold text-muted-foreground"
        }`}
      >
        {started ? (score ?? 0) : "–"}
      </span>
    </div>
  );
}

function GameCard({ game }: { game: LiveGame }) {
  const started = game.state !== "pre";
  const away = game.awayScore ?? 0;
  const home = game.homeScore ?? 0;

  return (
    <article className="field-panel rounded-2xl p-3.5">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] uppercase tracking-widest">
        <span
          className={`flex items-center gap-1.5 font-semibold ${
            game.state === "in" ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {game.state === "in" && (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
          )}
          {statusLine(game)}
        </span>
        {game.broadcast && <span className="text-muted-foreground">{game.broadcast}</span>}
      </div>

      <TeamRow
        team={game.awayTeam}
        abbr={game.awayAbbr}
        record={game.awayRecord}
        score={game.awayScore}
        hasBall={game.possessionAbbr === game.awayAbbr}
        leading={started && away > home}
        started={started}
      />
      <TeamRow
        team={game.homeTeam}
        abbr={game.homeAbbr}
        record={game.homeRecord}
        score={game.homeScore}
        hasBall={game.possessionAbbr === game.homeAbbr}
        leading={started && home > away}
        started={started}
      />

      {game.downDistance && (
        <div
          className={`mt-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
            game.isRedZone
              ? "bg-destructive/20 text-destructive"
              : "bg-secondary/50 text-muted-foreground"
          }`}
        >
          {game.possessionAbbr ? `${game.possessionAbbr} ball · ` : ""}
          {game.downDistance}
          {game.isRedZone ? " · Red zone" : ""}
        </div>
      )}
      {game.lastPlay && (
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
          {game.lastPlay}
        </p>
      )}
    </article>
  );
}

function ScoreboardPage() {
  const { data: slates = [] } = useSlates();
  const [slate, setSlate] = useState<Slate | null>(null);
  const active = slate ?? defaultSlate(slates);

  const fetchScoreboard = useServerFn(getLiveScoreboard);
  const { data: games = [], isLoading } = useQuery({
    queryKey: ["live-scoreboard", active?.seasonType, active?.week],
    enabled: !!active,
    queryFn: () => fetchScoreboard({ data: active! }),
    refetchOnWindowFocus: true,
    refetchInterval: (query) =>
      (query.state.data ?? []).some((g) => g.state === "in") ? 20_000 : false,
  });

  const groups = useMemo(() => {
    const live = games.filter((g) => g.state === "in");
    const upcoming = games.filter((g) => g.state === "pre");
    const final = games.filter((g) => g.state === "post");
    return { live, upcoming, final };
  }, [games]);

  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <h1 className="stadium-heading text-2xl">
            <span className="chrome-text">LIVE</span>{" "}
            <span className="text-primary">SCOREBOARD</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Scores, quarter, clock and possession — updates every 20 seconds while games are live.
          </p>
        </div>

        <SlatePicker
          slates={slates}
          value={active}
          onChange={(s) => setSlate(s)}
        />

        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
          <Radio size={12} className={groups.live.length ? "text-destructive" : ""} />
          {groups.live.length} live · {groups.final.length} final · {groups.upcoming.length} upcoming
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Loading scores…</p>}
        {!isLoading && games.length === 0 && (
          <p className="field-panel rounded-2xl p-4 text-sm text-muted-foreground">
            Live scores are unavailable right now. Try again in a moment.
          </p>
        )}

        {(
          [
            ["Live now", groups.live],
            ["Upcoming", groups.upcoming],
            ["Final", groups.final],
          ] as const
        ).map(([label, list]) =>
          list.length === 0 ? null : (
            <section key={label} className="space-y-2.5">
              <h2 className="stadium-heading text-sm text-muted-foreground">{label}</h2>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {list.map((g) => (
                  <GameCard key={g.external_id} game={g} />
                ))}
              </div>
            </section>
          ),
        )}
      </div>
    </AppShell>
  );
}
