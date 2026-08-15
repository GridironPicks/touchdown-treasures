import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Lock, Timer, Flame } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  SEASON,
  formatCountdown,
  isMondayNight,
  kickoffLabel,
  teamShort,
  tiebreakerGameOf,
  type Game,
  type SeasonType,
} from "@/lib/league";
import { TeamLogo } from "@/components/TeamLogo";
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

  

  const { data: games = [] } = useQuery({
    queryKey: ["games", seasonType, week],
    enabled: !!slate,
    queryFn: async () => {
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
  });

  const { data: existing } = useQuery({
    queryKey: ["my-picks", seasonType, week],
    enabled: !!slate,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user!.id;
      const [picks, tb] = await Promise.all([
        supabase
          .from("picks")
          .select("*")
          .eq("user_id", uid)
          .eq("season", SEASON)
          .eq("season_type", seasonType)
          .eq("week", week),
        supabase
          .from("tiebreakers")
          .select("*")
          .eq("user_id", uid)
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
  // Picks stay editable all week — only games that already kicked off lock.
  const locked = games.length > 0 && openGames.length === 0;

  const tiebreakerGame = useMemo(() => tiebreakerGameOf(games), [games]);
  const tiebreakerLocked = tiebreakerGame ? hasStarted(tiebreakerGame) : true;
  const nextKickoff = openGames[0] ? new Date(openGames[0].kickoff).getTime() - now : 0;


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
    if (!existing) return;
    setBusy(true);
    try {
      const uid = existing.uid;
      const openIds = openGames.map((g) => g.id);
      const rows = openGames
        .filter((g) => selections[g.id]?.team && selections[g.id]?.confidence)
        .map((g) => ({
          user_id: uid,
          game_id: g.id,
          season: SEASON,
          season_type: seasonType,
          week,
          picked_team: selections[g.id]!.team,
          confidence: selections[g.id]!.confidence!,
        }));

      if (openIds.length > 0) {
        const del = await supabase
          .from("picks")
          .delete()
          .eq("user_id", uid)
          .eq("season", SEASON)
          .eq("season_type", seasonType)
          .eq("week", week)
          .in("game_id", openIds);
        if (del.error) throw del.error;
      }

      const ins = await supabase.from("picks").insert(rows);
      if (ins.error) throw ins.error;

      const total = Number.parseInt(tiebreaker, 10);
      if (!tiebreakerLocked && !Number.isNaN(total)) {
        const tb = await supabase.from("tiebreakers").upsert(
          { user_id: uid, season: SEASON, season_type: seasonType, week, predicted_total: total },
          { onConflict: "user_id,season,season_type,week" },
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

  return (
    <div className="space-y-5">
      <SlatePicker slates={slates} value={slate} onChange={selectSlate} />

      <header className="field-panel rounded-2xl p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="stadium-heading text-3xl">{heading}</h1>
            <p className="text-sm text-muted-foreground">
              {maxPoints} games · assign {maxPoints} down to 1
              {openGames.length < maxPoints ? ` · ${openGames.length} still open` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="flex items-center justify-end gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
              {status === "open" ? <Timer size={13} /> : <Lock size={13} />}
              {status === "open"
                ? "Next kickoff"
                : status === "in-progress"
                  ? "All games started"
                  : "Final"}
            </p>
            {status === "open" ? (
              <p className="stadium-heading text-2xl tabular-nums text-primary">
                {formatCountdown(nextKickoff)}
              </p>
            ) : (
              <p className="stadium-heading text-2xl text-muted-foreground">
                {status === "final" ? "Week complete" : "LOCKED"}
              </p>
            )}
          </div>
        </div>
      </header>

      {status === "open" ? (
        <section className="field-panel rounded-2xl border border-primary/40 p-5">
          <h2 className="stadium-heading text-lg text-primary">Free to play</h2>
          <p className="text-sm text-muted-foreground">
            Free all season. Edit your picks any time — each game locks only when it kicks off.
          </p>
        </section>
      ) : (
        <section className="field-panel rounded-2xl border border-border p-5">
          <h2 className="stadium-heading text-lg">Read only</h2>
          <p className="text-sm text-muted-foreground">
            Every game this week has kicked off. Your submitted picks are shown below with scores.
          </p>
        </section>
      )}




      <ul className="space-y-3">
        {games.map((game) => {
          const sel = selections[game.id];
          const started = hasStarted(game);
          const gameLocked = locked || started;
          const finalScore =
            game.away_score !== null && game.home_score !== null
              ? `${game.away_score}–${game.home_score}`
              : null;
          return (
            <li
              key={game.id}
              className={`field-panel rounded-2xl p-4 ${started ? "opacity-70" : ""}`}
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
                      {game.status === "final" ? `Final ${finalScore ?? ""}` : "Kicked off"}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="grid flex-1 grid-cols-2 gap-2">
                  {[game.away_team, game.home_team].map((team) => (
                    <button
                      key={team}
                      type="button"
                      disabled={gameLocked}
                      onClick={() => pickTeam(game.id, team)}
                      className={`flex items-center gap-2.5 rounded-xl border px-3 py-3 text-left transition-colors disabled:opacity-60 ${
                        sel?.team === team
                          ? "glow-ring border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <TeamLogo team={team} size={32} />
                      <span className="min-w-0">
                        <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">
                          {team === game.home_team ? "Home" : "Away"}
                        </span>
                        <span className="stadium-heading block truncate text-lg">
                          {teamShort(team)}
                        </span>
                      </span>
                    </button>
                  ))}
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
                  {Array.from({ length: maxPoints }, (_, i) => maxPoints - i).map((n) => (
                    <option
                      key={n}
                      value={n}
                      disabled={
                        (usedPoints.has(n) || reservedPoints.has(n)) && sel?.confidence !== n
                      }
                    >
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </li>
          );
        })}
      </ul>

      <section className="field-panel space-y-3 rounded-2xl p-5">
        <h2 className="stadium-heading text-lg">Monday Night Tiebreaker</h2>
        <p className="text-sm text-muted-foreground">
          Total combined score in{" "}
          {tiebreakerGame
            ? `${teamShort(tiebreakerGame.away_team)} @ ${teamShort(tiebreakerGame.home_team)}`
            : "the final game"}
          .
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
