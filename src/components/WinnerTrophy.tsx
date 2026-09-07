import { WEEKLY_TROPHY_ART } from "@/lib/badge-art";

const SIZES = {
  sm: { px: 34 },
  md: { px: 52 },
  lg: { px: 76 },
} as const;

/** Oversized metallic trophy used to crown the winner of a week. */
export function WinnerTrophy({
  size = "md",
  label,
  className = "",
}: {
  size?: keyof typeof SIZES;
  label?: string;
  className?: string;
}) {
  const px = SIZES[size].px;
  return (
    <img
      src={WEEKLY_TROPHY_ART}
      alt={label ?? "Winner of the week"}
      title={label ?? "Winner of the week"}
      loading="lazy"
      width={px}
      height={px}
      style={{ width: px, height: px }}
      className={`medal-art shrink-0 object-contain ${className}`}
    />
  );
}
