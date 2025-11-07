import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  getUserSettings,
  saveUserSettings,
  migrateSettingsToSupabase,
  UserSettings,
} from "@/lib/supabase/settings";
import { PaymentSetting, EmailSignupSettings } from "@/types";

export interface UseSupabaseSettingsReturn {
  settings: UserSettings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (updates: Partial<UserSettings>) => Promise<boolean>;
  needsMigration: boolean;
}

/**
 * Hook to manage user settings in Supabase with automatic migration
 *
 * Flow:
 * 1. On mount, check if user has settings in Supabase
 * 2. If NO → Check localStorage/Sheets for legacy settings → Migrate
 * 3. If YES → Load from Supabase and cache in localStorage
 *
 * @returns Settings state and update function
 */
export function useSupabaseSettings(): UseSupabaseSettingsReturn {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsMigration, setNeedsMigration] = useState(false);

  useEffect(() => {
    async function loadOrMigrateSettings() {
      // Wait for session to load
      if (status === "loading") return;

      // No user logged in
      if (!session?.user?.email) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // ALWAYS check Supabase first (fixes multi-device issue)
        const userId = session.user.email; // Using email as temp ID until we have proper user ID
        const existingSettings = await getUserSettings(userId);

        if (existingSettings) {
          // User already has settings in Supabase - use them!
          console.log("✅ Loaded settings from Supabase");
          setSettings(existingSettings);
          setNeedsMigration(false);
        } else {
          // No settings in Supabase yet
          // Check localStorage to determine if this is migration vs new user
          console.log(
            "🔄 No Supabase settings found, checking for legacy data..."
          );

          const legacySettings = detectLegacySettings();

          if (legacySettings) {
            // Existing user - migrate their settings FROM Google Sheets
            console.log(
              "📦 Found legacy settings (has Sheet ID), migrating..."
            );
            setNeedsMigration(true);

            try {
              // Load actual settings from Google Sheets BEFORE migrating
              const sheetId = localStorage.getItem("salesSheetId");

              if (sheetId) {
                console.log(
                  "📥 Loading settings from Google Sheets for migration..."
                );

                const response = await fetch("/api/sheets/settings/load", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ spreadsheetId: sheetId }),
                });

                if (response.ok) {
                  const sheetData = await response.json();
                  console.log("✅ Loaded settings from Sheet:", sheetData);

                  // Migrate with ACTUAL settings from Sheet (not defaults!)
                  const migrated = await migrateSettingsToSupabase(userId, {
                    paymentSettings: sheetData.paymentSettings,
                    categories: sheetData.categories,
                    showTipJar: sheetData.showTipJar,
                    currency: sheetData.currency?.displayCurrency,
                    exchangeRate: sheetData.currency?.exchangeRate,
                    themeId: sheetData.theme,
                    emailSignupSettings: sheetData.emailSignup,
                  });

                  if (migrated) {
                    const migratedSettings = await getUserSettings(userId);
                    setSettings(migratedSettings);
                    setNeedsMigration(false);
                    console.log(
                      "✅ Migration complete with user's actual settings from Sheet!"
                    );
                  } else {
                    setError("Failed to migrate settings");
                  }
                } else {
                  console.warn(
                    "⚠️ Failed to load from Sheet, migrating with defaults"
                  );
                  // Fall back to defaults if Sheet load fails
                  const migrated = await migrateSettingsToSupabase(
                    userId,
                    legacySettings
                  );

                  if (migrated) {
                    const migratedSettings = await getUserSettings(userId);
                    setSettings(migratedSettings);
                    setNeedsMigration(false);
                    console.log(
                      "⚠️ Migration complete with defaults (Sheet load failed)"
                    );
                  } else {
                    setError("Failed to migrate settings");
                  }
                }
              } else {
                // No sheet ID found, shouldn't happen but handle gracefully
                console.warn(
                  "⚠️ Legacy user detected but no Sheet ID found, using defaults"
                );
                const migrated = await migrateSettingsToSupabase(
                  userId,
                  legacySettings
                );

                if (migrated) {
                  const migratedSettings = await getUserSettings(userId);
                  setSettings(migratedSettings);
                  setNeedsMigration(false);
                } else {
                  setError("Failed to migrate settings");
                }
              }
            } catch (err) {
              console.error("Error during migration:", err);
              setError("Migration failed");
            }
          } else {
            // Brand new user - create defaults
            // This will be called from initializeApp() after Sheet creation
            console.log(
              "🆕 New user detected (no Sheet ID, no Supabase settings)"
            );
            // Don't create settings here - let initializeApp() do it
            setSettings(null);
          }
        }
      } catch (err) {
        console.error("Error loading/migrating settings:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadOrMigrateSettings();
  }, [session, status]);

  const updateSettings = async (
    updates: Partial<UserSettings>
  ): Promise<boolean> => {
    if (!session?.user?.email) {
      setError("No user session");
      return false;
    }

    const userId = session.user.email;
    const success = await saveUserSettings({
      ...updates,
      user_id: userId,
    });

    if (success) {
      // Reload settings to get latest
      const updated = await getUserSettings(userId);
      setSettings(updated);
    }

    return success;
  };

  return {
    settings,
    loading,
    error,
    updateSettings,
    needsMigration,
  };
}

/**
 * Detect legacy settings from localStorage or Google Sheets API responses
 */
function detectLegacySettings(): {
  paymentSettings?: PaymentSetting[];
  categories?: string[];
  showTipJar?: boolean;
  currency?: string;
  exchangeRate?: number;
  themeId?: string;
  emailSignupSettings?: EmailSignupSettings;
} | null {
  try {
    // Check if there's a spreadsheet configured (indicates legacy user)
    const hasSheet = localStorage.getItem("salesSheetId");

    // Check for theme preference (most users will have set this)
    const savedTheme = localStorage.getItem("selectedTheme");

    // If neither exist, likely a new user
    if (!hasSheet && !savedTheme) {
      return null;
    }

    // Collect any available legacy data
    return {
      themeId: savedTheme || undefined,
      // Note: Payment settings, categories, etc. are loaded from Sheets
      // We'll detect those during the first Settings.tsx mount
      // This is just to flag that migration is needed
    };
  } catch {
    return null;
  }
}
