/** Display metadata for the award badges produced by the `manager_badges` function. */
export type BadgeKey =
  | "perfect_week"
  | "week_win"
  | "bullseye"
  | "gutsy_call"
  | "ice_cold"
  | "comeback"
  | "iron_manager"
  | "hot_streak";

export const BADGE_META: Record<BadgeKey, { label: string; icon: string; how: string }> = {
  perfect_week: { label: "Perfect Week", icon: "star", how: "Every game in the week called correctly." },
  week_win: { label: "Week Win", icon: "crown", how: "Finished first in the league that week." },
  bullseye: { label: "Bullseye", icon: "target", how: "Tiebreaker prediction landed within 3 points." },
  gutsy_call: { label: "Gutsy Call", icon: "zap", how: "Biggest confidence points earned on a road-team win." },
  ice_cold: { label: "Ice Cold", icon: "snowflake", how: "Finished last in the league that week." },
  comeback: { label: "Comeback", icon: "trending-up", how: "Climbed 3 or more places in the season standings in one week." },
  iron_manager: { label: "Iron Manager", icon: "shield", how: "Submitted picks every single week so far." },
  hot_streak: { label: "Hot Streak", icon: "flame", how: "Won two or more weeks in a row." },
};

export function badgeMeta(key: string) {
  return BADGE_META[key as BadgeKey] ?? { label: key, icon: "award", how: "" };
}
