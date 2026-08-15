import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Download, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getPushSupport } from "@/lib/push";

const DISMISS_KEY = "gc-install-dismissed";

type InstallPromptEvent = Event & { prompt: () => Promise<void> };

/** Nudge to install the app + turn on alerts. Hidden once installed or dismissed. */
export function InstallAppCard() {
  const [show, setShow] = useState(false);
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const support = getPushSupport();
    const dismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
    if (support.standalone || dismissed) return;
    setShow(true);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!show) return null;

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  return (
    <div className="relative mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:text-foreground"
      >
        <X size={15} />
      </button>
      <div className="flex items-start gap-3">
        <Download size={18} className="mt-0.5 text-primary" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">Get the app on your phone</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add Gridiron Confidence to your home screen and turn on deadline alerts so you never
            miss a Wednesday lock.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {deferred && (
              <Button
                size="sm"
                onClick={async () => {
                  await deferred.prompt();
                  setDeferred(null);
                  dismiss();
                }}
              >
                <Download size={15} /> Install
              </Button>
            )}
            <Button asChild size="sm" variant={deferred ? "outline" : "default"}>
              <Link to="/notifications">
                <Bell size={15} /> Set up alerts
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
