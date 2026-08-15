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

export type EarnedBadge = { badge: string; count: number; weeks: number[] };

/** Collapses raw badge rows into one chip per badge type with an earned count. */
export function collapseBadges(
  rows: { badge: string; week: number | null }[],
): EarnedBadge[] {
  const map = new Map<string, EarnedBadge>();
  for (const r of rows) {
    const entry = map.get(r.badge) ?? { badge: r.badge, count: 0, weeks: [] };
    entry.count += 1;
    if (r.week !== null) entry.weeks.push(r.week);
    map.set(r.badge, entry);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export function BadgeChip({ badge, count, weeks, size = "sm" }: EarnedBadge & { size?: "sm" | "md" }) {
  const meta = badgeMeta(badge);
  const Icon = ICONS[meta.icon] ?? Award;
  const title = `${meta.label} — ${meta.how}${weeks.length ? ` (weeks ${weeks.join(", ")})` : ""}`;
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 font-bold uppercase tracking-wide text-primary ${
        size === "md" ? "px-2.5 py-1 text-[11px]" : "px-1.5 py-0.5 text-[10px]"
      }`}
    >
      <Icon size={size === "md" ? 13 : 11} />
      {size === "md" ? meta.label : null}
      {count > 1 ? <span className="opacity-80">×{count}</span> : null}
    </span>
  );
}

export function BadgeRow({
  rows,
  size = "sm",
  limit,
}: {
  rows: { badge: string; week: number | null }[];
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
