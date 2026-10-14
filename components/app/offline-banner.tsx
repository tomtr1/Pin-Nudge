"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div role="alert" className="flex items-center gap-2 border-b border-danger/20 bg-danger-soft px-4 py-2 text-[13px] text-danger sm:px-6">
      <WifiOff className="size-4 shrink-0" aria-hidden />
      You're offline. Changes can't be saved until your connection is back.
    </div>
  );
}
