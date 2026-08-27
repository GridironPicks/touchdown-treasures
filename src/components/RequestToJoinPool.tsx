import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { myJoinStatus, requestToJoin, type JoinStatus } from "@/lib/join-requests.functions";

export function RequestToJoinPool() {
  const queryClient = useQueryClient();
  const statusFn = useServerFn(myJoinStatus);
  const requestFn = useServerFn(requestToJoin);

  const { data: status } = useQuery<JoinStatus>({
    queryKey: ["pool-join-status"],
    queryFn: () => statusFn(),
  });

  const ask = useMutation({
    mutationFn: () => requestFn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pool-join-status"] });
      queryClient.invalidateQueries({ queryKey: ["my-leagues"] });
      toast.success("Request sent to the commissioner");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not send that request"),
  });

  if (!status || !status.leagueId || status.isMember) return null;

  const poolName = status.leagueName ?? "the pool";

  return (
    <section className="field-panel rounded-2xl p-5">
      <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
        <ShieldCheck size={18} className="text-primary" /> {poolName}
      </h2>

      {status.status === "pending" ? (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Clock size={16} className="mt-0.5 shrink-0 text-primary" />
          Your request is with the commissioner. You'll get a notification the moment you're approved.
        </p>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {status.status === "declined"
              ? "Your last request wasn't approved. You can ask again if something's changed."
              : `${poolName} is invite-only. Send the commissioner a request and you'll be added once it's approved.`}
          </p>
          <Button onClick={() => ask.mutate()} disabled={ask.isPending} className="w-full sm:w-auto">
            {ask.isPending ? "Sending…" : "Request to join"}
          </Button>
        </>
      )}
    </section>
  );
}
