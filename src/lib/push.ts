/** Public VAPID key — safe to ship to the browser by design. */
export const VAPID_PUBLIC_KEY =
  "BB3qyK_xJFIoLcZFVYPDHrMX1A-6tVy54UcD6xKLuCrLsVzECdkp-W4tcWq7UkznAGo7Lr1Bu8f9Jw5eiwhrVkA";

export const CONSENT_VERSION = "2026-08-15";

export type PushSupport = {
  supported: boolean;
  standalone: boolean;
  iosNeedsInstall: boolean;
  permission: NotificationPermission | "unsupported";
};

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function getPushSupport(): PushSupport {
  if (typeof window === "undefined") {
    return { supported: false, standalone: false, iosNeedsInstall: false, permission: "unsupported" };
  }
  const hasApi =
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  const standalone = isStandalone();
  return {
    supported: hasApi,
    standalone,
    iosNeedsInstall: isIos() && !standalone,
    permission: hasApi ? Notification.permission : "unsupported",
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function bufferToBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export type BrowserSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
  deviceLabel: string;
};

async function registration(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
}

/** Asks permission (browser prompt) and returns the push subscription details. */
export async function subscribeToPush(): Promise<BrowserSubscription> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notifications were blocked in your browser.");

  const reg = await registration();
  await navigator.serviceWorker.ready;

  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    }));

  return {
    endpoint: sub.endpoint,
    p256dh: bufferToBase64Url(sub.getKey("p256dh")),
    auth: bufferToBase64Url(sub.getKey("auth")),
    deviceLabel: navigator.userAgent.slice(0, 120),
  };
}

/** Removes the browser subscription. Returns the endpoint that was removed, if any. */
export async function unsubscribeFromPush(): Promise<string | null> {
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
  if (!reg) return null;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}

export async function currentEndpoint(): Promise<string | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration("/push-sw.js");
  const sub = await reg?.pushManager.getSubscription();
  return sub?.endpoint ?? null;
}
