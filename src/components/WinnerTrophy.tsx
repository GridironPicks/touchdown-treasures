import { Trophy } from "lucide-react";

const SIZES = {
  sm: { box: "h-10 w-10", icon: 20 },
  md: { box: "h-14 w-14", icon: 28 },
  lg: { box: "h-20 w-20", icon: 40 },
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
  const s = SIZES[size];
  return (
    <span
      title={label ?? "Winner of the week"}
      aria-label={label ?? "Winner of the week"}
      className={`trophy-badge inline-flex shrink-0 items-center justify-center rounded-full ${s.box} ${className}`}
    >
      <Trophy size={s.icon} strokeWidth={2.2} />
    </span>
  );
}
