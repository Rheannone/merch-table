// src/lib/supabase/auth.ts
"use client";

import { createClient } from "./client";
import type { User, Session } from "@supabase/supabase-js";

export class SupabaseAuth {
  private supabase = createClient();

  async signInWithGoogle() {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Use PKCE flow for better security
        skipBrowserRedirect: false,
        // Request only basic profile scopes (no sensitive scopes = no OAuth verification required)
        scopes: "openid email profile",
        // Force fresh consent to clear old cached scopes
        queryParams: {
          prompt: 'consent',
          access_type: 'online',
        },
        // Note: Google Sheets export will be added as a future premium feature
      },
    });

    if (error) {
      console.error("Google sign-in error:", error);
      throw error;
    }

    return data;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      console.error("Sign-out error:", error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser();
    if (error) {
      console.error("Get user error:", error);
      return null;
    }
    return user;
  }

  async getCurrentSession(): Promise<Session | null> {
    const {
      data: { session },
      error,
    } = await this.supabase.auth.getSession();
    if (error) {
      console.error("Get session error:", error);
      return null;
    }
    return session;
  }

  onAuthStateChange(
    callback: (user: User | null, session: Session | null) => void
  ) {
    return this.supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user ?? null, session);
    });
  }
}

export const supabaseAuth = new SupabaseAuth();
