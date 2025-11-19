import { createBrowserClient } from "@supabase/ssr";

/**
 * Create a Supabase client for use in Client Components
 * This is safe to use in the browser
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Get authenticated user with error handling for expired tokens
 * Returns null if not authenticated or token expired
 */
export async function getAuthenticatedUser() {
  const supabase = createClient();

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      // Check if it's an auth error (expired token, invalid session, etc.)
      if (userError.status === 401 || userError.message.includes("JWT")) {
        console.warn("⚠️ Auth token expired or invalid:", userError.message);
        // Try to refresh the session
        const { data: refreshData, error: refreshError } =
          await supabase.auth.refreshSession();

        if (refreshError || !refreshData.session) {
          console.error("❌ Failed to refresh session:", refreshError?.message);
          return null;
        }

        // Retry getting user after refresh
        const { data: retryUserData, error: retryError } =
          await supabase.auth.getUser();
        if (retryError || !retryUserData?.user) {
          console.error(
            "❌ Failed to get user after refresh:",
            retryError?.message
          );
          return null;
        }

        console.log("✅ Session refreshed successfully");
        return retryUserData.user;
      }

      console.error("❌ Auth error:", userError.message);
      return null;
    }

    if (!userData?.user) {
      console.warn("⚠️ No user data returned");
      return null;
    }

    return userData.user;
  } catch (error) {
    console.error("❌ Unexpected auth error:", error);
    return null;
  }
}
