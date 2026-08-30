import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Lock, Trophy, GitBranch } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { TeamLogo } from "@/components/TeamLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLeague } from "@/lib/league-context";
import { PLAYOFF_ROUNDS, teamShort } from "@/lib/league";
import { conferenceOf, type Conference } from "@/lib/conference";
import { getBracketState, submitBracket } from "@/lib/bracket.functions";
import { ROUND_SLOTS } from "@/lib/bracket";

export const Route = createFileRoute("/_authenticated/bracket")({
  head: () => ({
    meta: [
      { title: "Bracket Challenge — Gridiron Confidence" },
      {
        name: "description",
        content:
          "Fill one NFL playoff bracket before Wild Card kickoff and earn escalating points every round up to the Super Bowl.",
      },
      { property: "og:title", content: "Bracket Challenge — Gridiron Confidence" },
      {
        property: "og:description",
        content: "One bracket, four rounds, 2-4-8-16 points. Locks at Wild Card kickoff.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BracketPage,
});

const CONFS: Conference[] = ["AFC", "NFC"];

/** Slot keys are round + conference + index, flattened into the picks table. */
function slotKey(round: number, conf: Conference, i: number): number {
  return (conf === "AFC" ? 0 : 6) + i + (round === 1 ? 0 : 0);
}

function BracketPage() {
  const { activeLeague } = useLeague();
  const qc = useQueryClient();
  const fetchState = useServerFn(getBracketState);
  const submit = useServerFn(submitBracket);

  const { data: state, isLoading } = useQuery({
    queryKey: ["bracket", activeLeague?.id],
    enabled: !!activeLeague,
    queryFn: () => fetchState({ data: { leagueId: activeLeague!.id } }),
  });

  // selections[round][conference] = teams advanced out of that round
  const [sel, setSel] = useState<Record<string, string[]>>({});
  const [tiebreak, setTiebreak] = useState("");

  const alive = useMemo(() => {
    const out: Record<string, Record<Conference, string[]>> = {};
    for (const conf of CONFS) {
      let pool = state?.field[conf] ?? [];
      for (const round of [1, 2, 3, 4]) {
        out[round] = out[round] ?? ({} as Record<Conference, string[]>);
        out[round]![conf] = pool;
        pool = sel[`${round}-${conf}`] ?? [];
      }
    }
    return out;
  }, [state, sel]);

  const toggle = (round: number, conf: Conference, team: string) => {
    const key = `${round}-${conf}`;
    const limit = round === 4 ? 1 : ROUND_SLOTS[round]!;
    setSel((prev) => {
      const cur = prev[key] ?? [];
      const next = cur.includes(team)
        ? cur.filter((t) => t !== team)
        : [...cur, team].slice(-limit);
      const updated = { ...prev, [key]: next };
      // Dropping a team invalidates every later round it appeared in.
      for (const later of [round + 1, round + 2, round + 3]) {
        const lk = `${later}-${conf}`;
        if (updated[lk]) updated[lk] = updated[lk]!.filter((t) => next.includes(t));
      }
      return updated;
    });
  };

  const championOptions = useMemo(
    () => CONFS.flatMap((c) => sel[`3-${c}`] ?? []),
    [sel],
  );
  const [champion, setChampion] = useState("");

  const complete =
    CONFS.every((c) =>
      [1, 2, 3].every((r) => (sel[`${r}-${c}`] ?? []).length === ROUND_SLOTS[r]),
    ) &&
    championOptions.includes(champion) &&
    tiebreak !== "";

  const save = useMutation({
    mutationFn: async () => {
      const picks: { round: number; slot: number; team: string }[] = [];
      for (const conf of CONFS) {
        for (const round of [1, 2, 3]) {
          (sel[`${round}-${conf}`] ?? []).forEach((team, i) => {
            picks.push({ round, slot: slotKey(round, conf, i), team });
          });
        }
      }
      picks.push({ round: 4, slot: 0, team: champion });
      return submit({
        data: {
          leagueId: activeLeague!.id,
          champion,
          tiebreakTotal: Number(tiebreak),
          picks,
        },
      });
    },
    onSuccess: () => {
      toast.success("Bracket locked in — good luck.");
      qc.invalidateQueries({ queryKey: ["bracket", activeLeague?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const alreadyEntered = !!state?.myChampion;
  const fieldSet = (state?.field.AFC.length ?? 0) > 0;

  return (
    <AppShell>
      <div className="space-y-4">
        <div>
          <h1 className="stadium-heading text-2xl">
            <span className="chrome-text">BRACKET</span>{" "}
            <span className="text-primary">CHALLENGE</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            One bracket, filled before Wild Card kickoff. Every team you advance correctly scores{" "}
            {Object.values(PLAYOFF_ROUNDS).map((r) => r.points).join(" / ")} points by round.
          </p>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Loading bracket…</p>}

        {!isLoading && !fieldSet && (
          <section className="field-panel rounded-2xl p-5 text-sm text-muted-foreground">
            The playoff field isn't set yet. Once Week 18 wraps and the Wild Card matchups are
            official, the bracket opens here.
          </section>
        )}

        {fieldSet && (state?.locked || alreadyEntered) && (
          <section className="field-panel flex items-start gap-2 rounded-2xl p-4 text-sm">
            <Lock size={16} className="mt-0.5 shrink-0 text-primary" />
            <p className="text-muted-foreground">
              {alreadyEntered
                ? `Your bracket is submitted — champion: ${state?.myChampion}.`
                : "Wild Card weekend has kicked off, so brackets are locked."}
            </p>
          </section>
        )}

        {fieldSet && !state?.locked && !alreadyEntered && (
          <>
            {[1, 2, 3].map((round) => (
              <section key={round} className="field-panel rounded-2xl p-4">
                <h2 className="stadium-heading flex items-center gap-2 text-sm">
                  <GitBranch size={14} className="text-primary" />
                  {PLAYOFF_ROUNDS[round]!.label} · {PLAYOFF_ROUNDS[round]!.points} pts each
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Advance {ROUND_SLOTS[round]} team{ROUND_SLOTS[round]! > 1 ? "s" : ""} per
                  conference.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {CONFS.map((conf) => (
                    <div key={conf}>
                      <p className="mb-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
                        {conf}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(alive[round]?.[conf] ?? []).map((team) => {
                          const on = (sel[`${round}-${conf}`] ?? []).includes(team);
                          return (
                            <button
                              key={team}
                              type="button"
                              onClick={() => toggle(round, conf, team)}
                              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs transition ${
                                on
                                  ? "border-primary bg-primary/15 text-foreground"
                                  : "border-border text-muted-foreground hover:border-primary/50"
                              }`}
                            >
                              <TeamLogo team={team} size={18} />
                              {teamShort(team)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            <section className="field-panel rounded-2xl p-4">
              <h2 className="stadium-heading flex items-center gap-2 text-sm">
                <Trophy size={14} className="text-gold" />
                Super Bowl champion · {PLAYOFF_ROUNDS[4]!.points} pts
              </h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {championOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Pick your conference championship winners first.
                  </p>
                )}
                {championOptions.map((team) => (
                  <button
                    key={team}
                    type="button"
                    onClick={() => setChampion(team)}
                    className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs transition ${
                      champion === team
                        ? "border-gold bg-gold/15 text-foreground"
                        : "border-border text-muted-foreground hover:border-gold/50"
                    }`}
                  >
                    <TeamLogo team={team} size={18} />
                    {teamShort(team)}
                  </button>
                ))}
              </div>

              <div className="mt-4 max-w-xs">
                <Label htmlFor="tb" className="text-xs">
                  Tiebreaker — total combined Super Bowl points
                </Label>
                <Input
                  id="tb"
                  inputMode="numeric"
                  value={tiebreak}
                  onChange={(e) => setTiebreak(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  placeholder="48"
                  className="mt-1"
                />
              </div>

              <Button
                className="mt-4 w-full sm:w-auto"
                disabled={!complete || save.isPending}
                onClick={() => save.mutate()}
              >
                {save.isPending ? "Submitting…" : "Submit bracket (final)"}
              </Button>
              {!complete && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Complete every round, pick a champion and enter a tiebreaker to submit.
                </p>
              )}
            </section>
          </>
        )}

        {(state?.standings.length ?? 0) > 0 && (
          <section className="field-panel rounded-2xl p-4">
            <h2 className="stadium-heading text-sm">Bracket standings</h2>
            <ul className="mt-3 space-y-1.5">
              {state!.standings.map((s, i) => (
                <li
                  key={s.user_id}
                  className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2 text-sm"
                >
                  <span className="w-5 text-xs text-muted-foreground">{i + 1}</span>
                  <Mascot name={s.mascot} color={s.primary_color} size="sm" />
                  <span className="min-w-0 flex-1 truncate">{s.team_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {s.champion ? `${teamShort(s.champion)} · ` : s.revealed ? "" : "Hidden · "}
                    {s.points} pts
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </AppShell>
  );
}
