import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { joinLeague } from "@/lib/leagues.functions";

export const Route = createFileRoute("/join")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search["code"] === "string" ? search["code"].toUpperCase() : "",
  }),
  head: () => ({
    meta: [
      { title: "Join League — Gridiron Confidence" },
      {
        name: "description",
        content: "Join a private Gridiron Confidence league with an invite code.",
      },
      { property: "og:title", content: "Join League — Gridiron Confidence" },
      {
        property: "og:description",
        content: "Accept your invite and start competing.",
      },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const { code } = useSearch({ from: "/join" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const joinFn = useServerFn(joinLeague);

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    },
  });

  const join = useMutation({
    mutationFn: async () => {
      const { leagueId } = await joinFn({ data: { code: code.trim() } });
      return leagueId;
    },
    onSuccess: (leagueId) => {
      queryClient.invalidateQueries({ queryKey: ["my-leagues"] });
      toast.success("Welcome to the league");
      navigate({ to: "/picks" });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not join league"),
  });

  useEffect(() => {
    if (session && code.trim()) {
      join.mutate();
    }
  }, [session, code]);

  if (sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Checking invite…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="stadium-heading text-3xl">Join the league</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Sign in first to accept your invite to <span className="font-semibold text-foreground">{code}</span>.
        </p>
        <Button onClick={() => navigate({ to: "/auth", search: { redirect: `/join?code=${code}` } })}>
          Sign in to join
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <p className="text-sm text-muted-foreground">Joining league…</p>
    </div>
  );
}
