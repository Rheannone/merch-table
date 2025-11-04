/**
 * Multi-Currency Display System
 *
 * All prices are stored in USD in the database and Google Sheets.
 * This module handles display conversion to other currencies for customer-facing UI.
 */

export type CurrencyCode =
  | "USD"
  | "CAD"
  | "EUR"
  | "GBP"
  | "MXN"
  | "AUD"
  | "JPY";

export interface CurrencySettings {
  displayCurrency: CurrencyCode;
  exchangeRate: number; // How many units of display currency = 1 USD (e.g., 1.35 for CAD)
  symbol: string;
  code: string;
}

export interface CurrencyInfo {
  code: CurrencyCode;
  name: string;
  symbol: string;
  defaultRate: number; // Approximate rate as of Nov 2025
  billDenominations: number[]; // Common cash denominations
}

/**
 * Currency information database
 */
export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  USD: {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    defaultRate: 1.0,
    billDenominations: [100, 50, 20, 10, 5, 1],
  },
  CAD: {
    code: "CAD",
    name: "Canadian Dollar",
    symbol: "CA$",
    defaultRate: 1.35, // 1 USD ≈ 1.35 CAD
    billDenominations: [100, 50, 20, 10, 5],
  },
  EUR: {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    defaultRate: 0.92, // 1 USD ≈ 0.92 EUR
    billDenominations: [100, 50, 20, 10, 5],
  },
  GBP: {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
    defaultRate: 0.79, // 1 USD ≈ 0.79 GBP
    billDenominations: [50, 20, 10, 5],
  },
  MXN: {
    code: "MXN",
    name: "Mexican Peso",
    symbol: "MX$",
    defaultRate: 17.0, // 1 USD ≈ 17 MXN
    billDenominations: [1000, 500, 200, 100, 50, 20],
  },
  AUD: {
    code: "AUD",
    name: "Australian Dollar",
    symbol: "AU$",
    defaultRate: 1.52, // 1 USD ≈ 1.52 AUD
    billDenominations: [100, 50, 20, 10, 5],
  },
  JPY: {
    code: "JPY",
    name: "Japanese Yen",
    symbol: "¥",
    defaultRate: 149.0, // 1 USD ≈ 149 JPY
    billDenominations: [10000, 5000, 2000, 1000],
  },
};

const STORAGE_KEY = "currency-settings";

/**
 * Get current currency settings from localStorage
 */
export function getCurrencySettings(): CurrencySettings {
  if (typeof window === "undefined") {
    // Server-side rendering fallback
    return {
      displayCurrency: "USD",
      exchangeRate: 1.0,
      symbol: "$",
      code: "USD",
    };
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse currency settings:", e);
    }
  }

  // Default to USD
  return {
    displayCurrency: "USD",
    exchangeRate: 1.0,
    symbol: "$",
    code: "USD",
  };
}

/**
 * Save currency settings to localStorage
 */
export function saveCurrencySettings(settings: CurrencySettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

  // Dispatch custom event so components can react to currency changes
  window.dispatchEvent(
    new CustomEvent("currency-changed", { detail: settings })
  );
}

/**
 * Format a USD amount for display in the selected currency
 * @param usdAmount Amount in USD (as stored in database)
 * @returns Formatted string with currency symbol
 */
export function formatPrice(usdAmount: number): string {
  const settings = getCurrencySettings();
  const convertedAmount = usdAmount * settings.exchangeRate;

  // JPY doesn't use decimal places
  const decimals = settings.displayCurrency === "JPY" ? 0 : 2;

  return `${settings.symbol}${convertedAmount.toFixed(decimals)}`;
}

/**
 * Convert displayed currency amount back to USD for storage
 * @param displayAmount Amount in display currency
 * @returns Amount in USD
 */
export function convertToUSD(displayAmount: number): number {
  const settings = getCurrencySettings();
  return displayAmount / settings.exchangeRate;
}

/**
 * Get bill denominations for current currency
 */
export function getBillDenominations(): number[] {
  const settings = getCurrencySettings();
  const currencyInfo = CURRENCIES[settings.displayCurrency];
  return currencyInfo.billDenominations;
}

/**
 * Get the currency symbol for display
 */
export function getCurrencySymbol(): string {
  return getCurrencySettings().symbol;
}

/**
 * Get the currency code for display
 */
export function getCurrencyCode(): string {
  return getCurrencySettings().code;
}

/**
 * Format a price input placeholder
 */
export function getPricePlaceholder(usdAmount: number): string {
  const settings = getCurrencySettings();
  const convertedAmount = usdAmount * settings.exchangeRate;
  const decimals = settings.displayCurrency === "JPY" ? 0 : 2;
  return convertedAmount.toFixed(decimals);
}
