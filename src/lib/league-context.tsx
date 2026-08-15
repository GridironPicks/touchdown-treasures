import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { listMyLeagues, type League } from "@/lib/leagues.functions";

type LeagueContextValue = {
  leagues: League[];
  activeLeagueId: string | null;
  activeLeague: League | null;
  isLoading: boolean;
  setActiveLeagueId: (id: string) => void;
};

const LeagueContext = createContext<LeagueContextValue | null>(null);

const STORAGE_KEY = "gc-active-league";

export function LeagueProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const fetchLeagues = useServerFn(listMyLeagues);

  const { data: leagues = [], isLoading } = useQuery({
    queryKey: ["my-leagues"],
    queryFn: () => fetchLeagues(),
  });

  const [activeLeagueId, setActiveLeagueIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(STORAGE_KEY);
  });

  const setActiveLeagueId = (id: string) => {
    setActiveLeagueIdState(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, id);
    }
    queryClient.invalidateQueries();
  };

  useEffect(() => {
    if (leagues.length === 0) return;
    const stillMember = leagues.some((l) => l.id === activeLeagueId);
    if (!activeLeagueId || !stillMember) {
      const global = leagues.find((l) => l.is_global_pool) ?? leagues[0];
      if (global && global.id !== activeLeagueId) {
        setActiveLeagueId(global.id);
      }
    }
  }, [leagues, activeLeagueId]);

  const activeLeague = leagues.find((l) => l.id === activeLeagueId) ?? null;

  return (
    <LeagueContext.Provider
      value={{ leagues, activeLeagueId, activeLeague, isLoading, setActiveLeagueId }}
    >
      {children}
    </LeagueContext.Provider>
  );
}

export function useLeague() {
  const ctx = useContext(LeagueContext);
  if (!ctx) throw new Error("useLeague must be used inside LeagueProvider");
  return ctx;
}
