import { openDB, DBSchema, IDBPDatabase } from "idb";
import { Product, Sale } from "@/types";

interface MerchPOSDB extends DBSchema {
  products: {
    key: string;
    value: Product;
  };
  sales: {
    key: string;
    value: Sale;
  };
}

const DB_NAME = "merch-pos-db";
const DB_VERSION = 2; // Temporarily match feature branch to avoid version errors

let dbPromise: Promise<IDBPDatabase<MerchPOSDB>> | null = null;

export function getDB() {
  dbPromise ??= openDB<MerchPOSDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Products store
      if (!db.objectStoreNames.contains("products")) {
        db.createObjectStore("products", { keyPath: "id" });
      }

      // Sales store
      if (!db.objectStoreNames.contains("sales")) {
        db.createObjectStore("sales", { keyPath: "id" });
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
}

export async function clearAllProducts() {
  const db = await getDB();
  await db.clear("products");
}
