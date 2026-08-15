import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowUp, Minus, Radio } from "lucide-react";

import { Mascot } from "@/components/Mascot";
import { getLiveStandings, type LiveRow } from "@/lib/awards.functions";
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
  const liveOrder = [...rows].sort((a, b) => b.live - a.live || b.banked - a.banked);
  const bankedRank = new Map(bankedOrder.map((r, i) => [r.user_id, i + 1]));
  const leaderBanked = bankedOrder[0]?.banked ?? 0;
  const bestMaxOfOthers = (uid: string) =>
    Math.max(0, ...rows.filter((r) => r.user_id !== uid).map((r) => r.max_possible));

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
            </li>
          );
        })}
      </ul>
    </section>
  );
}
