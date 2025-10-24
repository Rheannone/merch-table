export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock?: number;
  description?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
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
  }[];
  total: number;
  paymentMethod: PaymentMethod;
  synced: boolean;
}

export interface SyncStatus {
  lastSyncTime: string | null;
  pendingSales: number;
  isSyncing: boolean;
}
