/**
 * Centralized Sync Manager
 * Coordinates all data synchronization between IndexedDB, Google Sheets, and Supabase
 */

import {
  getProducts,
  getUnsyncedSales,
  markSaleAsSynced,
  deleteSyncedSales,
  hasPendingSettingsSync,
  markSettingsAsSynced,
  getSettings,
} from "@/lib/db";
import { isTutorialMode } from "@/lib/tutorialData";

export type SyncType = "sales" | "products" | "settings";

export interface SyncQueueItem {
  type: SyncType;
  priority: number; // 1 = highest (sales), 2 = medium (products), 3 = low (settings)
  timestamp: number;
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  pendingSales: number;
  pendingProducts: boolean;
  pendingSettings: boolean;
  error: string | null;
}

type SyncStatusListener = (status: SyncStatus) => void;

class SyncManager {
  private syncQueue: SyncQueueItem[] = [];
  private isSyncing = false;
  private isOnline = navigator.onLine;
  private listeners: SyncStatusListener[] = [];
  private syncStatus: SyncStatus = {
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncTime: null,
    pendingSales: 0,
    pendingProducts: false,
    pendingSettings: false,
    error: null,
  };

  constructor() {
    // Listen for network status changes
    window.addEventListener("online", () => this.handleOnline());
    window.addEventListener("offline", () => this.handleOffline());
  }

