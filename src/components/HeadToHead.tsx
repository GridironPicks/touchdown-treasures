import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ChevronDown, Swords } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { getHeadToHead, type H2HRow } from "@/lib/awards.functions";
import type { SeasonType } from "@/lib/league";

type Props = { leagueId: string; seasonType: SeasonType };

/** Every manager's weekly win/loss/tie record against every other manager. */
export function HeadToHead({ leagueId, seasonType }: Props) {
  const [open, setOpen] = useState(false);
  const fetchH2H = useServerFn(getHeadToHead);

  const { data: rows = [] } = useQuery<H2HRow[]>({
    queryKey: ["head-to-head", leagueId, seasonType],
    enabled: !!leagueId && open,
    queryFn: () => fetchH2H({ data: { leagueId, seasonType } }),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["h2h-profiles", leagueId, open],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, team_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const ids = [...new Set(rows.flatMap((r) => [r.user_id, r.opponent_id]))];
  const name = (id: string) => profiles.find((p) => p.id === id)?.team_name ?? "Manager";
  const cell = (a: string, b: string) => rows.find((r) => r.user_id === a && r.opponent_id === b);

  return (
    <section className="field-panel overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2">
          <Swords size={16} className="text-primary" />
          <span className="stadium-heading text-lg">Head-to-head</span>
        </span>
        <ChevronDown
          size={16}
          className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-border px-4 py-3">
          {ids.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No completed weeks yet — records appear once a week is final.
            </p>
          ) : (
            <div className="-mx-4 overflow-x-auto px-4">
              <table className="w-full min-w-max text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-semibold">Manager</th>
                    {ids.map((id) => (
                      <th key={id} className="px-2 py-2 font-semibold">
                        {name(id).slice(0, 10)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ids.map((a) => (
                    <tr key={a}>
                      <td className="py-2 pr-3 font-semibold">{name(a)}</td>
                      {ids.map((b) => {
                        if (a === b)
                          return (
                            <td key={b} className="px-2 py-2 text-center text-muted-foreground">
                              —
                            </td>
                          );
                        const c = cell(a, b);
                        const win = (c?.wins ?? 0) > (c?.losses ?? 0);
                        const loss = (c?.wins ?? 0) < (c?.losses ?? 0);
                        return (
                          <td
                            key={b}
                            className={`px-2 py-2 text-center font-semibold ${
                              win ? "text-primary" : loss ? "text-destructive" : "text-muted-foreground"
                            }`}
                          >
                            {c ? `${c.wins}-${c.losses}${c.ties ? `-${c.ties}` : ""}` : "0-0"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
