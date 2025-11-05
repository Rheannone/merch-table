export interface Product {
  id: string;
  name: string;
  price: number; // Base price in USD
  category: string;
  description?: string;
  imageUrl?: string;
  showTextOnButton?: boolean; // Whether to show product name on POS button (default: true)
  sizes?: string[]; // e.g., ['S', 'M', 'L', 'XL'] for apparel
  // Inventory tracking
  inventory?: {
    [sizeOrDefault: string]: number; // e.g., { "M": 5, "L": 3 } or { "default": 10 }
  };
  // Currency price overrides - allows setting specific prices per currency
  // e.g., { "CAD": 30, "EUR": 25 } to override automatic conversion
  currencyPrices?: {
    [currencyCode: string]: number;
  };
}

export interface CartItem {
  product: Product;
  quantity: number;
  size?: string; // Selected size if product has sizes
}

export type PaymentMethod = string; // "cash", "venmo", "credit", "other", or custom payment type names

export interface PaymentSetting {
  paymentType:
    | "cash"
    | "venmo"
    | "credit"
    | "other"
    | "custom1"
    | "custom2"
    | "custom3";
  enabled: boolean;
  displayName: string; // What shows on the button (e.g., "Cash", "Venmo", "Apple Pay")
  transactionFee?: number; // Percentage as decimal (e.g., 0.03 for 3%)
  qrCodeUrl?: string; // Optional QR code image URL
}

export interface POSSettings {
  paymentSettings: PaymentSetting[];
  categories: string[]; // Custom product categories
  theme?: string; // Selected theme name (e.g., 'default', 'girlypop')
  showTipJar?: boolean; // Whether to show the "Add a Tip" option (default: true)
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  emoji: string;
  colors: {
    // Background colors
    background: string;
    backgroundSecondary: string;
    backgroundTertiary: string;

    // Text colors
    foreground: string;
    foregroundSecondary: string;
    foregroundMuted: string;

    // Accent colors
    primary: string;
    primaryHover: string;
    secondary: string;
    secondaryHover: string;

    // Status colors
    success: string;
    successHover: string;
    error: string;
    errorHover: string;
    warning: string;
    info: string;

    // Border and dividers
    border: string;
    borderHover: string;

    // Cart and checkout
    cartBackground: string;
    cartBorder: string;
  };
  patterns?: {
    backgroundPattern?: string; // CSS background pattern
  };
}

export interface Sale {
  id: string;
  timestamp: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    size?: string; // Selected size if applicable
  }[];
  total: number; // Total cart value before any discounts
  actualAmount: number; // Actual amount of money received/charged
  discount?: number; // Discount amount (hookup) - calculated as total - actualAmount
  paymentMethod: PaymentMethod;
  synced: boolean;
  isHookup?: boolean; // True if this was a hookup/discount sale (for backward compatibility)
  tipAmount?: number; // Tip amount added to the sale (not included in actualAmount)
}

export interface SyncStatus {
  lastSyncTime: string | null;
  pendingSales: number;
  totalSales: number; // Total number of sales (synced + unsynced) for verification
  isSyncing: boolean;
  pendingProductSync: boolean; // True if products need to be synced
}

export interface EmailSignup {
  id: string;
  timestamp: string;
  email: string;
  name?: string; // Optional name
  phone?: string; // Optional phone number
  source: "post-checkout" | "manual-entry"; // How the email was collected
  saleId?: string; // Associated sale ID if collected post-checkout
  synced: boolean; // Whether synced to Google Sheets
}

export interface EmailSignupSettings {
  enabled: boolean; // Whether to show post-checkout email prompt
  promptMessage?: string; // Custom message (default: "Join our mailing list!")
  collectName?: boolean; // Whether to ask for name (default: false)
  collectPhone?: boolean; // Whether to ask for phone (default: false)
  autoDismissSeconds?: number; // Auto-dismiss after X seconds (default: 10)
}
