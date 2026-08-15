import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { SEASON } from "@/lib/league";

const paramsSchema = z.object({
  season: z.coerce.number().int().min(2000).max(2100).default(SEASON),
  season_type: z.enum(["pre", "reg"]).optional(),
  week: z.coerce.number().int().min(1).max(22).optional(),
});


function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function handle(request: Request) {
  const secret = process.env["NFL_SYNC_SECRET"];
  const provided =
    request.headers.get("x-sync-secret") ??
    (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");

  if (!secret || !provided || !timingSafeEqual(provided, secret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = paramsSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return Response.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const { syncWeek, resolveCurrentSlate, nextSlate } = await import("@/lib/nfl.server");
  const season = parsed.data.season;

  try {
    if (parsed.data.week) {
      return Response.json(
        await syncWeek(season, parsed.data.week, parsed.data.season_type ?? "reg"),
      );
    }
    // Default run: refresh the live slate plus the following week's schedule.
    const current = await resolveCurrentSlate(season);
    const upcoming = nextSlate(current);
    const results = [await syncWeek(season, current.week, current.seasonType)];
    if (upcoming.seasonType !== current.seasonType || upcoming.week !== current.week) {
      results.push(await syncWeek(season, upcoming.week, upcoming.seasonType));
    }
    return Response.json({ season, current, results });

  } catch (error) {
    console.error("[nfl-sync]", error);
    return Response.json(
      { error: "Sync failed", detail: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
  }
}

export const Route = createFileRoute("/api/public/nfl-sync")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
