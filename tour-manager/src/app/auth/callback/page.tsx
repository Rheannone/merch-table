"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = createClient();

      try {
        // Check for error in URL params first (from OAuth provider)
        const urlParams = new URLSearchParams(window.location.search);
        const errorParam = urlParams.get("error");
        const errorDescription = urlParams.get("error_description");

        if (errorParam) {
          console.error("OAuth error:", errorParam, errorDescription);
          setError(errorDescription || errorParam);
          setTimeout(() => {
            router.push(
              "/auth/signin?error=" +
                encodeURIComponent(errorDescription || errorParam)
            );
          }, 2000);
          return;
        }

        // Supabase automatically handles the PKCE code exchange
        // Just check for a session after OAuth redirect
        console.log("📝 Checking for session after OAuth redirect...");
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("❌ Session error:", error);
          setError(error.message);
          setTimeout(() => {
            router.push(
              "/auth/signin?error=" + encodeURIComponent(error.message)
            );
          }, 2000);
          return;
        }

        if (session) {
          console.log("✅ Session found!");
          console.log("User:", session.user.email);
          console.log(
            "Provider token:",
            session.provider_token ? "✅ Present" : "❌ Missing"
          );
          console.log(
            "Provider refresh token:",
            session.provider_refresh_token ? "✅ Present" : "❌ Missing"
          );

          if (!session.provider_token) {
            console.error(
              "⚠️ No provider_token in session - Google API calls will fail!"
            );
          }

          router.push("/app");
        } else {
          console.error("❌ No session found after OAuth");
          setError("Authentication failed - no session created");
          setTimeout(() => {
            router.push("/auth/signin");
          }, 2000);
        }
      } catch (error) {
        console.error("💥 Unexpected auth callback error:", error);
        const message =
          error instanceof Error ? error.message : "Authentication failed";
        setError(message);
        setTimeout(() => {
          router.push("/auth/signin?error=" + encodeURIComponent(message));
        }, 2000);
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <>
            <div className="text-red-500 text-4xl mb-4">❌</div>
            <p className="text-red-400 mb-2">Authentication Error</p>
            <p className="text-zinc-500 text-sm">{error}</p>
            <p className="text-zinc-600 text-xs mt-4">Redirecting...</p>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-zinc-400">Completing sign-in...</p>
          </>
        )}
      </div>
    </div>
  );
}
