"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Product, CartItem, PaymentMethod, Sale, SyncStatus } from "@/types";
import {
  getProducts,
  saveProducts,
  addProduct as addProductToDB,
  deleteProduct as deleteProductFromDB,
  saveSale,
  getSales,
  getUnsyncedSales,
  markSaleAsSynced,
} from "@/lib/db";
import { DEFAULT_PRODUCTS } from "@/lib/defaultProducts";
import POSInterface from "@/components/POSInterface";
import ProductManager from "@/components/ProductManager";
import SyncStatusBar from "@/components/SyncStatusBar";
import OfflineIndicator from "@/components/OfflineIndicator";
import { Cog6ToothIcon, ShoppingBagIcon } from "@heroicons/react/24/outline";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<"pos" | "setup">("pos");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSyncTime: null,
    pendingSales: 0,
    totalSales: 0,
    isSyncing: false,
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializingSheets, setIsInitializingSheets] = useState(false);

  // Handle authentication redirect
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      initializeApp();
    }
  }, [session]);

  useEffect(() => {
    if (isInitialized) {
      updateSyncStatus();
      const interval = setInterval(updateSyncStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [isInitialized]);

  // Auto-sync when coming back online
  useEffect(() => {
    const handleOnline = async () => {
      console.log("📶 Network connection restored - auto-syncing...");
      const unsyncedSales = await getUnsyncedSales();
      if (unsyncedSales.length > 0) {
        // Wait a moment for network to stabilize, then sync
        setTimeout(() => {
          syncSales();
        }, 1000);
      }
    };

    globalThis.addEventListener("online", handleOnline);
    return () => globalThis.removeEventListener("online", handleOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeApp = async () => {
    try {
      // Check if user has sheet IDs stored locally
      let storedProductsSheetId = localStorage.getItem("productsSheetId");
      let storedSalesSheetId = localStorage.getItem("salesSheetId");

      // If no local IDs, search for existing spreadsheet in Google Drive
      if (!storedProductsSheetId || !storedSalesSheetId) {
        console.log("🔍 No local sheet IDs found, searching Google Drive...");
        try {
          const findResponse = await fetch("/api/sheets/find");
          console.log("📡 Search response status:", findResponse.status);

          if (findResponse.ok) {
            const findData = await findResponse.json();
            console.log("📄 Search result:", findData);

            if (findData.found) {
              // Found existing spreadsheet - use it
              localStorage.setItem("productsSheetId", findData.spreadsheetId);
              localStorage.setItem("salesSheetId", findData.spreadsheetId);
              storedProductsSheetId = findData.spreadsheetId;
              storedSalesSheetId = findData.spreadsheetId;
              console.log(
                "✅ Found existing Merch Table spreadsheet!",
                findData.spreadsheetId
              );
            } else {
              console.log(
                "ℹ️ No existing spreadsheet found, will create new one"
              );
            }
          } else {
            const errorText = await findResponse.text();
            console.error("❌ Search request failed:", errorText);
          }
        } catch (error) {
          console.error("❌ Error searching for existing spreadsheet:", error);
        }
      } else {
        console.log("✅ Using cached sheet IDs:", {
          storedProductsSheetId,
          storedSalesSheetId,
        });
      }

      // If still no sheet IDs, create new spreadsheet
      if (!storedProductsSheetId || !storedSalesSheetId) {
        console.log("📝 Creating new spreadsheet...");
        setIsInitializingSheets(true);
        try {
          const response = await fetch("/api/sheets/initialize", {
            method: "POST",
          });

          console.log("📡 Create response status:", response.status);

          if (response.ok) {
            const data = await response.json();
            console.log("📄 Create result:", data);
            localStorage.setItem("productsSheetId", data.productsSheetId);
            localStorage.setItem("salesSheetId", data.salesSheetId);
            console.log(
              "✅ Google Sheets created successfully!",
              data.productsSheetId
            );
          } else {
            const errorText = await response.text();
            console.error("❌ Failed to initialize sheets:", errorText);
          }
        } catch (error) {
          console.error("❌ Error initializing sheets:", error);
        } finally {
          setIsInitializingSheets(false);
        }
      }

      // Load products - try from Google Sheets first, then IndexedDB, then defaults
      let loadedProducts: Product[] = [];

      // If we have a sheet ID, try loading products from Google Sheets
      if (storedProductsSheetId) {
        try {
          console.log("📥 Loading products from Google Sheets...");
          const response = await fetch("/api/sheets/load-products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productsSheetId: storedProductsSheetId }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.products && data.products.length > 0) {
              loadedProducts = data.products;
              await saveProducts(loadedProducts); // Save to IndexedDB
              console.log(
                "✅ Loaded",
                loadedProducts.length,
                "products from Google Sheets"
              );
            }
          }
        } catch (error) {
          console.error("❌ Failed to load from Google Sheets:", error);
        }
      }

      // If no products from sheets, try IndexedDB
      if (loadedProducts.length === 0) {
        loadedProducts = await getProducts();
        console.log(
          "📦 Loaded",
          loadedProducts.length,
          "products from IndexedDB"
        );
      }

      // If still no products, use defaults
      if (loadedProducts.length === 0) {
        await saveProducts(DEFAULT_PRODUCTS);
        loadedProducts = DEFAULT_PRODUCTS;
        console.log("🎯 Using default products");
      }

      setProducts(loadedProducts);
      setIsInitialized(true);
    } catch (error) {
      console.error("Failed to initialize:", error);
    }
  };

  const updateSyncStatus = async () => {
    const unsyncedSales = await getUnsyncedSales();
    const allSales = await getSales();
    setSyncStatus((prev) => ({
      ...prev,
      pendingSales: unsyncedSales.length,
      totalSales: allSales.length,
    }));
  };

  const handleCompleteSale = async (
    items: CartItem[],
    total: number,
    paymentMethod: PaymentMethod,
    isHookup: boolean = false
  ) => {
    const sale: Sale = {
      id: `sale-${Date.now()}`,
      timestamp: new Date().toISOString(),
      items: items.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        size: item.size,
      })),
      total,
      paymentMethod,
      synced: false,
      isHookup,
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
      const salesSheetId = localStorage.getItem("salesSheetId");

      if (unsyncedSales.length > 0 && salesSheetId) {
        const response = await fetch("/api/sheets/sync-sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sales: unsyncedSales, salesSheetId }),
        });

        if (response.ok) {
          for (const sale of unsyncedSales) {
            await markSaleAsSynced(sale.id);
          }

          const allSales = await getSales();
          setSyncStatus({
            lastSyncTime: new Date().toISOString(),
            pendingSales: 0,
            totalSales: allSales.length,
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
      const productsSheetId = localStorage.getItem("productsSheetId");

      if (!productsSheetId) {
        throw new Error("Products sheet not initialized");
      }

      const response = await fetch("/api/sheets/sync-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products, productsSheetId }),
      });

      if (!response.ok) {
        throw new Error("Failed to sync");
      }

      alert("Products synced to Google Sheets successfully!");
    } catch (error) {
      console.error("Failed to sync products:", error);
      alert(
        "Failed to sync products: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
      throw error;
    }
  };

  if (isInitializingSheets) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-900">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-white text-lg font-semibold mb-2">
            Setting up your Google Sheets...
          </p>
          <p className="text-zinc-400 text-sm">
            Creating Products and Sales sheets in your Google Drive
          </p>
        </div>
      </div>
    );
  }

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

  // Show loading state while checking authentication
  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-zinc-400">
            {status === "loading" ? "Loading..." : "Redirecting to sign in..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-900">
      <header className="bg-black border-b border-zinc-700 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">🎸 Merch Table</h1>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm text-zinc-400">Signed in as</p>
              <p className="text-sm font-medium text-white">
                {session?.user?.email}
              </p>
            </div>
            <button
              onClick={() => signOut()}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded border border-zinc-700 text-sm transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
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

      <OfflineIndicator />
    </div>
  );
}
