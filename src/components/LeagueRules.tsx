import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ScrollText } from "lucide-react";

import { listLeagueRules, type LeagueRule } from "@/lib/commissioner.functions";

export function LeagueRules({ leagueId }: { leagueId: string }) {
  const listFn = useServerFn(listLeagueRules);

  const { data: rules = [] } = useQuery<LeagueRule[]>({
    queryKey: ["league-rules", leagueId],
    queryFn: () => listFn({ data: { leagueId } }),
  });

  if (rules.length === 0) return null;

  return (
    <section className="field-panel rounded-2xl border border-border p-4">
      <div className="flex items-center gap-2">
        <ScrollText size={18} className="shrink-0 text-primary" />
        <h2 className="stadium-heading text-base">House Rules</h2>
        <span className="text-xs text-muted-foreground">set by the commissioner</span>
      </div>
      <ol className="mt-3 space-y-3">
        {rules.map((rule, i) => (
          <li key={rule.id} className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{rule.title}</p>
              {rule.body && (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{rule.body}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