  /**
   * Subscribe to sync status changes
   */
  subscribe(listener: SyncStatusListener): () => void {
    this.listeners.push(listener);
    // Immediately call with current status
    listener(this.syncStatus);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.syncStatus));
  }

  /**
   * Update sync status and notify listeners
   */
  private updateStatus(updates: Partial<SyncStatus>) {
    // Only update and notify if values actually changed
    const newStatus = { ...this.syncStatus, ...updates };

    // Deep equality check to prevent unnecessary updates
    const hasChanged = Object.keys(updates).some(
      (key) =>
        this.syncStatus[key as keyof SyncStatus] !==
        newStatus[key as keyof SyncStatus]
    );

    if (!hasChanged) {
      return; // Skip update if nothing changed
    }

    this.syncStatus = newStatus;
    this.notifyListeners();
  }

  /**
   * Handle network coming online
   */
  private async handleOnline() {
    console.log("📶 Network connection restored");
    this.isOnline = true;
    this.updateStatus({ isOnline: true, error: null });

    // Check for pending data and queue syncs
    await this.checkPendingData();

    // Process the queue
    await this.processQueue();
  }

  /**
   * Handle network going offline
   */
  private handleOffline() {
    console.log("📴 Network connection lost");
    this.isOnline = false;
    this.updateStatus({ isOnline: false });
  }

  /**
   * Check for pending data that needs syncing
   */
  async checkPendingData(): Promise<void> {
    // Skip checking in tutorial mode
    if (isTutorialMode()) {
      this.updateStatus({
        pendingSales: 0,
        pendingProducts: false,
        pendingSettings: false,
      });
      return;
    }

    try {
      // Check for unsynced sales
      const unsyncedSales = await getUnsyncedSales();
      const pendingSales = unsyncedSales.length;

      // Check for pending settings sync
      const pendingSettings = await hasPendingSettingsSync();

      // For products, we'll set a flag when products are modified
      // This will be set from outside the sync manager
      const pendingProducts = this.syncStatus.pendingProducts;

      this.updateStatus({
        pendingSales,
        pendingSettings,
        pendingProducts,
      });

      // Queue syncs if needed
      if (pendingSales > 0) {
        this.queueSync("sales");
      }
      if (pendingProducts) {
        this.queueSync("products");
      }
      if (pendingSettings) {
        this.queueSync("settings");
      }
    } catch (error) {
      console.error("Error checking pending data:", error);
    }
  }

  /**
   * Queue a sync operation
   */
  queueSync(type: SyncType): void {
    // Check if already queued
    const alreadyQueued = this.syncQueue.some((item) => item.type === type);
    if (alreadyQueued) {
      return;
    }

    // Assign priority: sales (1) > products (2) > settings (3)
    const priority = type === "sales" ? 1 : type === "products" ? 2 : 3;

    this.syncQueue.push({
      type,
      priority,
      timestamp: Date.now(),
    });

    // Sort by priority (lowest number = highest priority)
    this.syncQueue.sort((a, b) => a.priority - b.priority);

    console.log(`📋 Queued ${type} sync (priority ${priority})`);

    // If online and not already syncing, process queue
    if (this.isOnline && !this.isSyncing) {
      this.processQueue();
    }
  }

  /**
   * Process the sync queue
   */
  private async processQueue(): Promise<void> {
    // Skip syncing in tutorial mode - tutorial data doesn't go to Google Sheets
    if (isTutorialMode()) {
      console.log("🎓 Tutorial mode - skipping sync operations");
      this.syncQueue = []; // Clear queue
      this.updateStatus({
        pendingSales: 0,
        pendingProducts: false,
        pendingSettings: false,
      });
      return;
    }

    if (this.isSyncing || !this.isOnline) {
      return;
    }

    this.isSyncing = true;
    this.updateStatus({ isSyncing: true, error: null });

    try {
      while (this.syncQueue.length > 0 && this.isOnline) {
        const item = this.syncQueue.shift()!;
        console.log(`🔄 Processing ${item.type} sync...`);

        try {
          await this.executeSync(item.type);
        } catch (error) {
          console.error(`❌ ${item.type} sync failed:`, error);

          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          this.updateStatus({
            error: `Failed to sync ${item.type}: ${errorMessage}`,
          });

          // Only retry for transient errors, not configuration errors
          const isConfigError =
            errorMessage.includes("sheet ID not found") ||
            errorMessage.includes("Sheet ID not found") ||
            errorMessage.includes("not found");

          if (!isConfigError) {
            // Re-queue with delay for transient errors (network issues, etc.)
            setTimeout(() => {
              if (this.isOnline) {
                this.queueSync(item.type);
              }
            }, 5000); // Retry after 5 seconds
          } else {
            console.log(
              `⚠️ Skipping retry for configuration error: ${errorMessage}`
            );
          }

          // Don't stop processing other items
          continue;
        }

        // Small delay between syncs
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Update last sync time after successful queue processing
      if (this.syncQueue.length === 0) {
        this.updateStatus({
          lastSyncTime: new Date().toISOString(),
          error: null,
        });
      }
    } finally {
      this.isSyncing = false;
      this.updateStatus({ isSyncing: false });

      // Re-check pending data to update counts
      await this.checkPendingData();
    }
  }

  /**
   * Execute a specific sync operation
   */
  private async executeSync(type: SyncType): Promise<void> {
    switch (type) {
      case "sales":
        await this.syncSales();
        break;
      case "products":
        await this.syncProducts();
        break;
      case "settings":
        await this.syncSettings();
        break;
    }
  }

  /**
   * Sync sales to Google Sheets
   */
  private async syncSales(): Promise<void> {
    const unsyncedSales = await getUnsyncedSales();
    const salesSheetId = localStorage.getItem("salesSheetId");

    if (unsyncedSales.length === 0) {
      console.log("ℹ️ No sales to sync");
      return;
    }

    if (!salesSheetId) {
      throw new Error("Sales sheet ID not found");
    }

    console.log(`📤 Syncing ${unsyncedSales.length} sales to Google Sheets...`);

    const response = await fetch("/api/sheets/sync-sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sales: unsyncedSales, salesSheetId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to sync sales");
    }

    // Mark sales as synced and delete them
    for (const sale of unsyncedSales) {
      await markSaleAsSynced(sale.id);
    }

    const deletedCount = await deleteSyncedSales();
    console.log(
      `✅ Synced ${unsyncedSales.length} sales, cleaned up ${deletedCount} records`
    );

    this.updateStatus({ pendingSales: 0 });
  }

  /**
   * Sync products to Google Sheets
   */
  private async syncProducts(): Promise<void> {
    const productsSheetId = localStorage.getItem("productsSheetId");

    if (!productsSheetId) {
      throw new Error("Products sheet ID not found");
    }

    const currentProducts = await getProducts();
    console.log(
      `📤 Syncing ${currentProducts.length} products to Google Sheets...`
    );

    const response = await fetch("/api/sheets/sync-products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products: currentProducts, productsSheetId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to sync products");
    }

    console.log("✅ Products synced to Google Sheets");
    this.updateStatus({ pendingProducts: false });
  }

  /**
   * Sync settings to Supabase
   */
  private async syncSettings(): Promise<void> {
    const settings = await getSettings();

    if (!settings || !settings.pendingSync) {
      console.log("ℹ️ No settings to sync");
      return;
    }

    console.log("📤 Syncing settings to Supabase...");

    const response = await fetch("/api/settings/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        settings: {
          user_id: settings.id, // Will be replaced with actual user ID on server
          payment_methods: settings.paymentSettings,
          categories: settings.categories,
          show_tip_jar: settings.showTipJar,
          currency: settings.currency,
          exchange_rate: settings.exchangeRate,
          theme_id: settings.themeId,
          email_signup_enabled: settings.emailSignupSettings.enabled,
          email_signup_prompt_message:
            settings.emailSignupSettings.promptMessage,
          email_signup_collect_name: settings.emailSignupSettings.collectName,
          email_signup_collect_phone: settings.emailSignupSettings.collectPhone,
          email_signup_auto_dismiss_seconds:
            settings.emailSignupSettings.autoDismissSeconds,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to sync settings");
    }

    await markSettingsAsSynced();
    console.log("✅ Settings synced to Supabase");
    this.updateStatus({ pendingSettings: false });
  }

  /**
   * Mark products as needing sync
   */
  markProductsPending(): void {
    this.updateStatus({ pendingProducts: true });
    if (this.isOnline) {
      this.queueSync("products");
    }
  }

  /**
   * Manually trigger a sync (e.g., from a button)
   */
  async triggerSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error("Cannot sync while offline");
    }

    // Re-check pending data and queue everything
    await this.checkPendingData();
    await this.processQueue();
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return { ...this.syncStatus };
  }
}

// Export singleton instance
export const syncManager = new SyncManager();
