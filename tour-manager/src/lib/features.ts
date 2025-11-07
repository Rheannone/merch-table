/**
 * Feature access control based on subscription tier
 * Grandfathered users get Pro features for free forever
 */

import type { MinimalUser } from "./supabase/minimal-queries";

export type FeatureName =
  | "basic_pos"
  | "google_sheets"
  | "offline_mode"
  | "product_management"
  | "sales_tracking"
  | "basic_analytics"
  | "advanced_analytics"
  | "team_members"
  | "custom_themes"
  | "api_access"
  | "priority_support"
  | "white_label";

export type SubscriptionTier = "free" | "pro" | "enterprise";

const TIER_FEATURES: Record<SubscriptionTier, FeatureName[]> = {
  free: [
    "basic_pos",
    "google_sheets",
    "offline_mode",
    "product_management",
    "sales_tracking",
    "basic_analytics",
  ],
  pro: [
    "basic_pos",
    "google_sheets",
    "offline_mode",
    "product_management",
    "sales_tracking",
    "basic_analytics",
    "advanced_analytics",
    "team_members",
    "custom_themes",
    "api_access",
    "priority_support",
  ],
  enterprise: [
    "basic_pos",
    "google_sheets",
    "offline_mode",
    "product_management",
    "sales_tracking",
    "basic_analytics",
    "advanced_analytics",
    "team_members",
    "custom_themes",
    "api_access",
    "priority_support",
    "white_label",
  ],
};

/**
 * Check if a user has access to a specific feature
 * Grandfathered users always get Pro features
 */
export function canAccessFeature(
  user: MinimalUser | null,
  feature: FeatureName
): boolean {
  if (!user) return false;

  // Grandfathered users get Pro features for free forever
  if (user.is_grandfathered) {
    return TIER_FEATURES.pro.includes(feature);
  }

  // Check if their tier includes this feature
  const tier = user.subscription_tier as SubscriptionTier;
  return TIER_FEATURES[tier]?.includes(feature) || false;
}

/**
 * Get all features available to a user
 */
export function getUserFeatures(user: MinimalUser | null): FeatureName[] {
  if (!user) return [];

  // Grandfathered users get Pro features
  if (user.is_grandfathered) {
    return TIER_FEATURES.pro;
  }

  const tier = user.subscription_tier as SubscriptionTier;
  return TIER_FEATURES[tier] || TIER_FEATURES.free;
}

/**
 * Check if user needs to upgrade for a feature
 */
export function needsUpgrade(
  user: MinimalUser | null,
  feature: FeatureName
): boolean {
  return !canAccessFeature(user, feature);
}
