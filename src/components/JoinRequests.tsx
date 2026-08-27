import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mascot } from "@/components/Mascot";
import {
  decideJoinRequest,
  listJoinRequests,
  type JoinRequest,
} from "@/lib/join-requests.functions";

export function JoinRequests({ leagueId }: { leagueId: string }) {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listJoinRequests);
  const decideFn = useServerFn(decideJoinRequest);

  const { data: requests = [] } = useQuery<JoinRequest[]>({
    queryKey: ["join-requests", leagueId],
    queryFn: () => listFn({ data: { leagueId } }),
  });

  const decide = useMutation({
    mutationFn: (vars: { requestId: string; approve: boolean }) => decideFn({ data: vars }),
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: ["join-requests", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["league-members", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["league-rejoin", leagueId] });
      toast.success(vars.approve ? "Manager approved" : "Request declined");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update that request"),
  });

  if (requests.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label>Join requests</Label>
        <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
          {requests.length}
        </span>
      </div>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {requests.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
            <Mascot mascot={r.mascot} color={r.primary_color} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{r.team_name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {r.display_name} · asked {new Date(r.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                className="gap-1 text-xs"
                disabled={decide.isPending}
                onClick={() => decide.mutate({ requestId: r.id, approve: true })}
              >
                <Check size={13} /> Approve
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs text-destructive hover:text-destructive"
                disabled={decide.isPending}
                onClick={() => decide.mutate({ requestId: r.id, approve: false })}
              >
                <X size={13} /> Decline
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
