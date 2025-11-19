/**
 * Universal SyncManager
 *
 * Core class for managing offline-first sync with configurable destinations
 */

import {
  SyncQueueItem,
  SyncStrategy,
  SyncManagerConfig,
  SyncStats,
  SyncResult,
  SyncEvent,
  SyncEventListener,
  SyncDestination,
  SyncOperation,
} from "./types";

export class SyncManager {
  private queue: SyncQueueItem[] = [];
  private processing: Set<string> = new Set();
  private strategies: Map<string, SyncStrategy<Record<string, unknown>>> =
    new Map();
  private listeners: Set<SyncEventListener> = new Set();
  private isOnline =
    typeof navigator !== "undefined" ? navigator.onLine : false;
  private processingTimer?: NodeJS.Timeout;

  private stats: SyncStats = {
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : false,
    isProcessing: false,
    queueSize: 0,
    pendingByDestination: { supabase: 0, sheets: 0, indexdb: 0 },
    totalCompleted: 0,
    totalFailed: 0,
    errors: [],
  };

  constructor(private config: SyncManagerConfig) {
    this.setupNetworkMonitoring();
    this.startProcessingLoop();
  }

  /**
   * Register a sync strategy for a specific data type
   */
  registerStrategy<T extends Record<string, unknown>>(
    strategy: SyncStrategy<T>
  ): void {
    // Cast to the base type for storage
    this.strategies.set(
      strategy.dataType,
      strategy as SyncStrategy<Record<string, unknown>>
    );
    this.log(`Registered sync strategy for ${strategy.dataType}`);
  }

