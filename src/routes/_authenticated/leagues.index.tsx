import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, Crown, LogOut, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { useLeague } from "@/lib/league-context";
import {
  createLeague,
  deleteLeague,
  joinLeague,
  leaveLeague,
  type League,
} from "@/lib/leagues.functions";

export const Route = createFileRoute("/_authenticated/leagues/")({
  head: () => ({
    meta: [
      { title: "Leagues — Gridiron Confidence" },
      {
        name: "description",
        content: "Create or join private Gridiron Confidence leagues. The Global Pool is always available.",
      },
      { property: "og:title", content: "Leagues — Gridiron Confidence" },
      {
        property: "og:description",
        content: "Create or join private leagues and compete with your own crew.",
      },
    ],
  }),
  component: LeaguesPage,
});

function LeaguesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { activeLeague, setActiveLeagueId } = useLeague();
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [dropLowest, setDropLowest] = useState(false);
  const [deadlineFirstGame, setDeadlineFirstGame] = useState(false);
  const [customRules, setCustomRules] = useState("");
  const [pendingDelete, setPendingDelete] = useState<League | null>(null);
  const [confirmName, setConfirmName] = useState("");

  const { data: leagues = [] } = useQuery<League[]>({
    queryKey: ["my-leagues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("league_memberships")
        .select("role, leagues(id, name, owner_id, join_code, settings, is_global_pool, created_at)")
        .eq("user_id", (await supabase.auth.getUser()).data.user!.id)
        .order("created_at", { referencedTable: "leagues", ascending: true });
      if (error) throw error;
      return (data ?? []).map((row: any) => {
        const l = row.leagues;
        const settings = typeof l.settings === "object" && l.settings !== null ? l.settings : {};
        return {
          id: l.id,
          name: l.name,
          owner_id: l.owner_id,
          join_code: l.join_code,
          settings,
          is_global_pool: l.is_global_pool,
          role: row.role,
          created_at: l.created_at,
        } as League;
      });
    },
  });

  const createFn = useServerFn(createLeague);
  const joinFn = useServerFn(joinLeague);
  const leaveFn = useServerFn(leaveLeague);

  const create = useMutation({
    mutationFn: async () => {
      const settings = {
        deadline_first_game: deadlineFirstGame,
        drop_lowest_week: dropLowest,
        custom_rules: customRules,
      };
      const { leagueId } = await createFn({ data: { name: name.trim(), settings } });
      return leagueId;
    },
    onSuccess: (leagueId) => {
      setName("");
      queryClient.invalidateQueries({ queryKey: ["my-leagues"] });
      setActiveLeagueId(leagueId);
      toast.success("League created");
      navigate({ to: "/picks" });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not create league"),
  });

  const join = useMutation({
    mutationFn: async () => {
      const { leagueId } = await joinFn({ data: { code: joinCode.trim() } });
      return leagueId;
    },
    onSuccess: (leagueId) => {
      setJoinCode("");
      queryClient.invalidateQueries({ queryKey: ["my-leagues"] });
      setActiveLeagueId(leagueId);
      toast.success("Joined league");
      navigate({ to: "/picks" });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not join league"),
  });

  const leave = useMutation({
    mutationFn: async (leagueId: string) => {
      await leaveFn({ data: { leagueId } });
      return leagueId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-leagues"] });
      toast.success("Left league");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not leave league"),
  });

  const deleteFn = useServerFn(deleteLeague);

  const remove = useMutation({
    mutationFn: async (leagueId: string) => {
      await deleteFn({ data: { leagueId } });
      return leagueId;
    },
    onSuccess: () => {
      setPendingDelete(null);
      setConfirmName("");
      queryClient.invalidateQueries({ queryKey: ["my-leagues"] });
      toast.success("League deleted");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not delete league"),
  });


  const copyCode = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/join?code=${code}`);
    toast.success("Invite link copied");
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="stadium-heading text-3xl">Leagues</h1>
        <p className="text-sm text-muted-foreground">
          Play in the Global Pool or create private leagues for your crew.
        </p>
      </header>

      <section className="field-panel rounded-2xl p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Plus size={18} className="text-primary" /> Create a league
        </h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="league-name">League name</Label>
            <Input
              id="league-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. The Backfield"
              maxLength={60}
            />
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Switch id="drop-lowest" checked={dropLowest} onCheckedChange={setDropLowest} />
              <Label htmlFor="drop-lowest" className="text-sm font-normal">
                Drop lowest weekly score
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="deadline-first"
                checked={deadlineFirstGame}
                onCheckedChange={setDeadlineFirstGame}
              />
              <Label htmlFor="deadline-first" className="text-sm font-normal">
                Lock at first kickoff (not Wednesday 6pm)
              </Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom-rules">Commissioner rules / notes</Label>
            <Input
              id="custom-rules"
              value={customRules}
              onChange={(e) => setCustomRules(e.target.value)}
              placeholder="Optional house rules…"
            />
          </div>
          <Button
            onClick={() => create.mutate()}
            disabled={create.isPending || name.trim().length === 0}
            className="w-full sm:w-auto"
          >
            {create.isPending ? "Creating…" : "Create league"}
          </Button>
        </div>
      </section>

      <section className="field-panel rounded-2xl p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Users size={18} className="text-primary" /> Join a league
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Enter 6-character join code"
            maxLength={10}
            className="uppercase"
          />
          <Button onClick={() => join.mutate()} disabled={join.isPending || joinCode.trim().length === 0}>
            {join.isPending ? "Joining…" : "Join"}
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your leagues</h2>
        {leagues.length === 0 ? (
          <p className="text-sm text-muted-foreground">You are not in any leagues yet.</p>
        ) : (
          <ul className="space-y-3">
            {leagues.map((league) => {
              const isActive = activeLeague?.id === league.id;
              return (
                <li
                  key={league.id}
                  className={`field-panel rounded-2xl p-4 ${
                    isActive ? "border-primary/50 ring-1 ring-primary/30" : ""
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="flex items-center gap-2 font-semibold">
                      {league.name}
                      {league.is_global_pool && (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                          GLOBAL
                        </span>
                      )}
                      {league.role === "owner" && (
                        <span title="Owner">
                          <Crown size={14} className="text-primary" />
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">Code: {league.join_code}</p>
                    {!league.is_global_pool && league.role === "owner" && (
                      <p className="text-xs text-primary">You own this league — you can delete it</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyCode(league.join_code)}
                      className="gap-1"
                    >
                      <Copy size={14} /> Link
                    </Button>
                    {!league.is_global_pool && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => leave.mutate(league.id)}
                        disabled={leave.isPending}
                        className="gap-1 text-destructive hover:text-destructive"
                      >
                        <LogOut size={14} /> Leave
                      </Button>
                    )}
                    {!league.is_global_pool && league.role === "owner" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPendingDelete(league);
                          setConfirmName("");
                        }}
                        className="gap-1 border-destructive/60 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 size={14} /> Delete league
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={isActive ? "secondary" : "default"}
                      onClick={() => setActiveLeagueId(league.id)}
                    >
                      {isActive ? "Active" : "Switch"}
                    </Button>
                  </div>
                  </div>
                  {!league.is_global_pool && league.role === "owner" && (
                    <CommissionerPanel league={league} />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
            setConfirmName("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{pendingDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the league along with every member, pick, survivor pick,
              tiebreaker and chat message in it. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm-name">Type the league name to confirm</Label>
            <Input
              id="confirm-name"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={pendingDelete?.name ?? ""}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending || confirmName.trim() !== (pendingDelete?.name ?? "")}
              onClick={(e) => {
                e.preventDefault();
                if (pendingDelete) remove.mutate(pendingDelete.id);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {remove.isPending ? "Deleting…" : "Delete league"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
