/** ESPN team abbreviations keyed by full team name, for logo lookups. */
const ABBR: Record<string, string> = {
  "Arizona Cardinals": "ari",
  "Atlanta Falcons": "atl",
  "Baltimore Ravens": "bal",
  "Buffalo Bills": "buf",
  "Carolina Panthers": "car",
  "Chicago Bears": "chi",
  "Cincinnati Bengals": "cin",
  "Cleveland Browns": "cle",
  "Dallas Cowboys": "dal",
  "Denver Broncos": "den",
  "Detroit Lions": "det",
  "Green Bay Packers": "gb",
  "Houston Texans": "hou",
  "Indianapolis Colts": "ind",
  "Jacksonville Jaguars": "jax",
  "Kansas City Chiefs": "kc",
  "Las Vegas Raiders": "lv",
  "Los Angeles Chargers": "lac",
  "Los Angeles Rams": "lar",
  "Miami Dolphins": "mia",
  "Minnesota Vikings": "min",
  "New England Patriots": "ne",
  "New Orleans Saints": "no",
  "New York Giants": "nyg",
  "New York Jets": "nyj",
  "Philadelphia Eagles": "phi",
  "Pittsburgh Steelers": "pit",
  "San Francisco 49ers": "sf",
  "Seattle Seahawks": "sea",
  "Tampa Bay Buccaneers": "tb",
  "Tennessee Titans": "ten",
  "Washington Commanders": "wsh",
};

export function teamAbbr(name: string): string | null {
  return ABBR[name] ?? null;
}

export function teamLogo(name: string): string | null {
  const abbr = teamAbbr(name);
  return abbr ? `https://a.espncdn.com/i/teamlogos/nfl/500/${abbr}.png` : null;
}

export const NFL_BADGES = Object.entries(ABBR).map(([name, abbr]) => ({
  name,
  abbr,
  short: name.split(" ").slice(-1)[0]!,
}));

/**
 * Franchise identity colors, lifted where needed so they stay legible on the
 * stadium-navy background. Used for the "your pick" highlight.
 */
const TEAM_HEX: Record<string, string> = {
  ari: "#C8355A",
  atl: "#E8384F",
  bal: "#7B5CC4",
  buf: "#3A7BE0",
  car: "#3FB6E8",
  chi: "#F06A2A",
  cin: "#FB6A24",
  cle: "#F27A2E",
  dal: "#5C8FD6",
  den: "#FB6A24",
  det: "#4FA9DB",
  gb: "#F5C24C",
  hou: "#D4453F",
  ind: "#4A9BE8",
  jax: "#22B3B0",
  kc: "#E8404A",
  lv: "#C6CDD6",
  lac: "#3EC8F0",
  lar: "#F0C04A",
  mia: "#22C7C0",
  min: "#9A6DD7",
  ne: "#5A87C7",
  no: "#D3BC8D",
  nyg: "#4F86E0",
  nyj: "#2FBE7A",
  phi: "#2FA898",
  pit: "#F5CE45",
  sf: "#D4453F",
  sea: "#4FD97A",
  tb: "#E8503F",
  ten: "#4FB0EA",
  wsh: "#D89A4A",
};

/** Team's identity color, or the silver fallback for unknown names. */
export function teamColor(name: string): string {
  const abbr = teamAbbr(name);
  return (abbr && TEAM_HEX[abbr]) || "#C0C7D0";
}
