import { CalendarClock } from "lucide-react";

/**
 * The NFL leaves late-season and playoff kickoffs unscheduled until the field
 * is set, and the feed serves every game in one placeholder slot. Rather than
 * show a fake time, the whole week is flagged as TBD until real times land.
 */
export function TimesTbd({ label }: { label?: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-xs text-foreground">
      <CalendarClock size={14} className="mt-0.5 shrink-0 text-gold" />
      <span>
        <span className="font-semibold uppercase tracking-widest">Times TBD</span> —{" "}
        {label ?? "the NFL hasn't scheduled this week yet"}. Kickoffs update automatically as soon
        as they're announced.
      </span>
    </div>
  );
}
