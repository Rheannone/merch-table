"use client";

import { SyncStatus } from "@/types";
import {
  CloudArrowUpIcon,
  CheckCircleIcon,
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

  return (
    <div className="bg-zinc-800 border-b border-zinc-700 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
      <div className="flex items-center gap-3 flex-wrap">
        {status.isSyncing ? (
          <div className="flex items-center gap-2 text-blue-400">
            <CloudArrowUpIcon className="w-5 h-5 animate-pulse" />
            <span className="text-sm font-medium">Syncing...</span>
          </div>
        ) : status.pendingSales > 0 || status.pendingProductSync ? (
          <div className="flex items-center gap-2 text-amber-400">
            <ExclamationTriangleIcon className="w-5 h-5" />
            <div className="flex flex-col sm:flex-row sm:gap-2">
              {status.pendingSales > 0 && (
                <span className="text-sm font-medium">
                  {status.pendingSales} sale{status.pendingSales === 1 ? "" : "s"} pending
                </span>
              )}
              {status.pendingProductSync && (
                <span className="text-sm font-medium">
                  {status.pendingSales > 0 && "• "}Products pending sync
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircleIcon className="w-5 h-5" />
            <span className="text-sm font-medium">All synced</span>
          </div>
        )}

        <span className="text-xs text-zinc-400 border-l border-zinc-700 pl-3">
          Total: {status.totalSales} sale{status.totalSales === 1 ? "" : "s"}
        </span>

        {status.lastSyncTime && (
          <span className="text-xs text-zinc-500">
            Last synced: {new Date(status.lastSyncTime).toLocaleString()}
          </span>
        )}
      </div>

      {(status.pendingSales > 0 || status.pendingProductSync) && !status.isSyncing && (
        <button
          onClick={handleSync}
          className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 active:scale-95 touch-manipulation"
        >
          Sync Now
        </button>
      )}
    </div>
  );
}