  /**
   * Add item to sync queue
   */
  async enqueue(
    dataType: string,
    operation: SyncOperation,
    data: Record<string, unknown>,
    options?: {
      priority?: number;
      destinations?: SyncDestination[];
      userId?: string;
    }
  ): Promise<string> {
    const strategy = this.strategies.get(dataType);
    if (!strategy) {
      throw new Error(`No sync strategy registered for data type: ${dataType}`);
    }

    // Validate data if strategy provides validation
    if (strategy.validate) {
      const validation = strategy.validate(data);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors?.join(", ")}`);
      }
    }

    const now = new Date().toISOString();
    const queueItem: SyncQueueItem = {
      id: crypto.randomUUID(),
      dataType,
      operation,
      data,
      destinations: options?.destinations || strategy.destinations,
      status: "pending",
      attempts: 0,
      maxAttempts: strategy.maxAttempts,
      createdAt: now,
      scheduledAt: now,
      retryDelay: strategy.retryDelays[0] || 1000,
      userId: options?.userId,
      priority: options?.priority || strategy.priority,
    };

    // Check queue size limit
    if (this.queue.length >= this.config.maxQueueSize) {
      // Remove oldest low-priority items
      this.queue = this.queue
        .sort(
          (a, b) =>
            b.priority - a.priority ||
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
        .slice(0, this.config.maxQueueSize - 1);
    }

    this.queue.push(queueItem);
    this.updateStats();
    this.emit({ type: "queue_item_added", queueItem, timestamp: now });

    this.log(`Enqueued ${dataType} ${operation} with ID ${queueItem.id}`);

    // Try to process immediately if online
    if (this.isOnline) {
      this.processQueue();
    }

    return queueItem.id;
  }

  /**
   * Get current sync statistics
   */
  getStats(): SyncStats {
    return { ...this.stats };
  }

  /**
   * Add event listener
   */
  addEventListener(listener: SyncEventListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: SyncEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Force immediate sync attempt
   */
  async forcSync(): Promise<void> {
    this.log("Force sync requested");
    await this.processQueue();
  }

  /**
   * Clear failed items from queue
   */
  clearFailedItems(): void {
    const beforeCount = this.queue.length;
    this.queue = this.queue.filter((item) => item.status !== "failed");
    const removedCount = beforeCount - this.queue.length;
    this.updateStats();
    this.log(`Cleared ${removedCount} failed items from queue`);
  }

  /**
   * Get queue items for debugging
   */
  getQueueItems(): SyncQueueItem[] {
    return [...this.queue];
  }

  // Private methods

  private setupNetworkMonitoring(): void {
    // Only set up network monitoring in the browser
    if (typeof window === "undefined") return;

    window.addEventListener("online", () => {
      this.isOnline = true;
      this.updateStats();
      this.emit({
        type: "online_status_changed",
        timestamp: new Date().toISOString(),
      });
      this.log("Network came online, processing queue");
      this.processQueue();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      this.updateStats();
      this.emit({
        type: "online_status_changed",
        timestamp: new Date().toISOString(),
      });
      this.log("Network went offline");
    });
  }

  private startProcessingLoop(): void {
    if (this.config.enableBackgroundSync) {
      this.processingTimer = setInterval(() => {
        if (this.isOnline && this.queue.length > 0) {
          this.processQueue();
        }
      }, this.config.syncIntervalMs);
    }
  }

  private async processQueue(): Promise<void> {
    if (!this.isOnline || this.stats.isProcessing) {
      return;
    }

    this.stats.isProcessing = true;
    this.updateStats();

    const now = new Date().getTime();
    const readyItems = this.queue
      .filter(
        (item) =>
          item.status === "pending" ||
          (item.status === "retrying" &&
            new Date(item.scheduledAt).getTime() <= now)
      )
      .filter((item) => !this.processing.has(item.id))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, this.config.maxConcurrentSyncs);

    if (readyItems.length === 0) {
      this.stats.isProcessing = false;
      this.updateStats();
      return;
    }

    this.log(`Processing ${readyItems.length} items from queue`);

    const processingPromises = readyItems.map((item) => this.processItem(item));
    await Promise.allSettled(processingPromises);

    this.stats.isProcessing = false;
    this.updateStats();

    // Continue processing if there are more items
    const remainingItems = this.queue.filter(
      (item) => item.status === "pending" || item.status === "retrying"
    );
    if (remainingItems.length > 0 && this.isOnline) {
      setTimeout(() => this.processQueue(), 100);
    }
  }

  private async processItem(item: SyncQueueItem): Promise<void> {
    this.processing.add(item.id);
    item.status = "processing";
    item.lastAttemptAt = new Date().toISOString();
    item.attempts++;

    this.emit({
      type: "sync_started",
      queueItem: item,
      timestamp: new Date().toISOString(),
    });

    try {
      const strategy = this.strategies.get(item.dataType);
      if (!strategy) {
        throw new Error(`No strategy found for data type: ${item.dataType}`);
      }

      const results: SyncResult[] = [];

      // Process each destination
      for (const destination of item.destinations) {
        try {
          // For products: Skip Sheets sync if Supabase sync failed
          if (
            item.dataType === "product" &&
            destination === "sheets" &&
            results.length > 0
          ) {
            const supabaseResult = results.find(
              (r) => r.destination === "supabase"
            );
            if (supabaseResult && !supabaseResult.success) {
              console.log(
                "⏭️ Skipping Sheets sync for product - Supabase sync failed"
              );
              results.push({
                destination: "sheets",
                success: false,
                error: "Skipped: Supabase sync failed",
              });
              continue;
            }
          }

          const result = await this.syncToDestination(
            strategy,
            destination,
            item
          );
          results.push(result);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          results.push({
            destination,
            success: false,
            error: errorMessage,
          });
        }
      }

      // Check if all destinations succeeded
      const allSucceeded = results.every((r) => r.success);
      if (allSucceeded) {
        item.status = "completed";
        item.completedAt = new Date().toISOString();
        this.stats.totalCompleted++;
        this.emit({
          type: "sync_completed",
          queueItem: item,
          timestamp: new Date().toISOString(),
        });
        this.log(
          `Successfully synced ${item.dataType} ${item.operation} (${item.id})`
        );
      } else {
        throw new Error(
          `Some destinations failed: ${results
            .filter((r) => !r.success)
            .map((r) => r.error)
            .join(", ")}`
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      item.lastError = errorMessage;

      if (item.attempts >= item.maxAttempts) {
        item.status = "failed";
        this.stats.totalFailed++;
        this.stats.errors.push(
          `${item.dataType} ${item.operation}: ${errorMessage}`
        );
        this.emit({
          type: "sync_failed",
          queueItem: item,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        });
        this.log(
          `Failed to sync ${item.dataType} ${item.operation} after ${item.attempts} attempts: ${errorMessage}`
        );
      } else {
        item.status = "retrying";
        const strategy = this.strategies.get(item.dataType);
        const delay =
          strategy?.retryDelays[item.attempts - 1] ||
          item.retryDelay * Math.pow(2, item.attempts - 1);
        item.scheduledAt = new Date(Date.now() + delay).toISOString();
        this.log(
          `Retrying ${item.dataType} ${item.operation} in ${delay}ms (attempt ${item.attempts}/${item.maxAttempts})`
        );
      }
    } finally {
      this.processing.delete(item.id);
      this.updateStats();
    }
  }

  private async syncToDestination(
    strategy: SyncStrategy,
    destination: SyncDestination,
    item: SyncQueueItem
  ): Promise<SyncResult> {
    const { operation, data } = item;

    // Prepare data for destination if needed
    const preparedData = strategy.prepareForDestination
      ? strategy.prepareForDestination(data, destination)
      : data;

    // Call the appropriate sync function
    switch (destination) {
      case "supabase":
        if (!strategy.syncToSupabase) {
          throw new Error(`No Supabase sync function for ${strategy.dataType}`);
        }
        return await strategy.syncToSupabase(operation, preparedData);

      case "sheets":
        if (!strategy.syncToSheets) {
          throw new Error(`No Sheets sync function for ${strategy.dataType}`);
        }
        return await strategy.syncToSheets(operation, preparedData);

      case "indexdb":
        if (!strategy.syncToIndexDB) {
          throw new Error(`No IndexDB sync function for ${strategy.dataType}`);
        }
        return await strategy.syncToIndexDB(operation, preparedData);

      default:
        throw new Error(`Unknown destination: ${destination}`);
    }
  }

  private updateStats(): void {
    const pendingByDestination: Record<SyncDestination, number> = {
      supabase: 0,
      sheets: 0,
      indexdb: 0,
    };

    for (const item of this.queue) {
      if (item.status === "pending" || item.status === "retrying") {
        for (const dest of item.destinations) {
          pendingByDestination[dest]++;
        }
      }
    }

    this.stats = {
      ...this.stats,
      isOnline: this.isOnline,
      queueSize: this.queue.length,
      pendingByDestination,
      lastSyncTime: new Date().toISOString(),
    };

    this.emit({
      type: "stats_updated",
      timestamp: new Date().toISOString(),
    });
  }

  private emit(
    event: Omit<SyncEvent, "timestamp"> & { timestamp: string }
  ): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("Error in sync event listener:", error);
      }
    }
  }

  private log(message: string): void {
    if (this.config.debugMode) {
      console.log(`[SyncManager] ${message}`);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
    }
    this.listeners.clear();
    this.queue = [];
    this.processing.clear();
  }
}
