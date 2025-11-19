/**
 * Universal Sync Service
 *
 * Main service that initializes and manages the sync system for Tour Manager
 */

import { SyncManager } from "./SyncManager";
import { DEFAULT_SYNC_CONFIG, ALL_SYNC_STRATEGIES } from "./strategies";
import { SyncStats, SyncEvent, SyncStrategy } from "./types";
import { Sale, Product, CloseOut, UserSettings } from "../../types";

class SyncService {
  private syncManager: SyncManager;
  private initialized = false;

  constructor() {
    this.syncManager = new SyncManager(DEFAULT_SYNC_CONFIG);
  }

  /**
   * Initialize the sync service with all strategies
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn("SyncService already initialized");
      return;
    }

    // Register all sync strategies
    for (const strategy of ALL_SYNC_STRATEGIES) {
      // Use type assertion to work around strict generics
      this.syncManager.registerStrategy(
        strategy as unknown as SyncStrategy<Record<string, unknown>>
      );
    }

    console.log(
      "SyncService initialized with strategies:",
      ALL_SYNC_STRATEGIES.map((s) => s.dataType)
    );
    this.initialized = true;
  }

  /**
   * Sync a sale to all configured destinations
   */
  async syncSale(sale: Sale): Promise<string> {
    this.ensureInitialized();
    return await this.syncManager.enqueue(
      "sale",
      "create",
      sale as unknown as Record<string, unknown>,
      {
        priority: 8, // High priority for sales
      }
    );
  }

  /**
   * Sync a product to all configured destinations
   */
  async syncProduct(product: Product): Promise<string> {
    this.ensureInitialized();
    return await this.syncManager.enqueue(
      "product",
      "create",
      product as unknown as Record<string, unknown>,
      {
        priority: 5, // Medium priority for products
      }
    );
  }

  /**
   * Update an existing product
   */
  async updateProduct(product: Product): Promise<string> {
    this.ensureInitialized();
    return await this.syncManager.enqueue(
      "product",
      "update",
      product as unknown as Record<string, unknown>,
      {
        priority: 6, // Slightly higher priority for updates
      }
    );
  }

  /**
   * Delete a product from all destinations
   */
  async deleteProduct(productId: string): Promise<string> {
    this.ensureInitialized();
    return await this.syncManager.enqueue(
      "product",
      "delete",
      { id: productId },
      {
        priority: 4, // Lower priority for deletions
      }
    );
  }

  /**
   * Sync a close-out to Supabase (highest priority)
   */
  async syncCloseOut(closeOut: CloseOut): Promise<string> {
    this.ensureInitialized();
    return await this.syncManager.enqueue(
      "closeout",
      "create",
      closeOut as unknown as Record<string, unknown>,
      {
        priority: 10, // Highest priority
      }
    );
  }

  /**
   * Update an existing close-out
   */
  async updateCloseOut(closeOut: CloseOut): Promise<string> {
    this.ensureInitialized();
    return await this.syncManager.enqueue(
      "closeout",
      "update",
      closeOut as unknown as Record<string, unknown>,
      {
        priority: 10, // Highest priority
      }
    );
  }

  /**
   * Sync user settings to Supabase
   */
  async syncSettings(settings: UserSettings): Promise<string> {
    this.ensureInitialized();
    return await this.syncManager.enqueue(
      "settings",
      "update", // Settings always use update (upsert)
      settings as unknown as Record<string, unknown>,
      {
        priority: 9, // High priority - user expects instant saves
      }
    );
  }

  /**
   * Force sync all pending items immediately
   */
  async forceSync(): Promise<void> {
    this.ensureInitialized();
    await this.syncManager.forcSync();
  }

  /**
   * Get current sync statistics
   */
  getStats(): SyncStats {
    this.ensureInitialized();
    return this.syncManager.getStats();
  }

  /**
   * Listen for sync events (queue changes, completions, failures, etc.)
   */
  addEventListener(listener: (event: SyncEvent) => void): void {
    this.ensureInitialized();
    this.syncManager.addEventListener(listener);
  }

  /**
   * Remove sync event listener
   */
  removeEventListener(listener: (event: SyncEvent) => void): void {
    this.ensureInitialized();
    this.syncManager.removeEventListener(listener);
  }

  /**
   * Clear all failed sync items from the queue
   */
  clearFailedItems(): void {
    this.ensureInitialized();
    this.syncManager.clearFailedItems();
  }

  /**
   * Get current queue items for debugging
   */
  getQueueItems() {
    this.ensureInitialized();
    return this.syncManager.getQueueItems();
  }

  /**
   * Check if the sync service is online and ready
   */
  isOnline(): boolean {
    return this.getStats().isOnline;
  }

  /**
   * Check if sync is currently processing items
   */
  isProcessing(): boolean {
    return this.getStats().isProcessing;
  }

  /**
   * Get sync status summary for UI display
   */
  getSyncStatusSummary(): {
    status: "online" | "offline" | "syncing" | "error";
    message: string;
    pendingCount: number;
    errorCount: number;
  } {
    const stats = this.getStats();

    if (!stats.isOnline) {
      return {
        status: "offline",
        message: "Offline - changes will sync when online",
        pendingCount: stats.queueSize,
        errorCount: stats.errors.length,
      };
    }

    if (stats.isProcessing) {
      return {
        status: "syncing",
        message: "Syncing data...",
        pendingCount: stats.queueSize,
        errorCount: stats.errors.length,
      };
    }

    if (stats.errors.length > 0) {
      return {
        status: "error",
        message: `${stats.errors.length} sync error(s)`,
        pendingCount: stats.queueSize,
        errorCount: stats.errors.length,
      };
    }

    if (stats.queueSize > 0) {
      return {
        status: "online",
        message: `${stats.queueSize} items pending sync`,
        pendingCount: stats.queueSize,
        errorCount: 0,
      };
    }

    return {
      status: "online",
      message: "All data synced",
      pendingCount: 0,
      errorCount: 0,
    };
  }

  /**
   * Cleanup resources when app is closing
   */
  destroy(): void {
    if (this.syncManager) {
      this.syncManager.destroy();
    }
    this.initialized = false;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error("SyncService not initialized. Call initialize() first.");
    }
  }
}

// Export singleton instance
export const syncService = new SyncService();

// Auto-initialize when imported in the browser only
if (typeof window !== "undefined") {
  syncService.initialize().catch((error) => {
    console.error("Failed to initialize sync service:", error);
  });
}

export default syncService;
