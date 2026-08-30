/** Conference lookup keyed by the provider's full team display name. */
export const AFC_TEAMS = [
  "Baltimore Ravens",
  "Buffalo Bills",
  "Cincinnati Bengals",
  "Cleveland Browns",
  "Denver Broncos",
  "Houston Texans",
  "Indianapolis Colts",
  "Jacksonville Jaguars",
  "Kansas City Chiefs",
  "Las Vegas Raiders",
  "Los Angeles Chargers",
  "Miami Dolphins",
  "New England Patriots",
  "New York Jets",
  "Pittsburgh Steelers",
  "Tennessee Titans",
] as const;

export const NFC_TEAMS = [
  "Arizona Cardinals",
  "Atlanta Falcons",
  "Carolina Panthers",
  "Chicago Bears",
  "Dallas Cowboys",
  "Detroit Lions",
  "Green Bay Packers",
  "Los Angeles Rams",
  "Minnesota Vikings",
  "New Orleans Saints",
  "New York Giants",
  "Philadelphia Eagles",
  "San Francisco 49ers",
  "Seattle Seahawks",
  "Tampa Bay Buccaneers",
  "Washington Commanders",
] as const;

export type Conference = "AFC" | "NFC";

const AFC = new Set<string>(AFC_TEAMS);

export function conferenceOf(team: string): Conference {
  return AFC.has(team) ? "AFC" : "NFC";
}
