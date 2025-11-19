# New Data Entity Checklist

**Purpose:** Use this checklist when adding a new data entity to ensure complete and consistent implementation across all data flow patterns.

---

## 📋 Before You Start

- [ ] **Define the entity type** in `src/types/index.ts`
- [ ] **Decide on storage strategy:**
  - IndexedDB for local cache/offline? (Usually YES)
  - Supabase for cloud sync? (Usually YES)
  - Google Sheets for backup? (Optional)
- [ ] **Decide on sync priority** (1-10, higher = more critical)
- [ ] **Identify dependencies** (e.g., close-outs depend on sales data)

---

## 1️⃣ Type Definitions

### `src/types/index.ts`

- [ ] Create interface with all required fields
- [ ] Add `synced?: boolean` flag if using queue-based sync
- [ ] Add `syncedToSupabase?: boolean` if using Supabase
- [ ] Add timestamps: `createdAt`, `updatedAt`, `timestamp`
- [ ] Document what each field represents with JSDoc comments

**Example:**

```typescript
export interface MyEntity {
  id: string;
  timestamp: string;
  // ... entity-specific fields
  syncedToSupabase: boolean;
  createdAt: string;
  updatedAt?: string;
}
```

---

## 2️⃣ IndexedDB Schema

### `src/lib/db.ts`

- [ ] Add object store to `MerchPOSDB` interface
- [ ] Define `keyPath` (usually `"id"`)
- [ ] Add indexes if needed (e.g., `timestamp` for sorting)
- [ ] Increment `DB_VERSION` constant
- [ ] Add store creation in `upgrade()` function

**Example:**

```typescript
interface MerchPOSDB extends DBSchema {
  my_entities: {
    key: string;
    value: MyEntity;
    indexes: { timestamp: string };
  };
}
```

### CRUD Functions

- [ ] **Create:** `saveMyEntity(entity: MyEntity): Promise<void>`
- [ ] **Read:** `getMyEntities(): Promise<MyEntity[]>`
- [ ] **Update:** `updateMyEntity(entity: MyEntity): Promise<void>`
- [ ] **Delete:** `deleteMyEntity(id: string): Promise<void>`
- [ ] **Helper:** `markMyEntityAsSynced(id: string): Promise<void>`
- [ ] **Cleanup:** `deleteSyncedMyEntities(): Promise<number>` (if needed)

---

## 3️⃣ Supabase Integration

### Database Schema

- [ ] Create Supabase migration in `supabase/migrations/`
- [ ] Add table with snake_case column names
- [ ] Add `user_id` column with foreign key to `auth.users`
- [ ] Add RLS policies for user isolation
- [ ] Add created_at/updated_at triggers

### `src/lib/supabase/data.ts`

