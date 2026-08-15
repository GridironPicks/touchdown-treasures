export const SEASON = 2026;
export const ENTRY_FEE_CENTS = 500;

export type SeasonType = "pre" | "reg";

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
};

export function seasonTypeLabel(type: SeasonType): string {
  return type === "pre" ? "Preseason" : "Week";
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

function etOffsetMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "shortOffset",
  }).formatToParts(date);
  const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT-5";
  const match = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(name);
  if (!match) return -300;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0));
}

function etCalendar(date: Date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
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

/**
 * Wednesday 6:00 PM ET of the week containing the earliest kickoff.
 * Mirrors the database lock rule exactly.
 */
export function weekDeadline(games: Game[]): Date | null {
  if (games.length === 0) return null;
  const earliest = new Date(
    Math.min(...games.map((g) => new Date(g.kickoff).getTime())),
  );
  const cal = etCalendar(earliest);
  const daysSinceMonday = (cal.weekdayIndex + 6) % 7;
  const mondayUtcNoon = Date.UTC(cal.year, cal.month - 1, cal.day, 12) - daysSinceMonday * 86400000;
  const monday = new Date(mondayUtcNoon);
  const mCal = etCalendar(monday);
  const approx = new Date(Date.UTC(mCal.year, mCal.month - 1, mCal.day + 2, 22));
  const offset = etOffsetMinutes(approx);
  return new Date(Date.UTC(mCal.year, mCal.month - 1, mCal.day + 2, 18) - offset * 60000);
}

/**
 * Regular season picks open Tuesday 12:00 AM ET of the week — 42 hours
 * before the Wednesday 6:00 PM ET deadline. Mirrors the database rule.
 */
export function weekOpensAt(games: Game[]): Date | null {
  const deadline = weekDeadline(games);
  return deadline ? new Date(deadline.getTime() - 42 * 3600000) : null;
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

/** Kickoff in the viewer's own timezone, e.g. "Sat, Aug 15 · 5:00 PM PDT". */
export function kickoffLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
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
