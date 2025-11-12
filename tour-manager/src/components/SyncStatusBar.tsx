"use client";

import { SyncStatus } from "@/lib/syncManager";
import {
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  WifiIcon,
} from "@heroicons/react/24/outline";

interface SyncStatusBarProps {
  status: SyncStatus;
  onSync: () => Promise<void>;
}

export default function SyncStatusBar({ status, onSync }: SyncStatusBarProps) {
  const handleSync = async () => {
    await onSync();
  };

  // Show if offline, syncing, or has pending data
  const shouldShow =
    !status.isOnline ||
    status.isSyncing ||
    status.pendingSales > 0 ||
    status.pendingProducts ||
    status.pendingSettings;

  if (!shouldShow) return null;

  return (
    <div className="bg-theme-secondary border-b border-theme px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
      <div className="flex items-center gap-3 flex-wrap">
        {!status.isOnline ? (
          <div className="flex items-center gap-2 text-warning">
            <WifiIcon className="w-5 h-5" />
            <span className="text-sm font-medium">
              Offline - Changes saved locally
            </span>
          </div>
        ) : status.isSyncing ? (
          <div className="flex items-center gap-2 text-primary">
            <CloudArrowUpIcon className="w-5 h-5 animate-pulse" />
            <span className="text-sm font-medium">Syncing...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-warning">
            <ExclamationTriangleIcon className="w-5 h-5" />
            <div className="flex flex-col sm:flex-row sm:gap-2">
              {status.pendingSales > 0 && (
                <span className="text-sm font-medium">
                  {status.pendingSales} sale
                  {status.pendingSales === 1 ? "" : "s"} pending
                </span>
              )}
              {status.pendingProducts && (
                <span className="text-sm font-medium">
                  {status.pendingSales > 0 && "• "}Products pending
                </span>
              )}
              {status.pendingSettings && (
                <span className="text-sm font-medium">
                  {(status.pendingSales > 0 || status.pendingProducts) && "• "}
                  Settings pending
                </span>
              )}
            </div>
          </div>
        )}

        {status.lastSyncTime && !status.isSyncing && (
          <span className="text-xs text-theme-muted">
            Last synced: {new Date(status.lastSyncTime).toLocaleString()}
          </span>
        )}

        {status.error && (
          <span className="text-xs text-red-500">{status.error}</span>
        )}
      </div>

      {!status.isSyncing && !status.isOnline && (
        <button
          disabled
          className="px-4 py-2 bg-theme-tertiary text-theme-muted rounded-lg text-sm cursor-not-allowed opacity-50"
        >
          Offline
        </button>
      )}

      {!status.isSyncing &&
        status.isOnline &&
        (status.pendingSales > 0 ||
          status.pendingProducts ||
          status.pendingSettings) && (
          <button
            onClick={handleSync}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm rounded-lg active:scale-95 touch-manipulation transition-colors"
          >
            Sync Now
          </button>
        )}
    </div>
  );
}
