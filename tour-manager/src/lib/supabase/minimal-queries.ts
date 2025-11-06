/**
 * MINIMAL SUPABASE SETUP - Just user tracking
 * Use this instead of the full queries.ts if you just want to start simple
 */

import { createClient } from "@/lib/supabase/client";

export interface MinimalUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get the current user's profile
 */
export async function getCurrentUser(): Promise<MinimalUser | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Error fetching user:", error);
    return null;
  }

  return data;
}

/**
 * Update the current user's profile
 */
export async function updateUserProfile(updates: {
  full_name?: string;
  avatar_url?: string;
}): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    console.error("Error updating user:", error);
    throw new Error("Failed to update profile");
  }
}

/**
 * Get total user count (admin only - requires custom RLS policy)
 */
export async function getUserCount(): Promise<number> {
  const supabase = createClient();

  const { count, error } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Error counting users:", error);
    return 0;
  }

  return count || 0;
}

/**
 * Get when user signed up
 */
export async function getUserSignupDate(): Promise<Date | null> {
  const user = await getCurrentUser();
  return user ? new Date(user.created_at) : null;
}
