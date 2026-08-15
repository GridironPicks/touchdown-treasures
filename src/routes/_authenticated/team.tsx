import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { MASCOTS, TEAM_COLORS } from "@/lib/league";
import { Mascot } from "@/components/Mascot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "Team Setup — Gridiron Confidence" },
      {
        name: "description",
        content: "Name your franchise, pick a mascot badge and lock in your team colors.",
      },
      { property: "og:title", content: "Team Setup — Gridiron Confidence" },
      {
        property: "og:description",
        content: "Build your franchise identity before kickoff week.",
      },
    ],
  }),
  component: TeamPage,
});

function TeamPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [teamName, setTeamName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mascot, setMascot] = useState("eagle");
  const [color, setColor] = useState(TEAM_COLORS[0]!);
  const [busy, setBusy] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!profile) return;
    setTeamName(profile.team_name);
    setDisplayName(profile.display_name);
    setMascot(profile.mascot);
    setColor(profile.primary_color);
  }, [profile]);

  async function save() {
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("profiles").upsert({
        id: auth.user!.id,
        team_name: teamName.trim().slice(0, 40) || "Unnamed Squad",
        display_name: displayName.trim().slice(0, 40) || "New Manager",
        mascot,
        primary_color: color,
      });
      if (error) throw error;
      await queryClient.invalidateQueries();
      toast.success("Franchise saved");
      navigate({ to: "/picks" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="stadium-heading text-3xl">Team Setup</h1>
        <p className="text-sm text-muted-foreground">Your badge shows up on every leaderboard.</p>
      </header>

      <section className="field-panel flex items-center gap-4 rounded-2xl p-5">
        <Mascot mascot={mascot} color={color} size="lg" />
        <div className="min-w-0">
          <p className="stadium-heading truncate text-2xl" style={{ color }}>
            {teamName || "Your Team Name"}
          </p>
          <p className="truncate text-sm text-muted-foreground">
            Managed by {displayName || "you"}
          </p>
        </div>
      </section>

      <section className="field-panel space-y-5 rounded-2xl p-5">
        <div className="space-y-2">
          <Label htmlFor="team">Team name</Label>
          <Input
            id="team"
            maxLength={40}
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Ridgeway Rockets"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="manager">Manager name</Label>
          <Input
            id="manager"
            maxLength={40}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Coach Dustin"
          />
        </div>

        <div className="space-y-3">
          <Label>Team badge</Label>
          <Tabs defaultValue={mascot.startsWith("nfl:") ? "nfl" : "mascots"}>
            <TabsList className="w-full">
              <TabsTrigger className="flex-1" value="mascots">
                Mascots
              </TabsTrigger>
              <TabsTrigger className="flex-1" value="nfl">
                NFL Teams
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mascots" className="mt-3">
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                {MASCOTS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMascot(m.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 text-[11px] transition-colors ${
                      mascot === m.id
                        ? "glow-ring border-primary text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <Mascot mascot={m.id} color={mascot === m.id ? color : null} size="sm" />
                    {m.label}
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="nfl" className="mt-3">
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                {NFL_BADGES.map((t) => {
                  const id = `nfl:${t.abbr}`;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMascot(id)}
                      title={t.name}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 text-[10px] transition-colors ${
                        mascot === id
                          ? "glow-ring border-primary text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      <Mascot mascot={id} color={mascot === id ? color : null} size="sm" />
                      <span className="w-full truncate text-center">{t.short}</span>
                    </button>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-3">
          <Label>Team color</Label>
          <div className="flex flex-wrap gap-3">
            {TEAM_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                onClick={() => setColor(c)}
                className={`h-9 w-9 rounded-full border-2 transition-transform ${
                  color === c ? "scale-110 border-foreground" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <Button className="w-full" onClick={save} disabled={busy}>
          Save franchise
        </Button>
      </section>
    </div>
  );
}
