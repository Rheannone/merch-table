/**
 * Universal Sync System for Tour Manager
 *
 * This system provides:
 * - Offline-first operations with queueing
 * - Configurable sync destinations (Supabase, Google Sheets, etc.)
 * - Automatic retry with exponential backoff
 * - Conflict resolution strategies
 * - Real-time sync status
 */

export type SyncDestination = "supabase" | "sheets" | "indexdb";
export type SyncOperation = "create" | "update" | "delete";
export type SyncItemStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "retrying";

export interface SyncQueueItem {
  id: string;
  dataType: string; // 'sale', 'product', 'closeout', etc.
  operation: SyncOperation;
  data: Record<string, unknown>;
  destinations: SyncDestination[];

  // Status tracking
  status: SyncItemStatus;
  attempts: number;
  maxAttempts: number;

  // Timing
  createdAt: string;
  scheduledAt: string;
  lastAttemptAt?: string;
  completedAt?: string;

  // Error handling
  lastError?: string;
  retryDelay: number; // milliseconds

  // Metadata
  userId?: string;
  priority: number; // Higher = more urgent
  dependencies?: string[]; // Other queue items that must complete first
}

export interface SyncResult {
  destination: SyncDestination;
  success: boolean;
  error?: string;
  responseData?: Record<string, unknown>;
}

export interface SyncStrategy<T = Record<string, unknown>> {
  dataType: string;
  destinations: SyncDestination[];

  // Destination-specific sync functions
  syncToSupabase?: (operation: SyncOperation, data: T) => Promise<SyncResult>;
  syncToSheets?: (operation: SyncOperation, data: T) => Promise<SyncResult>;
  syncToIndexDB?: (operation: SyncOperation, data: T) => Promise<SyncResult>;

  // Data transformation
  prepareForDestination?: (data: T, destination: SyncDestination) => T;

  // Conflict resolution
  resolveConflict?: (localData: T, remoteData: T) => T;

  // Validation
  validate?: (data: T) => { valid: boolean; errors?: string[] };

  // Configuration
  maxAttempts: number;
  retryDelays: number[]; // milliseconds for each retry attempt
  priority: number;
}

export interface SyncManagerConfig {
  maxConcurrentSyncs: number;
  syncIntervalMs: number;
  offlineCheckIntervalMs: number;
  maxQueueSize: number;
  enableBackgroundSync: boolean;
  debugMode?: boolean;
  networkCheckUrl?: string;
}

export interface SyncStats {
  isOnline: boolean;
  isProcessing: boolean;
  queueSize: number;
  pendingByDestination: Record<SyncDestination, number>;
  totalCompleted: number;
  totalFailed: number;
  lastSyncTime?: string;
  errors: string[];
}

// Pre-defined sync configurations for common data types
export interface SalesSyncConfig extends SyncStrategy<Record<string, unknown>> {
  dataType: "sale";
  destinations: ["supabase", "sheets"]; // Save to both
  priority: 10; // High priority
}

export interface ProductsSyncConfig
  extends SyncStrategy<Record<string, unknown>> {
  dataType: "product";
  destinations: ["supabase", "sheets"]; // Save to both
  priority: 5; // Medium priority
}

export interface CloseOutsSyncConfig
  extends SyncStrategy<Record<string, unknown>> {
  dataType: "closeout";
  destinations: ["supabase"]; // Only Supabase for close-outs
  priority: 8; // High priority
}

// Events for real-time sync status
export interface SyncEvent {
  type:
    | "queue_item_added"
    | "sync_started"
    | "sync_completed"
    | "sync_failed"
    | "online_status_changed"
    | "stats_updated";
  queueItem?: SyncQueueItem;
  destination?: SyncDestination;
  error?: string;
  timestamp: string;
}

export type SyncEventListener = (event: SyncEvent) => void;

// Error types for better error handling
export class SyncError extends Error {
  constructor(
    message: string,
    public destination: SyncDestination,
    public operation: SyncOperation,
    public dataType: string,
    public isRetryable = true
  ) {
    super(message);
    this.name = "SyncError";
  }
}

export class ConflictError extends SyncError {
  constructor(
    message: string,
    destination: SyncDestination,
    public localData: Record<string, unknown>,
    public remoteData: Record<string, unknown>
  ) {
    super(message, destination, "update", "unknown", false);
    this.name = "ConflictError";
  }
}
