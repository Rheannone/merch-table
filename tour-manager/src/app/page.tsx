"use client";

import { useEffect, useState } from "react";
import { Product, CartItem, PaymentMethod, Sale, SyncStatus } from "@/types";
import {
  getProducts,
  saveProducts,
  addProduct as addProductToDB,
  deleteProduct as deleteProductFromDB,
  saveSale,
  getUnsyncedSales,
  markSaleAsSynced,
} from "@/lib/db";
import { DEFAULT_PRODUCTS } from "@/lib/defaultProducts";
import POSInterface from "@/components/POSInterface";
import ProductManager from "@/components/ProductManager";
import SyncStatusBar from "@/components/SyncStatusBar";
import { Cog6ToothIcon, ShoppingBagIcon } from "@heroicons/react/24/outline";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<"pos" | "setup">("pos");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSyncTime: null,
    pendingSales: 0,
    isSyncing: false,
  });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    if (isInitialized) {
      updateSyncStatus();
      const interval = setInterval(updateSyncStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [isInitialized]);

  const initializeApp = async () => {
    try {
      let loadedProducts = await getProducts();

      if (loadedProducts.length === 0) {
        await saveProducts(DEFAULT_PRODUCTS);
        loadedProducts = DEFAULT_PRODUCTS;
      }

      setProducts(loadedProducts);
      setIsInitialized(true);
    } catch (error) {
      console.error("Failed to initialize:", error);
    }
  };

  const updateSyncStatus = async () => {
    const unsyncedSales = await getUnsyncedSales();
    setSyncStatus((prev) => ({
      ...prev,
      pendingSales: unsyncedSales.length,
    }));
  };

  const handleCompleteSale = async (
    items: CartItem[],
    total: number,
    paymentMethod: PaymentMethod
  ) => {
    const sale: Sale = {
      id: `sale-${Date.now()}`,
      timestamp: new Date().toISOString(),
      items: items.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
      })),
      total,
      paymentMethod,
      synced: false,
    };

    await saveSale(sale);
    await updateSyncStatus();

    if (navigator.onLine) {
      syncSales();
    }
  };

  const syncSales = async () => {
    if (syncStatus.isSyncing) return;

    setSyncStatus((prev) => ({ ...prev, isSyncing: true }));

    try {
      const unsyncedSales = await getUnsyncedSales();

      if (unsyncedSales.length > 0) {
        const response = await fetch("/api/sync-sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sales: unsyncedSales }),
        });

        if (response.ok) {
          for (const sale of unsyncedSales) {
            await markSaleAsSynced(sale.id);
          }

          setSyncStatus({
            lastSyncTime: new Date().toISOString(),
            pendingSales: 0,
            isSyncing: false,
          });
        }
      } else {
        setSyncStatus((prev) => ({ ...prev, isSyncing: false }));
      }
    } catch (error) {
      console.error("Sync failed:", error);
      setSyncStatus((prev) => ({ ...prev, isSyncing: false }));
    }
  };

  const handleAddProduct = async (product: Product) => {
    await addProductToDB(product);
    const updatedProducts = await getProducts();
    setProducts(updatedProducts);
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      await deleteProductFromDB(id);
      const updatedProducts = await getProducts();
      setProducts(updatedProducts);
    }
  };

  const handleSyncProducts = async () => {
    try {
      const response = await fetch("/api/sync-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products }),
      });

      if (!response.ok) {
        throw new Error("Failed to sync");
      }
    } catch (error) {
      console.error("Failed to sync products:", error);
      throw error;
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-900">
      <header className="bg-black border-b border-zinc-700 p-4">
        <h1 className="text-2xl font-bold text-white">🎸 Band Merch POS</h1>
      </header>

      <SyncStatusBar status={syncStatus} onSync={syncSales} />

      <nav className="bg-zinc-900 border-b border-zinc-700">
        <div className="flex">
          <button
            onClick={() => setActiveTab("pos")}
            className={`flex-1 py-4 px-6 font-medium flex items-center justify-center gap-2 touch-manipulation ${
              activeTab === "pos"
                ? "border-b-2 border-red-500 text-red-400"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ShoppingBagIcon className="w-5 h-5" />
            Point of Sale
          </button>
          <button
            onClick={() => setActiveTab("setup")}
            className={`flex-1 py-4 px-6 font-medium flex items-center justify-center gap-2 touch-manipulation ${
              activeTab === "setup"
                ? "border-b-2 border-red-500 text-red-400"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Cog6ToothIcon className="w-5 h-5" />
            Product Setup
          </button>
        </div>
      </nav>

      <main className="flex-1 bg-zinc-900">
        {activeTab === "pos" && (
          <POSInterface
            products={products}
            onCompleteSale={handleCompleteSale}
          />
        )}
        {activeTab === "setup" && (
          <ProductManager
            products={products}
            onAddProduct={handleAddProduct}
            onDeleteProduct={handleDeleteProduct}
            onSyncToSheet={handleSyncProducts}
          />
        )}
      </main>
    </div>
  );
}
