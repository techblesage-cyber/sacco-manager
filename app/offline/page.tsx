import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="max-w-sm text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
          <WifiOff size={26} />
        </span>
        <h1 className="mt-5 text-xl font-bold">You are offline</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Your records stay on the SACCO's server, so they can only be shown when you have a connection. Check your
          internet and try again.
        </p>
        <a href="/" className="btn btn-primary mt-6">Try again</a>
      </div>
    </main>
  );
}
