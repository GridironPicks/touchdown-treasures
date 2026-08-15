import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SmilePlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export const REACTIONS = ["🔥", "😂", "😤", "🏈", "💀", "🧊", "👀", "🐐"] as const;

export type Reaction = { id: string; message_id: string; user_id: string; emoji: string };

/** Emoji reaction row for a single trash-talk message. */
export function MessageReactions({
  messageId,
  reactions,
  me,
}: {
  messageId: string;
  reactions: Reaction[];
  me: string | null;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const mine = reactions.filter((r) => r.user_id === me);
  const counts = new Map<string, number>();
  for (const r of reactions) counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);

  const toggle = useMutation({
    mutationFn: async (emoji: string) => {
      const uid = (await supabase.auth.getUser()).data.user?.id;
      if (!uid) throw new Error("You must be signed in");
      const existing = mine.find((r) => r.emoji === emoji);
      if (existing) {
        const { error } = await supabase.from("message_reactions").delete().eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("message_reactions")
          .insert({ message_id: messageId, user_id: uid, emoji });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["message-reactions"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not react"),
  });

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {[...counts.entries()].map(([emoji, count]) => {
        const reacted = mine.some((r) => r.emoji === emoji);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => toggle.mutate(emoji)}
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
              reacted
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            <span>{emoji}</span>
            <span className="tabular-nums">{count}</span>
          </button>
        );
      })}

      <div className="relative">
        <button
          type="button"
          aria-label="Add reaction"
          onClick={() => setOpen((v) => !v)}
          className="rounded-full border border-border p-1 text-muted-foreground transition-colors hover:text-primary"
        >
          <SmilePlus size={13} />
        </button>
        {open && (
          <div className="absolute bottom-full left-0 z-20 mb-1 flex gap-1 rounded-xl border border-border bg-popover p-1.5 shadow-lg">
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => toggle.mutate(emoji)}
                className="rounded-lg px-1.5 py-0.5 text-lg hover:bg-secondary"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
