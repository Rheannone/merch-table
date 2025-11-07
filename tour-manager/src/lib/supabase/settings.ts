import { PaymentSetting, EmailSignupSettings } from "@/types";
import {
  DEFAULT_PAYMENT_SETTINGS,
  DEFAULT_CATEGORIES,
  DEFAULT_CURRENCY,
  DEFAULT_EXCHANGE_RATE,
  DEFAULT_THEME,
  DEFAULT_SHOW_TIP_JAR,
} from "@/lib/defaultSettings";

export interface UserSettings {
  user_id: string;
  payment_methods: PaymentSetting[];
  categories: string[];
  show_tip_jar: boolean;
  currency: string;
  exchange_rate: number;
  theme_id: string;
  current_sheet_id: string | null;
  current_sheet_name: string | null;
  email_signup_enabled: boolean;
  email_signup_prompt_message: string;
  email_signup_collect_name: boolean;
  email_signup_collect_phone: boolean;
  email_signup_auto_dismiss_seconds: number;
  migrated_from_sheets: boolean;
  created_at?: string;
  updated_at?: string;
}

const SETTINGS_CACHE_KEY = "user_settings_cache";
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

/**
 * Get user settings from Supabase (with localStorage cache)
 * Uses API route with service role key to bypass RLS
 * @param userEmail - Not used (API route gets email from session), kept for API compatibility
 */
export async function getUserSettings(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userEmail?: string
): Promise<UserSettings | null> {
  try {
    // Check cache first (for offline/performance)
    const cached = getCachedSettings();
    if (cached) {
      return cached;
    }

    // Fetch from API route (uses service role to bypass RLS)
    const response = await fetch("/api/settings/load");

    if (!response.ok) {
      if (response.status === 404) {
        return null; // User not found
      }
      throw new Error(`Failed to load settings: ${response.statusText}`);
    }

    const { settings } = await response.json();

    // Cache for offline use
    if (settings) {
      setCachedSettings(settings);
    }

    return settings;
  } catch (error) {
    console.error("Error fetching user settings:", error);

    // Fall back to cache if available
    const cached = getCachedSettings();
    if (cached) {
      console.log("Using cached settings (offline mode)");
      return cached;
    }

    return null;
  }
}

/**
 * Save user settings to Supabase
 * Uses API route with service role key to bypass RLS
 */
export async function saveUserSettings(
  settings: Partial<UserSettings> & { user_id: string }
): Promise<boolean> {
  try {
    const response = await fetch("/api/settings/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error saving settings:", errorData);
      return false;
    }

    const { settings: savedSettings } = await response.json();

    // Update cache
    if (savedSettings) {
      setCachedSettings(savedSettings);
    }

    return true;
  } catch (error) {
    console.error("Error saving user settings:", error);
    return false;
  }
}

/**
 * Migrate settings from localStorage/Sheets to Supabase
 * Called on first login after migration
 */
export async function migrateSettingsToSupabase(
  userId: string,
  legacySettings: {
    paymentSettings?: PaymentSetting[];
    categories?: string[];
    showTipJar?: boolean;
    currency?: string;
    exchangeRate?: number;
    themeId?: string;
    emailSignupSettings?: EmailSignupSettings;
  }
): Promise<boolean> {
  try {
    console.log("Migrating legacy settings to Supabase for user:", userId);

    const settings: Partial<UserSettings> & { user_id: string } = {
      user_id: userId,
      payment_methods:
        legacySettings.paymentSettings || DEFAULT_PAYMENT_SETTINGS,
      categories: legacySettings.categories || DEFAULT_CATEGORIES,
      show_tip_jar: legacySettings.showTipJar ?? DEFAULT_SHOW_TIP_JAR,
      currency: legacySettings.currency || DEFAULT_CURRENCY,
      exchange_rate: legacySettings.exchangeRate || DEFAULT_EXCHANGE_RATE,
      theme_id: legacySettings.themeId || DEFAULT_THEME,
      email_signup_enabled:
        legacySettings.emailSignupSettings?.enabled ?? false,
      email_signup_prompt_message:
        legacySettings.emailSignupSettings?.promptMessage ||
        "Want to join our email list?",
      email_signup_collect_name:
        legacySettings.emailSignupSettings?.collectName ?? false,
      email_signup_collect_phone:
        legacySettings.emailSignupSettings?.collectPhone ?? false,
      email_signup_auto_dismiss_seconds:
        legacySettings.emailSignupSettings?.autoDismissSeconds || 10,
      migrated_from_sheets: true,
    };

    const success = await saveUserSettings(settings);

    if (success) {
      console.log("✅ Settings migrated successfully");
    }

    return success;
  } catch (error) {
    console.error("Error migrating settings:", error);
    return false;
  }
}

