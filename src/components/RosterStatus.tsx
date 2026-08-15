import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, Users } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { SEASON, type SeasonType } from "@/lib/league";
import { Mascot } from "@/components/Mascot";

type Row = {
  user_id: string;
  display_name: string;
  team_name: string;
  mascot: string;
  primary_color: string;
  submitted: boolean;
  pick_count: number;
};

export function RosterStatus({
  seasonType,
  week,
  leagueId,
}: {
  seasonType: SeasonType;
  week: number;
  leagueId: string;
}) {
  const { data: rows = [] } = useQuery({
    queryKey: ["week-submissions", leagueId, seasonType, week],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("week_submission_status", {
        _season: SEASON,
        _season_type: seasonType,
        _week: week,
        _league_id: leagueId,
      });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    refetchInterval: 60_000,
  });

  const inCount = rows.filter((r) => r.submitted).length;

  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide">League status</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {inCount}/{rows.length} submitted
        </span>
      </header>

      <ul className="grid gap-2 sm:grid-cols-2">
        {rows.map((r) => (
          <li key={r.user_id}>
            <Link
              to="/manager/$userId"
              params={{ userId: r.user_id }}
              search={{ type: seasonType, week }}
              className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/40 px-3 py-2 transition-colors hover:border-primary/60"
            >
            <Mascot mascot={r.mascot} color={r.primary_color} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{r.team_name}</p>
              <p className="truncate text-xs text-muted-foreground">{r.display_name}</p>
            </div>
            {r.submitted ? (
              <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-1 text-[11px] font-semibold text-primary">
                <CheckCircle2 className="h-3.5 w-3.5" /> Picks in
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-muted/40 px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                <Circle className="h-3.5 w-3.5" /> Not submitted
              </span>
            )}
            </Link>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="text-xs text-muted-foreground">No managers registered yet.</li>
        )}
      </ul>
    </section>
  );
}
