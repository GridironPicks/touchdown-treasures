import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Bell, BellOff, Share, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  getNotificationSettings,
  saveNotificationPrefs,
  savePushSubscription,
  removePushSubscription,
  sendTestNotification,
  type NotificationSettings,
} from "@/lib/notifications.functions";
import {
  CONSENT_VERSION,
  currentEndpoint,
  getPushSupport,
  subscribeToPush,
  unsubscribeFromPush,
  type PushSupport,
} from "@/lib/push";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Alerts & Install — Gridiron Confidence" },
      {
        name: "description",
        content:
          "Install Gridiron Confidence on your phone and choose which pick 'em alerts you get.",
      },
      { property: "og:title", content: "Alerts & Install — Gridiron Confidence" },
      {
        property: "og:description",
        content: "Deadline reminders, weekly results, trash talk and survivor alerts.",
      },
    ],
  }),
  component: NotificationsPage,
});

const TYPES = [
  {
    key: "deadlines" as const,
    label: "Pick deadline reminders",
    hint: "Week opens Monday, plus 24-hour and 2-hour warnings before the Wednesday 6:00 PM CT lock (only if you haven't submitted).",
  },
  {
    key: "results" as const,
    label: "Weekly results",
    hint: "Who won the week and where you finished, once every game is final.",
  },
  {
    key: "chat" as const,
    label: "Trash talk",
    hint: "New messages in your league chat.",
  },
  {
    key: "survivor" as const,
    label: "Survivor status",
    hint: "Survived or eliminated, as soon as your team's week wraps.",
  },
];

function NotificationsPage() {
  const queryClient = useQueryClient();
  const fetchSettings = useServerFn(getNotificationSettings);
  const savePrefs = useServerFn(saveNotificationPrefs);
  const saveSub = useServerFn(savePushSubscription);
  const removeSub = useServerFn(removePushSubscription);
  const sendTest = useServerFn(sendTestNotification);

  const [support, setSupport] = useState<PushSupport | null>(null);
  const [enabledHere, setEnabledHere] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: settings } = useQuery<NotificationSettings>({
    queryKey: ["notification-settings"],
    queryFn: () => fetchSettings(),
  });

  useEffect(() => {
    setSupport(getPushSupport());
    currentEndpoint().then((endpoint) => setEnabledHere(Boolean(endpoint)));
  }, []);

  const prefs = {
    deadlines: settings?.deadlines ?? true,
    results: settings?.results ?? true,
    chat: settings?.chat ?? false,
    survivor: settings?.survivor ?? true,
  };

  const updatePrefs = useMutation({
    mutationFn: (next: typeof prefs) => savePrefs({ data: { ...next, consentVersion: CONSENT_VERSION } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notification-settings"] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save"),
  });

  async function enable() {
    setBusy(true);
    try {
      const sub = await subscribeToPush();
      await saveSub({ data: sub });
      await savePrefs({ data: { ...prefs, consentVersion: CONSENT_VERSION } });
      setEnabledHere(true);
      setSupport(getPushSupport());
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
      toast.success("Alerts are on for this device");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not turn on alerts");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const endpoint = await unsubscribeFromPush();
      await removeSub({ data: endpoint ? { endpoint } : { all: true } });
      setEnabledHere(false);
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
      toast.success("Alerts turned off for this device");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not turn off alerts");
    } finally {
      setBusy(false);
    }
  }

  const blocked = support?.permission === "denied";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="stadium-heading text-2xl">
          <span className="chrome-text">ALERTS</span> <span className="text-primary">& INSTALL</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Put Gridiron Confidence on your home screen and never miss a deadline.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Smartphone size={18} className="text-primary" />
          <h2 className="font-semibold">Install the app</h2>
        </div>
        {support?.standalone ? (
          <p className="mt-2 text-sm text-primary">Installed — you're running the app version.</p>
        ) : (
          <div className="mt-3 space-y-3 text-sm text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">iPhone / iPad:</span> open the site in
              Safari, tap the <Share size={13} className="inline align-[-2px]" /> Share button, then{" "}
              <span className="font-semibold text-foreground">Add to Home Screen</span>.
            </p>
            <p>
              <span className="font-semibold text-foreground">Android:</span> tap the browser menu
              and choose <span className="font-semibold text-foreground">Install app</span> (or
              "Add to Home screen").
            </p>
            <p>
              <span className="font-semibold text-foreground">Desktop:</span> click the install icon
              in the address bar in Chrome or Edge.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-primary" />
          <h2 className="font-semibold">Push notifications</h2>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">
          We only send league activity: deadline reminders, weekly results, trash talk and survivor
          updates. No ads, no marketing, and nothing is shared with anyone outside your leagues. You
          can switch any of it off here at any time, and turning alerts off deletes the device
          record we use to reach you.
        </p>

        {support?.iosNeedsInstall && (
          <p className="mt-3 rounded-lg border border-border bg-secondary/60 p-3 text-sm">
            On iPhone, notifications only work after you add the app to your home screen (iOS 16.4
            or newer). Install it first, then open it from the icon and come back here.
          </p>
        )}

        {support && !support.supported && (
          <p className="mt-3 text-sm text-destructive">
            This browser doesn't support push notifications.
          </p>
        )}

        {blocked && (
          <p className="mt-3 text-sm text-destructive">
            Notifications are blocked in your browser settings for this site. Allow them there,
            then try again.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {enabledHere ? (
            <>
              <Button variant="outline" onClick={disable} disabled={busy}>
                <BellOff size={16} /> Turn off on this device
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={async () => {
                  const res = await sendTest({ data: undefined });
                  toast[res.sent > 0 ? "success" : "error"](
                    res.sent > 0 ? "Test alert sent" : "No devices received it",
                  );
                }}
              >
                Send a test
              </Button>
            </>
          ) : (
            <Button onClick={enable} disabled={busy || !support?.supported || blocked}>
              <Bell size={16} /> I agree — turn on alerts
            </Button>
          )}
        </div>

        {settings && settings.deviceCount > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Alerts active on {settings.deviceCount} device{settings.deviceCount === 1 ? "" : "s"}.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-semibold">What you get</h2>
        <div className="mt-3 space-y-4">
          {TYPES.map((type) => (
            <div key={type.key} className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor={type.key} className="text-sm font-semibold">
                  {type.label}
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">{type.hint}</p>
              </div>
              <Switch
                id={type.key}
                checked={prefs[type.key]}
                onCheckedChange={(checked) =>
                  updatePrefs.mutate({ ...prefs, [type.key]: checked })
                }
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
