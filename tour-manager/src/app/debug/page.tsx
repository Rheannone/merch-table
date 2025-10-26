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

  const handleCheckInsights = async () => {
    const spreadsheetId = localStorage.getItem("salesSheetId");
    if (!spreadsheetId) {
      alert("No spreadsheet ID found. Please initialize sheets first.");
      return;
    }

    try {
      const response = await fetch("/api/sheets/check-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId }),
      });

      const data = await response.json();
      console.log("Insights check result:", data);
      alert(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Error checking insights:", error);
      alert("Error checking insights: " + (error as Error).message);
    }
  };

  const handleRecreateInsights = async () => {
    if (!confirm("This will recreate the Insights sheet. Continue?")) return;

    const spreadsheetId = localStorage.getItem("salesSheetId");
    if (!spreadsheetId) {
      alert("No spreadsheet ID found. Please initialize sheets first.");
      return;
    }

    try {
      // First delete the existing Insights sheet if it exists
      const deleteResponse = await fetch("/api/sheets/delete-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId }),
      });

      console.log("Delete response:", await deleteResponse.text());

      // Then create a new one
      const createResponse = await fetch("/api/sheets/create-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId }),
      });

      const data = await createResponse.json();
      console.log("Create insights result:", data);
      alert(data.message || "Insights sheet recreated successfully!");
    } catch (error) {
      console.error("Error recreating insights:", error);
      alert("Error recreating insights: " + (error as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Debug Info</h1>

      <div className="mb-6 space-y-4">
        <div>
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

        <div>
          <button
            onClick={handleCheckInsights}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition-all mr-4"
          >
            🔍 Check Insights Sheet
          </button>
          <button
            onClick={handleRecreateInsights}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded transition-all"
          >
            ✨ Recreate Insights Sheet
          </button>
          <p className="text-zinc-400 text-sm mt-2">
            Debug the insights sheet or recreate it with updated formulas
          </p>
        </div>
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
