import { teamLogo } from "@/lib/teams";

type MascotAsset = { url: string };
type MascotAssetModule = { default: MascotAsset };

const mascotModules = import.meta.glob<MascotAssetModule>(
  "../assets/mascots/*.png.asset.json",
  { eager: true },
);

export const MASCOT_ART: Record<string, string> = Object.fromEntries(
  Object.entries(mascotModules).map(([path, module]) => {
    const id = path.split("/").pop()?.replace(".png.asset.json", "") ?? "";
    const storedId = [
      "cartel-cowboyz",
      "dustin-off-my-trophy",
      "heavy-hitters",
      "mama-bear",
      "junkyard-dogs",
      "trey-tors",
    ].includes(id)
      ? `crest-${id}`
      : id;
    return [storedId, module.default.url];
  }),
);

/** Resolves a stored mascot id to artwork. `nfl:dal` maps to the franchise logo. */
export function mascotSrc(mascot: string): string | null {
  if (mascot?.startsWith("nfl:")) {
    const abbr = mascot.slice(4);
    return `https://a.espncdn.com/i/teamlogos/nfl/500/${abbr}.png`;
  }
  return MASCOT_ART[mascot] ?? MASCOT_ART["eagle"] ?? null;
}

export { teamLogo };

export function Mascot({
  mascot,
  color,
  size = "md",
}: {
  mascot: string;
  color?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const src = mascotSrc(mascot);
  const box = size === "lg" ? "h-16 w-16" : size === "sm" ? "h-9 w-9" : "h-12 w-12";
  const pad = size === "lg" ? "p-1.5" : "p-1";
  return (
    <span
      className={`${box} ${pad} inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary`}
      style={color ? { boxShadow: `inset 0 0 0 2px ${color}` } : undefined}
    >
      {src ? (
        <img
          src={src}
          alt={`${mascot} badge`}
          loading="lazy"
          width={1024}
          height={1024}
          className="h-full w-full object-contain"
        />
      ) : null}
    </span>
  );
}
