import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { ArrowDown, ArrowUp, Minus, Radio } from "lucide-react";

import { Mascot } from "@/components/Mascot";
import { getLiveStandings, getOpenPicks, type LiveRow } from "@/lib/awards.functions";
import { getWinProbabilities } from "@/lib/winprob.functions";
import { winOdds } from "@/lib/win-odds";
import type { SeasonType } from "@/lib/league";

type Props = {
  leagueId: string;
  seasonType: SeasonType;
  week: number;
  meId?: string | null;
};

/** Banked vs live vs best-case points for the selected week, refreshed while games run. */
export function LivePoints({ leagueId, seasonType, week, meId }: Props) {
  const fetchLive = useServerFn(getLiveStandings);
  const fetchOpen = useServerFn(getOpenPicks);
  const fetchProbs = useServerFn(getWinProbabilities);

  const { data: rows = [] } = useQuery<LiveRow[]>({
    queryKey: ["live-standings", leagueId, seasonType, week],
    enabled: !!leagueId,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    queryFn: () => fetchLive({ data: { leagueId, seasonType, week } }),
  });

  const { data: openPicks = [] } = useQuery({
    queryKey: ["open-picks", leagueId, seasonType, week],
    enabled: !!leagueId,
    staleTime: 0,
    refetchInterval: 60_000,
    queryFn: () => fetchOpen({ data: { leagueId, seasonType, week } }),
  });

  const { data: probs = [] } = useQuery({
    queryKey: ["win-probs", seasonType, week],
    staleTime: 0,
    refetchInterval: 60_000,
    queryFn: () => fetchProbs({ data: { seasonType, week } }),
  });

  const odds = useMemo(() => {
    const banked: Record<string, number> = {};
    for (const r of rows) banked[r.user_id] = r.banked;
    const homePct: Record<string, number> = {};
    for (const p of probs) homePct[p.external_id] = p.homePct;
    return winOdds(banked, openPicks, homePct);
  }, [rows, openPicks, probs]);

  if (rows.length === 0) return null;

  const inProgress = rows.some((r) => r.remaining > 0);
  const bankedOrder = [...rows].sort((a, b) => b.banked - a.banked);
  const liveOrder = [...rows].sort((a, b) => b.live - a.live || b.banked - a.banked);
  const bankedRank = new Map(bankedOrder.map((r, i) => [r.user_id, i + 1]));
  const leaderBanked = bankedOrder[0]?.banked ?? 0;
  const bestMaxOfOthers = (uid: string) =>
    Math.max(0, ...rows.filter((r) => r.user_id !== uid).map((r) => r.max_possible));
  const fmtOdds = (v: number) =>
    v >= 99.5 ? "99+%" : v > 0 && v < 1 ? "<1%" : `${Math.round(v)}%`;


  return (
    <section className="field-panel overflow-hidden rounded-2xl">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="stadium-heading text-lg">Live points</h2>
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Radio size={12} className={inProgress ? "text-primary" : ""} />
          {inProgress ? "Games in progress" : "All games final"}
        </span>
      </header>

      <ul className="divide-y divide-border">
        {liveOrder.map((r, i) => {
          const projected = i + 1;
          const was = bankedRank.get(r.user_id) ?? projected;
          const move = was - projected;
          const clinched = r.banked > bestMaxOfOthers(r.user_id);
          const eliminated = !clinched && r.max_possible < leaderBanked;
          return (
            <li
              key={r.user_id}
              className={`flex items-center gap-3 px-4 py-3 ${
                r.user_id === meId ? "bg-primary/5" : ""
              }`}
            >
              <span className="stadium-heading w-6 text-lg text-muted-foreground">{projected}</span>
              <Mascot mascot={r.mascot} color={r.primary_color} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate font-semibold">
                  {r.team_name}
                  {clinched && (
                    <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                      Clinched
                    </span>
                  )}
                  {eliminated && (
                    <span className="rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-destructive">
                      Out
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.banked} banked · max {r.max_possible} · {r.remaining} game
                  {r.remaining === 1 ? "" : "s"} left
                </p>
              </div>
              <span className="flex items-center text-xs font-semibold text-muted-foreground">
                {move > 0 ? (
                  <>
                    <ArrowUp size={13} className="text-primary" />
                    {move}
                  </>
                ) : move < 0 ? (
                  <>
                    <ArrowDown size={13} className="text-destructive" />
                    {Math.abs(move)}
                  </>
                ) : (
                  <Minus size={13} />
                )}
              </span>
              <div className="w-12 text-right">
                <p className="stadium-heading text-xl text-primary">{r.live}</p>
                <p className="text-[10px] text-muted-foreground">live</p>
              </div>
              <div className="w-12 text-right">
                <p
                  className="stadium-heading text-xl tabular-nums"
                  title="Chance to win the week"
                >
                  {fmtOdds(clinched ? 100 : eliminated ? 0 : (odds[r.user_id] ?? 0))}
                </p>
                <p className="text-[10px] text-muted-foreground">win</p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
        Odds simulate the remaining games using live win probability.
      </p>

    </section>
  );
}
