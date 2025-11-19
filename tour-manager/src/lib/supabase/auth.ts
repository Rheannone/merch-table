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
        // Request Google Sheets and Drive scopes
        scopes:
          "openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file",
        // Request access to provider token so we can use it for Google APIs
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
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
