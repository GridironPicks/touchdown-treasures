import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { History } from "lucide-react";

import { listAlertHistory } from "@/lib/commissioner.functions";

const KIND_LABELS: Record<string, string> = {
  deadlines: "Deadline reminder",
  results: "Results recap",
  chat: "Trash talk",
  survivor: "Survivor alert",
};

function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Commissioner-only log of push alerts this league's managers received. */
export function AlertHistory({ leagueId }: { leagueId: string }) {
  const fetchHistory = useServerFn(listAlertHistory);
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["alert-history", leagueId],
    queryFn: () => fetchHistory({ data: { leagueId } }),
  });

  return (
    <div className="field-panel rounded-2xl border border-border p-4">
      <h3 className="stadium-heading flex items-center gap-2 text-sm">
        <History size={14} className="text-primary" />
        Alert history
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        The last 50 push alerts delivered to managers in this league.
      </p>

      {isLoading && <p className="mt-3 text-xs text-muted-foreground">Loading…</p>}
      {!isLoading && entries.length === 0 && (
        <p className="mt-3 text-xs text-muted-foreground">No alerts sent yet.</p>
      )}

      {entries.length > 0 && (
        <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto pr-1">
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-2.5 py-1.5 text-xs"
            >
              <span className="truncate font-medium">{e.team_name}</span>
              <span className="shrink-0 text-muted-foreground">
                {KIND_LABELS[e.kind] ?? e.kind} · {when(e.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
