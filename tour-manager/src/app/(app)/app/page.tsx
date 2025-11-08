"use client";

import { useEffect, useState, useRef } from "react";
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
  deleteSyncedSales,
} from "@/lib/db";
import { DEFAULT_PRODUCTS } from "@/lib/defaultProducts";
import POSInterface from "@/components/POSInterface";
import ProductManager from "@/components/ProductManager";
import Settings from "@/components/Settings";
import Analytics from "@/components/Analytics";
import SyncStatusBar from "@/components/SyncStatusBar";
import FeedbackButton from "@/components/FeedbackButton";
import Toast, { ToastType } from "@/components/Toast";
import {
  Cog6ToothIcon,
  ShoppingBagIcon,
  ArchiveBoxIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "@/components/ThemeProvider";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const initializingRef = useRef(false); // Prevent multiple initializations
  const productSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Debounce product syncs
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]); // Add category order state
  const [activeTab, setActiveTab] = useState<
    "pos" | "setup" | "analytics" | "settings"
  >("pos");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSyncTime: null,
    pendingSales: 0,
    totalSales: 0,
    isSyncing: false,
    pendingProductSync: false,
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializingSheets, setIsInitializingSheets] = useState(false);
  const [loadedFromSheets, setLoadedFromSheets] = useState(false); // Track if products were loaded from Sheets
  const [productsChanged, setProductsChanged] = useState(false); // Track if products actually changed
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  // Get theme context to apply saved theme on load
  const { setTheme } = useTheme();

  // Handle authentication redirect
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Monitor session for token refresh errors and auto-logout
  useEffect(() => {
    if (session?.error === "RefreshAccessTokenError") {
      console.error("Token refresh failed. Logging out...");
      setToast({
        message: "Your session has expired. Please sign in again.",
        type: "error",
      });
      // Sign out after a short delay to show the toast
      setTimeout(() => {
        signOut({ callbackUrl: "/auth/signin" });
      }, 2000);
    }
  }, [session]);

  // Load theme from settings on initialization
  useEffect(() => {
    const loadThemeFromSettings = async () => {
      const spreadsheetId = localStorage.getItem("salesSheetId");
      if (!spreadsheetId) return;

      try {
        const response = await fetch("/api/sheets/settings/load", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spreadsheetId }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.theme) {
            setTheme(data.theme);
          }
        }
      } catch (error) {
        console.error("Failed to load theme:", error);
      }
    };

    if (session && isInitialized) {
      loadThemeFromSettings();
    }
  }, [session, isInitialized, setTheme]);

  useEffect(() => {
    if (session && !isInitialized && !initializingRef.current) {
      initializingRef.current = true;
      initializeApp();
    }
  }, [session, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      updateSyncStatus();
      const interval = setInterval(updateSyncStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [isInitialized]);

  // Auto-sync on page load/refresh after initialization
  useEffect(() => {
    if (isInitialized && navigator.onLine) {
      const autoSync = async () => {
        console.log("🔄 Auto-syncing on page load...");

        const unsyncedSales = await getUnsyncedSales();
        const hasUnsyncedProducts = syncStatus.pendingProductSync;

        // Build toast message based on what happened
        const messageParts: string[] = [];

        // If products were loaded from Sheets AND they changed, mention it
        if (loadedFromSheets && productsChanged) {
          messageParts.push("Loaded latest products");
        }

        // Sync any local changes
        if (unsyncedSales.length > 0 || hasUnsyncedProducts) {
          const syncParts: string[] = [];

          if (unsyncedSales.length > 0) {
            await syncSales();
            syncParts.push(
              `${unsyncedSales.length} sale${
                unsyncedSales.length > 1 ? "s" : ""
              }`
            );
          }

          if (hasUnsyncedProducts) {
            await syncProductsToSheet();
            syncParts.push("products");
          }

          if (syncParts.length > 0) {
            messageParts.push(`synced ${syncParts.join(" and ")}`);
          }
        }

        // Show toast if there's something to report
        if (messageParts.length > 0) {
          // Capitalize first letter
          const message = messageParts.join(" and ");
          const formattedMessage =
            message.charAt(0).toUpperCase() + message.slice(1);

          setToast({
            message: formattedMessage,
            type: "success",
          });
        }
      };

      // Small delay to let the app finish loading
      const timer = setTimeout(autoSync, 1000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]);

  // Auto-sync when coming back online
  useEffect(() => {
    const handleOnline = async () => {
      console.log("📶 Network connection restored - auto-syncing...");

      // Sync sales if needed
      const unsyncedSales = await getUnsyncedSales();
      if (unsyncedSales.length > 0) {
        setTimeout(() => {
          syncSales();
        }, 1000);
      }

      // Sync products if needed
      if (syncStatus.pendingProductSync) {
        setTimeout(() => {
          syncProductsToSheet();
        }, 1500);
      }
    };

    globalThis.addEventListener("online", handleOnline);
    return () => {
      globalThis.removeEventListener("online", handleOnline);
      // Clean up any pending product sync timeouts
      if (productSyncTimeoutRef.current) {
        clearTimeout(productSyncTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper function to detect if products have changed
  const detectProductChanges = (
    oldProducts: Product[],
    newProducts: Product[]
  ): boolean => {
    // If counts differ, they've changed
    if (oldProducts.length !== newProducts.length) {
      return true;
    }

    // If no old products (first load), consider it changed
    if (oldProducts.length === 0) {
      return newProducts.length > 0;
    }

    // Create a simple fingerprint by sorting IDs and comparing
    const oldFingerprint = [...oldProducts]
      .map((p) => p.id)
      .sort((a, b) => a.localeCompare(b))
      .join(",");
    const newFingerprint = [...newProducts]
      .map((p) => p.id)
      .sort((a, b) => a.localeCompare(b))
      .join(",");

    // If IDs changed, products changed
    if (oldFingerprint !== newFingerprint) {
      return true;
    }

    // Check if any product's key properties changed
    // Create a more detailed fingerprint including name, price, and inventory
    const sortedOldProducts = [...oldProducts].sort((a, b) =>
      a.id.localeCompare(b.id)
    );
    const sortedNewProducts = [...newProducts].sort((a, b) =>
      a.id.localeCompare(b.id)
    );

    const oldDetailedFingerprint = sortedOldProducts
      .map(
        (p) =>
          `${p.id}:${p.name}:${p.price}:${JSON.stringify(p.inventory || {})}`
      )
      .join("|");

    const newDetailedFingerprint = sortedNewProducts
      .map(
        (p) =>
          `${p.id}:${p.name}:${p.price}:${JSON.stringify(p.inventory || {})}`
      )
      .join("|");

    return oldDetailedFingerprint !== newDetailedFingerprint;
  };

  const initializeApp = async () => {
    try {
      // Check for force-new parameter to bypass cached IDs (for testing)
      const urlParams = new URLSearchParams(window.location.search);
      const forceNew = urlParams.has("force-new");

      if (forceNew) {
        console.log("🆕 Force-new parameter detected - clearing cached IDs");
        localStorage.removeItem("productsSheetId");
        localStorage.removeItem("salesSheetId");
        // Remove the parameter from URL
        window.history.replaceState({}, "", window.location.pathname);
      }

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
                "✅ Found existing MERCH TABLE spreadsheet!",
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
            if (data.sheetName) {
              localStorage.setItem("salesSheetName", data.sheetName);
            }
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
      let productsLoadedFromSheets = false;

      // Get current products from IndexedDB to compare for changes
      const currentProducts = await getProducts();

      // If we have a sheet ID, try loading products from Google Sheets
      if (storedProductsSheetId) {
        try {
          console.log("📥 Loading products from Google Sheets...");

          // Add timeout to prevent hanging
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

          const response = await fetch("/api/sheets/load-products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productsSheetId: storedProductsSheetId }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            if (data.products && data.products.length > 0) {
              loadedProducts = data.products;
              await saveProducts(loadedProducts); // Save to IndexedDB
              productsLoadedFromSheets = true;
              console.log(
                "✅ Loaded",
                loadedProducts.length,
                "products from Google Sheets"
              );
            } else {
              console.log("ℹ️ No products found in Google Sheets");
            }
          } else {
            console.error("❌ Load products response not OK:", response.status);
          }
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            console.error("❌ Load products timed out after 10 seconds");
          } else {
            console.error("❌ Failed to load from Google Sheets:", error);
          }
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

        // Sync default products to Google Sheets for new users
        if (storedProductsSheetId) {
          try {
            console.log("📤 Syncing default products to Google Sheets...");
            const syncResponse = await fetch("/api/sheets/sync-products", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productsSheetId: storedProductsSheetId,
                products: DEFAULT_PRODUCTS,
              }),
            });

            if (syncResponse.ok) {
              console.log("✅ Default products synced to Google Sheets");
            } else {
              console.error("❌ Failed to sync default products");
            }
          } catch (error) {
            console.error("❌ Error syncing default products:", error);
          }
        }
      }

      // Detect if products actually changed
      const hasProductsChanged = detectProductChanges(
        currentProducts,
        loadedProducts
      );

      setProducts(loadedProducts);
      setLoadedFromSheets(productsLoadedFromSheets);
      setProductsChanged(hasProductsChanged);

      // Load category order from settings
      if (storedSalesSheetId) {
        try {
          const settingsResponse = await fetch("/api/sheets/settings/load", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ spreadsheetId: storedSalesSheetId }),
          });

          if (settingsResponse.ok) {
            const settingsData = await settingsResponse.json();
            if (
              settingsData.categories &&
              Array.isArray(settingsData.categories)
            ) {
              setCategoryOrder(settingsData.categories);
              console.log("✅ Loaded category order:", settingsData.categories);
            }
          }
        } catch (error) {
          console.error("❌ Failed to load category order:", error);
        }
      }

      setIsInitialized(true);
    } catch (error) {
      console.error("❌ Failed to initialize app:", error);
      // Set initialized anyway to prevent infinite loading
      // User can retry from settings or debug page
      setIsInitialized(true);
      setToast({
        message:
          "⚠️ Error during initialization. Some features may not work. Try refreshing or check /debug",
        type: "error",
      });
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
    actualAmount: number,
    paymentMethod: PaymentMethod,
    discount?: number,
    tipAmount?: number
  ) => {
    // Normalize payment method to Title Case for consistency
    const normalizedPaymentMethod = paymentMethod
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    const sale: Sale = {
      id: `sale-${Date.now()}`,
      timestamp: new Date().toISOString(),
      items: items.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        // Store the base USD price - user manages currency conversions
        price: item.product.price,
        size: item.size,
      })),
      total,
      actualAmount,
      discount,
      paymentMethod: normalizedPaymentMethod,
      synced: false,
      isHookup: discount !== undefined && discount > 0, // For backward compatibility
      tipAmount,
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

          // Delete synced sales to keep local storage clean
          const deletedCount = await deleteSyncedSales();
          console.log(
            `🗑️ Cleaned up ${deletedCount} synced sales from local storage`
          );

          const allSales = await getSales();
          setSyncStatus({
            lastSyncTime: new Date().toISOString(),
            pendingSales: 0,
            totalSales: allSales.length,
            isSyncing: false,
            pendingProductSync: false,
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

    // Mark products as needing sync
    setSyncStatus((prev) => ({ ...prev, pendingProductSync: true }));

    // Debounce sync to avoid showing sync bar for rapid changes
    // Clear any existing timeout
    if (productSyncTimeoutRef.current) {
      clearTimeout(productSyncTimeoutRef.current);
    }

    // Sync will happen after 1.5 seconds of inactivity, or on page load/online event
    productSyncTimeoutRef.current = setTimeout(() => {
      if (navigator.onLine) {
        syncProductsToSheet();
      }
    }, 1500);
  };

  const handleUpdateProduct = async (product: Product) => {
    await addProductToDB(product); // addProductToDB uses put() which updates if ID exists
    const updatedProducts = await getProducts();
    setProducts(updatedProducts);

    // Mark products as needing sync
    setSyncStatus((prev) => ({ ...prev, pendingProductSync: true }));

    // Debounce sync to avoid showing sync bar for rapid changes
    if (productSyncTimeoutRef.current) {
      clearTimeout(productSyncTimeoutRef.current);
    }

    productSyncTimeoutRef.current = setTimeout(() => {
      if (navigator.onLine) {
        syncProductsToSheet();
      }
    }, 1500);
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      await deleteProductFromDB(id);
      const updatedProducts = await getProducts();
      setProducts(updatedProducts);

      // Mark products as needing sync
      setSyncStatus((prev) => ({ ...prev, pendingProductSync: true }));

      // Debounce sync to avoid showing sync bar for rapid changes
      if (productSyncTimeoutRef.current) {
        clearTimeout(productSyncTimeoutRef.current);
      }

      productSyncTimeoutRef.current = setTimeout(() => {
        if (navigator.onLine) {
          syncProductsToSheet();
        }
      }, 1500);
    }
  };

  const syncProductsToSheet = async () => {
    try {
      const productsSheetId = localStorage.getItem("productsSheetId");

      if (!productsSheetId) {
        console.warn(
          "Products sheet not initialized - will sync when available"
        );
        return;
      }

      // Get latest products from IndexedDB
      const currentProducts = await getProducts();

      const response = await fetch("/api/sheets/sync-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: currentProducts, productsSheetId }),
      });

      if (!response.ok) {
        throw new Error("Failed to sync");
      }

      console.log("✅ Products synced to Google Sheets");
      setSyncStatus((prev) => ({ ...prev, pendingProductSync: false }));
    } catch (error) {
      console.error("Failed to sync products:", error);
      // Keep pendingProductSync true so it retries when online
      setSyncStatus((prev) => ({ ...prev, pendingProductSync: true }));
    }
  };

  if (isInitializingSheets) {
    return (
      <div className="flex items-center justify-center h-screen bg-theme">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-theme text-lg font-semibold mb-2">
            Setting up your Google Sheets...
          </p>
          <p className="text-theme-muted text-sm">
            Creating Products and Sales sheets in your Google Drive
          </p>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-theme">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-theme-muted">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading state while checking authentication
  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-theme flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-theme-muted">
            {status === "loading" ? "Loading..." : "Redirecting to sign in..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-theme">
      <header className="bg-theme-secondary border-b border-theme p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-theme ft-heading">
            Merch Table
          </h1>
          <div className="flex items-center gap-2 sm:gap-4">
            {session?.user?.email && (
              <div className="text-right">
                <p className="text-xs sm:text-sm text-theme-muted hidden sm:block">
                  Signed in as
                </p>
                <p className="text-xs sm:text-sm font-medium text-theme truncate max-w-[120px] sm:max-w-none">
                  {session.user.email}
                </p>
              </div>
            )}
            <button
              onClick={() => setShowWhatsNew(true)}
              className="p-2 sm:px-4 sm:py-2 bg-theme-secondary hover:bg-theme-tertiary text-theme-secondary hover:text-theme rounded border border-theme text-sm transition-all flex items-center gap-2"
              title="What's New"
            >
              <span className="text-base leading-none">✨</span>
              <span className="hidden sm:inline">What&apos;s New</span>
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`p-2 sm:px-4 sm:py-2 rounded border transition-all ${
                activeTab === "settings"
                  ? "bg-theme-tertiary border-theme text-theme"
                  : "bg-theme-secondary hover:bg-theme-tertiary text-theme-secondary hover:text-theme border-theme"
              }`}
              title="Settings"
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => signOut()}
              className="p-2 sm:px-4 sm:py-2 bg-theme-secondary hover:bg-theme-tertiary text-theme-secondary hover:text-theme rounded border border-theme text-sm transition-all flex items-center gap-2"
              title="Sign Out"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <SyncStatusBar status={syncStatus} onSync={syncSales} />

      <nav className="bg-theme border-b border-theme">
        <div className="flex">
          <button
            onClick={() => setActiveTab("pos")}
            className={`flex-1 py-3 sm:py-4 px-2 sm:px-6 font-medium flex items-center justify-center gap-2 touch-manipulation ${
              activeTab === "pos"
                ? "border-b-2 border-primary text-primary"
                : "text-theme-muted hover:text-theme-secondary"
            }`}
          >
            <ShoppingBagIcon className="w-5 h-5 flex-shrink-0" />
            <span className="hidden sm:inline">Point of Sale</span>
          </button>
          <button
            onClick={() => setActiveTab("setup")}
            className={`flex-1 py-3 sm:py-4 px-2 sm:px-6 font-medium flex items-center justify-center gap-2 touch-manipulation ${
              activeTab === "setup"
                ? "border-b-2 border-primary text-primary"
                : "text-theme-muted hover:text-theme-secondary"
            }`}
          >
            <ArchiveBoxIcon className="w-5 h-5 flex-shrink-0" />
            <span className="hidden sm:inline">Inventory</span>
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex-1 py-3 sm:py-4 px-2 sm:px-6 font-medium flex items-center justify-center gap-2 touch-manipulation ${
              activeTab === "analytics"
                ? "border-b-2 border-primary text-primary"
                : "text-theme-muted hover:text-theme-secondary"
            }`}
          >
            <ChartBarIcon className="w-5 h-5 flex-shrink-0" />
            <span className="hidden sm:inline">Analytics</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 bg-theme">
        {activeTab === "pos" && (
          <POSInterface
            products={products}
            categoryOrder={categoryOrder}
            onCompleteSale={handleCompleteSale}
            onUpdateProduct={handleUpdateProduct}
          />
        )}
        {activeTab === "setup" && (
          <ProductManager
            products={products}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        )}
        {activeTab === "analytics" && <Analytics />}
        {activeTab === "settings" && <Settings />}
      </main>

      <FeedbackButton />

      {/* What's New Modal */}
      {showWhatsNew && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-theme-secondary border border-theme rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 relative">
            {/* Close button */}
            <button
              onClick={() => setShowWhatsNew(false)}
              className="absolute top-4 right-4 text-theme-muted hover:text-theme transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>

            {/* Header */}
            <h2 className="text-3xl font-bold text-theme mb-2 pr-8">
              ✨ What&apos;s New
            </h2>
            <p className="text-theme-muted mb-6">
              Latest features and improvements
            </p>

            {/* Changelog */}
            <div className="space-y-6">
              {/* November 5, 2025 - v3 Features */}
              <div className="border-l-4 border-emerald-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500 text-white rounded">
                    NEW
                  </span>
                  <span className="text-sm text-theme-muted">
                    November 5, 2025
                  </span>
                </div>
                <h3 className="text-lg font-bold text-theme mb-2">
                  📧 Email List Signup
                </h3>
                <ul className="space-y-1 text-sm text-theme-secondary">
                  <li>
                    • Post-checkout modal to collect emails from customers
                  </li>
                  <li>
                    • Optional name and phone collection with smart toggle
                  </li>
                  <li>
                    • Auto-dismiss countdown that pauses when user starts typing
                  </li>
                  <li>
                    • Customizable prompt message for your band&apos;s voice
                  </li>
                  <li>• Manual entry form in Settings for table signups</li>
                  <li>
                    • All emails saved to &quot;Email List&quot; sheet in your
                    spreadsheet
                  </li>
                  <li>
                    • Each signup linked to sale ID for tracking conversion
                  </li>
                </ul>

                <h3 className="text-lg font-bold text-theme mb-2 mt-4">
                  🎨 Enhanced Settings
                </h3>
                <ul className="space-y-1 text-sm text-theme-secondary">
                  <li>
                    • Direct image uploads for products (no external links
                    needed)
                  </li>
                  <li>
                    • Upload QR codes directly from device for payment methods
                  </li>
                  <li>
                    • Images stored as base64 in sheets - never expire or break
                  </li>
                  <li>• Auto-compression keeps sheet sizes manageable</li>
                </ul>
              </div>

              {/* November 5, 2025 - MERCH TABLE Rebrand */}
              <div className="border-l-4 border-primary pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 text-xs font-bold bg-primary text-black rounded">
                    REBRAND
                  </span>
                  <span className="text-sm text-theme-muted">
                    November 5, 2025
                  </span>
                </div>
                <h3 className="text-lg font-bold text-theme mb-2">
                  🧡 Welcome to MERCH TABLE
                </h3>
                <ul className="space-y-1 text-sm text-theme-secondary">
                  <li>
                    • Complete visual rebrand with Safety Orange (#FF6A00) brand
                    identity
                  </li>
                  <li>
                    • New dark mode design (#111111 background) - easier on eyes
                    during late-night shows
                  </li>
                  <li>
                    • Updated typography: Bebas Neue for headings, Inter for
                    body text
                  </li>
                  <li>
                    • Road-ready branding that matches the touring band
                    lifestyle
                  </li>
                  <li>
                    • All functionality stays the same - just looks better
                  </li>
                  <li>
                    • Multiple themes still available in Settings (Merch Table,
                    Default, Girlypop)
                  </li>
                </ul>
                <p className="text-xs text-theme-muted mt-3 italic">
                  Same reliable POS, now with a name and look that fits the
                  vibe. 🎸
                </p>
              </div>

              {/* November 4, 2025 */}
              <div className="border-l-4 border-emerald-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500 text-white rounded">
                    NEW
                  </span>
                  <span className="text-sm text-theme-muted">
                    November 4, 2025
                  </span>
                </div>
                <h3 className="text-lg font-bold text-theme mb-2">
                  💱 Multi-Currency Support
                </h3>
                <ul className="space-y-1 text-sm text-theme-secondary">
                  <li>
                    • Display prices in 7 currencies: USD, CAD, EUR, GBP, MXN,
                    AUD, JPY
                  </li>
                  <li>
                    • Perfect for touring bands - show local currency while
                    keeping USD in sheets
                  </li>
                  <li>
                    • Set custom exchange rates with live rate checker link
                  </li>
                  <li>
                    • Currency-specific cash denominations (e.g., CA$5, CA$10,
                    CA$20 for Canada)
                  </li>
                  <li>
                    • All prices stored in USD for consistent reporting across
                    tours
                  </li>
                  <li>
                    • Settings persist to Google Sheets for multi-device sync
                  </li>
                </ul>

                <h3 className="text-lg font-bold text-theme mb-2 mt-4">
                  📸 Image Upload
                </h3>
                <ul className="space-y-1 text-sm text-theme-secondary">
                  <li>• Upload product images directly from your device</li>
                  <li>
                    • Auto-compression to ~50-100KB (perfect for sheets storage)
                  </li>
                  <li>
                    • Images stored as base64 in Google Sheets - never expire or
                    break
                  </li>
                  <li>• No external services or API keys required</li>
                  <li>• Works offline - fits touring band lifestyle</li>
                  <li>• Upload button in both Add and Edit product forms</li>
                </ul>
              </div>

              {/* November 3, 2025 */}
              <div className="border-l-4 border-secondary pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 text-xs font-bold bg-secondary text-theme rounded">
                    NEW
                  </span>
                  <span className="text-sm text-theme-muted">
                    November 3, 2025
                  </span>
                </div>
                <h3 className="text-lg font-bold text-theme mb-2">
                  ☕ Review Order Flow
                </h3>
                <ul className="space-y-1 text-sm text-theme-secondary">
                  <li>
                    • Coffee shop-style 2-step checkout for ALL payment types
                  </li>
                  <li>
                    • Step 1: Select tip percentage (5%, 10%, 20%) or custom
                    amount
                  </li>
                  <li>
                    • Step 2: Review complete order breakdown before completing
                  </li>
                  <li>• See transaction fees included in total to collect</li>
                  <li>• Cash change calculation includes all fees and tips</li>
                  <li>
                    • Unified experience across Cash, Venmo, Card, and custom
                    payments
                  </li>
                </ul>
              </div>

              {/* October 30, 2025 */}
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 text-xs font-bold bg-blue-500 text-white rounded">
                    NEW
                  </span>
                  <span className="text-sm text-theme-muted">
                    October 30, 2025
                  </span>
                </div>
                <h3 className="text-lg font-bold text-theme mb-2">
                  📦 Inventory Value Tracking
                </h3>
                <ul className="space-y-1 text-sm text-theme-secondary">
                  <li>• Added Inventory Value card to Quick Stats</li>
                  <li>• Shows total retail value of all unsold merchandise</li>
                  <li>• Calculates from Google Sheets Products data</li>
                  <li>• Click info icon for detailed calculation breakdown</li>
                </ul>
              </div>

              {/* October 29, 2025 */}
              <div className="border-l-4 border-green-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 text-xs font-bold bg-green-500 text-white rounded">
                    FIXED
                  </span>
                  <span className="text-sm text-theme-muted">
                    October 29, 2025
                  </span>
                </div>
                <h3 className="text-lg font-bold text-theme mb-2">
                  🎸 Hookup & Tip Improvements
                </h3>
                <ul className="space-y-1 text-sm text-theme-secondary">
                  <li>• Fixed $0 hookups (100% free merchandise)</li>
                  <li>• Hookup discounts now visible as line items</li>
                  <li>• Tips properly included in Venmo/QR code totals</li>
                  <li>• Hookup auto-fills with cash received amount</li>
                  <li>• Transaction fees calculated on hookup amount</li>
                </ul>
              </div>

              {/* October 28, 2025 */}
              <div className="border-l-4 border-secondary pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 text-xs font-bold bg-secondary text-theme rounded">
                    NEW
                  </span>
                  <span className="text-sm text-theme-muted">
                    October 28, 2025
                  </span>
                </div>
                <h3 className="text-lg font-bold text-theme mb-2">
                  💰 Tips Support
                </h3>
                <ul className="space-y-1 text-sm text-theme-secondary">
                  <li>• Added tip tracking for Venmo/QR payments</li>
                  <li>• Tips shown separately in Insights (Column D)</li>
                  <li>• Tips not included in revenue calculations</li>
                  <li>• Daily tips breakdown in Revenue by Date table</li>
                </ul>
              </div>

              {/* October 25, 2025 */}
              <div className="border-l-4 border-yellow-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 text-xs font-bold bg-yellow-500 text-black rounded">
                    FEATURE
                  </span>
                  <span className="text-sm text-theme-muted">
                    October 25, 2025
                  </span>
                </div>
                <h3 className="text-lg font-bold text-theme mb-2">
                  🎨 Theme System
                </h3>
                <ul className="space-y-1 text-sm text-theme-secondary">
                  <li>• Multiple app themes available in Settings</li>
                  <li>• Live preview before saving</li>
                  <li>• Persistent theme selection across sessions</li>
                </ul>
              </div>

              {/* Earlier Features */}
              <div className="border-l-4 border-zinc-500 pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-theme-muted">
                    Earlier Updates
                  </span>
                </div>
                <h3 className="text-lg font-bold text-theme mb-2">
                  🚀 Core Features
                </h3>
                <ul className="space-y-1 text-sm text-theme-secondary">
                  <li>• Offline-first POS with IndexedDB storage</li>
                  <li>• Google Sheets integration for sales tracking</li>
                  <li>• Custom payment methods with QR codes</li>
                  <li>• Product breakdown by date in Insights</li>
                  <li>• Dynamic schema updates for payment methods</li>
                  <li>• Revenue calculation explainer</li>
                </ul>
              </div>
            </div>

            {/* Close button at bottom */}
            <button
              onClick={() => setShowWhatsNew(false)}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
