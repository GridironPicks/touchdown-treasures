import type { LiveGame } from "@/lib/scoreboard.server";

function clockLabel(game: LiveGame): string {
  const detail = game.shortDetail || game.statusDetail;
  if (detail && /half|end of|delay/i.test(detail)) return detail;
  const quarter = game.period > 4 ? "OT" : `Q${game.period}`;
  return game.clock ? `${quarter} · ${game.clock}` : quarter;
}

/** Live clock, possession, down & distance plus a field bar with the ball spot. */
export function FieldPositionBar({ game }: { game: LiveGame }) {
  if (game.state !== "in") return null;
  const context = [
    game.possessionAbbr ? `${game.possessionAbbr} ball` : null,
    game.downDistance,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-[11px] font-semibold">
        <span className="flex items-center gap-1.5 text-destructive">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
          {clockLabel(game)}
        </span>
        {context && (
          <span
            className={`truncate ${game.isRedZone ? "text-destructive" : "text-muted-foreground"}`}
          >
            {context}
            {game.isRedZone ? " · Red zone" : ""}
          </span>
        )}
      </div>
      {game.ballPercent !== null && (
        <div className="field-strip relative h-2 overflow-hidden rounded-full">
          <span
            className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
              game.isRedZone ? "ball-dot-red" : "ball-dot"
            }`}
            style={{ left: `${game.ballPercent}%` }}
            aria-hidden
          />
        </div>
      )}
    </div>
  );
}
