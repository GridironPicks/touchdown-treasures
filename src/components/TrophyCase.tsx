import { Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";

import { Mascot } from "@/components/Mascot";
import { BadgeChip, collapseBadges, type BadgeSource } from "@/components/BadgeRow";
import type { SeasonType } from "@/lib/league";

export type CabinetManager = {
  user_id: string;
  display_name: string;
  team_name: string;
  mascot: string;
  primary_color: string;
  weekWins: number[];
  badges: BadgeSource[];
  seasonPoints: number;
};

/** A single gold weekly-win trophy with the week engraved on its plaque. */
function WeekTrophy({ week }: { week: number }) {
  return (
    <span
      title={`Week ${week} winner`}
      aria-label={`Week ${week} winner`}
      className="group inline-flex w-14 flex-col items-center gap-1"
    >
      <span className="trophy-badge inline-flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-200 group-hover:-translate-y-0.5">
        <Trophy size={22} strokeWidth={2.2} />
      </span>
      <span className="trophy-plaque rounded px-1.5 py-0.5 text-[9px] font-bold uppercase">
        WK {week}
      </span>
    </span>
  );
}

function Shelf({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="trophy-shelf px-3 pb-3 pt-2">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <div className="relative flex flex-wrap items-end gap-2">{children}</div>
      <span className="shelf-glass pointer-events-none absolute inset-0" aria-hidden />
    </div>
  );
}

export function ManagerCabinet({
  manager,
  seasonType,
  isLeader,
}: {
  manager: CabinetManager;
  seasonType: SeasonType;
  isLeader: boolean;
}) {
  const badges = collapseBadges(manager.badges);
  const hardware = manager.weekWins.length + badges.length;

  return (
    <article className="trophy-cabinet overflow-hidden">
      <header className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
        <Mascot mascot={manager.mascot} color={manager.primary_color} />
        <div className="min-w-0 flex-1">
          <Link
            to="/manager/$userId"
            params={{ userId: manager.user_id }}
            search={{ type: seasonType, week: manager.weekWins[0] ?? 1 }}
            className="stadium-heading block truncate text-base hover:text-primary"
          >
            {manager.team_name}
          </Link>
          <p className="truncate text-xs text-muted-foreground">{manager.display_name}</p>
        </div>
        {isLeader ? (
          <span className="trophy-plaque shrink-0 rounded-full px-2 py-1 text-[9px] font-bold uppercase">
            Leader
          </span>
        ) : null}
        <span className="shrink-0 text-right">
          <span className="stadium-heading block text-lg text-primary">{hardware}</span>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Pieces</span>
        </span>
      </header>

      {hardware === 0 ? (
        <div className="trophy-shelf m-3 px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">No hardware yet — the case is waiting.</p>
        </div>
      ) : (
        <div className="space-y-3 p-3">
          {manager.weekWins.length > 0 ? (
            <Shelf label={`Weekly trophies · ${manager.weekWins.length}`}>
              {manager.weekWins.map((w) => (
                <WeekTrophy key={w} week={w} />
              ))}
            </Shelf>
          ) : null}
          {badges.length > 0 ? (
            <Shelf label={`Medals · ${badges.length}`}>
              {badges.map((b) => (
                <BadgeChip key={b.badge} {...b} size="md" />
              ))}
            </Shelf>
          ) : null}
        </div>
      )}
    </article>
  );
}
