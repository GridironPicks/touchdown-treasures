import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { refreshSlateScores } from "@/lib/scores.functions";
import { getWinProbabilities } from "@/lib/winprob.functions";
import { WinProbability } from "@/components/WinProbability";
import { useEffect, useMemo, useState } from "react";
import { Lock, Timer, Flame, Trophy, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  SEASON,
  formatCountdown,
  isMondayNight,
  kickoffLabel,
  teamShort,
  tiebreakerGameOf,
  weekDeadline,
  weekOpensAt,
  type Game,
  type SeasonType,
} from "@/lib/league";
import { TeamLogo } from "@/components/TeamLogo";
import { HowToPlay } from "@/components/HowToPlay";
import { LeagueRules } from "@/components/LeagueRules";
import { RosterStatus } from "@/components/RosterStatus";
import { useLeague } from "@/lib/league-context";

import { useSlates, defaultSlate, slateLabel, type Slate } from "@/lib/slate";
import { SlatePicker } from "@/components/SlatePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PicksSearch = { type?: SeasonType; week?: number };

export const Route = createFileRoute("/_authenticated/picks")({
  validateSearch: (search: Record<string, unknown>): PicksSearch => {
    const type = search["type"] === "pre" || search["type"] === "reg" ? search["type"] : undefined;
    const weekRaw = Number(search["week"]);
    const week = Number.isFinite(weekRaw) && weekRaw > 0 ? weekRaw : undefined;
    return type && week ? { type, week } : {};
  },
  head: () => ({
    meta: [
      { title: "Weekly Picks — Gridiron Confidence" },
      {
        name: "description",
        content:
          "Assign confidence points to every NFL matchup and submit before the Wednesday 6PM lock.",
      },
      { property: "og:title", content: "Weekly Picks — Gridiron Confidence" },
      {
        property: "og:description",
        content: "Rank every game by confidence and set your Monday night tiebreaker.",
      },
    ],
  }),
  component: PicksPage,
});

type Selection = { team: string; confidence: number | null };

