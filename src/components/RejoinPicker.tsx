import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mascot } from "@/components/Mascot";
import { addMember, listRejoinCandidates, type Candidate } from "@/lib/commissioner.functions";

export function RejoinPicker({ leagueId }: { leagueId: string }) {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listRejoinCandidates);
  const addFn = useServerFn(addMember);

  const { data: candidates = [] } = useQuery<Candidate[]>({
    queryKey: ["league-rejoin", leagueId],
    queryFn: () => listFn({ data: { leagueId } }),
  });

  const add = useMutation({
    mutationFn: (userId: string) => addFn({ data: { leagueId, userId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["league-rejoin", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["league-members", leagueId] });
      toast.success("Manager added back");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add that manager"),
  });

  if (candidates.length === 0) return null;

  return (
    <div className="space-y-2">
      <Label>Re-add a removed manager</Label>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {candidates.map((c) => (
          <li key={c.user_id} className="flex items-center gap-3 px-3 py-2.5">
            <Mascot mascot={c.mascot} color={c.primary_color} size="sm" />
            <p className="min-w-0 flex-1 truncate text-sm font-semibold">{c.team_name}</p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs"
              disabled={add.isPending}
              onClick={() => add.mutate(c.user_id)}
            >
              <UserPlus size={13} /> Add
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
