import { teamLogo } from "@/lib/teams";

import bear from "@/assets/mascots/bear.png.asset.json";
import bison from "@/assets/mascots/bison.png.asset.json";
import bolt from "@/assets/mascots/bolt.png.asset.json";
import bull from "@/assets/mascots/bull.png.asset.json";
import cobra from "@/assets/mascots/cobra.png.asset.json";
import eagle from "@/assets/mascots/eagle.png.asset.json";
import falcon from "@/assets/mascots/falcon.png.asset.json";
import hornet from "@/assets/mascots/hornet.png.asset.json";
import knight from "@/assets/mascots/knight.png.asset.json";
import lion from "@/assets/mascots/lion.png.asset.json";
import outlaw from "@/assets/mascots/outlaw.png.asset.json";
import panther from "@/assets/mascots/panther.png.asset.json";
import ram from "@/assets/mascots/ram.png.asset.json";
import raven from "@/assets/mascots/raven.png.asset.json";
import rhino from "@/assets/mascots/rhino.png.asset.json";
import shark from "@/assets/mascots/shark.png.asset.json";
import stallion from "@/assets/mascots/stallion.png.asset.json";
import titan from "@/assets/mascots/titan.png.asset.json";
import viper from "@/assets/mascots/viper.png.asset.json";
import wolf from "@/assets/mascots/wolf.png.asset.json";

export const MASCOT_ART: Record<string, string> = {
  eagle: eagle.url,
  bull: bull.url,
  shark: shark.url,
  wolf: wolf.url,
  bear: bear.url,
  falcon: falcon.url,
  ram: ram.url,
  cobra: cobra.url,
  stallion: stallion.url,
  titan: titan.url,
  hornet: hornet.url,
  bolt: bolt.url,
  lion: lion.url,
  raven: raven.url,
  panther: panther.url,
  rhino: rhino.url,
  bison: bison.url,
  viper: viper.url,
  knight: knight.url,
  outlaw: outlaw.url,
};

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
  const pad = size === "lg" ? "p-1.5" : size === "sm" ? "p-1" : "p-1";
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
          width={512}
          height={512}
          className="h-full w-full object-contain"
        />
      ) : null}
    </span>
  );
}