/**
 * Update a single setting field
 */
export async function updateSetting<K extends keyof UserSettings>(
  userId: string,
  field: K,
  value: UserSettings[K]
): Promise<boolean> {
  return saveUserSettings({
    user_id: userId,
    [field]: value,
  });
}

// ============= Cache Helpers =============

function getCachedSettings(): UserSettings | null {
  try {
    const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);

    // Check if cache is still fresh
    if (Date.now() - timestamp < CACHE_DURATION) {
      return data;
    }

    return null;
  } catch {
    return null;
  }
}

function setCachedSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(
      SETTINGS_CACHE_KEY,
      JSON.stringify({
        data: settings,
        timestamp: Date.now(),
      })
    );
  } catch (error) {
    console.warn("Failed to cache settings:", error);
  }
}

/**
 * Clear settings cache (useful when user logs out)
 */
export function clearSettingsCache(): void {
  try {
    localStorage.removeItem(SETTINGS_CACHE_KEY);
  } catch (error) {
    console.warn("Failed to clear settings cache:", error);
  }
}

/**
 * Update the current Google Sheet association
 * Called when user switches sheets via "Change Sheet" button
 */
export async function updateCurrentSheet(
  userId: string,
  sheetId: string,
  sheetName: string
): Promise<boolean> {
  try {
    console.log("📊 Updating current sheet for user:", userId);

    const success = await saveUserSettings({
      user_id: userId,
      current_sheet_id: sheetId,
      current_sheet_name: sheetName,
    });

    if (success) {
      // Also update localStorage for backward compatibility
      if (typeof window !== "undefined") {
        localStorage.setItem("salesSheetId", sheetId);
        localStorage.setItem("salesSheetName", sheetName);
        localStorage.setItem("productsSheetId", sheetId); // Same sheet for both
      }
      console.log("✅ Sheet association updated");
    }

    return success;
  } catch (error) {
    console.error("Error updating sheet association:", error);
    return false;
  }
}

/**
 * Create default settings for a new user
 * Called from initializeApp() after Sheet creation
 */
export async function createDefaultUserSettings(
  userId: string
): Promise<boolean> {
  try {
    console.log("🆕 Creating default settings for new user:", userId);

    // Get current sheet ID from localStorage (if exists)
    const sheetId =
      typeof window !== "undefined"
        ? localStorage.getItem("salesSheetId")
        : null;
    const sheetName =
      typeof window !== "undefined"
        ? localStorage.getItem("salesSheetName")
        : null;

    const defaultSettings: Partial<UserSettings> & { user_id: string } = {
      user_id: userId,
      payment_methods: DEFAULT_PAYMENT_SETTINGS,
      categories: DEFAULT_CATEGORIES,
      show_tip_jar: DEFAULT_SHOW_TIP_JAR,
      currency: DEFAULT_CURRENCY,
      exchange_rate: DEFAULT_EXCHANGE_RATE,
      theme_id: DEFAULT_THEME,
      current_sheet_id: sheetId,
      current_sheet_name: sheetName,
      email_signup_enabled: false,
      email_signup_prompt_message: "Want to join our email list?",
      email_signup_collect_name: false,
      email_signup_collect_phone: false,
      email_signup_auto_dismiss_seconds: 10,
    };

    const success = await saveUserSettings(defaultSettings);

    if (success) {
      console.log("✅ Default settings created in Supabase");
    }

    return success;
  } catch (error) {
    console.error("Error creating default settings:", error);
    return false;
  }
}
