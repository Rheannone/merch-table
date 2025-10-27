"use client";

import { useSession } from "next-auth/react";

export default function DebugPage() {
  const { data: session, status } = useSession();

  const handleNuclearReset = async () => {
    if (
      !confirm(
        "🚨 NUCLEAR RESET 🚨\n\n" +
          "This will COMPLETELY WIPE:\n" +
          "✅ localStorage (sheet IDs, settings)\n" +
          "✅ sessionStorage\n" +
          "✅ IndexedDB (all products & sales)\n" +
          "✅ All cookies\n" +
          "✅ Service worker cache\n" +
          "\n" +
          "You will be signed out and redirected to the home page.\n" +
          "\n" +
          "⚠️ IMPORTANT: You must manually delete your 'Merch Table' spreadsheet from Google Drive after this.\n" +
          "\n" +
          "Continue?"
      )
    ) {
      return;
    }

    try {
      console.log("🧹 Starting nuclear reset...");

      // 1. Clear localStorage
      localStorage.clear();
      console.log("✅ Cleared localStorage");

      // 2. Clear sessionStorage
      sessionStorage.clear();
      console.log("✅ Cleared sessionStorage");

      // 3. Delete IndexedDB
      await new Promise<void>((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase("merch-pos-db");
        deleteRequest.onsuccess = () => {
          console.log("✅ Deleted IndexedDB");
          resolve();
        };
        deleteRequest.onerror = () => {
          console.error("❌ Failed to delete IndexedDB");
          reject(new Error("Failed to delete IndexedDB"));
        };
        deleteRequest.onblocked = () => {
          console.warn("⚠️ IndexedDB deletion blocked - will retry");
          setTimeout(() => {
            const retryRequest = indexedDB.deleteDatabase("merch-pos-db");
            retryRequest.onsuccess = () => {
              console.log("✅ Deleted IndexedDB (retry)");
              resolve();
            };
            retryRequest.onerror = () => reject(new Error("Failed on retry"));
          }, 100);
        };
      });

      // 4. Clear all cookies
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
      });
      console.log("✅ Cleared cookies");

      // 5. Unregister service workers
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
        console.log("✅ Unregistered service workers");
      }

      // 6. Clear all caches
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
        console.log("✅ Cleared all caches");
      }

      console.log("🎉 Nuclear reset complete!");

      // 7. Do a HARD redirect (bypasses React, clears everything)
      window.location.replace("/auth/signin");
    } catch (error) {
      console.error("❌ Error during nuclear reset:", error);
      // Even if there's an error, redirect anyway
      window.location.replace("/auth/signin");
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
      <h1 className="text-2xl font-bold mb-6">Debug Tools</h1>

      {/* Nuclear Reset Section */}
      <div className="mb-8 p-6 bg-red-950 border-2 border-red-600 rounded-lg">
        <h2 className="text-xl font-bold text-red-400 mb-3">
          🚨 Nuclear Reset
        </h2>
        <p className="text-zinc-300 mb-4">
          Completely wipe all local data and sign out. Use this to test as a
          completely fresh user.
        </p>
        <button
          onClick={handleNuclearReset}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all shadow-lg"
        >
          💣 RESET EVERYTHING
        </button>
        <div className="mt-4 text-sm text-zinc-400 space-y-1">
          <p>This will clear:</p>
          <ul className="list-disc list-inside ml-2">
            <li>localStorage (sheet IDs, settings)</li>
            <li>sessionStorage</li>
            <li>IndexedDB (products, sales)</li>
            <li>Cookies</li>
            <li>Service worker & caches</li>
          </ul>
          <p className="mt-2 font-semibold text-yellow-400">
            ⚠️ After reset, manually delete &quot;Merch Table&quot; spreadsheet
            from Google Drive
          </p>
        </div>
      </div>

      {/* Insights Tools Section */}
      <div className="mb-8 p-6 bg-zinc-800 border border-zinc-700 rounded-lg">
        <h2 className="text-xl font-semibold text-zinc-300 mb-3">
          Insights Sheet Tools
        </h2>
        <div className="flex gap-3 mb-3">
          <button
            onClick={handleCheckInsights}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition-all"
          >
            🔍 Check Insights Sheet
          </button>
          <button
            onClick={handleRecreateInsights}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded transition-all"
          >
            ✨ Recreate Insights Sheet
          </button>
        </div>
        <p className="text-zinc-400 text-sm">
          Debug the insights sheet or recreate it with updated formulas
        </p>
      </div>

      {/* Session Info Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-400 mb-2">
            Session Status:
          </h2>
          <pre className="bg-zinc-800 p-4 rounded border border-zinc-700 overflow-auto text-sm">
            {status}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-zinc-400 mb-2">
            Session Data:
          </h2>
          <pre className="bg-zinc-800 p-4 rounded border border-zinc-700 overflow-auto text-sm">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-zinc-400 mb-2">
            Environment:
          </h2>
          <pre className="bg-zinc-800 p-4 rounded border border-zinc-700 overflow-auto text-sm">
            {`NEXT_PUBLIC_URL: ${process.env.NEXT_PUBLIC_URL || "not set"}
NODE_ENV: ${process.env.NODE_ENV}`}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-zinc-400 mb-2">
            Local Storage:
          </h2>
          <pre className="bg-zinc-800 p-4 rounded border border-zinc-700 overflow-auto text-sm">
            {typeof window !== "undefined"
              ? JSON.stringify(
                  {
                    productsSheetId: localStorage.getItem("productsSheetId"),
                    salesSheetId: localStorage.getItem("salesSheetId"),
                  },
                  null,
                  2
                )
              : "Loading..."}
          </pre>
        </div>
      </div>
    </div>
  );
}
