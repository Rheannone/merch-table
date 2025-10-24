"use client";

import { useSession } from "next-auth/react";

export default function DebugPage() {
  const { data: session, status } = useSession();

  const handleResetCache = () => {
    if (
      confirm(
        "This will clear all local data and reload from Google Sheets. Continue?"
      )
    ) {
      localStorage.clear();
      globalThis.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Debug Info</h1>

      <div className="mb-6">
        <button
          onClick={handleResetCache}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded transition-all"
        >
          🔄 Reset Cache & Reload from Sheets
        </button>
        <p className="text-zinc-400 text-sm mt-2">
          Clears localStorage and reloads products from Google Sheets
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-red-500">
            Session Status:
          </h2>
          <pre className="bg-zinc-800 p-4 rounded mt-2 overflow-auto">
            {status}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-red-500">Session Data:</h2>
          <pre className="bg-zinc-800 p-4 rounded mt-2 overflow-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-red-500">Environment:</h2>
          <pre className="bg-zinc-800 p-4 rounded mt-2 overflow-auto">
            {`NEXT_PUBLIC_URL: ${process.env.NEXT_PUBLIC_URL || "not set"}
NODE_ENV: ${process.env.NODE_ENV}`}
          </pre>
        </div>
      </div>
    </div>
  );
}
