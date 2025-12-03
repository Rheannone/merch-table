"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useRouter } from "next/navigation";
import { Product, CartItem, PaymentMethod, Sale, SyncStatus } from "@/types";
import {
  getProducts,
  saveProducts,
  addProduct as addProductToDB,
  deleteProduct as deleteProductFromDB,
  saveSale,
  saveSales,
  getSales,
  getUnsyncedSales,
} from "@/lib/db";
import { DEFAULT_PRODUCTS } from "@/lib/defaultProducts";
import syncService from "@/lib/sync/syncService";
import {
  loadProductsFromSupabase,
  loadSalesFromSupabase,
  loadSettingsFromSupabase,
  loadOrganizationSettings,
  saveOrganizationSettings,
} from "@/lib/supabase/data";
import { createClient } from "@/lib/supabase/client";
import { deleteProductImage } from "@/lib/supabase/storage";
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
} from "@heroicons/react/24/outline";
import { useTheme } from "@/components/ThemeProvider";

export default function Home() {
  const { user, session, signOut } = useAuth();
  const {
    currentOrganization,
    organizations,
    loading: orgLoading,
    switchOrganization,
  } = useOrganization();
  const router = useRouter();
  const initializingRef = useRef(false); // Prevent multiple initializations
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
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializingSheets, setIsInitializingSheets] = useState(false);
  const [productsChanged, setProductsChanged] = useState(false); // Track if products actually changed
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);

  // Get theme context to apply saved theme on load
  const { setTheme } = useTheme();

  // Debug: Log when categoryOrder changes
  useEffect(() => {
    console.log("🔄 categoryOrder state changed:", categoryOrder);
  }, [categoryOrder]);

  // Handle authentication redirect
  useEffect(() => {
    if (!session && !user) {
      router.push("/auth/signin");
    }
  }, [session, user, router]);

  // Monitor session for token refresh errors and auto-logout
  useEffect(() => {
    if (!session && user) {
      console.error("Session lost. Logging out...");
      setToast({
        message: "Your session has expired. Please sign in again.",
        type: "error",
      });
      // Sign out after a short delay to show the toast
      setTimeout(() => {
        signOut();
      }, 2000);
    }
  }, [session, user, signOut]);

  // Load theme from settings on initialization
  useEffect(() => {
    const loadThemeFromSettings = async () => {
      try {
        if (navigator.onLine) {
          // Online: Load from Supabase (auto-caches to IndexedDB)
          const settings = await loadSettingsFromSupabase();
          if (settings?.theme) {
            setTheme(settings.theme);
          }
        } else {
          // Offline: Load from IndexedDB cache
          const { getSettings } = await import("@/lib/db");
          const {
            data: { user },
          } = await createClient().auth.getUser();
          if (user) {
            const cachedSettings = await getSettings(user.id);
            if (cachedSettings?.theme) {
              setTheme(cachedSettings.theme);
              console.log("📱 Loaded theme from IndexedDB (offline mode)");
            }
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
    if (
      session &&
      !isInitialized &&
      !initializingRef.current &&
      currentOrganization
    ) {
      initializingRef.current = true;
      initializeApp();
    }
  }, [session, isInitialized, currentOrganization]);

  // Reload data when organization changes (after initial load)
  useEffect(() => {
    if (isInitialized && currentOrganization) {
      console.log(`🔄 Organization changed to: ${currentOrganization.name}`);
      // Re-initialize to load data for new organization
      initializingRef.current = false; // Reset flag
      setIsInitialized(false); // Trigger re-initialization
    }
  }, [currentOrganization?.id]); // Only watch ID changes

  // Initialize sync service on client side
  useEffect(() => {
    const initializeSyncService = async () => {
      try {
        await syncService.initialize();
        console.log("✅ Sync service initialized");
      } catch (error) {
        console.error("Failed to initialize sync service:", error);
      }
    };

    if (typeof window !== "undefined") {
      initializeSyncService();
    }
  }, []);

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
        const queueStats = syncService.getStats();
        const hasUnsyncedProducts = queueStats.queueSize > unsyncedSales.length;

        // Build toast message based on what happened
        const messageParts: string[] = [];

        // If products changed, mention it
        if (productsChanged) {
          messageParts.push("Loaded latest products");
        }

        // Sync happens automatically via syncService
        // Just show a message if there were unsynced items that will be processed
        if (unsyncedSales.length > 0 || hasUnsyncedProducts) {
          const syncParts: string[] = [];

          if (unsyncedSales.length > 0) {
            syncParts.push(
              `${unsyncedSales.length} sale${
                unsyncedSales.length > 1 ? "s" : ""
              }`
            );
          }

          if (hasUnsyncedProducts) {
            syncParts.push("products");
          }

          if (syncParts.length > 0) {
            messageParts.push(`syncing ${syncParts.join(" and ")}`);
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
      console.log("📶 Network connection restored - triggering sync...");

      // Sync service will automatically process queued items (sales, products, etc.)
      await syncService.forceSync();

      // Also re-sync offline-saved settings if they exist
      try {
        const { getSettings } = await import("@/lib/db");
        const { saveSettingsToSupabase } = await import("@/lib/supabase/data");

        if (user) {
          const cachedSettings = await getSettings(user.id);
          if (cachedSettings) {
            // Try to sync to Supabase
            const success = await saveSettingsToSupabase(cachedSettings);
            if (success) {
              console.log("✅ Offline settings synced to Supabase");
            }
          }
        }
      } catch (error) {
        console.error("Failed to sync offline settings:", error);
      }

      // Auto-sync unsynced close-outs
      try {
        const { syncUnsyncedCloseOuts } = await import("@/lib/closeouts");
        const syncedCount = await syncUnsyncedCloseOuts();
        if (syncedCount > 0) {
          console.log(
            `✅ ${syncedCount} offline close-outs synced to Supabase`
          );
        }
      } catch (error) {
        console.error("Failed to sync offline close-outs:", error);
      }

      // Auto-sync unsynced email signups
      try {
        const { getUnsyncedEmailSignups } = await import("@/lib/db");
        const unsyncedEmailSignups = await getUnsyncedEmailSignups();
        if (unsyncedEmailSignups.length > 0) {
          console.log(
            `📧 Found ${unsyncedEmailSignups.length} unsynced email signups, queuing for sync...`
          );
          for (const emailSignup of unsyncedEmailSignups) {
            await syncService.syncEmailSignup(emailSignup);
          }
          console.log(
            `✅ ${unsyncedEmailSignups.length} offline email signups queued for sync`
          );
        }
      } catch (error) {
        console.error("Failed to sync offline email signups:", error);
      }
    };

    globalThis.addEventListener("online", handleOnline);
    return () => {
      globalThis.removeEventListener("online", handleOnline);
    };
  }, [user]);

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
    // Guard: Ensure we have an organization before initializing
    if (!currentOrganization) {
      console.error("Cannot initialize app without organization");
      return;
    }

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

      // Google Sheets initialization removed - using Supabase only
      console.log(
        `✅ Using Supabase for all data storage (organization: ${currentOrganization.name})`
      );

      // ===== NEW APPROACH: Load from Supabase first =====
      let loadedProducts: Product[] = [];
      const currentProducts = await getProducts(); // Get cached products for comparison
      console.log(
        "🔍 Current IndexedDB products:",
        currentProducts.length,
        currentProducts.map((p) => ({ id: p.id, name: p.name }))
      );

      if (navigator.onLine) {
        // Online: Try Supabase first
        try {
          console.log("📥 Loading products from Supabase...");
          const supabaseProducts = await loadProductsFromSupabase(
            currentOrganization.id
          );
          console.log(
            "🔍 Supabase returned:",
            supabaseProducts.length,
            supabaseProducts.map((p) => ({ id: p.id, name: p.name }))
          );

          if (supabaseProducts.length > 0) {
            loadedProducts = supabaseProducts;
            await saveProducts(loadedProducts); // Cache in IndexedDB
            console.log(
              "✅ Loaded",
              loadedProducts.length,
              "products from Supabase and cached to IndexedDB"
            );
          } else {
            console.log("ℹ️ No products in Supabase, trying IndexedDB...");
            loadedProducts = await getProducts();
          }
        } catch (error) {
          console.error("❌ Failed to load from Supabase:", error);
          // Fall back to IndexedDB
          loadedProducts = await getProducts();
          console.log(
            "📦 Loaded",
            loadedProducts.length,
            "products from IndexedDB (Supabase failed)"
          );
        }
      } else {
        // Offline: Load from IndexedDB
        console.log("📴 Offline - loading from IndexedDB");
        loadedProducts = await getProducts();
        console.log(
          "📦 Loaded",
          loadedProducts.length,
          "products from IndexedDB"
        );
      }

      // If still no products, use defaults
      if (loadedProducts.length === 0) {
        console.log("🎯 No products found, using defaults");
        await saveProducts(DEFAULT_PRODUCTS);
        loadedProducts = DEFAULT_PRODUCTS;
        console.log(
          "🎯 Using default products:",
          DEFAULT_PRODUCTS.map((p) => ({ id: p.id, name: p.name }))
        );

        // Queue default products for sync
        for (const product of DEFAULT_PRODUCTS) {
          try {
            await syncService.syncProduct(product);
          } catch (error) {
            console.error("Failed to queue default product:", error);
          }
        }
      }

      // Detect if products actually changed
      const hasProductsChanged = detectProductChanges(
        currentProducts,
        loadedProducts
      );

      setProducts(loadedProducts);
      setProductsChanged(hasProductsChanged);

      // ===== Load sales from Supabase =====
      if (navigator.onLine) {
        try {
          console.log("📥 Loading sales from Supabase...");
          const supabaseSales = await loadSalesFromSupabase(
            currentOrganization.id
          );
          console.log("🔍 Supabase returned:", supabaseSales.length, "sales");

          if (supabaseSales.length > 0) {
            // Cache to IndexedDB
            await saveSales(supabaseSales);
            console.log(
              "✅ Loaded",
              supabaseSales.length,
              "sales from Supabase and cached to IndexedDB"
            );
          }
        } catch (error) {
          console.error("❌ Failed to load sales from Supabase:", error);
        }
      } else {
        console.log("📴 Offline - sales will load from IndexedDB only");
      }

      // ===== Load close-outs from Supabase =====
      if (navigator.onLine) {
        try {
          console.log("📥 Loading close-outs from Supabase...");
          const { loadCloseOutsFromSupabase } = await import(
            "@/lib/supabase/data"
          );
          const supabaseCloseOuts = await loadCloseOutsFromSupabase(
            currentOrganization.id
          );
          console.log(
            "🔍 Supabase returned:",
            supabaseCloseOuts.length,
            "close-outs"
          );

          if (supabaseCloseOuts.length > 0) {
            // Cache to IndexedDB
            const { saveCloseOut } = await import("@/lib/db");
            for (const closeOut of supabaseCloseOuts) {
              await saveCloseOut(closeOut);
            }
            console.log(
              "✅ Loaded",
              supabaseCloseOuts.length,
              "close-outs from Supabase and cached to IndexedDB"
            );
          }
        } catch (error) {
          console.error("❌ Failed to load close-outs from Supabase:", error);
        }
      } else {
        console.log("📴 Offline - close-outs will load from IndexedDB only");
      }

      // ===== Load email signups from Supabase =====
      if (navigator.onLine) {
        try {
          console.log("📥 Loading email signups from Supabase...");
          const { loadEmailSignupsFromSupabase } = await import(
            "@/lib/supabase/data"
          );
          const supabaseEmailSignups = await loadEmailSignupsFromSupabase(
            currentOrganization.id
          );
          console.log(
            "🔍 Supabase returned:",
            supabaseEmailSignups.length,
            "email signups"
          );

          if (supabaseEmailSignups.length > 0) {
            // Cache to IndexedDB
            const { saveEmailSignup } = await import("@/lib/db");
            for (const emailSignup of supabaseEmailSignups) {
              await saveEmailSignup(emailSignup);
            }
            console.log(
              "✅ Loaded",
              supabaseEmailSignups.length,
              "email signups from Supabase and cached to IndexedDB"
            );
          }
        } catch (error) {
          console.error(
            "❌ Failed to load email signups from Supabase:",
            error
          );
        }
      } else {
        console.log("📴 Offline - email signups will load from IndexedDB only");
      }

      // Load category order from settings
      try {
        if (navigator.onLine && currentOrganization?.id) {
          // Online: Load from Supabase organization settings
          const orgSettings = await loadOrganizationSettings(
            currentOrganization.id
          );
          console.log("📋 app/page.tsx loaded org settings:", orgSettings);
          if (
            orgSettings?.categories &&
            Array.isArray(orgSettings.categories)
          ) {
            setCategoryOrder(orgSettings.categories);
            console.log(
              "✅ Loaded category order from org settings:",
              orgSettings.categories
            );
          } else {
            console.warn(
              "⚠️ No categories found in org settings, using defaults"
            );
            setCategoryOrder(["Apparel", "Merch", "Music"]);
          }
        } else if (!navigator.onLine) {
          // Offline: Load from IndexedDB cache
          const { getSettings } = await import("@/lib/db");
          const {
            data: { user },
          } = await createClient().auth.getUser();
          if (user) {
            const cachedSettings = await getSettings(user.id);
            if (
              cachedSettings?.categories &&
              Array.isArray(cachedSettings.categories)
            ) {
              setCategoryOrder(cachedSettings.categories);
              console.log("📱 Loaded category order from IndexedDB (offline)");
            }
          }
        } else {
          console.warn("⚠️ No organization selected, using default categories");
          setCategoryOrder(["Apparel", "Merch", "Music"]);
        }
      } catch (error) {
        console.error("❌ Failed to load category order:", error);
        setCategoryOrder(["Apparel", "Merch", "Music"]);
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

    // Also check the actual sync queue
    const queueStats = syncService.getStats();
    console.log("🔍 Sync Status Check:", {
      unsyncedSalesInDB: unsyncedSales.length,
      totalSales: allSales.length,
      queueSize: queueStats.queueSize,
      isOnline: queueStats.isOnline,
      isProcessing: queueStats.isProcessing,
      errors: queueStats.errors.length,
    });

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

    // Save to local database first
    await saveSale(sale);

    // Use new sync service to handle cloud sync
    try {
      await syncService.syncSale(sale);
      console.log("✅ Sale queued for sync:", sale.id);
    } catch (error) {
      console.error("Failed to queue sale for sync:", error);
      // Don't block the sale - it's already saved locally and will be synced later
    }

    await updateSyncStatus();
  };

  const handleAddProduct = async (product: Product) => {
    await addProductToDB(product);
    const updatedProducts = await getProducts();
    setProducts(updatedProducts);

    // Use new sync service to handle cloud sync
    try {
      await syncService.syncProduct(product);
      console.log("✅ Product queued for sync:", product.id);
    } catch (error) {
      console.error("Failed to queue product for sync:", error);
      // Don't block the operation - product is already saved locally
    }
  };

  const handleUpdateProduct = async (product: Product) => {
    await addProductToDB(product); // addProductToDB uses put() which updates if ID exists
    const updatedProducts = await getProducts();
    setProducts(updatedProducts);

    // Use new sync service to handle cloud sync
    try {
      await syncService.updateProduct(product);
      console.log("✅ Product update queued for sync:", product.id);
    } catch (error) {
      console.error("Failed to queue product update for sync:", error);
      // Don't block the operation - product is already saved locally
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      // Get product data before deletion for image cleanup
      const productsToDelete = products.filter((p) => p.id === id);
      const productToDelete = productsToDelete[0];

      // Queue deletion FIRST (before removing from IndexedDB)
      // This ensures sync has access to product data if needed
      try {
        await syncService.deleteProduct(id);
        console.log("✅ Product deletion queued for sync:", id);
      } catch (error) {
        console.error("Failed to queue product deletion for sync:", error);
        // Continue with local deletion even if queueing fails
      }

      // Delete associated image from Supabase Storage (if it's a Storage URL)
      if (productToDelete?.imageUrl) {
        try {
          await deleteProductImage(productToDelete.imageUrl);
          console.log(
            "✅ Product image deleted from Storage:",
            productToDelete.imageUrl
          );
        } catch (error) {
          console.error("Failed to delete product image:", error);
          // Continue with product deletion even if image deletion fails
        }
      }

      // Then delete from IndexedDB
      await deleteProductFromDB(id);
      const updatedProducts = await getProducts();
      setProducts(updatedProducts);
    }
  };

  const handleCategoryCreated = async (newCategory: string) => {
    try {
      // Check if category already exists
      if (categoryOrder.includes(newCategory)) {
        console.log("Category already exists:", newCategory);
        return;
      }

      // Make sure we have an organization
      if (!currentOrganization?.id) {
        console.error("No current organization");
        setToast({
          message: "No organization selected",
          type: "error",
        });
        return;
      }

      // Add the new category to the end of the category order
      const updatedCategories = [...categoryOrder, newCategory];
      setCategoryOrder(updatedCategories);
      console.log("📋 Updated categoryOrder state:", updatedCategories);

      // Load current organization settings to preserve other fields
      const currentSettings = await loadOrganizationSettings(
        currentOrganization.id
      );

      // Save updated category order to organization settings
      await saveOrganizationSettings(currentOrganization.id, {
        ...currentSettings,
        categories: updatedCategories,
      });

      console.log("✅ New category added and synced:", newCategory);
      setToast({
        message: `Category "${newCategory}" added successfully`,
        type: "success",
      });
    } catch (error) {
      console.error("❌ Failed to save new category:", error);
      setToast({
        message: "Failed to save new category. Please try again.",
        type: "error",
      });
    }
  };

  const handleCategoriesChange = (updatedCategories: string[]) => {
    console.log("📋 Categories updated from Settings:", updatedCategories);
    console.log("📋 Current categoryOrder:", categoryOrder);
    setCategoryOrder(updatedCategories);
    console.log("📋 Called setCategoryOrder with:", updatedCategories);
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

  // Wait for organization to load before showing content
  if (orgLoading || !currentOrganization) {
    return (
      <div className="min-h-screen bg-theme flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-theme-muted">Loading organization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-theme">
      <header className="bg-theme-secondary border-b border-theme p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-theme ft-heading">
              Road Dog
            </h1>

            {/* Organization Switcher */}
            {organizations.length > 1 && (
              <div className="relative">
                <select
                  value={currentOrganization.id}
                  onChange={(e) => switchOrganization(e.target.value)}
                  className="text-sm bg-theme-tertiary border border-theme rounded px-3 py-1.5 text-theme focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  title="Switch organization"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Show current org name if only one org */}
            {organizations.length === 1 && (
              <div className="hidden sm:block text-sm text-theme-muted">
                {currentOrganization.name}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {user?.email && (
              <div className="text-right">
                <p className="text-xs sm:text-sm text-theme-muted hidden sm:block">
                  Signed in as
                </p>
                <p className="text-xs sm:text-sm font-medium text-theme truncate max-w-[120px] sm:max-w-none">
                  {user.email}
                </p>
              </div>
            )}
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

      <SyncStatusBar
        status={syncStatus}
        onSync={() => syncService.forceSync()}
      />

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
            organizationId={currentOrganization?.id}
            onCompleteSale={handleCompleteSale}
            onUpdateProduct={handleUpdateProduct}
          />
        )}
        {activeTab === "setup" && (
          <ProductManager
            products={products}
            categories={categoryOrder}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onCategoryCreated={handleCategoryCreated}
          />
        )}
        {activeTab === "analytics" && <Analytics />}
        {activeTab === "settings" && (
          <Settings
            products={products}
            onCategoriesChange={handleCategoriesChange}
            onAddProduct={handleAddProduct}
          />
        )}
      </main>

      <FeedbackButton />

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
