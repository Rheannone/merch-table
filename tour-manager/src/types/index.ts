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

export type PaymentMethod = "cash" | "card" | "venmo" | "other";

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
  total: number;
  paymentMethod: PaymentMethod;
  synced: boolean;
  isHookup?: boolean; // True if this was a hookup/discount sale
}

export interface SyncStatus {
  lastSyncTime: string | null;
  pendingSales: number;
  totalSales: number; // Total number of sales (synced + unsynced) for verification
  isSyncing: boolean;
  pendingProductSync: boolean; // True if products need to be synced
}