function PicksPage() {
  const queryClient = useQueryClient();
  const { activeLeague, isLoading: leaguesLoading } = useLeague();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [selections, setSelections] = useState<Record<string, Selection>>({});
  const [tiebreaker, setTiebreaker] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: slates = [] } = useSlates();
  const fallback = useMemo(() => defaultSlate(slates), [slates]);
  const slate: Slate | null =
    search.type && search.week ? { seasonType: search.type, week: search.week } : fallback;
  const seasonType = slate?.seasonType ?? "reg";
  const week = slate?.week ?? 1;

  const selectSlate = (next: Slate) =>
    navigate({ search: { type: next.seasonType, week: next.week } });


  

  const refreshScores = useServerFn(refreshSlateScores);

  const { data: games = [] } = useQuery({
    queryKey: ["games", seasonType, week],
    enabled: !!slate,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async () => {
      // Pull the newest NFL scores before reading, so a refresh or tab switch
      // always shows live data.
      try {
        await refreshScores({ data: { seasonType, week } });
      } catch {
        /* fall back to whatever is already stored */
      }
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .eq("season", SEASON)
        .eq("season_type", seasonType)
        .eq("week", week)
        .order("kickoff");
      if (error) throw error;
      return (data ?? []) as Game[];
    },
    refetchInterval: (query) => {
      const data = query.state.data as Game[] | undefined;
      const live = data?.some((g) => g.status === "in_progress");
      return live ? 60_000 : false;
    },
  });

  // Live win probability straight from the provider, polled while games run.
  const fetchWinProb = useServerFn(getWinProbabilities);
  const anyLive = games.some((g) => g.status === "in_progress");
  const { data: winProbs = [] } = useQuery({
    queryKey: ["winprob", seasonType, week],
    enabled: !!slate && anyLive,
    queryFn: async () => await fetchWinProb({ data: { seasonType, week } }),
    refetchInterval: anyLive ? 30_000 : false,
    refetchOnWindowFocus: true,
  });
  const winProbFor = (game: Game) =>
    winProbs.find((w) => w.external_id === game.external_id) ?? null;

  const { data: existing } = useQuery({
    queryKey: ["my-picks", activeLeague?.id, seasonType, week],
    enabled: !!slate && !!activeLeague,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user!.id;
      const [picks, tb] = await Promise.all([
        supabase
          .from("picks")
          .select("*")
          .eq("user_id", uid)
          .eq("league_id", activeLeague!.id)
          .eq("season", SEASON)
          .eq("season_type", seasonType)
          .eq("week", week),
        supabase
          .from("tiebreakers")
          .select("*")
          .eq("user_id", uid)
          .eq("league_id", activeLeague!.id)
          .eq("season", SEASON)
          .eq("season_type", seasonType)
          .eq("week", week)
          .maybeSingle(),
      ]);
      if (picks.error) throw picks.error;
      return { uid, picks: picks.data ?? [], tiebreaker: tb.data };
    },
  });


  useEffect(() => {
    if (!existing) return;
    const next: Record<string, Selection> = {};
    for (const p of existing.picks) {
      next[p.game_id] = { team: p.picked_team, confidence: p.confidence };
    }
    setSelections(next);
    setTiebreaker(existing.tiebreaker ? String(existing.tiebreaker.predicted_total) : "");
  }, [existing]);

  const hasStarted = (g: Game) => new Date(g.kickoff).getTime() <= now;
  const openGames = games.filter((g) => !hasStarted(g));
  const maxPoints = games.length;
  // Regular season: opens Tuesday 12:00 AM ET, locks Wednesday 6:00 PM ET,
  // and picks are final once submitted. Preseason stays open per game.
  const isRegular = slate?.seasonType === "reg";
  const firstKickoff = useMemo(() => {
    const times = games.map((g) => new Date(g.kickoff).getTime()).filter((t) => !Number.isNaN(t));
    return times.length ? new Date(Math.min(...times)) : null;
  }, [games]);
  const lastKickoff = useMemo(() => {
    const times = games.map((g) => new Date(g.kickoff).getTime()).filter((t) => !Number.isNaN(t));
    return times.length ? new Date(Math.max(...times)) : null;
  }, [games]);
  // Preseason: each game locks at its own kickoff and the week closes when the
  // last game starts. Late entries lose the highest confidence numbers.
  const deadline = useMemo(
    () => (isRegular ? weekDeadline(games) : lastKickoff),
    [isRegular, games, lastKickoff],
  );
  const opensAt = useMemo(() => (isRegular ? weekOpensAt(games) : null), [isRegular, games]);
  const deadlinePassed = deadline ? deadline.getTime() <= now : false;
  const notOpenYet = opensAt ? now < opensAt.getTime() : false;
  const hasPicks = (existing?.picks.length ?? 0) > 0;
  // Picks are final once submitted — preseason included.
  const submitted = hasPicks;
  const locked =
    (games.length > 0 && openGames.length === 0) || deadlinePassed || notOpenYet || submitted;

  // Preseason penalty: every game that has kicked off burns the next highest
  // confidence number off the board for anyone who hasn't submitted yet.
  const startedCount = games.length - openGames.length;
  const burnedTop = !isRegular && !submitted ? startedCount : 0;
  const pointsCeiling = Math.max(0, maxPoints - burnedTop);
  const burnedNumbers = Array.from({ length: burnedTop }, (_, i) => maxPoints - i).reverse();

  const tiebreakerGame = useMemo(() => tiebreakerGameOf(games), [games]);
  const tiebreakerLocked = locked || (tiebreakerGame ? hasStarted(tiebreakerGame) : true);
  
  const untilDeadline = deadline ? deadline.getTime() - now : 0;
  const untilOpen = opensAt ? opensAt.getTime() - now : 0;




  // Points spent on games that already kicked off can't be reused this week.
  const reservedPoints = new Set(
    games
      .filter(hasStarted)
      .map((g) => selections[g.id]?.confidence)
      .filter((c): c is number => typeof c === "number"),
  );
  const usedPoints = new Set(
    Object.values(selections)
      .map((s) => s.confidence)
      .filter((c): c is number => c !== null),
  );

  const complete =
    openGames.length > 0 &&
    openGames.every((g) => selections[g.id]?.team && selections[g.id]?.confidence) &&
    (tiebreakerLocked || tiebreaker.trim() !== "");


  function pickTeam(gameId: string, team: string) {
    if (locked) return;
    setSelections((prev) => ({
      ...prev,
      [gameId]: { team, confidence: prev[gameId]?.confidence ?? null },
    }));
  }

  function setConfidence(gameId: string, value: number | null) {
    if (locked) return;
    setSelections((prev) => {
      const next = { ...prev };
      if (value !== null) {
        for (const [id, sel] of Object.entries(next)) {
          if (id !== gameId && sel.confidence === value) next[id] = { ...sel, confidence: null };
        }
      }
      next[gameId] = { team: next[gameId]?.team ?? "", confidence: value };
      return next;
    });
  }

  async function submit() {
    if (!existing || locked) return;
    if (
      !window.confirm(
        "Submit your picks? Picks are final — you won't be able to change them.",
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const uid = existing.uid;
      const rows = openGames
        .filter((g) => selections[g.id]?.team && selections[g.id]?.confidence)
        .map((g) => ({
          user_id: uid,
          league_id: activeLeague!.id,
          game_id: g.id,
          season: SEASON,
          season_type: seasonType,
          week,
          picked_team: selections[g.id]!.team,
          confidence: selections[g.id]!.confidence!,
        }));

      const ins = await supabase.from("picks").insert(rows);
      if (ins.error) throw ins.error;

      const total = Number.parseInt(tiebreaker, 10);
      if (!tiebreakerLocked && !Number.isNaN(total)) {
        const tb = await supabase.from("tiebreakers").upsert(
          {
            user_id: uid,
            league_id: activeLeague!.id,
            season: SEASON,
            season_type: seasonType,
            week,
            predicted_total: total,
          },
          { onConflict: "user_id,league_id,season,season_type,week", ignoreDuplicates: true },
        );
        if (tb.error) throw tb.error;
      }

      await queryClient.invalidateQueries();
      toast.success("Picks submitted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit picks");
    } finally {
      setBusy(false);
    }
  }

  const heading = slate ? `${slateLabel(slate)} Picks` : "Picks";
  const allFinal = games.length > 0 && games.every((g) => g.status === "final");
  const status: "open" | "in-progress" | "final" = allFinal
    ? "final"
    : locked
      ? "in-progress"
      : "open";

  if (leaguesLoading || !activeLeague) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (

    <div className="space-y-5">
      <SlatePicker slates={slates} value={slate} onChange={selectSlate} />

      <header className="field-panel rounded-2xl p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="stadium-heading text-3xl">{heading}</h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
                  hasPicks
                    ? "bg-primary/15 text-primary"
                    : "bg-amber-500/10 text-amber-400"
                }`}
              >
                {hasPicks ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                {hasPicks ? "Picks in" : "Not submitted"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {maxPoints} games · assign {burnedTop > 0 ? pointsCeiling : maxPoints} down to 1
              {openGames.length < maxPoints ? ` · ${openGames.length} still open` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="flex items-center justify-end gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
              {status === "open" || notOpenYet ? <Timer size={13} /> : <Lock size={13} />}
              {notOpenYet
                ? "Opens Tue 12:00 AM ET"
                : status === "open"
                  ? isRegular
                    ? "Locks Wed 6:00 PM ET"
                    : "Closes at last kickoff"
                  : submitted
                    ? "Picks submitted"
                    : status === "in-progress"
                      ? deadlinePassed
                        ? "Deadline passed"
                        : "All games started"
                      : "Final"}
            </p>
            {notOpenYet ? (
              <p className="stadium-heading text-2xl tabular-nums text-muted-foreground">
                {formatCountdown(untilOpen)}
              </p>
            ) : status === "open" ? (
              <p className="stadium-heading text-2xl tabular-nums text-primary">
                {formatCountdown(untilDeadline)}
              </p>
            ) : (
              <p className="stadium-heading text-2xl text-muted-foreground">
                {status === "final" ? "Week complete" : submitted ? "FINAL" : "LOCKED"}
              </p>
            )}
          </div>
        </div>
      </header>

      {notOpenYet ? (
        <section className="field-panel rounded-2xl border border-border p-5">
          <h2 className="stadium-heading text-lg">Week not open yet</h2>
          <p className="text-sm text-muted-foreground">
            Regular season picks open Tuesday at 12:00 AM ET of game week and lock Wednesday at
            6:00 PM ET. Check back Tuesday to make this week's picks.
          </p>
        </section>
      ) : status === "open" ? (
        <section className="field-panel rounded-2xl border border-primary/40 p-5">
          <h2 className="stadium-heading text-lg text-primary">
            {isRegular ? "Picks open" : "Preseason picks open"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isRegular
              ? "Submit by Wednesday 6:00 PM ET. Once you hit submit your picks are final — no changes after that."
              : "Pick the games that haven't kicked off yet. Every game that starts burns the highest confidence number off your board, so the longer you wait the less you can score. Picks are final once submitted."}
          </p>
          {burnedTop > 0 ? (
            <p className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-300">
              {burnedTop} {burnedTop === 1 ? "game has" : "games have"} started — confidence{" "}
              {burnedNumbers.join(", ")} {burnedTop === 1 ? "is" : "are"} off the board for you this
              week. You can still assign {pointsCeiling} down to 1.
            </p>
          ) : null}
        </section>
      ) : (
        <section className="field-panel rounded-2xl border border-border p-5">
          <h2 className="stadium-heading text-lg">
            {submitted ? "Picks are final" : "Read only"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {submitted
              ? "You've submitted this week's picks — they're locked in and can't be changed."
              : deadlinePassed
                ? isRegular
                  ? "The Wednesday 6:00 PM ET deadline has passed. Your submitted picks are shown below with scores."
                  : "The last game of this week has kicked off, so the week is closed. Scores are shown below."
                : "Every game this week has kicked off. Your submitted picks are shown below with scores."}
          </p>
        </section>
      )}


      <RosterStatus seasonType={isRegular ? "reg" : "pre"} week={week} leagueId={activeLeague!.id} />

      <HowToPlay
        seasonType={isRegular ? "reg" : "pre"}
        maxPoints={maxPoints}
        opensAt={opensAt}
        deadline={deadline}
      />

      <LeagueRules leagueId={activeLeague!.id} />




      <ul className="space-y-3">
        {games.map((game) => {
          const sel = selections[game.id];
          const started = hasStarted(game);
          const gameLocked = locked || started;
          const isFinal = game.status === "final";
          const hasScore = game.away_score !== null && game.home_score !== null;
          const finalScore = hasScore ? `${game.away_score}–${game.home_score}` : null;
          const winner =
            isFinal && hasScore && game.away_score !== game.home_score
              ? (game.home_score! > game.away_score! ? game.home_team : game.away_team)
              : null;
          return (
            <li
              key={game.id}
              className={`field-panel rounded-2xl p-4 ${started && !isFinal ? "opacity-70" : ""}`}
            >
              <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-widest text-muted-foreground">
                <span>{kickoffLabel(game.kickoff)}</span>
                <span className="flex items-center gap-2">
                  {tiebreakerGame?.id === game.id && (
                    <span className="flex items-center gap-1 text-primary">
                      <Flame size={12} />
                      {isMondayNight(game.kickoff) ? "Monday Night" : "Final game"}
                    </span>
                  )}
                  {started && (
                    <span className="flex items-center gap-1">
                      <Lock size={11} />
                      {isFinal ? `Final ${finalScore ?? ""}` : "Kicked off"}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="grid flex-1 grid-cols-2 gap-2">
                  {[game.away_team, game.home_team].map((team) => {
                    const score = team === game.home_team ? game.home_score : game.away_score;
                    const won = winner === team;
                    const lost = winner !== null && !won;
                    return (
                      <button
                        key={team}
                        type="button"
                        disabled={gameLocked}
                        onClick={() => pickTeam(game.id, team)}
                        className={`flex items-center gap-2.5 rounded-xl border px-3 py-3 text-left transition-colors disabled:opacity-100 ${
                          won
                            ? "glow-ring border-primary bg-primary/15"
                            : lost
                              ? "border-border/60 opacity-55"
                              : sel?.team === team
                                ? "glow-ring border-primary bg-primary/10 text-primary"
                                : "border-border hover:border-primary/50"
                        }`}
                      >
                        <TeamLogo team={team} size={32} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                            {team === game.home_team ? "Home" : "Away"}
                            {sel?.team === team && <span className="text-primary">· your pick</span>}
                          </span>
                          <span className="flex items-center justify-between gap-2">
                            <span
                              className={`stadium-heading block truncate text-lg ${won ? "text-primary" : ""}`}
                            >
                              {teamShort(team)}
                            </span>
                            {hasScore && (
                              <span
                                className={`stadium-heading text-xl tabular-nums ${
                                  won ? "text-primary" : "text-muted-foreground"
                                }`}
                              >
                                {score}
                              </span>
                            )}
                          </span>
                        </span>
                        {won && <Trophy size={16} className="shrink-0 text-primary" />}
                      </button>
                    );
                  })}
                </div>


                <select
                  aria-label="Confidence points"
                  disabled={gameLocked}
                  value={sel?.confidence ?? ""}
                  onChange={(e) =>
                    setConfidence(game.id, e.target.value ? Number(e.target.value) : null)
                  }
                  className="h-12 w-full rounded-xl border border-border bg-input px-3 text-base font-bold text-foreground sm:w-28"
                >
                  <option value="">Pts</option>
                  {Array.from({ length: pointsCeiling }, (_, i) => pointsCeiling - i)
                    .filter(
                      (n) =>
                        sel?.confidence === n ||
                        (!usedPoints.has(n) && !reservedPoints.has(n)),
                    )
                    .map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                </select>
              </div>
              {(() => {
                const wp = winProbFor(game);
                if (!wp || isFinal) return null;
                return (
                  <WinProbability
                    awayTeam={game.away_team}
                    homeTeam={game.home_team}
                    awayPct={wp.awayPct}
                    homePct={wp.homePct}
                    live={wp.live}
                  />
                );
              })()}
            </li>
          );
        })}
      </ul>

      <section className="field-panel space-y-3 rounded-2xl p-5">
        <h2 className="stadium-heading text-lg">
          {tiebreakerGame && isMondayNight(tiebreakerGame.kickoff)
            ? "Monday Night Tiebreaker"
            : "Final Game Tiebreaker"}
        </h2>
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          Total combined score in{" "}
          {tiebreakerGame ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <TeamLogo team={tiebreakerGame.away_team} size={20} />
              {teamShort(tiebreakerGame.away_team)} @
              <TeamLogo team={tiebreakerGame.home_team} size={20} />
              {teamShort(tiebreakerGame.home_team)}
            </span>
          ) : (
            "the final game"
          )}
        </p>

        <Input
          inputMode="numeric"
          disabled={tiebreakerLocked}
          value={tiebreaker}
          onChange={(e) => setTiebreaker(e.target.value.replace(/\D/g, "").slice(0, 3))}
          placeholder="48"
        />
      </section>

      {!locked && (
        <div className="sticky bottom-20 sm:bottom-4">
          <Button
            size="lg"
            className="w-full"
            disabled={busy || !complete}
            onClick={submit}
          >
            {openGames.length === 0
              ? "Every game has kicked off"
              : complete
                ? "Submit picks"
                : "Complete every open game to submit"}
          </Button>
        </div>
      )}

    </div>
  );
}
