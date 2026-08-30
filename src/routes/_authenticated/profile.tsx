import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Mail, ShieldCheck, LogOut, KeyRound, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useLeague } from "@/lib/league-context";
import { deleteMyAccount } from "@/lib/account.functions";
import { MASCOTS, SIGNATURE_CRESTS, TEAM_COLORS } from "@/lib/league";
import { NFL_BADGES } from "@/lib/teams";
import { Mascot } from "@/components/Mascot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Gridiron Confidence" },
      {
        name: "description",
        content:
          "Edit your franchise badge, team name and colors, and manage your sign-in details and leagues.",
      },
      { property: "og:title", content: "Profile — Gridiron Confidence" },
      {
        property: "og:description",
        content: "Your franchise identity, sign-in details, leagues and account settings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function fmt(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { leagues } = useLeague();
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const removeAccount = useServerFn(deleteMyAccount);

  const [teamName, setTeamName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mascot, setMascot] = useState("eagle");
  const [color, setColor] = useState(TEAM_COLORS[0]!);

  const { data: account, isLoading } = useQuery({
    queryKey: ["account"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      return { user, profile };
    },
  });

  const user = account?.user;
  const profile = account?.profile;

  useEffect(() => {
    if (!profile) return;
    setTeamName(profile.team_name);
    setDisplayName(profile.display_name);
    setMascot(profile.mascot);
    setColor(profile.primary_color);
  }, [profile]);

  const provider = (user?.app_metadata?.["provider"] as string | undefined) ?? "email";
  const providerLabel =
    provider === "google" ? "Google" : provider === "email" ? "Email & password" : provider;

  async function saveFranchise() {
    setSaving(true);
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      await removeAccount({ data: undefined });
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
      toast.success("Your account has been deleted.");
      navigate({ to: "/auth", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete your account");
      setDeleting(false);
    }
  }

  async function sendReset() {
    if (!user?.email) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset link sent to your email.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset link");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="stadium-heading text-3xl">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Your franchise identity and everything tied to your login.
        </p>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your profile…</p>
      ) : (
        <>
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
            <h2 className="stadium-heading text-xl">Franchise</h2>
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
              <Tabs
                defaultValue={
                  mascot.startsWith("nfl:")
                    ? "nfl"
                    : mascot.startsWith("crest-")
                      ? "crests"
                      : "mascots"
                }
              >
                <TabsList className="w-full">
                  <TabsTrigger className="flex-1" value="mascots">
                    Mascots
                  </TabsTrigger>
                  <TabsTrigger className="flex-1" value="crests">
                    Crests
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

                <TabsContent value="crests" className="mt-3">
                  <p className="mb-3 text-xs text-muted-foreground">
                    Optional 3D signature crests — your current badge stays put unless you pick one.
                  </p>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {SIGNATURE_CRESTS.map((m) => (
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
                        <span className="w-full truncate text-center">{m.label}</span>
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

            <Button className="w-full" onClick={saveFranchise} disabled={saving}>
              Save franchise
            </Button>
          </section>

          <section className="field-panel space-y-4 rounded-2xl p-5">
            <h2 className="stadium-heading text-xl">Sign-in details</h2>
            <div className="flex items-start gap-3">
              <Mail size={18} className="mt-0.5 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Account email
                </p>
                <p className="break-all font-medium">{user?.email ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-primary" />
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Sign-in method
                </p>
                <p className="font-medium capitalize">{providerLabel}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Account created
                </p>
                <p className="text-sm">{fmt(user?.created_at)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Last sign-in
                </p>
                <p className="text-sm">{fmt(user?.last_sign_in_at)}</p>
              </div>
            </div>
          </section>

          <section className="field-panel space-y-3 rounded-2xl p-5">
            <h2 className="stadium-heading text-xl">Your leagues</h2>
            {leagues.length === 0 ? (
              <p className="text-sm text-muted-foreground">You're not in any leagues yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {leagues.map((league) => (
                  <li key={league.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="truncate text-sm font-medium">{league.name}</span>
                    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] uppercase tracking-widest text-muted-foreground">
                      {league.role}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="secondary" className="w-full sm:w-auto">
              <Link to="/leagues">Manage leagues</Link>
            </Button>
          </section>

          <section className="field-panel space-y-3 rounded-2xl p-5">
            <h2 className="stadium-heading text-xl">Security</h2>
            <p className="text-sm text-muted-foreground">
              We'll email a secure reset link to {user?.email ?? "your account email"}.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={sendReset} disabled={busy || !user?.email}>
                <KeyRound size={16} /> Change password
              </Button>
              <Button variant="secondary" onClick={signOut}>
                <LogOut size={16} /> Sign out
              </Button>
            </div>
          </section>

          <section className="field-panel space-y-3 rounded-2xl border-destructive/40 p-5">
            <h2 className="stadium-heading text-xl text-destructive">Danger zone</h2>
            <p className="text-sm text-muted-foreground">
              Deleting your account permanently removes your profile, picks, survivor picks,
              messages, badges and league memberships. This cannot be undone.
            </p>
            <AlertDialog
              onOpenChange={(open) => {
                if (!open) setConfirmText("");
              }}
            >
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">
                  <Trash2 size={16} /> Delete my account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes {user?.email ?? "your account"} and every pick,
                    trophy and message tied to it. Type DELETE below to confirm.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  aria-label="Type DELETE to confirm"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={confirmText.trim().toUpperCase() !== "DELETE" || deleting}
                    onClick={(e) => {
                      e.preventDefault();
                      void deleteAccount();
                    }}
                  >
                    {deleting ? "Deleting…" : "Delete forever"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </section>
        </>
      )}
    </div>
  );
}
