type IconAsset = { url: string };
type IconAssetModule = { default: IconAsset };

const iconModules = import.meta.glob<IconAssetModule>(
  "../assets/nav-icons/*.png.asset.json",
  { eager: true },
);

export const NAV_ICON_ART: Record<string, string> = Object.fromEntries(
  Object.entries(iconModules).map(([path, module]) => [
    path.split("/").pop()?.replace(".png.asset.json", "") ?? "",
    module.default.url,
  ]),
);

export type NavIconKey = keyof typeof NAV_ICON_ART;

export function NavIcon({
  name,
  size = 26,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const src = NAV_ICON_ART[name];
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
