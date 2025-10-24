export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock?: number;
  description?: string;
  imageUrl?: string;
  sizes?: string[]; // e.g., ['S', 'M', 'L', 'XL'] for apparel
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
  isSyncing: boolean;
}
