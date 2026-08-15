import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Crown, Flame, Share2, Skull, Target, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Mascot } from "@/components/Mascot";
import { BadgeRow } from "@/components/BadgeRow";
import { SlatePicker } from "@/components/SlatePicker";
import { getManagerBadges } from "@/lib/awards.functions";
import { useLeague } from "@/lib/league-context";
import { getWeekRecap, type WeekRecap } from "@/lib/recap.functions";

import { defaultSlate, slateLabel, useSlates, type Slate } from "@/lib/slate";

const searchSchema = z.object({
  st: z.enum(["pre", "reg"]).optional(),
  wk: z.number().int().min(1).max(22).optional(),
});

export const Route = createFileRoute("/_authenticated/recap")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Weekly Recap — Gridiron Confidence" },
      {
        name: "description",
        content:
          "The official weekly winner, tiebreakers, biggest hits and misses, and survivor casualties.",
      },
      { property: "og:title", content: "Weekly Recap — Gridiron Confidence" },
      {
        property: "og:description",
        content: "Who won the week, how the tiebreaker landed and who got knocked out.",
      },
    ],
  }),
  component: RecapPage,
});

const DECIDED_BY: Record<string, string> = {
  points: "on points",
  tiebreaker: "on the tiebreaker score",
  correct: "on most correct picks",
  submitted: "on earliest submission",
};

