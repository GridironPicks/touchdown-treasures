import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Lock, Timer, Flame } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  SEASON,
  formatCountdown,
  kickoffLabel,
  teamShort,
  weekDeadline,
  type Game,
} from "@/lib/league";
import { useCurrentSlate, slateLabel } from "@/lib/slate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/picks")({
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
  const [selections, setSelections] = useState<Record<string, Selection>>({});
  const [tiebreaker, setTiebreaker] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: slate } = useCurrentSlate();
  const seasonType = slate?.seasonType ?? "reg";
  const week = slate?.week ?? 1;
  const isPreseason = seasonType === "pre";

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

  const { data: myEntry } = useQuery({
    queryKey: ["my-entry", seasonType, week],
    enabled: !!slate && !isPreseason,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("entries")
        .select("paid")
        .eq("user_id", auth.user!.id)
        .eq("season", SEASON)
        .eq("season_type", "reg")
        .eq("week", week)
        .maybeSingle();
      if (error) throw error;
      return data;
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

  const deadline = useMemo(() => weekDeadline(games), [games]);
  const msLeft = deadline ? deadline.getTime() - now : 0;
  const deadlinePassed = deadline !== null && msLeft <= 0;
  const paid = isPreseason || myEntry?.paid === true;
  const locked = deadlinePassed || !paid;

  const hasStarted = (g: Game) => new Date(g.kickoff).getTime() <= now;
  const openGames = games.filter((g) => !hasStarted(g));
  const maxPoints = games.length;

  const tiebreakerGame = games.find((g) => g.is_tiebreaker_game) ?? games[games.length - 1];
  const tiebreakerLocked = locked || (tiebreakerGame ? hasStarted(tiebreakerGame) : true);

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

  return (
    <div className="space-y-5">
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
              {deadlinePassed ? <Lock size={13} /> : <Timer size={13} />}
              {deadlinePassed ? "Picks locked" : "Locks Wed 6:00 PM ET"}
            </p>
            <p
              className={`stadium-heading text-2xl tabular-nums ${
                deadlinePassed ? "text-destructive" : "text-primary"
              }`}
            >
              {formatCountdown(msLeft)}
            </p>
          </div>
        </div>
      </header>

      {isPreseason ? (
        <section className="field-panel rounded-2xl border border-primary/40 p-5">
          <h2 className="stadium-heading text-lg text-primary">Free preseason play</h2>
          <p className="text-sm text-muted-foreground">
            Preseason weeks are free — no buy-in required. The $5 weekly entry starts in Week 1 of
            the 2026 regular season.
          </p>
        </section>
      ) : (
        !paid &&
        !deadlinePassed && (
          <section className="field-panel flex flex-col gap-3 rounded-2xl border border-primary/40 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="stadium-heading text-lg text-primary">Entry fee required</h2>
              <p className="text-sm text-muted-foreground">
                Pay the $5 Week {week} buy-in to unlock your picks.
              </p>
            </div>
            <Link
              to="/pot"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
            >
              Pay $5 entry
            </Link>
          </section>
        )
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
                  {game.is_tiebreaker_game && (
                    <span className="flex items-center gap-1 text-primary">
                      <Flame size={12} /> Monday Night
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
                      className={`rounded-xl border px-3 py-3 text-left transition-colors disabled:opacity-60 ${
                        sel?.team === team
                          ? "glow-ring border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">
                        {team === game.home_team ? "Home" : "Away"}
                      </span>
                      <span className="stadium-heading text-lg">{teamShort(team)}</span>
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

      <div className="sticky bottom-20 sm:bottom-4">
        <Button
          size="lg"
          className="w-full"
          disabled={locked || busy || !complete}
          onClick={submit}
        >
          {!paid
            ? "Pay your $5 entry to submit"
            : deadlinePassed
              ? "Picks locked"
              : openGames.length === 0
                ? "Every game has kicked off"
                : complete
                  ? "Submit picks"
                  : "Complete every open game to submit"}
        </Button>
      </div>
    </div>
  );
}
