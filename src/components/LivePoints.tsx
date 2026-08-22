import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { Radio } from "lucide-react";

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

/** Live chance-to-win-the-week odds for the selected week, refreshed while games run. */
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
  const leaderBanked = bankedOrder[0]?.banked ?? 0;
  const bestMaxOfOthers = (uid: string) =>
    Math.max(0, ...rows.filter((r) => r.user_id !== uid).map((r) => r.max_possible));
  const fmtOdds = (v: number) =>
    v >= 99.5 ? "99+%" : v > 0 && v < 1 ? "<1%" : `${Math.round(v)}%`;
  const oddsOrder = [...rows].sort(
    (a, b) => (odds[b.user_id] ?? 0) - (odds[a.user_id] ?? 0) || b.banked - a.banked,
  );


  return (
    <section className="field-panel overflow-hidden rounded-2xl">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="stadium-heading text-lg">Chance to win the week</h2>
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Radio size={12} className={inProgress ? "text-primary" : ""} />
          {inProgress ? "Games in progress" : "All games final"}
        </span>
      </header>

      <ul className="divide-y divide-border">
        {oddsOrder.map((r) => {
          const clinched = r.banked > bestMaxOfOthers(r.user_id);
          const eliminated = !clinched && r.max_possible < leaderBanked;
          const pct = clinched ? 100 : eliminated ? 0 : (odds[r.user_id] ?? 0);
          return (
            <li
              key={r.user_id}
              className={`flex items-center gap-3 px-4 py-3 ${
                r.user_id === meId ? "bg-primary/5" : ""
              }`}
            >
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
                  {r.remaining} game{r.remaining === 1 ? "" : "s"} left
                </p>
              </div>
              <div className="w-14 text-right">
                <p className="stadium-heading text-xl tabular-nums text-primary">{fmtOdds(pct)}</p>
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
