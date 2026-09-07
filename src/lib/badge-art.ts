import perfectWeek from "@/assets/badges/perfect-week.png";
import weekWin from "@/assets/badges/week-win.png";
import bullseye from "@/assets/badges/bullseye.png";
import gutsyCall from "@/assets/badges/gutsy-call.png";
import iceCold from "@/assets/badges/ice-cold.png";
import comeback from "@/assets/badges/comeback.png";
import ironManager from "@/assets/badges/iron-manager.png";
import hotStreak from "@/assets/badges/hot-streak.png";
import weeklyTrophy from "@/assets/badges/weekly-trophy.png";

/** Sculpted 3D medal artwork for each award badge. */
export const BADGE_ART: Record<string, string> = {
  perfect_week: perfectWeek,
  week_win: weekWin,
  bullseye,
  gutsy_call: gutsyCall,
  ice_cold: iceCold,
  comeback,
  iron_manager: ironManager,
  hot_streak: hotStreak,
};

/** The gold cup handed out to the winner of each week. */
export const WEEKLY_TROPHY_ART = weeklyTrophy;

export function badgeArt(key: string): string | null {
  return BADGE_ART[key] ?? null;
}
