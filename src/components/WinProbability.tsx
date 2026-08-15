import { Activity } from "lucide-react";

import { teamShort } from "@/lib/league";

/** Live win probability bar for an in-progress game. */
export function WinProbability({
  awayTeam,
  homeTeam,
  awayPct,
  homePct,
  live,
}: {
  awayTeam: string;
  homeTeam: string;
  awayPct: number;
  homePct: number;
  live: boolean;
}) {
  return (
    <div className="mt-3 rounded-xl border border-border/70 bg-secondary/30 p-3">
      <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
        <span className="flex items-center gap-1">
          <Activity size={11} className={live ? "text-primary" : ""} />
          {live ? "Live win probability" : "Win probability"}
        </span>
        {live && (
          <span className="flex items-center gap-1 text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            Live
          </span>
        )}
      </div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="bg-primary" style={{ width: `${awayPct}%` }} />
        <div className="bg-[hsl(var(--chrome,0_0%_75%))] bg-muted-foreground/70" style={{ width: `${homePct}%` }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-xs font-semibold tabular-nums">
        <span className="text-primary">
          {teamShort(awayTeam)} {awayPct}%
        </span>
        <span className="text-muted-foreground">
          {teamShort(homeTeam)} {homePct}%
        </span>
      </div>
    </div>
  );
}
