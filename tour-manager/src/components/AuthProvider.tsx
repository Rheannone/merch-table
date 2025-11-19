"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabaseAuth } from "@/lib/supabase/auth";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const session = await supabaseAuth.getCurrentSession();
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error("Error getting initial session:", error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabaseAuth.onAuthStateChange((user, session) => {
      setUser(user);
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await supabaseAuth.signInWithGoogle();
    } catch (error) {
      console.error("Sign in failed:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Get user ID before signing out (use the user from state)
      const currentUser = user;

      // Clear user's cached settings from IndexedDB
      if (currentUser) {
        try {
          const { clearSettings } = await import("@/lib/db");
          await clearSettings(currentUser.id);
          console.log("🗑️ Cleared cached settings for user");
        } catch (error) {
          console.error("Failed to clear settings:", error);
          // Don't block sign-out if settings cleanup fails
        }
      }

      // Sign out from Supabase
      await supabaseAuth.signOut();
    } catch (error) {
      console.error("Sign out failed:", error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useUser() {
  const { user } = useAuth();
  return user;
}

export function useSession() {
  const { session } = useAuth();
  return {
    data: session,
    status: session ? "authenticated" : "unauthenticated",
  };
}
