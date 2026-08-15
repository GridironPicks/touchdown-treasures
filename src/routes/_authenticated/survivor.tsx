import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Skull, ShieldCheck, Lock, Timer, HelpCircle } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Mascot } from "@/components/Mascot";
import { TeamLogo } from "@/components/TeamLogo";
import { Button } from "@/components/ui/button";
import {
  SEASON,
  formatCountdown,
  kickoffLabel,
  teamShort,
  weekDeadline,
  weekOpensAt,
  type Game,
} from "@/lib/league";
import { useSlates } from "@/lib/slate";

export const Route = createFileRoute("/_authenticated/survivor")({
  head: () => ({
    meta: [
      { title: "Survivor Pool — Gridiron Confidence" },
      {
        name: "description",
        content:
          "Pick one NFL winner each week, use every team only once, and stay alive in the free Gridiron Confidence survivor pool.",
      },
      { property: "og:title", content: "Survivor Pool — Gridiron Confidence" },
      {
        property: "og:description",
        content: "One team a week, no repeats, ties survive. Last manager standing wins.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SurvivorPage,
});

type BoardRow = {
  user_id: string;
  display_name: string;
  team_name: string;
  mascot: string;
  primary_color: string;
  week: number | null;
  team: string | null;
  revealed: boolean;
  result: string | null;
};

type Manager = {
  user_id: string;
  display_name: string;
  team_name: string;
  mascot: string;
  primary_color: string;
  runs: BoardRow[];
  eliminated: boolean;
  eliminatedWeek: number | null;
  survivedWeeks: number;
};

function groupBoard(rows: BoardRow[]): Manager[] {
  const map = new Map<string, Manager>();
  for (const r of rows) {
    let m = map.get(r.user_id);
    if (!m) {
      m = {
        user_id: r.user_id,
        display_name: r.display_name,
        team_name: r.team_name,
        mascot: r.mascot,
        primary_color: r.primary_color,
        runs: [],
        eliminated: false,
        eliminatedWeek: null,
        survivedWeeks: 0,
      };
      map.set(r.user_id, m);
    }
    if (r.week !== null) m.runs.push(r);
  }
  for (const m of map.values()) {
    m.runs.sort((a, b) => (a.week ?? 0) - (b.week ?? 0));
    const out = m.runs.find((r) => r.result === "eliminated");
    m.eliminated = !!out;
    m.eliminatedWeek = out?.week ?? null;
    m.survivedWeeks = m.runs.filter((r) => r.result === "survived").length;
  }
  return [...map.values()].sort(
    (a, b) =>
      Number(a.eliminated) - Number(b.eliminated) ||
      b.survivedWeeks - a.survivedWeeks ||
      a.team_name.localeCompare(b.team_name),
  );
}

function SurvivorPage() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const now = Date.now();

  const { data: slates = [] } = useSlates();

  // Survivor runs the regular season only: week 1 through the last unfinished week.
  const regSlates = slates.filter((s) => s.seasonType === "reg");
  const activeSlate = regSlates.find((s) => !s.allFinal) ?? regSlates[regSlates.length - 1] ?? null;
  const week = activeSlate?.week ?? 1;

  const { data: me } = useQuery({
    queryKey: ["me-id"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });

  const { data: games = [] } = useQuery({
    queryKey: ["survivor-games", week],
    enabled: !!activeSlate,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("*")
        .eq("season", SEASON)
        .eq("season_type", "reg")
        .eq("week", week)
        .order("kickoff");
      if (error) throw error;
      return (data ?? []) as Game[];
    },
  });

  const { data: board = [] } = useQuery({
    queryKey: ["survivor-board", SEASON],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("survivor_board", { _season: SEASON });
      if (error) throw error;
      return (data ?? []) as BoardRow[];
    },
    refetchInterval: 60_000,
  });

  const managers = useMemo(() => groupBoard(board), [board]);
  const alive = managers.filter((m) => !m.eliminated);
  const graveyard = managers.filter((m) => m.eliminated);
  const mine = managers.find((m) => m.user_id === me) ?? null;
  const myRuns = mine?.runs ?? [];
  const usedTeams = new Set(myRuns.map((r) => r.team).filter(Boolean) as string[]);
  const thisWeekPick = myRuns.find((r) => r.week === week)?.team ?? null;

  const deadline = useMemo(() => weekDeadline(games), [games]);
  const opensAt = useMemo(() => weekOpensAt(games), [games]);
  const notOpenYet = opensAt ? now < opensAt.getTime() : false;
  const deadlinePassed = deadline ? deadline.getTime() <= now : false;
  const locked = notOpenYet || deadlinePassed || !!thisWeekPick || (mine?.eliminated ?? false);

  async function pick(team: string) {
    if (locked) return;
    if (usedTeams.has(team)) {
      toast.error(`You already used ${teamShort(team)} this season`);
      return;
    }
    if (!window.confirm(`Lock in ${teamShort(team)} for week ${week}? Survivor picks are final.`))
      return;
    setBusy(true);
    try {
      const uid = (await supabase.auth.getUser()).data.user?.id;
      if (!uid) throw new Error("You must be signed in");
      const { error } = await supabase
        .from("survivor_picks")
        .insert({ user_id: uid, season: SEASON, week, team });
      if (error) throw error;
      toast.success(`${teamShort(team)} locked in for week ${week}`);
      await queryClient.invalidateQueries({ queryKey: ["survivor-board", SEASON] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your pick");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="stadium-heading flex items-center gap-2 text-3xl">
            <ShieldCheck className="text-primary" /> Survivor Pool
          </h1>
          <p className="text-sm text-muted-foreground">
            Week {week} · {alive.length} alive · {graveyard.length} eliminated
          </p>
        </div>
        <div className="text-right">
          {notOpenYet && opensAt ? (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Timer size={14} /> Opens in {formatCountdown(opensAt.getTime() - now)}
            </p>
          ) : deadline && !deadlinePassed ? (
            <p className="flex items-center gap-1.5 text-sm text-primary">
              <Timer size={14} /> Locks in {formatCountdown(deadline.getTime() - now)}
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Lock size={14} /> Week {week} locked
            </p>
          )}
        </div>
      </header>

      <section className="field-panel rounded-2xl border border-border p-5">
        <h2 className="stadium-heading flex items-center gap-2 text-lg">
          <HelpCircle size={16} className="text-primary" /> How survivor works
        </h2>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          <li>• Pick one team to win outright each regular season week — starting week 1.</li>
          <li>• Each team can only be used once all season. Used teams show as USED below.</li>
          <li>• Your team loses, you're eliminated. A tie survives.</li>
          <li>• Picks open Tuesday 12:00 AM ET and lock Wednesday 6:00 PM ET — and are final once submitted.</li>
          <li>• Last manager standing wins bragging rights. Free to play.</li>
        </ul>
      </section>

      {mine?.eliminated ? (
        <section className="field-panel rounded-2xl border border-destructive/50 p-5">
          <h2 className="stadium-heading flex items-center gap-2 text-lg text-destructive">
            <Skull size={18} /> You're out
          </h2>
          <p className="text-sm text-muted-foreground">
            Eliminated in week {mine.eliminatedWeek}. You survived {mine.survivedWeeks} week
            {mine.survivedWeeks === 1 ? "" : "s"}.
          </p>
        </section>
      ) : thisWeekPick ? (
        <section className="field-panel flex items-center gap-3 rounded-2xl border border-primary/40 p-5">
          <TeamLogo team={thisWeekPick} size={40} />
          <div>
            <h2 className="stadium-heading text-lg text-primary">Week {week} pick locked</h2>
            <p className="text-sm text-muted-foreground">
              {thisWeekPick} — final, no changes.
            </p>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="stadium-heading text-lg">Week {week} team selection</h2>
        {games.length === 0 && (
          <p className="text-sm text-muted-foreground">No games scheduled for this week yet.</p>
        )}
        <ul className="space-y-3">
          {games.map((game) => (
            <li key={game.id} className="field-panel rounded-2xl p-4">
              <p className="mb-3 text-[11px] uppercase tracking-widest text-muted-foreground">
                {kickoffLabel(game.kickoff)}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[game.away_team, game.home_team].map((team) => {
                  const used = usedTeams.has(team);
                  const picked = thisWeekPick === team;
                  return (
                    <button
                      key={team}
                      type="button"
                      disabled={busy || locked || used}
                      onClick={() => pick(team)}
                      className={`flex items-center gap-2.5 rounded-xl border px-3 py-3 text-left transition-colors ${
                        picked
                          ? "glow-ring border-primary bg-primary/15 text-primary"
                          : used
                            ? "border-border/60 opacity-45"
                            : "border-border hover:border-primary/50"
                      }`}
                    >
                      <TeamLogo team={team} size={32} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">
                          {team === game.home_team ? "Home" : "Away"}
                          {used && <span className="ml-1 text-destructive">· used</span>}
                          {picked && <span className="ml-1 text-primary">· your pick</span>}
                        </span>
                        <span className="stadium-heading block truncate text-lg">
                          {teamShort(team)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="field-panel space-y-3 rounded-2xl p-5">
        <h2 className="stadium-heading text-lg">Still alive ({alive.length})</h2>
        <ul className="space-y-2">
          {alive.map((m) => (
            <li key={m.user_id} className="flex items-center gap-3">
              <Mascot mascot={m.mascot} color={m.primary_color} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{m.team_name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {m.display_name} · {m.survivedWeeks} week{m.survivedWeeks === 1 ? "" : "s"} survived
                </p>
              </div>
              <div className="flex items-center gap-1">
                {m.runs.map((r) => (
                  <span key={r.week} title={`Week ${r.week}`}>
                    {r.team ? (
                      <TeamLogo team={r.team} size={20} />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">W{r.week}?</span>
                    )}
                  </span>
                ))}
              </div>
            </li>
          ))}
          {alive.length === 0 && (
            <p className="text-sm text-muted-foreground">Nobody is alive yet.</p>
          )}
        </ul>
      </section>

      <section className="field-panel space-y-3 rounded-2xl border border-destructive/30 p-5">
        <h2 className="stadium-heading flex items-center gap-2 text-lg">
          <Skull size={18} className="text-destructive" /> Graveyard ({graveyard.length})
        </h2>
        {graveyard.length === 0 ? (
          <p className="text-sm text-muted-foreground">Empty. Nobody has been buried yet.</p>
        ) : (
          <ul className="space-y-2">
            {graveyard.map((m) => (
              <li key={m.user_id} className="flex items-center gap-3 opacity-70">
                <Mascot mascot={m.mascot} color={m.primary_color} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold line-through">{m.team_name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    Eliminated week {m.eliminatedWeek} ·{" "}
                    {m.runs.find((r) => r.result === "eliminated")?.team ?? "hidden pick"}
                  </p>
                </div>
                <Skull size={16} className="text-destructive" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
