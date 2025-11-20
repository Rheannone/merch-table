// src/lib/supabase/api-auth.ts
/**
 * Helper functions for authenticating Google Sheets API calls with Supabase Auth
 */
import { createClient } from "./server";
import { NextResponse } from "next/server";

export async function getGoogleAuthClient() {
  const supabase = await createClient();

  // Use getUser() instead of getSession() for secure authentication
  // getUser() validates the session by contacting Supabase Auth server
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("❌ No authenticated user found:", userError);
    return {
      error: NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      ),
    };
  }

  // After verifying user authenticity, get the session for provider token
  // Note: getSession() warning can be safely ignored here because we already
  // validated the user with getUser() above. We only use session for provider_token.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    console.error("❌ No session found");
    return {
      error: NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      ),
    };
  }

  // Get Google OAuth access token from Supabase session
  const providerToken = session.provider_token;
  const providerRefreshToken = session.provider_refresh_token;

  if (!providerToken) {
    console.error("❌ No Google access token in session");
    console.error(
      "🔧 User needs to sign out and sign in again to get new scopes"
    );
    return {
      error: NextResponse.json(
        {
          error:
            "No Google access token found. Please sign out and sign in again to grant Google Sheets permissions.",
        },
        { status: 401 }
      ),
    };
  }

  // Create Google Auth client with refresh token support
  const { google } = await import("googleapis");
  const authClient = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  // Set credentials with both access and refresh tokens
  authClient.setCredentials({
    access_token: providerToken,
    refresh_token: providerRefreshToken,
  });

  // Handle token refresh automatically
  authClient.on("tokens", async (tokens) => {
    if (tokens.refresh_token) {
      // New refresh token received, store it
      console.log("🔄 Received new refresh token");
    }
    if (tokens.access_token) {
      // New access token received, update Supabase session
      console.log("✅ Access token refreshed automatically");
      // Note: Supabase handles this internally, we just log it
    }
  });

  return { authClient };
}