function RecapPage() {
  const search = Route.useSearch();
  const { activeLeague } = useLeague();
  const { data: slates = [] } = useSlates();
  const fallback = useMemo(() => defaultSlate(slates), [slates]);
  const fromSearch: Slate | null = search.st && search.wk ? { seasonType: search.st, week: search.wk } : null;
  const [picked, setPicked] = useState<Slate | null>(fromSearch);
  const slate = picked ?? fromSearch ?? fallback;

  const fetchRecap = useServerFn(getWeekRecap);

  const { data, isLoading } = useQuery<WeekRecap>({
    queryKey: ["recap", activeLeague?.id, slate?.seasonType, slate?.week],
    enabled: !!activeLeague && !!slate,
    queryFn: () =>
      fetchRecap({
        data: {
          leagueId: activeLeague!.id,
          seasonType: slate!.seasonType,
          week: slate!.week,
        },
      }),
  });

  const winner = data?.rows.find((r) => r.place === 1) ?? null;
  const runnerUp = data?.rows.find((r) => r.place === 2) ?? null;
  const highlight = (kind: string) => data?.highlights.find((h) => h.kind === kind) ?? null;

  const fetchBadges = useServerFn(getManagerBadges);
  const { data: badgeRows = [] } = useQuery({
    queryKey: ["badges", activeLeague?.id, slate?.seasonType],
    enabled: !!activeLeague && !!slate,
    queryFn: () =>
      fetchBadges({ data: { leagueId: activeLeague!.id, seasonType: slate!.seasonType } }),
  });

  const weekBadges = useMemo(() => {
    const map = new Map<string, { badge: string; week: number | null }[]>();
    for (const b of badgeRows) {
      if (b.week !== null && b.week !== slate?.week) continue;
      const list = map.get(b.user_id) ?? [];
      list.push({ badge: b.badge, week: b.week });
      map.set(b.user_id, list);
    }
    return [...map.entries()].map(([userId, rows]) => ({ userId, rows }));
  }, [badgeRows, slate?.week]);


  function share() {
    if (!data || !winner || !slate) return;
    const lines = [
      `${slateLabel(slate)} — ${activeLeague?.name ?? "Gridiron Confidence"}`,
      `🏆 ${winner.team_name} wins with ${winner.points} pts${
        winner.decided_by && winner.decided_by !== "points"
          ? ` (${DECIDED_BY[winner.decided_by] ?? ""})`
          : ""
      }`,
      "",
      ...data.rows.slice(0, 10).map((r) => `${r.place}. ${r.team_name} — ${r.points} pts`),
    ];
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Recap copied");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="stadium-heading text-3xl">Weekly Recap</h1>
        <p className="text-sm text-muted-foreground">
          {slate ? slateLabel(slate) : "Select a week"} ·{" "}
          {activeLeague?.name ?? "your league"} · official results
        </p>
      </header>

      <SlatePicker slates={slates} value={slate} onChange={setPicked} />

      {isLoading ? (
        <p className="field-panel rounded-2xl p-6 text-sm text-muted-foreground">Loading recap…</p>
      ) : !data?.ready ? (
        <div className="field-panel rounded-2xl p-6">
          <p className="font-semibold">This week isn't final yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The recap unlocks once every game in {slate ? slateLabel(slate) : "the week"} has
            finished. Until then, follow the live scores on the{" "}
            <Link to="/picks" className="text-primary underline">
              Picks
            </Link>{" "}
            page.
          </p>
        </div>
      ) : (
        <>
          {winner && (
            <section className="field-panel rounded-2xl p-5">
              <div className="flex items-start gap-4">
                <Mascot mascot={winner.mascot} color={winner.primary_color} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
                    <Crown size={14} /> Winner of the week
                  </p>
                  <h2 className="stadium-heading mt-1 truncate text-2xl">{winner.team_name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {winner.points} points · {winner.correct_count} correct picks
                    {runnerUp && winner.points > runnerUp.points
                      ? ` · won by ${winner.points - runnerUp.points}`
                      : ""}
                  </p>
                  {winner.decided_by && winner.decided_by !== "points" && (
                    <p className="mt-2 rounded-lg bg-secondary px-3 py-2 text-xs">
                      Tied on points — decided {DECIDED_BY[winner.decided_by]}
                      {winner.decided_by === "tiebreaker" && data.finalGame
                        ? `: predicted ${winner.predicted_total ?? "—"}, actual ${data.finalGame.total} in ${data.finalGame.matchup}`
                        : ""}
                      .
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={share} className="gap-1">
                  <Share2 size={14} /> Share
                </Button>
              </div>
            </section>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { kind: "hit", label: "Biggest hit", icon: Flame },
              { kind: "miss", label: "Biggest miss", icon: TrendingDown },
              { kind: "upset", label: "Upset of the week", icon: Target },
            ].map(({ kind, label, icon: Icon }) => {
              const h = highlight(kind);
              return (
                <div key={kind} className="field-panel rounded-2xl p-4">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    <Icon size={14} className="text-primary" /> {label}
                  </p>
                  {h ? (
                    <>
                      <p className="mt-2 font-semibold">
                        {kind === "upset" ? h.matchup : (h.picked_team ?? "—")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {kind === "upset"
                          ? `${h.points} confidence points burned league-wide`
                          : `${h.team_name} · ${h.points} points ${kind === "hit" ? "won" : "lost"} · ${h.matchup}`}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">Nothing to report.</p>
                  )}
                </div>
              );
            })}
          </div>

          <section className="field-panel overflow-hidden rounded-2xl">
            <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">
              Final standings for the week
            </h2>
            <ul className="divide-y divide-border">
              {data.rows.map((row) => (
                <li key={row.user_id} className="flex items-center gap-3 px-4 py-3">
                  <span className="stadium-heading w-6 text-lg text-muted-foreground">
                    {row.place}
                  </span>
                  <Mascot mascot={row.mascot} color={row.primary_color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/manager/$userId"
                      params={{ userId: row.user_id }}
                      className="block truncate font-semibold hover:text-primary"
                    >
                      {row.team_name}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.correct_count} correct
                      {row.tiebreak_diff !== null ? ` · tiebreak off by ${row.tiebreak_diff}` : ""}
                    </p>
                  </div>
                  <span className="stadium-heading text-lg text-primary">{row.points}</span>
                </li>
              ))}
            </ul>
          </section>

          {weekBadges.length > 0 && (
            <section className="field-panel rounded-2xl p-5">
              <h2 className="stadium-heading mb-3 text-lg">Awards this week</h2>
              <ul className="space-y-2 text-sm">
                {weekBadges.map((entry) => (
                  <li key={entry.userId} className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">
                      {data.rows.find((r) => r.user_id === entry.userId)?.team_name ?? "Manager"}
                    </span>
                    <BadgeRow rows={entry.rows} size="md" />
                  </li>
                ))}
              </ul>
            </section>
          )}


          {data.casualties.length > 0 && (
            <section className="field-panel rounded-2xl p-5">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-destructive">
                <Skull size={14} /> Survivor casualties
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                {data.casualties.map((c) => (
                  <li key={c.user_id} className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{c.team_name}</span>
                    {c.team ? ` — knocked out with ${c.team}` : " — eliminated"}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
