export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  imageUrl?: string;
  showTextOnButton?: boolean; // Whether to show product name on POS button (default: true)
  sizes?: string[]; // e.g., ['S', 'M', 'L', 'XL'] for apparel
  // Inventory tracking
  inventory?: {
    [sizeOrDefault: string]: number; // e.g., { "M": 5, "L": 3 } or { "default": 10 }
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
}

export interface SyncStatus {
  lastSyncTime: string | null;
  pendingSales: number;
  totalSales: number; // Total number of sales (synced + unsynced) for verification
  isSyncing: boolean;
  pendingProductSync: boolean; // True if products need to be synced
}
