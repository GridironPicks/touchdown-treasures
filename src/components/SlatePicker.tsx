import { ChevronLeft, ChevronRight } from "lucide-react";

import { slateLabel, type Slate, type SlateInfo } from "@/lib/slate";

type Props = {
  slates: SlateInfo[];
  value: Slate | null;
  onChange: (slate: Slate) => void;
};

export function SlatePicker({ slates, value, onChange }: Props) {
  if (slates.length === 0 || !value) return null;
  const index = slates.findIndex(
    (s) => s.seasonType === value.seasonType && s.week === value.week,
  );
  const key = (s: Slate) => `${s.seasonType}-${s.week}`;

  const go = (delta: number) => {
    const next = slates[index + delta];
    if (next) onChange({ seasonType: next.seasonType, week: next.week });
  };

  return (
    <div className="field-panel flex items-center gap-2 rounded-xl p-2">
      <button
        type="button"
        aria-label="Previous week"
        disabled={index <= 0}
        onClick={() => go(-1)}
        className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
      >
        <ChevronLeft size={18} />
      </button>
      <select
        aria-label="Select week"
        value={key(value)}
        onChange={(e) => {
          const [seasonType, week] = e.target.value.split("-");
          onChange({ seasonType: seasonType as Slate["seasonType"], week: Number(week) });
        }}
        className="h-10 flex-1 rounded-lg border border-border bg-input px-3 text-sm font-semibold text-foreground"
      >
        {slates.map((s) => (
          <option key={key(s)} value={key(s)}>
            {slateLabel(s)}
          </option>
        ))}
      </select>
      <button
        type="button"
        aria-label="Next week"
        disabled={index < 0 || index >= slates.length - 1}
        onClick={() => go(1)}
        className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
