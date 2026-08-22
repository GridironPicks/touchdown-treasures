import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Trophy, Shirt, MessageSquare, ShieldCheck, LogOut, Users, Bell, UserCircle, Radio, Zap } from "lucide-react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { LeagueSwitcher } from "@/components/LeagueSwitcher";
import { InstallAppCard } from "@/components/InstallAppCard";

const NAV = [
  { to: "/picks", label: "Picks", icon: ClipboardList },
  { to: "/scoreboard", label: "Scores", icon: Radio },
  { to: "/leaderboard", label: "Standings", icon: Trophy },
  
  { to: "/survivor", label: "Survivor", icon: ShieldCheck },
  { to: "/chat", label: "Trash Talk", icon: MessageSquare },
  { to: "/team", label: "Team", icon: Shirt },
  { to: "/leagues", label: "Leagues", icon: Users },
  { to: "/notifications", label: "Alerts", icon: Bell },
  { to: "/account", label: "Account", icon: UserCircle },
] as const;





export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <Link to="/picks" className="stadium-heading truncate text-lg leading-none">
            <span className="chrome-text">GRIDIRON</span>{" "}
            <span className="text-primary">CONFIDENCE</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden sm:block">
              <LeagueSwitcher />
            </div>
            <button
              onClick={signOut}
              aria-label="Sign out"
              className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
        <nav className="mx-auto hidden w-full max-w-5xl flex-wrap items-center gap-1 px-3 pb-2 sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:px-3 lg:py-2"
              activeProps={{ className: "bg-secondary text-primary" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-40 pt-5 sm:pb-10">
        <InstallAppCard />
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        <div className="grid grid-cols-5">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex min-w-0 flex-col items-center gap-1 px-1 py-2 text-[9px] font-semibold leading-tight text-muted-foreground"
              activeProps={{ className: "text-primary" }}
            >
              <item.icon size={18} className="shrink-0" />
              <span className="w-full truncate text-center">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

