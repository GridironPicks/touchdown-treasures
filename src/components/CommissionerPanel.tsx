import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { BellRing, Copy, Crown, RefreshCw, Settings, UserMinus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mascot } from "@/components/Mascot";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  listLeagueMembers,
  nudgeUnsubmitted,
  regenerateJoinCode,
  removeMember,
  renameLeague,
  transferOwnership,
  type LeagueMember,
} from "@/lib/commissioner.functions";
import { LeagueRulesEditor } from "@/components/LeagueRulesEditor";
import { RejoinPicker } from "@/components/RejoinPicker";
import type { League } from "@/lib/leagues.functions";
import { defaultSlate, slateLabel, useSlates } from "@/lib/slate";

type Confirm =
  | { type: "remove"; member: LeagueMember }
  | { type: "transfer"; member: LeagueMember }
  | null;

export function CommissionerPanel({ league }: { league: League }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(league.name);
  const [confirm, setConfirm] = useState<Confirm>(null);

  const { data: slates = [] } = useSlates();
  const slate = useMemo(() => defaultSlate(slates), [slates]);

  const listFn = useServerFn(listLeagueMembers);
  const renameFn = useServerFn(renameLeague);
  const codeFn = useServerFn(regenerateJoinCode);
  const removeFn = useServerFn(removeMember);
  const transferFn = useServerFn(transferOwnership);
  const nudgeFn = useServerFn(nudgeUnsubmitted);

  const { data: members = [], isLoading } = useQuery<LeagueMember[]>({
    queryKey: ["league-members", league.id, slate?.seasonType, slate?.week],
    enabled: open && !!slate,
    queryFn: () =>
      listFn({
        data: { leagueId: league.id, seasonType: slate!.seasonType, week: slate!.week },
      }),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["league-members", league.id] });
    queryClient.invalidateQueries({ queryKey: ["my-leagues"] });
  };

  const rename = useMutation({
    mutationFn: () => renameFn({ data: { leagueId: league.id, name: name.trim() } }),
    onSuccess: () => {
      invalidate();
      toast.success("League renamed");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not rename league"),
  });

  const newCode = useMutation({
    mutationFn: () => codeFn({ data: { leagueId: league.id } }),
    onSuccess: (res) => {
      invalidate();
      toast.success(`New join code: ${res.joinCode}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not regenerate the code"),
  });

  const kick = useMutation({
    mutationFn: (userId: string) => removeFn({ data: { leagueId: league.id, userId } }),
    onSuccess: () => {
      setConfirm(null);
      invalidate();
      toast.success("Member removed");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not remove that member"),
  });

  const transfer = useMutation({
    mutationFn: (userId: string) => transferFn({ data: { leagueId: league.id, userId } }),
    onSuccess: () => {
      setConfirm(null);
      invalidate();
      toast.success("Ownership transferred");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not transfer ownership"),
  });

  const nudge = useMutation({
    mutationFn: () =>
      nudgeFn({
        data: { leagueId: league.id, seasonType: slate!.seasonType, week: slate!.week },
      }),
    onSuccess: (res) => {
      if (res.pending === 0) toast.success("Everyone has already submitted");
      else toast.success(`Nudged ${res.pending} player${res.pending === 1 ? "" : "s"}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not send the nudge"),
  });

  const pending = members.filter((m) => !m.submitted).length;

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <Settings size={15} className="text-primary" />
        {open ? "Hide commissioner tools" : "Commissioner tools"}
      </button>

      {open && (
        <div className="mt-4 space-y-5">
          <div className="space-y-2">
            <Label htmlFor={`rename-${league.id}`}>League name</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id={`rename-${league.id}`}
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
              />
              <Button
                onClick={() => rename.mutate()}
                disabled={rename.isPending || name.trim().length === 0 || name === league.name}
              >
                Save
              </Button>
            </div>
          </div>

          {!league.is_global_pool && (
            <div className="space-y-2">
              <Label>Invite</Label>
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded-lg bg-secondary px-3 py-2 text-sm font-semibold">
                  {league.join_code}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/join?code=${league.join_code}`,
                    );
                    toast.success("Invite link copied");
                  }}
                >
                  <Copy size={14} /> Copy link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => newCode.mutate()}
                  disabled={newCode.isPending}
                >
                  <RefreshCw size={14} /> New code
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                A new code immediately invalidates old invite links.
              </p>
            </div>
          )}

          <LeagueRulesEditor leagueId={league.id} />


          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>
                Members {slate ? `· ${slateLabel(slate)}` : ""}
              </Label>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => nudge.mutate()}
                disabled={nudge.isPending || !slate || pending === 0}
              >
                <BellRing size={14} /> Nudge {pending > 0 ? `(${pending})` : ""}
              </Button>
            </div>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading members…</p>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {members.map((m) => (
                  <li key={m.user_id} className="flex items-center gap-3 px-3 py-2.5">
                    <Mascot mascot={m.mascot} color={m.primary_color} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                        {m.team_name}
                        {m.role === "owner" && <Crown size={12} className="text-primary" />}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(m.joined_at).toLocaleDateString()} ·{" "}
                        {m.submitted ? "picks in" : "not submitted"}
                      </p>
                    </div>
                    {m.role !== "owner" && (
                      <div className="flex items-center gap-1">
                        {!league.is_global_pool && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={() => setConfirm({ type: "transfer", member: m })}
                          >
                            <Crown size={13} /> Make owner
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs text-destructive hover:text-destructive"
                          onClick={() => setConfirm({ type: "remove", member: m })}
                        >
                          <UserMinus size={13} /> Remove
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {league.is_global_pool && <RejoinPicker leagueId={league.id} />}
        </div>

      )}

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.type === "remove"
                ? `Remove ${confirm.member.team_name}?`
                : `Make ${confirm?.member.team_name} the owner?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.type === "remove"
                ? "They lose access to this league's picks, standings and chat. They can rejoin with the code."
                : "They take over commissioner tools for this league and you become a regular member."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (!confirm) return;
                if (confirm.type === "remove") kick.mutate(confirm.member.user_id);
                else transfer.mutate(confirm.member.user_id);
              }}
              disabled={kick.isPending || transfer.isPending}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
