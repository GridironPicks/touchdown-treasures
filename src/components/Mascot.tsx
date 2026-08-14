import {
  Bird,
  Beef,
  Fish,
  Dog,
  PawPrint,
  Feather,
  Mountain,
  Worm,
  Rabbit,
  Shield,
  Bug,
  Zap,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  eagle: Bird,
  bull: Beef,
  shark: Fish,
  wolf: Dog,
  bear: PawPrint,
  falcon: Feather,
  ram: Mountain,
  cobra: Worm,
  stallion: Rabbit,
  titan: Shield,
  hornet: Bug,
  bolt: Zap,
};

export function Mascot({
  mascot,
  color,
  size = "md",
}: {
  mascot: string;
  color?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const Icon = ICONS[mascot] ?? Shield;
  const box = size === "lg" ? "h-16 w-16" : size === "sm" ? "h-9 w-9" : "h-12 w-12";
  const icon = size === "lg" ? 32 : size === "sm" ? 18 : 24;
  return (
    <span
      className={`${box} inline-flex shrink-0 items-center justify-center rounded-xl border border-border bg-secondary`}
      style={color ? { boxShadow: `inset 0 0 0 2px ${color}` } : undefined}
    >
      <Icon size={icon} style={color ? { color } : undefined} strokeWidth={2.2} />
    </span>
  );
}
