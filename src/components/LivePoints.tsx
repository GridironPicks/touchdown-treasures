import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Radio } from "lucide-react";

import { Mascot } from "@/components/Mascot";
import { getLiveStandings, type LiveRow } from "@/lib/awards.functions";
import type { SeasonType } from "@/lib/league";

type Props = {
  leagueId: string;
  seasonType: SeasonType;
  week: number;
  meId?: string | null;
  /** Every game of the week is final — lets the header avoid claiming so too early. */
  allFinal?: boolean;
};

/** Live chance-to-win-the-week odds for the selected week, refreshed while games run. */
export function LivePoints({ leagueId, seasonType, week, meId, allFinal }: Props) {
  const fetchLive = useServerFn(getLiveStandings);

  const { data: rows = [] } = useQuery<LiveRow[]>({
    queryKey: ["live-standings", leagueId, seasonType, week],
    enabled: !!leagueId,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    queryFn: () => fetchLive({ data: { leagueId, seasonType, week } }),
  });

  if (rows.length === 0) return null;

  const inProgress = rows.some((r) => r.remaining > 0);
  const bankedOrder = [...rows].sort((a, b) => b.banked - a.banked);
  const leaderBanked = bankedOrder[0]?.banked ?? 0;
  const bestMaxOfOthers = (uid: string) =>
    Math.max(0, ...rows.filter((r) => r.user_id !== uid).map((r) => r.max_possible));
  const eligibleRows = rows.filter((r) => r.max_possible >= leaderBanked);
  const totalEligiblePotential = eligibleRows.reduce((sum, r) => sum + r.max_possible, 0);
  const clinchedUser = rows.find((r) => r.banked > bestMaxOfOthers(r.user_id))?.user_id;
  const fmtOdds = (v: number) =>
    v >= 99.5 ? "100%" : v > 0 && v < 1 ? "<1%" : `${Math.round(v)}%`;
  const oddsOrder = [...rows].sort(
    (a, b) => {
      const aPct = clinchedUser
        ? a.user_id === clinchedUser ? 100 : 0
        : a.max_possible >= leaderBanked && totalEligiblePotential > 0
          ? (a.max_possible / totalEligiblePotential) * 100
          : 0;
      const bPct = clinchedUser
        ? b.user_id === clinchedUser ? 100 : 0
        : b.max_possible >= leaderBanked && totalEligiblePotential > 0
          ? (b.max_possible / totalEligiblePotential) * 100
          : 0;
      return bPct - aPct || b.banked - a.banked;
    },
  );


  return (
    <section className="field-panel overflow-hidden rounded-2xl">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="stadium-heading text-lg">Chance to win the week</h2>
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Radio size={12} className={inProgress && !allFinal ? "text-primary" : ""} />
          {allFinal ? "All games final" : inProgress ? "Games in progress" : "Waiting on results"}
        </span>
      </header>

      <ul className="divide-y divide-border">
        {oddsOrder.map((r) => {
          const clinched = r.user_id === clinchedUser;
          const eliminated = !clinched && r.max_possible < leaderBanked;
          const pct = clinched
            ? 100
            : eliminated || totalEligiblePotential === 0
              ? 0
              : (r.max_possible / totalEligiblePotential) * 100;
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
        Based on current points and confidence points still available from unplayed games.
      </p>
    </section>
  );
}
