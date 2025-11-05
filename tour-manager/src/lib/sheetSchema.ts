/**
 * Google Sheets Schema Constants
 *
 * Centralized column definitions to prevent hardcoded references.
 * If we ever add/remove/reorder columns, update here and all references automatically adjust.
 */

// Current schema version - increment when making breaking changes
export const SCHEMA_VERSION = "1.0.0";

/**
 * Sales Sheet Column Indices (0-based for array access)
 */
export const SALES_COLUMNS = {
  ID: 0, // A
  DATE: 1, // B
  ITEMS: 2, // C
  TOTAL: 3, // D
  ACTUAL_AMOUNT: 4, // E
  DISCOUNT: 5, // F
  PAYMENT_METHOD: 6, // G
  HOOKUP: 7, // H
  PRODUCT_NAMES: 8, // I
  SIZES: 9, // J
  TIPS: 10, // K
} as const;

/**
 * Sales Sheet Column Letters (for Google Sheets range notation)
 */
export const SALES_COL_LETTERS = {
  ID: "A",
  DATE: "B",
  ITEMS: "C",
  TOTAL: "D",
  ACTUAL_AMOUNT: "E",
  DISCOUNT: "F",
  PAYMENT_METHOD: "G",
  HOOKUP: "H",
  PRODUCT_NAMES: "I",
  SIZES: "J",
  TIPS: "K",
} as const;

/**
 * Sales Sheet Headers (in order)
 */
export const SALES_HEADERS = [
  "ID",
  "Timestamp",
  "Items",
  "Total",
  "Actual Amount",
  "Discount",
  "Payment Method",
  "Hookup",
  "Product Names",
  "Sizes",
  "Tips",
] as const;

/**
 * Products Sheet Column Indices (0-based)
 */
export const PRODUCTS_COLUMNS = {
  ID: 0, // A
  NAME: 1, // B
  PRICE: 2, // C
  CATEGORY: 3, // D
  SIZES: 4, // E
  IMAGE_URL: 5, // F
  DESCRIPTION: 6, // G
  INVENTORY: 7, // H
  SHOW_TEXT: 8, // I
  CURRENCY_PRICES: 9, // J
} as const;

/**
 * Products Sheet Column Letters
 */
export const PRODUCTS_COL_LETTERS = {
  ID: "A",
  NAME: "B",
  PRICE: "C",
  CATEGORY: "D",
  SIZES: "E",
  IMAGE_URL: "F",
  DESCRIPTION: "G",
  INVENTORY: "H",
  SHOW_TEXT: "I",
  CURRENCY_PRICES: "J",
} as const;

/**
 * Products Sheet Headers (in order)
 */
export const PRODUCTS_HEADERS = [
  "ID",
  "Name",
  "Price",
  "Category",
  "Sizes",
  "Image URL",
  "Description",
  "Inventory",
  "Show Text",
  "Currency Prices",
] as const;

/**
 * POS Settings Sheet Column Indices (0-based)
 */
export const POS_SETTINGS_COLUMNS = {
  PAYMENT_TYPE: 0, // A
  ENABLED: 1, // B
  DISPLAY_NAME: 2, // C
  TRANSACTION_FEE: 3, // D
  QR_CODE_URL: 4, // E
  // F is empty spacer
  CATEGORIES: 6, // G
  THEME: 7, // H
} as const;

/**
 * POS Settings Sheet Column Letters
 */
export const POS_SETTINGS_COL_LETTERS = {
  PAYMENT_TYPE: "A",
  ENABLED: "B",
  DISPLAY_NAME: "C",
  TRANSACTION_FEE: "D",
  QR_CODE_URL: "E",
  CATEGORIES: "G",
  THEME: "H",
} as const;

/**
 * POS Settings Sheet Headers
 */
export const POS_SETTINGS_HEADERS = [
  "Payment Type",
  "Enabled",
  "Display Name",
  "Transaction Fee %",
  "QR Code URL",
  "", // Empty column F
  "Categories",
  "Theme",
] as const;

/**
 * Insights Sheet Fixed Column Indices (0-based)
 * Payment method columns are dynamic and inserted between TIPS and TOP_ITEM
 */
export const INSIGHTS_FIXED_COLUMNS = {
  DATE: 0, // A
  SALES_COUNT: 1, // B
  REVENUE: 2, // C
  TIPS: 3, // D (FIXED POSITION)
  // Payment methods start at index 4 (E) - count varies
  // TOP_ITEM and TOP_SIZE come after payment methods
} as const;

/**
 * Insights Sheet Column Letters (Fixed columns only)
 */
export const INSIGHTS_COL_LETTERS = {
  DATE: "A",
  SALES_COUNT: "B",
  REVENUE: "C",
  TIPS: "D",
  FIRST_PAYMENT_METHOD: "E", // Dynamic payment methods start here
} as const;

/**
 * Default payment methods (used when no sales exist)
 */
export const DEFAULT_PAYMENT_METHODS = [
  "Cash",
  "Venmo",
  "Card",
  "Other",
] as const;

/**
 * Utility: Normalize payment method to Title Case for consistency
 */
export function normalizePaymentMethod(method: string): string {
  return method
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Utility: Get column letter from index (0-based)
 */
export function getColumnLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

/**
 * Utility: Build a range string
 */
export function buildRange(
  sheetName: string,
  startCol: string,
  startRow: number,
  endCol?: string,
  endRow?: number
): string {
  let range = `${sheetName}!${startCol}${startRow}`;
  if (endCol) {
    range += `:${endCol}`;
    if (endRow) {
      range += `${endRow}`;
    }
  }
  return range;
}
