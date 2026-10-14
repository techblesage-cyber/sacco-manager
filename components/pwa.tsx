"use client";

import { useEffect, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

const DISMISS_KEY = "install-prompt-dismissed";

function isInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function wasDismissed() {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function PwaClient() {
  const [update, setUpdate] = useState<ServiceWorker | null>(null);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;

    let reloading = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    let registration: ServiceWorkerRegistration | undefined;

    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };

    const watch = (worker: ServiceWorker | null) => {
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) setUpdate(worker);
      });
    };

    const check = () => {
      registration?.update().catch(() => undefined);
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        registration = reg;
        if (reg.waiting && navigator.serviceWorker.controller) setUpdate(reg.waiting);
        reg.addEventListener("updatefound", () => watch(reg.installing));
        timer = setInterval(check, 30 * 60 * 1000);
        document.addEventListener("visibilitychange", onVisible);
      })
      .catch(() => undefined);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisible);
      if (timer) clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (isInstalled() || wasDismissed()) return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (ios) setIosHint(true);

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismissInstall() {
    setInstallEvent(null);
    setIosHint(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* storage unavailable */
    }
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice.catch(() => undefined);
    setInstallEvent(null);
  }

  return (
    <>
      {update && (
        <div
          role="status"
          className="no-print fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-3 bg-[var(--brand)] px-4 py-2.5 text-sm text-white"
          style={{ paddingTop: "calc(0.625rem + env(safe-area-inset-top))" }}
        >
          <span>A new version is ready.</span>
          <button
            type="button"
            onClick={() => update.postMessage({ type: "SKIP_WAITING" })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-[var(--brand)]"
          >
            <RefreshCw size={14} /> Update now
          </button>
        </div>
      )}

      {(installEvent || iosHint) && (
        <div className="no-print fixed inset-x-3 bottom-20 z-[55] mx-auto flex max-w-md items-center gap-3 rounded-xl border border-[var(--line)] bg-white p-3 pl-4 shadow-lg lg:bottom-4">
          <div className="min-w-0 flex-1 text-sm">
            <div className="font-semibold">Install this app</div>
            <div className="text-xs text-[var(--muted)]">
              {installEvent ? "Open it like any other app on your device." : "Tap Share, then Add to Home Screen."}
            </div>
          </div>
          {installEvent && (
            <button type="button" onClick={install} className="btn btn-primary btn-sm">
              <Download size={15} /> Install
            </button>
          )}
          <button type="button" onClick={dismissInstall} aria-label="Dismiss" className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
      )}
    </>
  );
}
