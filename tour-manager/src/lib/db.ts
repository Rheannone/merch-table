import { openDB, DBSchema, IDBPDatabase } from "idb";
import { Product, Sale, PaymentSetting } from "@/types";

export interface UserSettings {
  id: string; // Always "current" - single settings object
  paymentSettings: PaymentSetting[];
  categories: string[];
  showTipJar: boolean;
  currency: string;
  exchangeRate: number;
  themeId: string;
  emailSignupSettings: {
    enabled: boolean;
    promptMessage?: string;
    collectName?: boolean;
    collectPhone?: boolean;
    autoDismissSeconds?: number;
  };
  updatedAt: string;
  pendingSync: boolean; // True if needs to sync to Supabase
}

interface MerchPOSDB extends DBSchema {
  products: {
    key: string;
    value: Product;
  };
  sales: {
    key: string;
    value: Sale;
  };
  settings: {
    key: string;
    value: UserSettings;
  };
}

const DB_NAME = "merch-pos-db";
const DB_VERSION = 2; // Increment version to add settings store

let dbPromise: Promise<IDBPDatabase<MerchPOSDB>> | null = null;

export function getDB() {
  dbPromise ??= openDB<MerchPOSDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Products store
      if (!db.objectStoreNames.contains("products")) {
        db.createObjectStore("products", { keyPath: "id" });
      }

      // Sales store
      if (!db.objectStoreNames.contains("sales")) {
        db.createObjectStore("sales", { keyPath: "id" });
      }

      // Settings store (new in v2)
      if (oldVersion < 2 && !db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "id" });
      }
    },
  });
  return dbPromise;
}

// Products
export async function saveProducts(products: Product[]) {
  const db = await getDB();
  const tx = db.transaction("products", "readwrite");
  await Promise.all(products.map((product) => tx.store.put(product)));
  await tx.done;
}

export async function getProducts(): Promise<Product[]> {
  const db = await getDB();
  return db.getAll("products");
}

export async function addProduct(product: Product) {
  const db = await getDB();
  await db.put("products", product);
}

export async function deleteProduct(id: string) {
  const db = await getDB();
  await db.delete("products", id);
}

// Sales
export async function saveSale(sale: Sale) {
  const db = await getDB();
  await db.put("sales", sale);
}

export async function getSales(): Promise<Sale[]> {
  const db = await getDB();
  return db.getAll("sales");
}

export async function getUnsyncedSales(): Promise<Sale[]> {
  const db = await getDB();
  const allSales = await db.getAll("sales");
  return allSales.filter((sale) => !sale.synced);
}

export async function markSaleAsSynced(saleId: string) {
  const db = await getDB();
  const sale = await db.get("sales", saleId);
  if (sale) {
    sale.synced = true;
    await db.put("sales", sale);
  }
}

export async function deleteSyncedSales() {
  const db = await getDB();
  const allSales = await db.getAll("sales");
  const syncedSales = allSales.filter((sale) => sale.synced);

  for (const sale of syncedSales) {
    await db.delete("sales", sale.id);
  }

  return syncedSales.length;
}

export async function clearAllData() {
  const db = await getDB();
  await db.clear("products");
  await db.clear("sales");
  await db.clear("settings");
}

export async function clearAllProducts() {
  const db = await getDB();
  await db.clear("products");
}

// Settings
export async function saveSettings(settings: UserSettings) {
  const db = await getDB();
  const settingsWithId = {
    ...settings,
    id: "current", // Single settings object
    updatedAt: new Date().toISOString(),
  };
  await db.put("settings", settingsWithId);
}

export async function getSettings(): Promise<UserSettings | null> {
  const db = await getDB();
  const settings = await db.get("settings", "current");
  return settings || null;
}

export async function clearSettings() {
  const db = await getDB();
  await db.clear("settings");
}

/**
 * Check if settings have pending changes that need to sync to Supabase
 */
export async function hasPendingSettingsSync(): Promise<boolean> {
  const settings = await getSettings();
  return settings?.pendingSync || false;
}

/**
 * Mark settings as synced to Supabase
 */
export async function markSettingsAsSynced(): Promise<void> {
  const settings = await getSettings();
  if (settings) {
    await saveSettings({ ...settings, pendingSync: false });
  }
}
