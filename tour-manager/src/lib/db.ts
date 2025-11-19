import { openDB, DBSchema, IDBPDatabase } from "idb";
import { Product, Sale, CloseOut, UserSettings } from "@/types";

interface MerchPOSDB extends DBSchema {
  products: {
    key: string;
    value: Product;
  };
  sales: {
    key: string;
    value: Sale;
  };
  closeouts: {
    key: string;
    value: CloseOut;
    indexes: { timestamp: string };
  };
  settings: {
    key: string;
    value: UserSettings & { userId: string };
  };
}

const DB_NAME = "road-dog-db";
const DB_VERSION = 3; // Increment for new settings store

let dbPromise: Promise<IDBPDatabase<MerchPOSDB>> | null = null;

export function getDB() {
  dbPromise ??= openDB<MerchPOSDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion) {
      console.log(`🔄 Database upgrade: ${oldVersion} → ${newVersion}`);

      // Products store
      if (!db.objectStoreNames.contains("products")) {
        console.log("📦 Creating products store");
        db.createObjectStore("products", { keyPath: "id" });
      }

      // Sales store
      if (!db.objectStoreNames.contains("sales")) {
        console.log("💰 Creating sales store");
        db.createObjectStore("sales", { keyPath: "id" });
      }

      // Close-outs store (added in v2)
      if (!db.objectStoreNames.contains("closeouts")) {
        console.log("📊 Creating closeouts store");
        const closeoutStore = db.createObjectStore("closeouts", {
          keyPath: "id",
        });
        // Add index for timestamp to enable sorting by date
        closeoutStore.createIndex("timestamp", "timestamp", { unique: false });
      }

      // Settings store (added in v3)
      if (!db.objectStoreNames.contains("settings")) {
        console.log("⚙️ Creating settings store");
        db.createObjectStore("settings", { keyPath: "userId" });
      }
    },
  });
  return dbPromise;
}

// Force refresh database connection (useful for debugging)
export function refreshDB() {
  dbPromise = null;
  return getDB();
}

// Products
export async function saveProducts(products: Product[]) {
  const db = await getDB();
  const tx = db.transaction("products", "readwrite");
  // Clear existing products first to remove any that were deleted
  await tx.store.clear();
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

export async function saveSales(sales: Sale[]) {
  const db = await getDB();

  // Get current unsynced sales to preserve them during cleanup
  // This ensures we don't lose sales that are pending sync
  const currentSales = await db.getAll("sales");
  const unsyncedSales = currentSales.filter((s) => !s.synced);

  const tx = db.transaction("sales", "readwrite");

  // Clear existing sales to remove any that were deleted in Supabase
  await tx.store.clear();

  // Put back unsynced sales (pending sync) + new sales from Supabase
  // This ensures deleted sales are removed while preserving local changes
  for (const sale of [...unsyncedSales, ...sales]) {
    await tx.store.put(sale);
  }

  await tx.done;

  console.log(
    `💾 Saved ${sales.length} sales from Supabase, preserved ${unsyncedSales.length} unsynced sales`
  );
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

  // Get all close-outs to see which sales are already closed out
  const allCloseOuts = await db.getAll("closeouts");
  const closedOutSaleIds = new Set<string>();
  for (const closeOut of allCloseOuts) {
    for (const saleId of closeOut.saleIds) {
      closedOutSaleIds.add(saleId);
    }
  }

  // Only delete synced sales that have been closed out
  // Keep synced sales that haven't been closed out yet for future close-outs
  const salesToDelete = allSales.filter(
    (sale) => sale.synced && closedOutSaleIds.has(sale.id)
  );

  for (const sale of salesToDelete) {
    await db.delete("sales", sale.id);
  }

  console.log(
    `🗑️ Deleted ${salesToDelete.length} closed-out sales, keeping ${
      allSales.filter((s) => s.synced && !closedOutSaleIds.has(s.id)).length
    } synced sales for future close-outs`
  );

  return salesToDelete.length;
}

export async function clearAllData() {
  const db = await getDB();
  await db.clear("products");
  await db.clear("sales");
  await db.clear("closeouts");
}

export async function clearAllProducts() {
  const db = await getDB();
  await db.clear("products");
}

// Close-outs
export async function saveCloseOut(closeOut: CloseOut) {
  const db = await getDB();
  await db.put("closeouts", closeOut);
}

export async function getCloseOuts(): Promise<CloseOut[]> {
  const db = await getDB();
  const closeOuts = await db.getAll("closeouts");
  // Sort manually by timestamp (newest first)
  return closeOuts.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export async function getCloseOutById(
  id: string
): Promise<CloseOut | undefined> {
  const db = await getDB();
  return db.get("closeouts", id);
}

export async function updateCloseOut(closeOut: CloseOut) {
  const db = await getDB();
  closeOut.updatedAt = new Date().toISOString();
  await db.put("closeouts", closeOut);
}

export async function markCloseOutAsSynced(closeOutId: string) {
  const db = await getDB();
  const closeOut = await db.get("closeouts", closeOutId);
  if (closeOut) {
    closeOut.syncedToSupabase = true;
    closeOut.updatedAt = new Date().toISOString();
    await db.put("closeouts", closeOut);
  }
}

export async function markProductAsSynced(productId: string) {
  const db = await getDB();
  const product = await db.get("products", productId);
  if (product) {
    product.synced = true;
    await db.put("products", product);
  }
}

// Settings
export async function saveSettings(
  userId: string,
  settings: UserSettings
): Promise<void> {
  const db = await getDB();
  await db.put("settings", { userId, ...settings });
}

export async function getSettings(
  userId: string
): Promise<UserSettings | null> {
  const db = await getDB();
  const result = await db.get("settings", userId);
  if (!result) return null;

  // Remove userId from the returned object
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { userId: _userId, ...settings } = result;
  return settings;
}

export async function clearSettings(userId: string): Promise<void> {
  const db = await getDB();
  await db.delete("settings", userId);
}

export async function deleteCloseOut(id: string) {
  const db = await getDB();
  await db.delete("closeouts", id);
}

export async function getLastCloseOut(): Promise<CloseOut | undefined> {
  const closeOuts = await getCloseOuts(); // Already sorted newest first
  return closeOuts[0];
}
