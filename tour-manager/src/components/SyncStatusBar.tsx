"use client";

import { SyncStatus } from "@/types";
import {
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

interface SyncStatusBarProps {
  status: SyncStatus;
  onSync: () => Promise<void>;
}

export default function SyncStatusBar({ status, onSync }: SyncStatusBarProps) {
  const handleSync = async () => {
    await onSync();
  };

  // Only show if there's something to sync or actively syncing
  const shouldShow =
    status.isSyncing || status.pendingSales > 0 || status.pendingProductSync;

  if (!shouldShow) return null;

  return (
    <div className="bg-theme-secondary border-b border-theme px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
      <div className="flex items-center gap-3 flex-wrap">
        {status.isSyncing ? (
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
              {status.pendingProductSync && (
                <span className="text-sm font-medium">
                  {status.pendingSales > 0 && "• "}Products pending sync
                </span>
              )}
            </div>
          </div>
        )}

        {status.totalSales > 0 && (
          <span className="text-xs text-theme-muted border-l border-theme pl-3">
            Total: {status.totalSales} sale{status.totalSales === 1 ? "" : "s"}
          </span>
        )}

        {status.lastSyncTime && (
          <span className="text-xs text-theme-muted">
            Last synced: {new Date(status.lastSyncTime).toLocaleString()}
          </span>
        )}
      </div>

      {!status.isSyncing && (
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
