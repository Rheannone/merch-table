"use client";

import { useSession } from "next-auth/react";

export default function DebugPage() {
  const { data: session, status } = useSession();

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Info</h1>

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
