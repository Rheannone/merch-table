/**
 * Sync Strategies for Tour Manager
 *
 * Pre-configured strategies for syncing different data types to various destinations
 */

import {
  SyncStrategy,
  SyncResult,
  SyncOperation,
  SyncDestination,
} from "./types";
import { Sale, Product, CloseOut, UserSettings } from "../../types";
import { createClient, getAuthenticatedUser } from "../supabase/client";

// Base configurations
const DEFAULT_RETRY_DELAYS = [1000, 3000, 10000]; // 1s, 3s, 10s
const HIGH_PRIORITY_RETRY_DELAYS = [500, 2000, 8000, 20000]; // Faster retries for important data

// Debouncing for Sheets product sync
let productSheetsSyncTimeout: NodeJS.Timeout | null = null;
let pendingProductSheetsSyncResolves: ((result: SyncResult) => void)[] = []; // Track ALL pending resolves
const PRODUCT_SHEETS_DEBOUNCE_MS = 2000; // Wait 2 seconds before syncing

/**
 * Sales Sync Strategy - Sync to both Supabase and Google Sheets
 */
export const salesSyncStrategy: SyncStrategy<Sale> = {
  dataType: "sale",
  destinations: ["supabase", "sheets"],
  maxAttempts: 3,
  retryDelays: DEFAULT_RETRY_DELAYS,
  priority: 8, // High priority

  async syncToSupabase(
    operation: SyncOperation,
    data: Sale
  ): Promise<SyncResult> {
    try {
      const supabase = createClient();

      if (operation === "create" || operation === "update") {
        // Get the current user with token refresh handling
        const user = await getAuthenticatedUser();

        if (!user?.id) {
          throw new Error("Authentication failed - please sign in again");
        }

        console.log("🔒 User ID for sale sync:", user.id);

        // Insert/update the main sale record
        const saleData = {
          id: data.id,
          user_id: user.id,
          timestamp: data.timestamp,
          total: data.total,
          actual_amount: data.actualAmount,
          discount: data.discount || 0,
          tip_amount: data.tipAmount || 0,
          payment_method: data.paymentMethod,
          is_hookup: data.isHookup || false,
          synced: true,
        };

        console.log("📝 Sale data being inserted:", saleData);

        const { data: saleResult, error: saleError } = await supabase
          .from("sales")
          .upsert(saleData)
          .select();

        if (saleError) throw saleError;

        // Insert/update sale items
        if (data.items && data.items.length > 0) {
          // First delete existing items for this sale (in case of update)
          await supabase.from("sale_items").delete().eq("sale_id", data.id);

          // Insert new items
          const saleItems = data.items.map((item) => ({
            sale_id: data.id,
            product_id: item.productId,
            product_name: item.productName,
            quantity: item.quantity,
            price: item.price,
            size: item.size,
          }));

          const { error: itemsError } = await supabase
            .from("sale_items")
            .insert(saleItems);

          if (itemsError) throw itemsError;
        }

        console.log(`✅ Sale synced to Supabase: ${data.id}`);

        // Update IndexedDB to mark sale as synced
        const { markSaleAsSynced } = await import("../db");
        await markSaleAsSynced(data.id);

        return {
          destination: "supabase",
          success: true,
          responseData: saleResult?.[0] || { id: data.id },
        };
      } else if (operation === "delete") {
        const { error } = await supabase
          .from("sales")
          .delete()
          .eq("id", data.id);

        if (error) throw error;

        console.log(`🗑️ Sale deleted from Supabase: ${data.id}`);

        return {
          destination: "supabase",
          success: true,
          responseData: { id: data.id },
        };
      }

      throw new Error(`Unsupported operation: ${operation}`);
    } catch (error) {
      console.error("Failed to sync sale to Supabase:", error);
      return {
        destination: "supabase",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  async syncToSheets(
    operation: SyncOperation,
    data: Sale
  ): Promise<SyncResult> {
    try {
      if (operation === "delete") {
        // Sheets doesn't support easy deletion, so we skip
        console.log("Skipping delete operation for Sheets");
        return {
          destination: "sheets",
          success: true,
          responseData: {
            message: "Delete operation not supported for Sheets",
          },
        };
      }

      const salesSheetId = localStorage.getItem("salesSheetId");
      if (!salesSheetId) {
        throw new Error("Sales sheet ID not found in localStorage");
      }

      // Call the existing sync-sales API endpoint
      const response = await fetch("/api/sheets/sync-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sales: [data], salesSheetId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to sync to Sheets");
      }

      const result = await response.json();
      console.log(`✅ Sale synced to Sheets: ${data.id}`);

      return {
        destination: "sheets",
        success: true,
        responseData: result,
      };
    } catch (error) {
      console.error("Failed to sync sale to Sheets:", error);
      return {
        destination: "sheets",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  validate(data: Sale) {
    const errors: string[] = [];

    if (!data.id) errors.push("Sale ID is required");
    if (!data.total || data.total <= 0)
      errors.push("Sale total must be positive");
    if (!data.timestamp) errors.push("Sale timestamp is required");
    if (!data.items || data.items.length === 0)
      errors.push("Sale must have items");

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  },

  prepareForDestination(data: Sale, destination: SyncDestination): Sale {
    // For Supabase, we might want to flatten some nested structures
    if (destination === "supabase") {
      return {
        ...data,
        // Add any Supabase-specific transformations
      };
    }

    // For Sheets, we might want to format dates differently
    if (destination === "sheets") {
      return {
        ...data,
        timestamp: new Date(data.timestamp).toISOString(),
      };
    }

    return data;
  },
};

/**
 * Products Sync Strategy - Sync to both Supabase and Google Sheets
 */
export const productsSyncStrategy: SyncStrategy<Product> = {
  dataType: "product",
  destinations: ["supabase", "sheets"],
  maxAttempts: 3,
  retryDelays: DEFAULT_RETRY_DELAYS,
  priority: 5, // Medium priority

  async syncToSupabase(
    operation: SyncOperation,
    data: Product
  ): Promise<SyncResult> {
    try {
      const supabase = createClient();

      if (operation === "create" || operation === "update") {
        // Get the current user with token refresh handling
        const user = await getAuthenticatedUser();

        if (!user?.id) {
          throw new Error("Authentication failed - please sign in again");
        }

        console.log("🔒 User ID for product sync:", user.id);

        const productData = {
          id: data.id,
          user_id: user.id,
          name: data.name,
          price: data.price,
          image_url: data.imageUrl,
          category: data.category,
          inventory: data.inventory || {},
          sku: null, // Not in current Product interface
          cost: null, // Not in current Product interface
          notes: data.description, // Use description field
        };

        console.log("📝 Product data being inserted:", productData);

        const { data: productResult, error } = await supabase
          .from("products")
          .upsert(productData)
          .select();

        if (error) throw error;

        console.log(`✅ Product synced to Supabase: ${data.id}`);

        // Update IndexedDB to mark product as synced
        const { markProductAsSynced } = await import("../db");
        await markProductAsSynced(data.id);

        return {
          destination: "supabase",
          success: true,
          responseData: productResult?.[0] || { id: data.id },
        };
      } else if (operation === "delete") {
        const { error } = await supabase
          .from("products")
          .delete()
          .eq("id", data.id);

        if (error) throw error;

        console.log(`🗑️ Product deleted from Supabase: ${data.id}`);

        return {
          destination: "supabase",
          success: true,
          responseData: { id: data.id },
        };
      }

      throw new Error(`Unsupported operation: ${operation}`);
    } catch (error) {
      console.error("Failed to sync product to Supabase:", error);
      return {
        destination: "supabase",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  async syncToSheets(
    operation: SyncOperation,
    data: Product // eslint-disable-line @typescript-eslint/no-unused-vars -- Needed for type signature, actual sync fetches all products
  ): Promise<SyncResult> {
    try {
      const productsSheetId = localStorage.getItem("productsSheetId");
      if (!productsSheetId) {
        throw new Error("Products sheet ID not found in localStorage");
      }

      // For products, we sync the entire product list, not individual products
      // This is because the sync-products API clears and re-writes the sheet
      if (operation === "create" || operation === "update") {
        // DEBOUNCE: If multiple product updates happen in quick succession
        // (e.g., inventory updates from a multi-item sale), only sync once
        return new Promise<SyncResult>((resolve) => {
          // Add this resolve to the pending array
          pendingProductSheetsSyncResolves.push(resolve);

          // Clear any existing timeout
          if (productSheetsSyncTimeout) {
            clearTimeout(productSheetsSyncTimeout);
          }

          // Set new timeout to actually perform the sync
          productSheetsSyncTimeout = setTimeout(async () => {
            try {
              const { getProducts } = await import("../db");
              const allProducts = await getProducts();

              const response = await fetch("/api/sheets/sync-products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  products: allProducts,
                  productsSheetId,
                }),
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                  errorData.error || "Failed to sync products to Sheets"
                );
              }

              const result = await response.json();
              console.log(
                `✅ Products synced to Sheets (${allProducts.length} products) - debounced (${pendingProductSheetsSyncResolves.length} pending)`
              );

              const syncResult: SyncResult = {
                destination: "sheets",
                success: true,
                responseData: result,
              };

              // Resolve ALL pending promises with the same result
              const resolvesToCall = [...pendingProductSheetsSyncResolves];
              pendingProductSheetsSyncResolves = [];
              resolvesToCall.forEach((r) => r(syncResult));
            } catch (error) {
              const syncResult: SyncResult = {
                destination: "sheets",
                success: false,
                error: error instanceof Error ? error.message : String(error),
              };

              // Resolve ALL pending promises with the error result
              const resolvesToCall = [...pendingProductSheetsSyncResolves];
              pendingProductSheetsSyncResolves = [];
              resolvesToCall.forEach((r) => r(syncResult));
            } finally {
              productSheetsSyncTimeout = null;
            }
          }, PRODUCT_SHEETS_DEBOUNCE_MS);
        });
      } else if (operation === "delete") {
        // For delete, we also re-sync all remaining products
        const { getProducts } = await import("../db");
        const allProducts = await getProducts();

        const response = await fetch("/api/sheets/sync-products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ products: allProducts, productsSheetId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Failed to sync products to Sheets"
          );
        }

        const result = await response.json();
        console.log(`✅ Products synced to Sheets after deletion`);

        return {
          destination: "sheets",
          success: true,
          responseData: result,
        };
      }

      throw new Error(`Unsupported operation: ${operation}`);
    } catch (error) {
      console.error("Failed to sync products to Sheets:", error);
      return {
        destination: "sheets",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  validate(data: Product) {
    const errors: string[] = [];

    if (!data.id) errors.push("Product ID is required");
    if (!data.name?.trim()) errors.push("Product name is required");
    if (data.price < 0) errors.push("Product price cannot be negative");

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
};

/**
 * Close-outs Sync Strategy - Supabase only for centralized data
 */
export const closeOutsSyncStrategy: SyncStrategy<CloseOut> = {
  dataType: "closeout",
  destinations: ["supabase"], // Only Supabase for close-outs
  maxAttempts: 5, // More retries for important close-out data
  retryDelays: HIGH_PRIORITY_RETRY_DELAYS,
  priority: 10, // Highest priority

  async syncToSupabase(
    operation: SyncOperation,
    data: CloseOut
  ): Promise<SyncResult> {
    try {
      const supabase = createClient();

      if (operation === "create" || operation === "update") {
        // Get the current user with token refresh handling
        const user = await getAuthenticatedUser();

        if (!user?.id) {
          throw new Error("Authentication failed - please sign in again");
        }

        console.log("🔒 User ID for close-out sync:", user.id);

        const closeOutData = {
          id: data.id,
          user_id: user.id,
          timestamp: data.timestamp,
          session_name: data.sessionName,
          location: data.location,
          event_date: data.eventDate
            ? new Date(data.eventDate).toISOString()
            : null,
          notes: data.notes,
          sales_count: data.salesCount,
          total_revenue: data.totalRevenue,
          actual_revenue: data.actualRevenue,
          discounts_given: data.discountsGiven,
          tips_received: data.tipsReceived,
          payment_breakdown: data.paymentBreakdown,
          products_sold: data.productsSold,
          expected_cash: data.expectedCash,
          actual_cash: data.actualCash,
          cash_difference: data.cashDifference,
          sale_ids: data.saleIds,
          synced_to_supabase: true,
        };

        console.log("📊 Close-out data being inserted:", closeOutData);

        const { data: closeOutResult, error } = await supabase
          .from("close_outs")
          .upsert(closeOutData)
          .select();

        if (error) {
          console.error("❌ Close-out sync error:", error);
          throw new Error(
            `Failed to sync close-out to Supabase: ${error.message}`
          );
        }

        console.log("✅ Close-out synced successfully to Supabase:", data.id);

        // Update IndexedDB to mark close-out as synced
        const { markCloseOutAsSynced } = await import("../db");
        await markCloseOutAsSynced(data.id);

        return {
          destination: "supabase",
          success: true,
          responseData: closeOutResult?.[0] || { id: data.id },
        };
      } else if (operation === "delete") {
        const { error } = await supabase
          .from("close_outs")
          .delete()
          .eq("id", data.id);

        if (error) throw error;

        console.log(`🗑️ Close-out deleted from Supabase: ${data.id}`);

        return {
          destination: "supabase",
          success: true,
          responseData: { id: data.id },
        };
      }

      throw new Error(`Unsupported operation: ${operation}`);
    } catch (error) {
      console.error("Failed to sync close-out to Supabase:", error);
      return {
        destination: "supabase",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  validate(data: CloseOut) {
    const errors: string[] = [];

    if (!data.id) errors.push("Close-out ID is required");
    if (!data.timestamp) errors.push("Close-out timestamp is required");
    if (data.totalRevenue < 0) errors.push("Total revenue cannot be negative");
    if (data.salesCount < 0) errors.push("Sales count cannot be negative");
    if (!data.saleIds || data.saleIds.length === 0)
      errors.push("Close-out must include sale IDs");

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  },

  prepareForDestination(data: CloseOut): CloseOut {
    // Ensure all dates are in ISO format for Supabase
    return {
      ...data,
      timestamp: new Date(data.timestamp).toISOString(),
      createdAt: new Date(data.createdAt).toISOString(),
      updatedAt: data.updatedAt
        ? new Date(data.updatedAt).toISOString()
        : undefined,
    };
  },
};

/**
 * Settings Sync Strategy - Sync to Supabase only
 * Settings are stored as flexible JSONB in user_settings table
 */
export const settingsSyncStrategy: SyncStrategy<UserSettings> = {
  dataType: "settings",
  destinations: ["supabase"],
  maxAttempts: 3,
  retryDelays: HIGH_PRIORITY_RETRY_DELAYS,
  priority: 9, // High priority - user expects instant saves

  async syncToSupabase(
    operation: SyncOperation,
    data: UserSettings
  ): Promise<SyncResult> {
    try {
      const supabase = createClient();

      if (operation === "create" || operation === "update") {
        // Get the current user with token refresh handling
        const user = await getAuthenticatedUser();

        if (!user?.id) {
          throw new Error("Authentication failed - please sign in again");
        }

        // Upsert settings (creates or updates)
        const { error } = await supabase.from("user_settings").upsert({
          user_id: user.id,
          settings: data,
        });

        if (error) throw error;

        console.log("✅ Settings synced to Supabase");

        return {
          destination: "supabase",
          success: true,
          responseData: { synced: true },
        };
      }

      // Settings don't support delete operation
      throw new Error("Delete operation not supported for settings");
    } catch (error) {
      console.error("❌ Settings Supabase sync failed:", error);
      return {
        destination: "supabase",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  async syncToSheets(): Promise<SyncResult> {
    // Settings are Supabase-only, not synced to Sheets
    return {
      destination: "sheets",
      success: true,
      responseData: { skipped: true, reason: "Settings are Supabase-only" },
    };
  },

  validate(data: UserSettings) {
    // Settings are flexible JSONB, minimal validation
    if (!data || typeof data !== "object") {
      return {
        valid: false,
        errors: ["Settings must be an object"],
      };
    }
    return { valid: true };
  },

  prepareForDestination(data: UserSettings): UserSettings {
    // Return as-is, JSONB handles the structure
    return data;
  },
};

/**
 * Email Signups Sync Strategy - Sync to Supabase (and optionally Sheets)
 */
export const emailSignupsSyncStrategy: SyncStrategy<
  import("../../types").EmailSignup
> = {
  dataType: "email_signup",
  destinations: ["supabase"], // Supabase as primary, Sheets as optional legacy
  maxAttempts: 3,
  retryDelays: DEFAULT_RETRY_DELAYS,
  priority: 8, // High priority - user expects confirmation

  async syncToSupabase(
    operation: SyncOperation,
    data: import("../../types").EmailSignup
  ): Promise<SyncResult> {
    try {
      const supabase = createClient();

      if (operation === "create" || operation === "update") {
        // Get the current user with token refresh handling
        const user = await getAuthenticatedUser();

        if (!user?.id) {
          throw new Error("Authentication failed - please sign in again");
        }

        console.log("🔒 User ID for email signup sync:", user.id);

        const emailSignupData = {
          id: data.id,
          user_id: user.id,
          timestamp: data.timestamp,
          email: data.email,
          name: data.name || null,
          phone: data.phone || null,
          source: data.source,
          sale_id: data.saleId || null,
          synced: true,
        };

        console.log("📧 Email signup data being inserted:", emailSignupData);

        const { data: emailSignupResult, error } = await supabase
          .from("email_signups")
          .upsert(emailSignupData)
          .select();

        if (error) {
          console.error("❌ Email signup sync error:", error);
          throw new Error(
            `Failed to sync email signup to Supabase: ${error.message}`
          );
        }

        console.log(
          "✅ Email signup synced successfully to Supabase:",
          data.id
        );

        // Update IndexedDB to mark email signup as synced
        const { markEmailSignupAsSynced } = await import("../db");
        await markEmailSignupAsSynced(data.id);

        return {
          destination: "supabase",
          success: true,
          responseData: emailSignupResult?.[0] || { id: data.id },
        };
      } else if (operation === "delete") {
        const { error } = await supabase
          .from("email_signups")
          .delete()
          .eq("id", data.id);

        if (error) throw error;

        console.log(`🗑️ Email signup deleted from Supabase: ${data.id}`);

        return {
          destination: "supabase",
          success: true,
          responseData: { id: data.id },
        };
      }

      throw new Error(`Unsupported operation: ${operation}`);
    } catch (error) {
      console.error("Failed to sync email signup to Supabase:", error);
      return {
        destination: "supabase",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  validate(data: import("../../types").EmailSignup) {
    const errors: string[] = [];

    if (!data.id) errors.push("Email signup ID is required");
    if (!data.email) errors.push("Email is required");
    if (!data.timestamp) errors.push("Timestamp is required");
    if (!data.source) errors.push("Source is required");

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.email && !emailRegex.test(data.email)) {
      errors.push("Invalid email format");
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  },

  prepareForDestination(
    data: import("../../types").EmailSignup
  ): import("../../types").EmailSignup {
    // Ensure timestamp is in ISO format for Supabase
    return {
      ...data,
      timestamp: new Date(data.timestamp).toISOString(),
    };
  },
};

// Export all strategies for easy registration
export const ALL_SYNC_STRATEGIES = [
  salesSyncStrategy,
  productsSyncStrategy,
  closeOutsSyncStrategy,
  settingsSyncStrategy,
  emailSignupsSyncStrategy,
] as const;

// Default sync manager configuration
export const DEFAULT_SYNC_CONFIG = {
  maxConcurrentSyncs: 3,
  syncIntervalMs: 5000, // 5 seconds
  offlineCheckIntervalMs: 10000, // 10 seconds
  maxQueueSize: 1000,
  enableBackgroundSync: true,
  debugMode: process.env.NODE_ENV === "development",
  networkCheckUrl: "https://www.google.com/favicon.ico",
};
