import { NFL_BADGES, teamColor } from "@/lib/teams";
import { TeamLogo } from "@/components/TeamLogo";

export function SurvivorTeamPool({
  usedTeams,
  currentPick,
}: {
  /** team full name -> week it was used */
  usedTeams: Record<string, number>;
  currentPick: string | null;
}) {
  const remaining = NFL_BADGES.filter((t) => !(t.name in usedTeams)).length;

  return (
    <section className="field-panel rounded-2xl border border-border p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="stadium-heading text-lg">Your team pool</h2>
        <p className="text-sm text-muted-foreground">
          {remaining} team{remaining === 1 ? "" : "s"} left
        </p>
      </div>
      <ul className="grid grid-cols-6 gap-2 sm:grid-cols-8">
        {NFL_BADGES.map((t) => {
          const week = usedTeams[t.name];
          const used = week !== undefined;
          const isCurrent = currentPick === t.name;
          return (
            <li
              key={t.abbr}
              title={used ? `${t.name} — used week ${week}` : t.name}
              style={isCurrent ? ({ "--pick-color": teamColor(t.name) } as React.CSSProperties) : undefined}
              className={`relative flex flex-col items-center justify-center rounded-lg border p-1.5 transition-transform ${
                isCurrent
                  ? "border-[color:var(--pick-color)] ring-1 ring-[color:var(--pick-color)]"
                  : used
                    ? "border-border/40"
                    : "border-border/60 hover:-translate-y-0.5 hover:border-primary/50"
              }`}
            >
              <span className={used ? "opacity-30 grayscale" : ""}>
                <TeamLogo team={t.name} size={34} />
              </span>
              {used && (
                <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                  W{week}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
