export const SEASON = 2026;
export const ENTRY_FEE_CENTS = 500;

export type SeasonType = "pre" | "reg" | "post";

/** Playoff rounds, keyed by the postseason "week" number. */
export const PLAYOFF_ROUNDS: Record<number, { label: string; short: string; points: number }> = {
  1: { label: "Wild Card", short: "WC", points: 2 },
  2: { label: "Divisional", short: "DIV", points: 4 },
  3: { label: "Conference Championships", short: "CONF", points: 8 },
  4: { label: "Super Bowl", short: "SB", points: 16 },
};

export type Game = {
  id: string;
  season: number;
  season_type: SeasonType;
  week: number;
  kickoff: string;
  away_team: string;
  home_team: string;
  away_score: number | null;
  home_score: number | null;
  status: string;
  is_tiebreaker_game: boolean;
  external_id?: string | null;
};

export function seasonTypeLabel(type: SeasonType): string {
  if (type === "pre") return "Preseason";
  if (type === "post") return "Playoffs";
  return "Week";
}


export const MASCOTS = [
  { id: "eagle", label: "Eagle" },
  { id: "bull", label: "Bull" },
  { id: "shark", label: "Shark" },
  { id: "wolf", label: "Wolf" },
  { id: "bear", label: "Bear" },
  { id: "falcon", label: "Falcon" },
  { id: "ram", label: "Ram" },
  { id: "cobra", label: "Cobra" },
  { id: "stallion", label: "Stallion" },
  { id: "titan", label: "Titan" },
  { id: "hornet", label: "Hornet" },
  { id: "bolt", label: "Bolt" },
  { id: "lion", label: "Lion" },
  { id: "raven", label: "Raven" },
  { id: "panther", label: "Panther" },
  { id: "rhino", label: "Rhino" },
  { id: "bison", label: "Bison" },
  { id: "viper", label: "Viper" },
  { id: "knight", label: "Knight" },
  { id: "outlaw", label: "Outlaw" },
] as const;

/** Premium 3D crests — optional, nobody's badge changes unless they pick one. */
export const SIGNATURE_CRESTS = [
  { id: "crest-cartel-cowboyz", label: "Cartel Cowboyz" },
  { id: "crest-dustin-off-my-trophy", label: "Dustin Off My Trophy" },
  { id: "crest-heavy-hitters", label: "Heavy Hitters" },
  { id: "crest-mama-bear", label: "Mama Bear" },
  { id: "crest-junkyard-dogs", label: "Junkyard Dogs" },
  { id: "crest-trey-tors", label: "The Trey-tors" },
] as const;

export const TEAM_COLORS = [
  "#00E676",
  "#4FC3F7",
  "#FFD54F",
  "#FF7043",
  "#BA68C8",
  "#EF5350",
  "#26A69A",
  "#C0C7D0",
];

/** League timezone — everything the app shows or locks on is Central (Dallas). */
export const LEAGUE_TZ = "America/Chicago";

function ctOffsetMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: LEAGUE_TZ,
    timeZoneName: "shortOffset",
  }).formatToParts(date);
  const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT-6";
  const match = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(name);
  if (!match) return -360;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0));
}

function etCalendar(date: Date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: LEAGUE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    parts["weekday"] as string,
  );
  return {
    year: Number(parts["year"]),
    month: Number(parts["month"]),
    day: Number(parts["day"]),
    weekdayIndex,
  };
}

/** Monday 12:00 AM CT of the week containing the earliest kickoff. */
function weekMondayCt(earliest: Date): { y: number; m: number; d: number } {
  const cal = etCalendar(earliest);
  const daysSinceMonday = (cal.weekdayIndex + 6) % 7;
  const monday = new Date(
    Date.UTC(cal.year, cal.month - 1, cal.day, 12) - daysSinceMonday * 86400000,
  );
  const mCal = etCalendar(monday);
  return { y: mCal.year, m: mCal.month - 1, d: mCal.day };
}

function ctWallClock(y: number, m: number, d: number, hour: number): Date {
  const approx = new Date(Date.UTC(y, m, d, hour + 6));
  const offset = ctOffsetMinutes(approx);
  return new Date(Date.UTC(y, m, d, hour) - offset * 60000);
}

/**
 * Wednesday 6:00 PM CT of the week containing the earliest kickoff — or 30
 * minutes before the first kickoff on short weeks (Thanksgiving), whichever
 * comes first. Mirrors the database lock rule exactly.
 */
export function weekDeadline(games: Game[]): Date | null {
  if (games.length === 0) return null;
  const earliestMs = Math.min(...games.map((g) => new Date(g.kickoff).getTime()));
  const { y, m, d } = weekMondayCt(new Date(earliestMs));
  const wednesday = ctWallClock(y, m, d + 2, 18);
  return new Date(Math.min(wednesday.getTime(), earliestMs - 30 * 60000));
}

/**
 * Picks open Monday 12:00 AM CT of game week (pulled earlier if a short week
 * moves the lock up, so the window is never under 42 hours).
 */
export function weekOpensAt(games: Game[]): Date | null {
  if (games.length === 0) return null;
  const deadline = weekDeadline(games);
  if (!deadline) return null;
  const earliestMs = Math.min(...games.map((g) => new Date(g.kickoff).getTime()));
  const { y, m, d } = weekMondayCt(new Date(earliestMs));
  const monday = ctWallClock(y, m, d, 0);
  return new Date(Math.min(monday.getTime(), deadline.getTime() - 42 * 3600000));
}



export function formatCountdown(ms: number): string {
  if (ms <= 0) return "LOCKED";
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** Kickoff in Central Time, e.g. "Sat, Aug 15 · 7:00 PM CDT". */
export function kickoffLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  })
    .format(new Date(iso))
    .replace(/,\s(?=\d)/, " · ");
}

/** The game whose combined score settles ties: the last kickoff of the week. */
export function tiebreakerGameOf(games: Game[]): Game | undefined {
  if (games.length === 0) return undefined;
  return [...games].sort(
    (a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime(),
  )[games.length - 1];
}

export function isMondayNight(iso: string): boolean {
  return etCalendar(new Date(iso)).weekdayIndex === 1;
}

export function teamShort(name: string): string {
  const parts = name.split(" ");
  return parts[parts.length - 1] ?? name;
}
