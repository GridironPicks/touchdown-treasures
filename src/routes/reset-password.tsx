import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset Password — Gridiron Confidence" },
      {
        name: "description",
        content: "Set a new password for your Gridiron Confidence league account.",
      },
      { property: "og:title", content: "Reset Password — Gridiron Confidence" },
      {
        property: "og:description",
        content: "Choose a new password and get back to making your weekly picks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendEmail, setResendEmail] = useState("");

  useEffect(() => {
    let done = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        done = true;
        setReady(true);
      }
    });

    // Fall back to whatever session the recovery link established.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        done = true;
        setReady(true);
      }
    });

    const t = setTimeout(() => {
      if (!done) setInvalid(true);
    }, 2500);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated — you're signed in.");
      navigate({ to: "/picks", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update your password");
    } finally {
      setBusy(false);
    }
  }

  async function resend(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await supabase.auth.resetPasswordForEmail(resendEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      toast.success("If that email is registered, a new reset link is on the way.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="field-panel w-full max-w-md rounded-2xl p-6 sm:p-8">
        <h1 className="stadium-heading text-3xl">
          <span className="chrome-text">GRIDIRON</span>{" "}
          <span className="text-primary">CONFIDENCE</span>
        </h1>

        {ready ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose a new password for your account.
            </p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                Save new password
              </Button>
            </form>
          </>
        ) : invalid ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              That reset link is expired or already used. Enter your email and we'll send a fresh
              one.
            </p>
            <form onSubmit={resend} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resend-email">Email</Label>
                <Input
                  id="resend-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                Send new reset link
              </Button>
            </form>
            <button
              type="button"
              className="mt-6 w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => navigate({ to: "/auth" })}
            >
              Back to sign in
            </button>
          </>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">Verifying your reset link…</p>
        )}
      </div>
    </div>
  );
}
