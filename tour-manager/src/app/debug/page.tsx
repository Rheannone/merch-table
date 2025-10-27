"use client";"use client";"use client";



import { useSession, signOut } from "next-auth/react";



export default function DebugPage() {import { useSession, signOut } from "next-auth/react";import { useSession } from "next-auth/react";

  const { data: session, status } = useSession();



  const handleNuclearReset = async () => {

    if (export default function DebugPage() {export default function DebugPage() {

      !confirm(

        "🚨 NUCLEAR RESET 🚨\n\n" +  const { data: session, status } = useSession();  const { data: session, status } = useSession();

        "This will COMPLETELY WIPE:\n" +

        "✅ localStorage (sheet IDs, settings)\n" +

        "✅ sessionStorage\n" +

        "✅ IndexedDB (all products & sales)\n" +  const handleNuclearReset = async () => {  const handleResetCache = () => {

        "✅ All cookies\n" +

        "✅ Service worker cache\n" +    if (    if (

        "\n" +

        "You will be signed out and redirected to the home page.\n" +      !confirm(      confirm(

        "\n" +

        "⚠️ IMPORTANT: You must manually delete your 'Merch Table' spreadsheet from Google Drive after this.\n" +        "🚨 NUCLEAR RESET 🚨\n\n" +        "This will clear all local data and reload from Google Sheets. Continue?"

        "\n" +

        "Continue?"        "This will COMPLETELY WIPE:\n" +      )

      )

    ) {        "✅ localStorage (sheet IDs, settings)\n" +    ) {

      return;

    }        "✅ sessionStorage\n" +      localStorage.clear();



    try {        "✅ IndexedDB (all products & sales)\n" +      globalThis.location.reload();

      console.log("🧹 Starting nuclear reset...");

        "✅ All cookies\n" +    }

      // 1. Clear localStorage

      localStorage.clear();        "✅ Service worker cache\n" +  };

      console.log("✅ Cleared localStorage");

        "\n" +

      // 2. Clear sessionStorage

      sessionStorage.clear();        "You will be signed out and redirected to the home page.\n" +  const handleFreshUserReset = async () => {

      console.log("✅ Cleared sessionStorage");

        "\n" +    if (

      // 3. Delete IndexedDB

      await new Promise<void>((resolve, reject) => {        "⚠️ IMPORTANT: You must manually delete your 'Merch Table' spreadsheet from Google Drive after this.\n" +      confirm(

        const deleteRequest = indexedDB.deleteDatabase("merch-pos-db");

        deleteRequest.onsuccess = () => {        "\n" +        "⚠️ FRESH USER RESET ⚠️\n\nThis will:\n- Clear localStorage (sheet IDs)\n- Delete IndexedDB (all products & sales)\n- Reload as a brand new user\n\nContinue?"

          console.log("✅ Deleted IndexedDB");

          resolve();        "Continue?"      )

        };

        deleteRequest.onerror = () => {      )    ) {

          console.error("❌ Failed to delete IndexedDB");

          reject(new Error("Failed to delete IndexedDB"));    ) {      try {

        };

        deleteRequest.onblocked = () => {      return;        // Clear localStorage

          console.warn("⚠️ IndexedDB deletion blocked - will retry");

          setTimeout(() => {    }        localStorage.clear();

            const retryRequest = indexedDB.deleteDatabase("merch-pos-db");

            retryRequest.onsuccess = () => {        console.log("✅ Cleared localStorage");

              console.log("✅ Deleted IndexedDB (retry)");

              resolve();    try {

            };

            retryRequest.onerror = () => reject(new Error("Failed on retry"));      console.log("🧹 Starting nuclear reset...");        // Delete IndexedDB

          }, 100);

        };        await new Promise<void>((resolve, reject) => {

      });

      // 1. Clear localStorage          const deleteRequest = indexedDB.deleteDatabase("merch-pos-db");

      // 4. Clear all cookies

      document.cookie.split(";").forEach((c) => {      localStorage.clear();          deleteRequest.onsuccess = () => {

        document.cookie = c

          .replace(/^ +/, "")      console.log("✅ Cleared localStorage");            console.log("✅ Deleted IndexedDB");

          .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);

      });            resolve();

      console.log("✅ Cleared cookies");

      // 2. Clear sessionStorage          };

      // 5. Unregister service workers

      if ("serviceWorker" in navigator) {      sessionStorage.clear();          deleteRequest.onerror = () => {

        const registrations = await navigator.serviceWorker.getRegistrations();

        for (const registration of registrations) {      console.log("✅ Cleared sessionStorage");            console.error("❌ Failed to delete IndexedDB");

          await registration.unregister();

        }            reject(new Error("Failed to delete IndexedDB"));

        console.log("✅ Unregistered service workers");

      }      // 3. Delete IndexedDB          };



      // 6. Clear all caches      await new Promise<void>((resolve, reject) => {        });

      if ("caches" in window) {

        const cacheNames = await caches.keys();        const deleteRequest = indexedDB.deleteDatabase("merch-pos-db");

        await Promise.all(cacheNames.map((name) => caches.delete(name)));

        console.log("✅ Cleared all caches");        deleteRequest.onsuccess = () => {        // Reload with force-new parameter to bypass any caching issues

      }

          console.log("✅ Deleted IndexedDB");        console.log("🔄 Reloading with force-new parameter...");

      console.log("🎉 Nuclear reset complete!");

          resolve();        window.location.href = "/?force-new";

      alert(

        "✅ Reset complete!\n\n" +        };      } catch (error) {

        "⚠️ REMINDER: Go to Google Drive and manually delete your 'Merch Table' spreadsheet.\n\n" +

        "You will now be signed out and redirected to the home page."        deleteRequest.onerror = () => {        console.error("Error during reset:", error);

      );

          console.error("❌ Failed to delete IndexedDB");        alert("Error during reset. Check console for details.");

      // 7. Sign out and redirect to home

      await signOut({ redirect: false });          reject(new Error("Failed to delete IndexedDB"));      }

      window.location.href = "/";

    } catch (error) {        };    }

      console.error("❌ Error during nuclear reset:", error);

      alert(        deleteRequest.onblocked = () => {  };

        "Error during reset. Check console for details.\n\n" +

        "You may need to manually:\n" +          console.warn("⚠️ IndexedDB deletion blocked - will retry");

        "1. Clear browser data in Settings\n" +

        "2. Sign out\n" +          setTimeout(() => {  const handleCheckInsights = async () => {

        "3. Close and reopen the browser"

      );            const retryRequest = indexedDB.deleteDatabase("merch-pos-db");    const spreadsheetId = localStorage.getItem("salesSheetId");

    }

  };            retryRequest.onsuccess = () => {    if (!spreadsheetId) {



  const handleCheckInsights = async () => {              console.log("✅ Deleted IndexedDB (retry)");      alert("No spreadsheet ID found. Please initialize sheets first.");

    const spreadsheetId = localStorage.getItem("salesSheetId");

    if (!spreadsheetId) {              resolve();      return;

      alert("No spreadsheet ID found. Please initialize sheets first.");

      return;            };    }

    }

            retryRequest.onerror = () => reject(new Error("Failed on retry"));

    try {

      const response = await fetch("/api/sheets/check-insights", {          }, 100);    try {

        method: "POST",

        headers: { "Content-Type": "application/json" },        };      const response = await fetch("/api/sheets/check-insights", {

        body: JSON.stringify({ spreadsheetId }),

      });      });        method: "POST",



      const data = await response.json();        headers: { "Content-Type": "application/json" },

      console.log("Insights check result:", data);

      alert(JSON.stringify(data, null, 2));      // 4. Clear all cookies        body: JSON.stringify({ spreadsheetId }),

    } catch (error) {

      console.error("Error checking insights:", error);      document.cookie.split(";").forEach((c) => {      });

      alert("Error checking insights: " + (error as Error).message);

    }        document.cookie = c

  };

          .replace(/^ +/, "")      const data = await response.json();

  const handleRecreateInsights = async () => {

    if (!confirm("This will recreate the Insights sheet. Continue?")) return;          .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);      console.log("Insights check result:", data);



    const spreadsheetId = localStorage.getItem("salesSheetId");      });      alert(JSON.stringify(data, null, 2));

    if (!spreadsheetId) {

      alert("No spreadsheet ID found. Please initialize sheets first.");      console.log("✅ Cleared cookies");    } catch (error) {

      return;

    }      console.error("Error checking insights:", error);



    try {      // 5. Unregister service workers      alert("Error checking insights: " + (error as Error).message);

      // First delete the existing Insights sheet if it exists

      const deleteResponse = await fetch("/api/sheets/delete-insights", {      if ("serviceWorker" in navigator) {    }

        method: "POST",

        headers: { "Content-Type": "application/json" },        const registrations = await navigator.serviceWorker.getRegistrations();  };

        body: JSON.stringify({ spreadsheetId }),

      });        for (const registration of registrations) {



      console.log("Delete response:", await deleteResponse.text());          await registration.unregister();  const handleRecreateInsights = async () => {



      // Then create a new one        }    if (!confirm("This will recreate the Insights sheet. Continue?")) return;

      const createResponse = await fetch("/api/sheets/create-insights", {

        method: "POST",        console.log("✅ Unregistered service workers");

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ spreadsheetId }),      }    const spreadsheetId = localStorage.getItem("salesSheetId");

      });

    if (!spreadsheetId) {

      const data = await createResponse.json();

      console.log("Create insights result:", data);      // 6. Clear all caches      alert("No spreadsheet ID found. Please initialize sheets first.");

      alert(data.message || "Insights sheet recreated successfully!");

    } catch (error) {      if ("caches" in window) {      return;

      console.error("Error recreating insights:", error);

      alert("Error recreating insights: " + (error as Error).message);        const cacheNames = await caches.keys();    }

    }

  };        await Promise.all(cacheNames.map((name) => caches.delete(name)));



  return (        console.log("✅ Cleared all caches");    try {

    <div className="min-h-screen bg-zinc-900 text-white p-8">

      <h1 className="text-2xl font-bold mb-6">Debug Tools</h1>      }      // First delete the existing Insights sheet if it exists



      <div className="mb-8 space-y-4">      const deleteResponse = await fetch("/api/sheets/delete-insights", {

        <div className="bg-red-900/20 border border-red-600 rounded-lg p-6">

          <h2 className="text-xl font-bold text-red-400 mb-4">⚠️ Danger Zone</h2>      console.log("🎉 Nuclear reset complete!");        method: "POST",

          <button

            onClick={handleNuclearReset}              headers: { "Content-Type": "application/json" },

            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all shadow-lg"

          >      alert(        body: JSON.stringify({ spreadsheetId }),

            🚨 NUCLEAR RESET - Wipe Everything

          </button>        "✅ Reset complete!\n\n" +      });

          <p className="text-zinc-400 text-sm mt-3">

            Completely wipes all local data, signs you out, and redirects to home page.        "⚠️ REMINDER: Go to Google Drive and manually delete your 'Merch Table' spreadsheet.\n\n" +

            <br />

            <strong className="text-red-400">        "You will now be signed out and redirected to the home page."      console.log("Delete response:", await deleteResponse.text());

              You must manually delete your Google Sheets after clicking this.

            </strong>      );

          </p>

        </div>      // Then create a new one



        <div>      // 7. Sign out and redirect to home      const createResponse = await fetch("/api/sheets/create-insights", {

          <h2 className="text-lg font-bold text-blue-400 mb-3">Insights Tools</h2>

          <div className="flex gap-4">      await signOut({ callbackUrl: "/" });        method: "POST",

            <button

              onClick={handleCheckInsights}    } catch (error) {        headers: { "Content-Type": "application/json" },

              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition-all"

            >      console.error("❌ Error during nuclear reset:", error);        body: JSON.stringify({ spreadsheetId }),

              🔍 Check Insights Sheet

            </button>      alert(      });

            <button

              onClick={handleRecreateInsights}        "⚠️ Error during reset. Check console for details.\n\n" +

              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded transition-all"

            >        "Some data may not have been cleared. Try manually clearing browser data:\n" +      const data = await createResponse.json();

              ✨ Recreate Insights Sheet

            </button>        "Settings → Privacy → Clear Browsing Data"      console.log("Create insights result:", data);

          </div>

          <p className="text-zinc-400 text-sm mt-2">      );      alert(data.message || "Insights sheet recreated successfully!");

            Debug the insights sheet or recreate it with updated formulas

          </p>    }    } catch (error) {

        </div>

      </div>  };      console.error("Error recreating insights:", error);



      <div className="space-y-4">      alert("Error recreating insights: " + (error as Error).message);

        <div>

          <h2 className="text-lg font-semibold text-yellow-400 mb-2">  const handleCheckInsights = async () => {    }

            Session Status:

          </h2>    const spreadsheetId = localStorage.getItem("salesSheetId");  };

          <pre className="bg-zinc-800 p-4 rounded mt-2 overflow-auto text-sm">

            {status}    if (!spreadsheetId) {

          </pre>

        </div>      alert("No spreadsheet ID found. Please initialize sheets first.");  return (



        <div>      return;    <div className="min-h-screen bg-zinc-900 text-white p-8">

          <h2 className="text-lg font-semibold text-yellow-400 mb-2">

            Session Data:    }      <h1 className="text-2xl font-bold mb-6">Debug Info</h1>

          </h2>

          <pre className="bg-zinc-800 p-4 rounded mt-2 overflow-auto text-sm">

            {JSON.stringify(session, null, 2)}

          </pre>    try {      <div className="mb-6 space-y-4">

        </div>

      const response = await fetch("/api/sheets/check-insights", {        <div>

        <div>

          <h2 className="text-lg font-semibold text-yellow-400 mb-2">        method: "POST",          <button

            LocalStorage:

          </h2>        headers: { "Content-Type": "application/json" },            onClick={handleFreshUserReset}

          <pre className="bg-zinc-800 p-4 rounded mt-2 overflow-auto text-sm">

            {JSON.stringify(        body: JSON.stringify({ spreadsheetId }),            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded transition-all mr-4"

              {

                productsSheetId: localStorage.getItem("productsSheetId"),      });          >

                salesSheetId: localStorage.getItem("salesSheetId"),

              },            🆕 Fresh User Reset (Complete)

              null,

              2      const data = await response.json();          </button>

            )}

          </pre>      console.log("Insights check result:", data);          <button

        </div>

      alert(JSON.stringify(data, null, 2));            onClick={handleResetCache}

        <div>

          <h2 className="text-lg font-semibold text-yellow-400 mb-2">    } catch (error) {            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded transition-all"

            Environment:

          </h2>      console.error("Error checking insights:", error);          >

          <pre className="bg-zinc-800 p-4 rounded mt-2 overflow-auto text-sm">

            {`NEXT_PUBLIC_URL: ${process.env.NEXT_PUBLIC_URL || "not set"}      alert("Error checking insights: " + (error as Error).message);            🔄 Reset Cache & Reload from Sheets

NODE_ENV: ${process.env.NODE_ENV}`}

          </pre>    }          </button>

        </div>

      </div>  };          <p className="text-zinc-400 text-sm mt-2">

    </div>

  );            <strong>Fresh User:</strong> Clears everything (localStorage +

}

  const handleRecreateInsights = async () => {            IndexedDB) to simulate a new user

    if (!confirm("This will recreate the Insights sheet. Continue?")) return;            <br />

            <strong>Cache Reset:</strong> Clears localStorage and reloads

    const spreadsheetId = localStorage.getItem("salesSheetId");            products from Google Sheets

    if (!spreadsheetId) {          </p>

      alert("No spreadsheet ID found. Please initialize sheets first.");        </div>

      return;

    }        <div>

          <button

    try {            onClick={handleCheckInsights}

      // First delete the existing Insights sheet if it exists            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition-all mr-4"

      const deleteResponse = await fetch("/api/sheets/delete-insights", {          >

        method: "POST",            🔍 Check Insights Sheet

        headers: { "Content-Type": "application/json" },          </button>

        body: JSON.stringify({ spreadsheetId }),          <button

      });            onClick={handleRecreateInsights}

            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded transition-all"

      console.log("Delete response:", await deleteResponse.text());          >

            ✨ Recreate Insights Sheet

      // Then create a new one          </button>

      const createResponse = await fetch("/api/sheets/create-insights", {          <p className="text-zinc-400 text-sm mt-2">

        method: "POST",            Debug the insights sheet or recreate it with updated formulas

        headers: { "Content-Type": "application/json" },          </p>

        body: JSON.stringify({ spreadsheetId }),        </div>

      });      </div>



      const data = await createResponse.json();      <div className="space-y-4">

      console.log("Create insights result:", data);        <div>

      alert(data.message || "Insights sheet recreated successfully!");          <h2 className="text-lg font-semibold text-red-500">

    } catch (error) {            Session Status:

      console.error("Error recreating insights:", error);          </h2>

      alert("Error recreating insights: " + (error as Error).message);          <pre className="bg-zinc-800 p-4 rounded mt-2 overflow-auto">

    }            {status}

  };          </pre>

        </div>

  return (

    <div className="min-h-screen bg-zinc-900 text-white p-8">        <div>

      <h1 className="text-2xl font-bold mb-6">Debug Tools</h1>          <h2 className="text-lg font-semibold text-red-500">Session Data:</h2>

          <pre className="bg-zinc-800 p-4 rounded mt-2 overflow-auto">

      {/* Nuclear Reset Section */}            {JSON.stringify(session, null, 2)}

      <div className="mb-8 p-6 bg-red-950 border-2 border-red-600 rounded-lg">          </pre>

        <h2 className="text-xl font-bold text-red-400 mb-3">🚨 Nuclear Reset</h2>        </div>

        <p className="text-zinc-300 mb-4">

          Completely wipe all local data and sign out. Use this to test as a completely fresh user.        <div>

        </p>          <h2 className="text-lg font-semibold text-red-500">Environment:</h2>

        <button          <pre className="bg-zinc-800 p-4 rounded mt-2 overflow-auto">

          onClick={handleNuclearReset}            {`NEXT_PUBLIC_URL: ${process.env.NEXT_PUBLIC_URL || "not set"}

          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all shadow-lg"NODE_ENV: ${process.env.NODE_ENV}`}

        >          </pre>

          💣 RESET EVERYTHING        </div>

        </button>      </div>

        <div className="mt-4 text-sm text-zinc-400 space-y-1">    </div>

          <p>This will clear:</p>  );

          <ul className="list-disc list-inside ml-2">}

            <li>localStorage (sheet IDs, settings)</li>
            <li>sessionStorage</li>
            <li>IndexedDB (products, sales)</li>
            <li>Cookies</li>
            <li>Service worker & caches</li>
          </ul>
          <p className="mt-2 font-semibold text-yellow-400">
            ⚠️ After reset, manually delete "Merch Table" spreadsheet from Google Drive
          </p>
        </div>
      </div>

      {/* Insights Tools Section */}
      <div className="mb-8 p-6 bg-zinc-800 border border-zinc-700 rounded-lg">
        <h2 className="text-xl font-semibold text-zinc-300 mb-3">Insights Sheet Tools</h2>
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
          <h2 className="text-lg font-semibold text-zinc-400 mb-2">Session Status:</h2>
          <pre className="bg-zinc-800 p-4 rounded border border-zinc-700 overflow-auto text-sm">
            {status}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-zinc-400 mb-2">Session Data:</h2>
          <pre className="bg-zinc-800 p-4 rounded border border-zinc-700 overflow-auto text-sm">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-zinc-400 mb-2">Environment:</h2>
          <pre className="bg-zinc-800 p-4 rounded border border-zinc-700 overflow-auto text-sm">
            {`NEXT_PUBLIC_URL: ${process.env.NEXT_PUBLIC_URL || "not set"}
NODE_ENV: ${process.env.NODE_ENV}`}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-zinc-400 mb-2">Local Storage:</h2>
          <pre className="bg-zinc-800 p-4 rounded border border-zinc-700 overflow-auto text-sm">
            {typeof window !== "undefined" 
              ? JSON.stringify({
                  productsSheetId: localStorage.getItem("productsSheetId"),
                  salesSheetId: localStorage.getItem("salesSheetId"),
                }, null, 2)
              : "Loading..."}
          </pre>
        </div>
      </div>
    </div>
  );
}
