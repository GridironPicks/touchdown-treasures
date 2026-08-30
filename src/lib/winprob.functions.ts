import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { SEASON } from "@/lib/league";

const schema = z.object({
  seasonType: z.enum(["pre", "reg", "post"]),
  week: z.number().int().min(1).max(22),
});

/** Live win probability per game for one slate (read-only provider data). */
export const getWinProbabilities = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    const { fetchWinProbabilities } = await import("@/lib/winprob.server");
    try {
      return await fetchWinProbabilities(SEASON, data.week, data.seasonType);
    } catch (error) {
      console.error("[getWinProbabilities]", error);
      return [];
    }
  });
