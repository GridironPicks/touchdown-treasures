import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SEASON, weekDeadline, weekOpensAt, type Game, type SeasonType } from "@/lib/league";
import { sendToUsers } from "@/lib/push.server";

type Slate = { seasonType: SeasonType; week: number; games: Game[] };

function groupSlates(games: Game[]): Slate[] {
  const out: Slate[] = [];
  for (const g of games) {
    let slate = out.find((s) => s.seasonType === g.season_type && s.week === g.week);
    if (!slate) {
      slate = { seasonType: g.season_type, week: g.week, games: [] };
      out.push(slate);
    }
    slate.games.push(g);
  }
  return out;
}

async function leagueMembers(): Promise<Map<string, { name: string; users: string[] }>> {
  const [{ data: leagues }, { data: memberships }] = await Promise.all([
    supabaseAdmin.from("leagues").select("id, name"),
    supabaseAdmin.from("league_memberships").select("league_id, user_id"),
  ]);
  const map = new Map<string, { name: string; users: string[] }>();
  for (const l of leagues ?? []) map.set(l.id, { name: l.name, users: [] });
  for (const m of memberships ?? []) map.get(m.league_id)?.users.push(m.user_id);
  return map;
}

/** Deadline nudges for the live regular-season slate. */
async function deadlineAlerts(slates: Slate[], now: number) {
  let sent = 0;
  const leagues = await leagueMembers();

  for (const slate of slates) {
    if (slate.seasonType !== "reg") continue;
    const deadline = weekDeadline(slate.games)?.getTime();
    const opensAt = weekOpensAt(slate.games)?.getTime();
    if (!deadline || !opensAt) continue;
    if (now < opensAt || now > deadline) continue;

    const hoursLeft = (deadline - now) / 3600000;
    let stage: "open" | "24h" | "2h" | null = null;
    if (hoursLeft <= 2) stage = "2h";
    else if (hoursLeft <= 24) stage = "24h";
    else stage = "open";

    const { data: picks } = await supabaseAdmin
      .from("picks")
      .select("user_id, league_id")
      .eq("season", SEASON)
      .eq("season_type", "reg")
      .eq("week", slate.week);

    const submitted = new Set((picks ?? []).map((p) => `${p.league_id}:${p.user_id}`));

    for (const [leagueId, league] of leagues) {
      const pending = league.users.filter((u) => !submitted.has(`${leagueId}:${u}`));
      if (pending.length === 0) continue;

      const body =
        stage === "open"
          ? `Week ${slate.week} picks are open in ${league.name}. Lock is Wednesday 6:00 PM ET.`
          : stage === "24h"
            ? `24 hours left to submit Week ${slate.week} picks in ${league.name}.`
            : `Final call — Week ${slate.week} picks in ${league.name} lock in under 2 hours.`;

      sent += await sendToUsers(
        pending,
        "deadlines",
        { title: "Gridiron Confidence", body, url: "/picks", tag: `deadline-${slate.week}` },
        `deadline-${stage}-${leagueId}-reg-${slate.week}`,
      );
    }
  }
  return sent;
}

/** Weekly winner + your finish, once every game in a slate is final. */
async function resultAlerts(slates: Slate[]) {
  let sent = 0;
  const leagues = await leagueMembers();

  for (const slate of slates) {
    if (!slate.games.every((g) => g.status === "final")) continue;
    // Only report on weeks that wrapped within the last 5 days.
    const last = Math.max(...slate.games.map((g) => new Date(g.kickoff).getTime()));
    if (Date.now() - last > 5 * 86400000) continue;

    const weekLabel =
      slate.seasonType === "pre" ? `Preseason Week ${slate.week}` : `Week ${slate.week}`;

    for (const [leagueId, league] of leagues) {
      // Same tiebroken order the recap and standings use.
      const { data: rows } = await supabaseAdmin.rpc("week_recap", {
        _season: SEASON,
        _season_type: slate.seasonType,
        _week: slate.week,
        _league_id: leagueId,
      });
      if (!rows || rows.length === 0) continue;

      const winner = rows[0]!;
      const winnerName = winner.team_name ?? "A rival";
      const tiebroken = winner.decided_by && winner.decided_by !== "points";

      for (const row of rows) {
        const isWinner = row.place === 1;
        const body = isWinner
          ? `You won ${weekLabel} in ${league.name} with ${winner.points} points${tiebroken ? " on the tiebreaker" : ""}.`
          : `${winnerName} won ${weekLabel} in ${league.name}. You finished #${row.place} with ${row.points} points.`;
        sent += await sendToUsers(
          [row.user_id as string],
          "results",
          {
            title: `${weekLabel} results`,
            body,
            url: `/recap?st=${slate.seasonType}&wk=${slate.week}`,
            tag: `results-${slate.week}`,
          },
          `results-${leagueId}-${slate.seasonType}-${slate.week}`,
        );
      }
    }
  }
  return sent;
}

/** Survived / eliminated once the survivor week is final. */
async function survivorAlerts(slates: Slate[]) {
  let sent = 0;
  for (const slate of slates) {
    if (slate.seasonType !== "reg") continue;
    if (!slate.games.every((g) => g.status === "final")) continue;
    const last = Math.max(...slate.games.map((g) => new Date(g.kickoff).getTime()));
    if (Date.now() - last > 5 * 86400000) continue;

    const { data: picks } = await supabaseAdmin
      .from("survivor_picks")
      .select("user_id, league_id, team")
      .eq("season", SEASON)
      .eq("week", slate.week);
    if (!picks || picks.length === 0) continue;

    for (const pick of picks) {
      const game = slate.games.find(
        (g) => g.home_team === pick.team || g.away_team === pick.team,
      );
      if (!game || game.home_score === null || game.away_score === null) continue;
      const isHome = game.home_team === pick.team;
      const mine = isHome ? game.home_score : game.away_score;
      const theirs = isHome ? game.away_score : game.home_score;
      const survived = mine > theirs;

      sent += await sendToUsers(
        [pick.user_id],
        "survivor",
        {
          title: survived ? "You survived" : "Eliminated",
          body: survived
            ? `${pick.team} came through in Week ${slate.week}. Pick again next week.`
            : `${pick.team} lost in Week ${slate.week}. Your survivor run is over.`,
          url: "/survivor",
          tag: `survivor-${slate.week}`,
        },
        `survivor-${pick.league_id}-${slate.week}`,
      );
    }
  }
  return sent;
}

export async function runNotificationSweep() {
  const { data, error } = await supabaseAdmin
    .from("games")
    .select("*")
    .eq("season", SEASON)
    .order("kickoff");
  if (error) throw error;

  const slates = groupSlates((data ?? []) as Game[]);
  const now = Date.now();

  const [deadlines, results, survivor] = [
    await deadlineAlerts(slates, now),
    await resultAlerts(slates),
    await survivorAlerts(slates),
  ];

  return { deadlines, results, survivor };
}
