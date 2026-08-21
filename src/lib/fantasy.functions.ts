import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { SEASON } from "@/lib/league";

const schema = z.object({
  seasonType: z.enum(["pre", "reg"]),
  week: z.number().int().min(1).max(22),
});

/**
 * Makes sure the week's draft pool exists and refreshes live fantasy scoring.
 * Throttled per slate so page refreshes can't hammer the provider.
 */
export const refreshFantasySlate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    const { syncFantasyPool, syncFantasyStats, shouldRun, POOL_THROTTLE_MS } = await import(
      "@/lib/fantasy.server"
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key = `${data.seasonType}-${data.week}`;

    let pool = 0;
    try {
      const { count } = await supabaseAdmin
        .from("fantasy_players")
        .select("id", { count: "exact", head: true })
        .eq("season", SEASON)
        .eq("season_type", data.seasonType)
        .eq("week", data.week);

      if ((count ?? 0) === 0 || shouldRun(`pool-${key}`, POOL_THROTTLE_MS)) {
        pool = (await syncFantasyPool(SEASON, data.seasonType, data.week)).players;
      }
    } catch (error) {
      console.error("[refreshFantasySlate pool]", error);
    }

    let stats = 0;
    try {
      if (shouldRun(`stats-${key}`)) {
        stats = (await syncFantasyStats(SEASON, data.seasonType, data.week)).players;
      }
    } catch (error) {
      console.error("[refreshFantasySlate stats]", error);
    }

    return { pool, stats };
  });
