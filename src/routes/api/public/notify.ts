import { createFileRoute } from "@tanstack/react-router";

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

  try {
    const { runNotificationSweep } = await import("@/lib/notify.server");
    return Response.json(await runNotificationSweep());
  } catch (error) {
    console.error("[notify]", error);
    return Response.json(
      { error: "Sweep failed", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export const Route = createFileRoute("/api/public/notify")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
