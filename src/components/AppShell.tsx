import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Trophy, Shirt, MessageSquare, ShieldCheck, LogOut } from "lucide-react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { LeagueSwitcher } from "@/components/LeagueSwitcher";

const NAV = [
  { to: "/picks", label: "Picks", icon: ClipboardList },
  { to: "/leaderboard", label: "Standings", icon: Trophy },
  { to: "/survivor", label: "Survivor", icon: ShieldCheck },
  { to: "/chat", label: "Trash Talk", icon: MessageSquare },
  { to: "/team", label: "Team", icon: Shirt },
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
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/picks" className="stadium-heading text-lg leading-none">
            <span className="chrome-text">GRIDIRON</span>{" "}
            <span className="text-primary">CONFIDENCE</span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-primary" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <button
            onClick={signOut}
            aria-label="Sign out"
            className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-5 sm:pb-10">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur sm:hidden">
        <div className="grid grid-cols-5">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-muted-foreground"
              activeProps={{ className: "text-primary" }}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
