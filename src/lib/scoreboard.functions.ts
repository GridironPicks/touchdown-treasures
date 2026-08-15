import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { SEASON } from "@/lib/league";
import type { LiveGame } from "@/lib/scoreboard.server";

const schema = z.object({
  seasonType: z.enum(["pre", "reg"]),
  week: z.number().int().min(1).max(22),
});

/** Full live scoreboard for one slate (read-only provider data). */
export const getLiveScoreboard = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }): Promise<LiveGame[]> => {
    const { fetchLiveScoreboard } = await import("@/lib/scoreboard.server");
    try {
      return await fetchLiveScoreboard(SEASON, data.week, data.seasonType);
    } catch (error) {
      console.error("[getLiveScoreboard]", error);
      return [];
    }
  });