- [ ] **Load function:** `loadMyEntitiesFromSupabase(): Promise<MyEntity[]>`

  - [ ] Get authenticated user
  - [ ] Query Supabase table with `.eq("user_id", user.id)`
  - [ ] Transform snake_case → camelCase
  - [ ] Handle errors gracefully
  - [ ] Return empty array on error (don't throw)

- [ ] **Save function:** `saveMyEntityToSupabase(entity: MyEntity): Promise<boolean>`
  - [ ] Get authenticated user
  - [ ] Transform camelCase → snake_case
  - [ ] Use `.upsert()` for create/update
  - [ ] Return boolean success
  - [ ] Log errors but don't throw

**Example:**

```typescript
export async function loadMyEntitiesFromSupabase(): Promise<MyEntity[]> {
  try {
    const supabase = createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      console.error("Not authenticated:", userError);
      return [];
    }

    const { data, error } = await supabase
      .from("my_entities")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("timestamp", { ascending: false });

    if (error) {
      console.error("Error loading entities:", error);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      // ... transform fields
      syncedToSupabase: true,
    }));
  } catch (error) {
    console.error("Failed to load entities:", error);
    return [];
  }
}
```

---

## 4️⃣ Sync Strategy

### `src/lib/sync/strategies.ts`

- [ ] Create sync strategy object: `myEntitySyncStrategy: SyncStrategy<MyEntity>`
- [ ] Set `dataType` identifier
- [ ] Set `destinations` array (`["supabase"]` or `["supabase", "sheets"]`)
- [ ] Set `priority` (1-10)
- [ ] Set `maxAttempts` and `retryDelays`

### Implement Methods

- [ ] **`syncToSupabase()`**

  - [ ] Handle "create", "update", "delete" operations
  - [ ] Call `getAuthenticatedUser()` for token refresh
  - [ ] Transform to Supabase schema
  - [ ] Call `.upsert()` or `.delete()`
  - [ ] Call `markMyEntityAsSynced(id)` callback
  - [ ] Return `SyncResult` with success/error

- [ ] **`validate()`**

  - [ ] Check required fields
  - [ ] Validate data types
  - [ ] Return validation result

- [ ] **`prepareForDestination()`** (optional)
  - [ ] Ensure ISO dates
  - [ ] Remove client-only fields
  - [ ] Transform as needed

### Export Strategy

- [ ] Add to `SYNC_STRATEGIES` object at bottom of file

**Example:**

```typescript
export const myEntitySyncStrategy: SyncStrategy<MyEntity> = {
  dataType: "myentity",
  destinations: ["supabase"],
  priority: 5,
  maxAttempts: 3,
  retryDelays: STANDARD_RETRY_DELAYS,

  async syncToSupabase(operation, data): Promise<SyncResult> {
    // Implementation
  },

  validate(data): ValidationResult {
    // Implementation
  },
};
```

---

## 5️⃣ App Initialization

### `src/app/(app)/app/page.tsx` - `initializeApp()`

- [ ] **Load from Supabase on online startup:**

  ```typescript
  if (navigator.onLine) {
    try {
      console.log("📥 Loading entities from Supabase...");
      const { loadMyEntitiesFromSupabase } = await import(
        "@/lib/supabase/data"
      );
      const supabaseEntities = await loadMyEntitiesFromSupabase();

      if (supabaseEntities.length > 0) {
        // Cache to IndexedDB
        const { saveMyEntity } = await import("@/lib/db");
        for (const entity of supabaseEntities) {
          await saveMyEntity(entity);
        }
        console.log("✅ Loaded", supabaseEntities.length, "entities");
      }
    } catch (error) {
      console.error("❌ Failed to load entities:", error);
    }
  }
  ```

- [ ] Place AFTER sales load, BEFORE settings load
- [ ] Use dynamic imports to avoid circular dependencies
- [ ] Handle offline gracefully

---

## 6️⃣ Auto-Sync on Network Return

### `src/app/(app)/app/page.tsx` - `handleOnline()`

- [ ] **Add auto-sync for offline changes:**

  ```typescript
  // Auto-sync unsynced entities
  try {
    const { syncUnsyncedMyEntities } = await import("@/lib/my-entities");
    const syncedCount = await syncUnsyncedMyEntities();
    if (syncedCount > 0) {
      console.log(`✅ ${syncedCount} offline entities synced`);
    }
  } catch (error) {
    console.error("Failed to sync offline entities:", error);
  }
  ```

- [ ] Create helper function in entity module if needed:
  ```typescript
  // src/lib/my-entities.ts
  export async function syncUnsyncedMyEntities(): Promise<number> {
    const { getMyEntities } = await import("./db");
    const all = await getMyEntities();
    const unsynced = all.filter((e) => !e.syncedToSupabase);

    let syncedCount = 0;
    for (const entity of unsynced) {
      try {
        await syncService.syncMyEntity(entity);
        syncedCount++;
      } catch (error) {
        console.error(`Failed to sync entity ${entity.id}:`, error);
      }
    }
    return syncedCount;
  }
  ```

---

## 7️⃣ Create/Update Operations

### Create Flow

- [ ] **Save to IndexedDB immediately**
- [ ] **Queue for sync via SyncManager**
- [ ] Handle sync errors gracefully (save succeeded even if sync fails)

**Example:**

```typescript
export async function createMyEntity(data: MyEntityData): Promise<MyEntity> {
  const entity: MyEntity = {
    id: `entity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    syncedToSupabase: false,
    ...data,
  };

  // Save locally
  await saveMyEntity(entity);

  // Queue for sync
  try {
    await syncService.syncMyEntity(entity);
    console.log("✅ Entity queued for sync");
  } catch (error) {
    console.error("❌ Failed to queue entity:", error);
    // Don't throw - entity is saved locally
  }

  return entity;
}
```

### Update Flow

- [ ] **Update IndexedDB**
- [ ] **Set `syncedToSupabase: false`** to trigger re-sync
- [ ] **Queue for sync again**
- [ ] **Update `updatedAt` timestamp**

**Example:**

```typescript
export async function updateMyEntity(entity: MyEntity): Promise<void> {
  const updated: MyEntity = {
    ...entity,
    updatedAt: new Date().toISOString(),
    syncedToSupabase: false, // Mark as unsynced
  };

  await db.put("my_entities", updated);

  // Re-queue for sync
  try {
    await syncService.syncMyEntity(updated);
    console.log("✅ Updated entity queued for re-sync");
  } catch (error) {
    console.error("❌ Failed to queue update:", error);
  }
}
```

---

## 8️⃣ UI Integration

### List/Display Component

- [ ] Load from IndexedDB (not Supabase directly)
- [ ] Use `getMyEntities()` helper
- [ ] Show sync status indicators if needed
- [ ] Handle empty state
- [ ] Refresh data periodically or on events

### Create/Edit Component

- [ ] Call create/update helper functions
- [ ] Show loading states during save
- [ ] Show success/error toasts
- [ ] Handle offline scenarios
- [ ] Validate input before saving

---

## 9️⃣ Testing Checklist

### Manual Testing

- [ ] **Online create:** Entity saves to IndexedDB and syncs to Supabase
- [ ] **Offline create:** Entity saves to IndexedDB, queued for later sync
- [ ] **Network return:** Offline entities auto-sync to Supabase
- [ ] **Multi-device:** Entity created on Device A appears on Device B after refresh
- [ ] **Edit online:** Changes save and re-sync to Supabase
- [ ] **Edit offline:** Changes save locally, sync on network return
- [ ] **App reinstall:** Entities reload from Supabase on first launch
- [ ] **Browser data clear:** Entities reload from Supabase

### Error Scenarios

- [ ] Sync fails (network error) → Entity retries with backoff
- [ ] Auth token expires → Re-authenticates and retries
- [ ] Validation fails → Shows error, doesn't save
- [ ] Supabase down → Saves locally, queues for later

---

## 🔟 Documentation

- [ ] Add entity to `DATA_FLOW_ARCHITECTURE.md`
- [ ] Document business rules and constraints
- [ ] Add examples to README if user-facing
- [ ] Update API documentation if needed
- [ ] Add migration notes if schema changes

---

## ✅ Final Checks

- [ ] All TypeScript compilation errors resolved
- [ ] No console errors in browser
- [ ] Build succeeds: `npm run build`
- [ ] Sync queue processes correctly (check browser console)
- [ ] RLS policies prevent cross-user access
- [ ] Offline mode works completely
- [ ] Multi-device scenario tested
- [ ] Data persists after app reload

---

## 🚨 Common Pitfalls to Avoid

1. **❌ Not loading from Supabase on init** → Data loss on device switch
2. **❌ Not re-syncing on edit** → Data divergence between devices
3. **❌ Not auto-syncing on network return** → Stale offline changes
4. **❌ Forgetting `syncedToSupabase` flag** → Items never marked as synced
5. **❌ Not handling auth errors** → Sync failures that never retry
6. **❌ Using localStorage instead of IndexedDB** → Storage quota issues
7. **❌ Missing RLS policies** → Security vulnerability
8. **❌ Not testing multi-device** → Critical bugs in production

---

## 📚 Reference Implementations

**✅ Complete implementations to copy from:**

- **Products** - Full queue-based sync with Sheets
- **Sales** - Queue-based sync with cleanup
- **Settings** - Direct Supabase save with cache
- **Close-outs** - ✅ NOW FIXED - Full Supabase sync

**🔍 See these files for examples:**

- `src/lib/db.ts` - IndexedDB patterns
- `src/lib/supabase/data.ts` - Supabase loaders
- `src/lib/sync/strategies.ts` - Sync strategies
- `src/app/(app)/app/page.tsx` - Init and auto-sync
- `src/lib/closeouts.ts` - Business logic helpers

---

**Last Updated:** November 19, 2025  
**Version:** 1.0 (Post close-outs audit)
