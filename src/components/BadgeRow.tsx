import {
  Award,
  Crown,
  Flame,
  Shield,
  Snowflake,
  Star,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { badgeMeta } from "@/lib/badges";

const ICONS: Record<string, typeof Award> = {
  star: Star,
  crown: Crown,
  target: Target,
  zap: Zap,
  snowflake: Snowflake,
  "trending-up": TrendingUp,
  shield: Shield,
  flame: Flame,
  award: Award,
};

export function badgeIcon(icon: string) {
  return ICONS[icon] ?? Award;
}

export type BadgeSource = { badge: string; week: number | null; detail?: string | null };
export type EarnedBadge = {
  badge: string;
  count: number;
  entries: { week: number | null; detail: string | null }[];
};

/** Collapses raw badge rows into one chip per badge type with an earned count. */
export function collapseBadges(rows: BadgeSource[]): EarnedBadge[] {
  const map = new Map<string, EarnedBadge>();
  for (const r of rows) {
    const entry = map.get(r.badge) ?? { badge: r.badge, count: 0, entries: [] };
    entry.count += 1;
    entry.entries.push({ week: r.week, detail: r.detail ?? null });
    map.set(r.badge, entry);
  }
  for (const entry of map.values()) {
    entry.entries.sort((a, b) => (a.week ?? 99) - (b.week ?? 99));
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export function BadgeChip({ badge, count, entries, size = "sm" }: EarnedBadge & { size?: "sm" | "md" }) {
  const meta = badgeMeta(badge);
  const Icon = ICONS[meta.icon] ?? Award;
  const weeks = entries.map((e) => e.week).filter((w): w is number => w !== null);
  const title = `${meta.label} — ${meta.how}${weeks.length ? ` (weeks ${weeks.join(", ")})` : ""}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={title}
          aria-label={title}
          className={`inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 font-bold uppercase tracking-wide text-primary transition-colors hover:bg-primary/20 ${
            size === "md" ? "px-2.5 py-1 text-[11px]" : "px-1.5 py-0.5 text-[10px]"
          }`}
        >
          <Icon size={size === "md" ? 13 : 11} />
          {size === "md" ? meta.label : null}
          {count > 1 ? <span className="opacity-80">×{count}</span> : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-4">
        <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary">
          <Icon size={15} /> {meta.label}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{meta.how}</p>
        <ul className="mt-3 space-y-1.5 border-t border-border pt-3 text-xs">
          {entries.map((e, i) => (
            <li key={`${e.week ?? "season"}-${i}`} className="text-foreground">
              {e.detail ?? (e.week !== null ? `Week ${e.week}` : "Earned this season")}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function BadgeRow({
  rows,
  size = "sm",
  limit,
}: {
  rows: BadgeSource[];
  size?: "sm" | "md";
  limit?: number;
}) {
  const badges = collapseBadges(rows);
  if (badges.length === 0) return null;
  const shown = limit ? badges.slice(0, limit) : badges;
  return (
    <span className="flex flex-wrap items-center gap-1">
      {shown.map((b) => (
        <BadgeChip key={b.badge} {...b} size={size} />
      ))}
      {limit && badges.length > limit ? (
        <span className="text-[10px] font-semibold text-muted-foreground">
          +{badges.length - limit}
        </span>
      ) : null}
    </span>
  );
}
