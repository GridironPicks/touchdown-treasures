import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useServerFn } from "@tanstack/react-start";
import { notifyChatMessage } from "@/lib/notifications.functions";
import { supabase } from "@/integrations/supabase/client";
import { Mascot } from "@/components/Mascot";
import { MessageReactions, type Reaction } from "@/components/MessageReactions";
import { useLeague } from "@/lib/league-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Trash Talk — Gridiron Confidence" },
      {
        name: "description",
        content: "League-wide chat room for weekly trash talk between Gridiron Confidence managers.",
      },
      { property: "og:title", content: "Trash Talk — Gridiron Confidence" },
      {
        property: "og:description",
        content: "Talk smack with the whole league before and after every slate.",
      },
    ],
  }),
  component: ChatPage,
});

type Message = { id: string; user_id: string; body: string; created_at: string };
type Profile = {
  id: string;
  display_name: string;
  team_name: string;
  mascot: string;
  primary_color: string;
};

function timeLabel(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ChatPage() {
  const queryClient = useQueryClient();
  const { activeLeague, isLoading: leaguesLoading } = useLeague();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: me } = useQuery({
    queryKey: ["me-id"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });


  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", activeLeague?.id],
    enabled: !!activeLeague,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("league_id", activeLeague!.id)
        .order("created_at", { ascending: true })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as Message[];
    },
  });

  const { data: reactions = [] } = useQuery({
    queryKey: ["message-reactions", activeLeague?.id],
    enabled: !!activeLeague,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_reactions")
        .select("*")
        .in(
          "message_id",
          messages.map((m) => m.id),
        );
      if (error) throw error;
      return (data ?? []) as Reaction[];
    },
  });

  // Live chat: push new/removed messages straight into the cache.
  useEffect(() => {
    if (!activeLeague) return;
    const channel = supabase
      .channel(`league-chat-${activeLeague.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `league_id=eq.${activeLeague.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", activeLeague.id] });
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => {
        queryClient.invalidateQueries({ queryKey: ["message-reactions", activeLeague.id] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, activeLeague?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = useMutation({
    mutationFn: async (body: string) => {
      const uid = (await supabase.auth.getUser()).data.user?.id;
      if (!uid) throw new Error("You must be signed in");
      if (!activeLeague) throw new Error("No league selected");
      const { error } = await supabase
        .from("messages")
        .insert({ user_id: uid, league_id: activeLeague.id, body });
      if (error) throw error;
      void notifyChat({ data: { leagueId: activeLeague.id, body } }).catch(() => {});
    },
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["messages", activeLeague?.id] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not send"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("messages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["messages"] }),
  });

  if (leaguesLoading || !activeLeague) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (

    <div className="space-y-4">
      <header>
        <h1 className="stadium-heading flex items-center gap-2 text-3xl">
          <MessageSquare className="text-primary" /> Trash Talk
        </h1>
        <p className="text-sm text-muted-foreground">
          League-wide chat — everyone playing sees every message.
        </p>
      </header>

      <section className="field-panel flex h-[60vh] flex-col overflow-hidden rounded-2xl">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No smack talk yet. Be the first to fire a shot.
            </p>
          )}
          {messages.map((m) => {
            const p = profiles.find((x) => x.id === m.user_id);
            const mine = m.user_id === me;
            return (
              <div key={m.id} className="flex items-start gap-3">
                <Mascot mascot={p?.mascot ?? "eagle"} color={p?.primary_color ?? "#00E676"} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-semibold">{p?.team_name ?? "Manager"}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {p?.display_name ?? ""} · {timeLabel(m.created_at)}
                    </span>
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
                  <MessageReactions
                    messageId={m.id}
                    reactions={reactions.filter((r) => r.message_id === m.id)}
                    me={me ?? null}
                  />
                </div>
                {mine && (
                  <button
                    type="button"
                    aria-label="Delete message"
                    onClick={() => remove.mutate(m.id)}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form
          className="flex items-center gap-2 border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const body = draft.trim();
            if (body) send.mutate(body);
          }}
        >
          <Input
            value={draft}
            maxLength={500}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Talk your talk…"
          />
          <Button type="submit" disabled={send.isPending || draft.trim() === ""}>
            <Send size={16} />
          </Button>
        </form>
      </section>
    </div>
  );
}
