import { useState } from "react";
import { ChevronDown, Settings, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { useLeague } from "@/lib/league-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function LeagueSwitcher() {
  const { leagues, activeLeague, setActiveLeagueId, isLoading } = useLeague();
  const [open, setOpen] = useState(false);

  if (isLoading || leagues.length === 0) {
    return (
      <button
        type="button"
        disabled
        className="flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium text-muted-foreground"
      >
        <Users size={16} /> Leagues…
      </button>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-9 max-w-[180px] items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-secondary"
        >
          <Users size={16} className="shrink-0 text-primary" />
          <span className="truncate">{activeLeague?.name ?? "Select league"}</span>
          <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        {leagues.map((league) => (
          <DropdownMenuItem
            key={league.id}
            onClick={() => {
              setActiveLeagueId(league.id);
              setOpen(false);
            }}
            className="cursor-pointer justify-between"
          >
            <span className="truncate">{league.name}</span>
            {league.role === "owner" && !league.is_global_pool && (
              <Link
                to="/leagues"
                aria-label={`Manage ${league.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                }}
                className="ml-2 shrink-0 text-muted-foreground hover:text-primary"
              >
                <Settings size={13} />
              </Link>
            )}
            {activeLeague?.id === league.id && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                ACTIVE
              </span>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/leagues" className="flex items-center gap-2">
            <Settings size={14} /> Manage leagues
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
