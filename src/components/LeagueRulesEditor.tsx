import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteLeagueRule,
  listLeagueRules,
  reorderLeagueRules,
  upsertLeagueRule,
  type LeagueRule,
} from "@/lib/commissioner.functions";

export function LeagueRulesEditor({ leagueId }: { leagueId: string }) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [adding, setAdding] = useState(false);

  const listFn = useServerFn(listLeagueRules);
  const saveFn = useServerFn(upsertLeagueRule);
  const removeFn = useServerFn(deleteLeagueRule);
  const orderFn = useServerFn(reorderLeagueRules);

  const { data: rules = [] } = useQuery<LeagueRule[]>({
    queryKey: ["league-rules", leagueId],
    queryFn: () => listFn({ data: { leagueId } }),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["league-rules", leagueId] });

  function resetForm() {
    setEditingId(null);
    setAdding(false);
    setTitle("");
    setBody("");
  }

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          leagueId,
          ...(editingId ? { id: editingId } : {}),
          title: title.trim(),
          body: body.trim(),
        },
      }),
    onSuccess: () => {
      resetForm();
      invalidate();
      toast.success("Rules updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save that rule"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeFn({ data: { leagueId, id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Rule deleted");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete that rule"),
  });

  const reorder = useMutation({
    mutationFn: (ids: string[]) => orderFn({ data: { leagueId, ids } }),
    onSuccess: invalidate,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not reorder the rules"),
  });

  function move(index: number, delta: number) {
    const next = [...rules];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    reorder.mutate(next.map((r) => r.id));
  }

  const formOpen = adding || editingId !== null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>House rules</Label>
        {!formOpen && (
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setAdding(true)}>
            <Plus size={14} /> Add rule
          </Button>
        )}
      </div>

      {rules.length === 0 && !formOpen && (
        <p className="text-xs text-muted-foreground">
          No house rules yet. Anything you add shows on everyone's Picks page.
        </p>
      )}

      {rules.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {rules.map((rule, i) => (
            <li key={rule.id} className="flex items-start gap-2 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{rule.title}</p>
                {rule.body && (
                  <p className="whitespace-pre-wrap text-xs text-muted-foreground">{rule.body}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Move up"
                  disabled={i === 0 || reorder.isPending}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp size={13} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Move down"
                  disabled={i === rules.length - 1 || reorder.isPending}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown size={13} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Edit rule"
                  onClick={() => {
                    setAdding(false);
                    setEditingId(rule.id);
                    setTitle(rule.title);
                    setBody(rule.body);
                  }}
                >
                  <Pencil size={13} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  aria-label="Delete rule"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(rule.id)}
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {formOpen && (
        <div className="space-y-2 rounded-xl border border-border p-3">
          <Input
            value={title}
            maxLength={80}
            placeholder="Rule title (e.g. Weekly buy-in)"
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            value={body}
            maxLength={1000}
            rows={3}
            placeholder="Details (optional)"
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={save.isPending || title.trim().length === 0}
              onClick={() => save.mutate()}
            >
              {editingId ? "Save changes" : "Add rule"}
            </Button>
            <Button variant="ghost" size="sm" className="gap-1" onClick={resetForm}>
              <X size={14} /> Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
