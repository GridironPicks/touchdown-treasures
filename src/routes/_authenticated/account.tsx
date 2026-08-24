import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Mail, ShieldCheck, LogOut, KeyRound, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useLeague } from "@/lib/league-context";
import { deleteMyAccount } from "@/lib/account.functions";
import { Mascot } from "@/components/Mascot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "My Account — Gridiron Confidence" },
      {
        name: "description",
        content: "See the email on your account, your franchise details and your leagues.",
      },
      { property: "og:title", content: "My Account — Gridiron Confidence" },
      {
        property: "og:description",
        content: "Account email, sign-in method, franchise info and league memberships.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPage,
});

function fmt(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function AccountPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { leagues } = useLeague();
  const [busy, setBusy] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const removeAccount = useServerFn(deleteMyAccount);

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
  const provider = (user?.app_metadata?.["provider"] as string | undefined) ?? "email";
  const providerLabel =
    provider === "google" ? "Google" : provider === "email" ? "Email & password" : provider;

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
        <h1 className="stadium-heading text-3xl">My Account</h1>
        <p className="text-sm text-muted-foreground">
          Everything tied to your login lives here.
        </p>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your account…</p>
      ) : (
        <>
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

          <section className="field-panel space-y-4 rounded-2xl p-5">
            <h2 className="stadium-heading text-xl">Franchise</h2>
            <div className="flex items-center gap-4">
              <Mascot
                mascot={profile?.mascot ?? "eagle"}
                color={profile?.primary_color ?? null}
                size="lg"
              />
              <div className="min-w-0">
                <p
                  className="stadium-heading truncate text-2xl"
                  {...(profile?.primary_color ? { style: { color: profile.primary_color } } : {})}
                >
                  {profile?.team_name ?? "Unnamed Squad"}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  Managed by {profile?.display_name ?? "you"}
                </p>
              </div>
            </div>
            <Button asChild variant="secondary" className="w-full sm:w-auto">
              <Link to="/team">Edit team setup</Link>
            </Button>
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
