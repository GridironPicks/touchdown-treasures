import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { SEASON } from "@/lib/league";

const schema = z.object({
  seasonType: z.enum(["pre", "reg", "post"]),
  week: z.number().int().min(1).max(22),
});

/**
 * Pulls the freshest ESPN scores for one slate into the database.
 * Public on purpose (read-only provider data), throttled per slate so a page
 * refresh can never hammer the provider.
 */
export const refreshSlateScores = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    const { syncWeek } = await import("@/lib/nfl.server");
    const { shouldSync } = await import("@/lib/scores.server");
    if (!shouldSync(`${data.seasonType}-${data.week}`)) return { skipped: true as const };
    try {
      await syncWeek(SEASON, data.week, data.seasonType);
      return { skipped: false as const, error: false as const };
    } catch (error) {
      console.error("[refreshSlateScores]", error);
      return { skipped: false as const, error: true as const };
    }

  });
