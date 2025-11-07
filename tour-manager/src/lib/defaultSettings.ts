import { PaymentSetting } from "@/types";

/**
 * Default payment methods for new users
 * Shared between Supabase and Google Sheets initialization
 */
export const DEFAULT_PAYMENT_SETTINGS: PaymentSetting[] = [
  { paymentType: "cash", enabled: true, displayName: "Cash" },
  { paymentType: "venmo", enabled: true, displayName: "Venmo" },
  {
    paymentType: "credit",
    enabled: false,
    displayName: "Credit",
    transactionFee: 0.03,
  },
  { paymentType: "other", enabled: true, displayName: "Other" },
  { paymentType: "custom1", enabled: false, displayName: "Custom 1" },
  { paymentType: "custom2", enabled: false, displayName: "Custom 2" },
  { paymentType: "custom3", enabled: false, displayName: "Custom 3" },
];

/**
 * Default product categories for new users
 */
export const DEFAULT_CATEGORIES = ["Apparel", "Merch", "Music"];

/**
 * Default currency settings
 */
export const DEFAULT_CURRENCY = "USD";
export const DEFAULT_EXCHANGE_RATE = 1.0;

/**
 * Default theme
 */
export const DEFAULT_THEME = "default";

/**
 * Default tip jar setting
 */
export const DEFAULT_SHOW_TIP_JAR = true;
