"use client";

import { useState, useEffect, useRef } from "react";
import { SignalSlashIcon, SignalIcon } from "@heroicons/react/24/outline";

/**
 * Floating connectivity status. Shows a persistent banner while offline and
 * a short "back online" confirmation when the connection returns. Sales made
 * offline are saved to IndexedDB and synced by the sync service on reconnect.
 */
export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [showBackOnline, setShowBackOnline] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline.current) {
        setShowBackOnline(true);
        wasOffline.current = false;
      }
    };
    const handleOffline = () => {
      wasOffline.current = true;
      setShowBackOnline(false);
      setIsOnline(false);
    };

    globalThis.addEventListener("online", handleOnline);
    globalThis.addEventListener("offline", handleOffline);

    return () => {
      globalThis.removeEventListener("online", handleOnline);
      globalThis.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!showBackOnline) return;
    const timer = setTimeout(() => setShowBackOnline(false), 4000);
    return () => clearTimeout(timer);
  }, [showBackOnline]);

  if (isOnline && showBackOnline) {
    return (
      <div
        role="status"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-success text-theme px-4 py-3 rounded-lg shadow-lg flex items-center gap-2"
      >
        <SignalIcon className="w-5 h-5" />
        <span className="font-semibold">Back online</span>
        <span className="text-sm opacity-90">— syncing your sales</span>
      </div>
    );
  }

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-warning text-theme px-4 py-3 rounded-lg shadow-lg flex items-center gap-2"
    >
      <SignalSlashIcon className="w-5 h-5" />
      <span className="font-semibold">You&apos;re offline</span>
      <span className="text-sm opacity-90">
        — sales are saved on this device
      </span>
    </div>
  );
}
