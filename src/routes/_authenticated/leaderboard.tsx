import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Trophy } from "lucide-react";


import { supabase } from "@/integrations/supabase/client";
import { Mascot } from "@/components/Mascot";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "Season Standings — Gridiron Confidence" },
      {
        name: "description",
        content: "Cumulative confidence points, weekly wins and the 2026 championship trophy.",
      },
      { property: "og:title", content: "Season Standings — Gridiron Confidence" },
      {
        property: "og:description",
        content: "See who is chasing the 2026 NFL Championship trophy badge.",
      },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const [board, setBoard] = useState<"reg" | "pre">("reg");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["leaderboard", board],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(board === "pre" ? "preseason_leaderboard" : "leaderboard")
        .select("*")
        .order("season_points", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="stadium-heading text-3xl">Season Standings</h1>
        <p className="text-sm text-muted-foreground">
          {board === "pre"
            ? "2026 preseason · free-play practice points"
            : "2026 season · cumulative confidence points"}
        </p>
      </header>

      <div className="field-panel inline-flex rounded-xl p-1">
        {(["reg", "pre"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setBoard(key)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              board === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {key === "reg" ? "Regular season" : "Preseason"}
          </button>
        ))}
      </div>

      <section className="field-panel overflow-hidden rounded-2xl">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading standings…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No managers yet.</p>
        ) : (

          <ul className="divide-y divide-border">
            {rows.map((row, i) => (
              <li key={row.user_id} className="flex items-center gap-3 px-4 py-3">
                <span className="stadium-heading w-6 text-lg text-muted-foreground">{i + 1}</span>
                <Mascot mascot={row.mascot ?? "eagle"} color={row.primary_color} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{row.team_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{row.display_name}</p>
                </div>
                {i === 0 && (row.season_points ?? 0) > 0 && (
                  <span className="trophy-badge flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase">
                    <Trophy size={13} /> 2026
                  </span>
                )}
                <div className="text-right">
                  <p className="stadium-heading text-xl text-primary">{row.season_points ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {row.weeks_played ?? 0} wks scored
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
