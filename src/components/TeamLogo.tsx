import { teamLogo } from "@/lib/teams";
import { teamShort } from "@/lib/league";

export function TeamLogo({ team, size = 28 }: { team: string; size?: number }) {
  const src = teamLogo(team);
  if (!src) {
    return (
      <span
        className="flex items-center justify-center rounded-full bg-muted text-[10px] font-bold"
        style={{ width: size, height: size }}
      >
        {teamShort(team).slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={`${team} logo`}
      width={size}
      height={size}
      loading="lazy"
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  );
}
