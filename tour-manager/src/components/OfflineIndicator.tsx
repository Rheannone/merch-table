"use client";

import { useState, useEffect } from "react";
import { SignalSlashIcon } from "@heroicons/react/24/outline";

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    globalThis.addEventListener("online", handleOnline);
    globalThis.addEventListener("offline", handleOffline);

    return () => {
      globalThis.removeEventListener("online", handleOnline);
      globalThis.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-yellow-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
      <SignalSlashIcon className="w-5 h-5" />
      <span className="font-semibold">Offline Mode</span>
      <span className="text-sm opacity-90">- Sales saved locally</span>
    </div>
  );
}
