import { HelpCircle } from "lucide-react";

import { badgeIcon } from "@/components/BadgeRow";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BADGE_META } from "@/lib/badges";

/** Lists every award in the league and how each one is earned. */
export function BadgeGlossary() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <HelpCircle size={14} /> Badge guide
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="stadium-heading">Award badges</DialogTitle>
          <DialogDescription>
            Every badge you can earn this season, and what it takes to get it.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-3">
          {Object.entries(BADGE_META).map(([key, meta]) => {
            const Icon = badgeIcon(meta.icon);
            return (
              <li key={key} className="flex items-start gap-3 rounded-xl bg-secondary/50 p-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary">
                  <Icon size={15} />
                </span>
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide">{meta.label}</p>
                  <p className="text-xs text-muted-foreground">{meta.how}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted-foreground">
          Tap any badge on a manager to see exactly which week and game earned it.
        </p>
      </DialogContent>
    </Dialog>
  );
}
