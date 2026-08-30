import { useEffect, useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { type SeasonType } from "@/lib/league";

type Props = {
  seasonType: SeasonType;
  maxPoints: number;
  opensAt?: Date | null;
  deadline?: Date | null;
};

const STORAGE_KEY = "gc-how-to-play-collapsed";

export function HowToPlay({ seasonType, maxPoints, opensAt, deadline }: Props) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  const isRegular = seasonType === "reg";
  const openLabel = opensAt
    ? opensAt.toLocaleString("en-US", {
        timeZone: "America/Chicago",
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      })
    : "Monday 12:00 AM CT";
  const deadlineLabel = deadline
    ? deadline.toLocaleString("en-US", {
        timeZone: "America/Chicago",
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      })
    : "Wednesday 6:00 PM CT";

  return (
    <section className="field-panel rounded-2xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <HelpCircle size={18} className="shrink-0 text-primary" />
          <h2 className="stadium-heading text-base">How to Play</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-controls="how-to-play-body"
          className="h-8 px-2 text-muted-foreground hover:text-foreground"
        >
          {collapsed ? "Show" : "Hide"}
          <ChevronDown
            size={16}
            className={`ml-1 transition-transform ${collapsed ? "-rotate-90" : ""}`}
          />
        </Button>
      </div>

      {!collapsed && (
        <div id="how-to-play-body" className="mt-3 space-y-3 text-sm text-muted-foreground">
          <p>
            {isRegular ? (
              <>
                <strong className="text-foreground">Regular season:</strong> picks open{" "}
                <span className="text-foreground">{openLabel}</span> and lock{" "}
                <span className="text-foreground">{deadlineLabel}</span>. Once you hit Submit,
                your picks are final.
              </>
            ) : (
              <>
                <strong className="text-foreground">Free preseason play:</strong> each game locks
                at its own kickoff, and the week closes when the last game starts. Every game that
                kicks off before you submit burns the highest confidence number off your board — if
                3 games have started, {maxPoints}, {maxPoints - 1} and {maxPoints - 2} are gone for
                you that week.
              </>
            )}

          </p>

          <ul className="list-disc space-y-1.5 pl-4">
            <li>
              Rank every game from <span className="font-semibold text-foreground">1</span> (least
              confident) to{" "}
              <span className="font-semibold text-foreground">{maxPoints}</span> (most confident).
              Each number can only be used once per week.
            </li>
            <li>
              Earn the confidence points you assigned to every game you picked correctly. Most
              points that week wins.
            </li>
            <li>
              Tiebreaker: predict the combined final score of the week's last-kickoff game.
              Closest guess breaks ties.
            </li>
          </ul>
        </div>
      )}
    </section>
  );
}
