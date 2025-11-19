# Complete Sales Data Flow Analysis

**Date:** November 19, 2025  
**Scope:** All sales scenarios - loading, syncing, creation, close-outs, analytics

---

## 📊 ARCHITECTURE OVERVIEW

### Storage Layers

1. **IndexedDB** (Local Cache) - Immediate persistence, offline support
2. **Supabase** (Source of Truth) - Cloud database with sales + sale_items tables
3. **Google Sheets** (Backup/Analytics) - Append-only sales log

### Sync Pattern

```
Sale Created → IndexedDB (instant) → Sync Queue → Supabase (main + items) → Sheets
                    ↓                                      ↓
                  UI Update                        markSaleAsSynced()
```

### Key Files

- **`/src/app/(app)/app/page.tsx`** - Sale creation handler, initialization
- **`/src/lib/db.ts`** - IndexedDB operations, synced flag management
- **`/src/lib/supabase/data.ts`** - Supabase queries with JOIN for sale_items
- **`/src/lib/sync/strategies.ts`** - Sales sync strategy (NO debouncing)
- **`/src/components/POSInterface.tsx`** - Sale creation, inventory updates
- **`/src/components/CloseOutWizard.tsx`** - Session close-outs
- **`/src/lib/closeouts.ts`** - Sales aggregation logic

---

## 🔄 SCENARIO 1: APP INITIALIZATION (New User)

### Flow

```
initializeApp() called on mount
    ↓
IF navigator.onLine === true:
    ├─ TRY:
    │   ├─ supabaseSales = loadSalesFromSupabase()
    │   │   ├─ Query: SELECT * FROM sales
    │   │   │         LEFT JOIN sale_items
    │   │   │         WHERE user_id = {userId}
    │   │   │         ORDER BY timestamp DESC
    │   │   ├─ Transform to app format
    │   │   └─ Set synced: true on all loaded sales
    │   ├─ IF supabaseSales.length > 0:
    │   │   ├─ await saveSales(supabaseSales) // Cache to IndexedDB
    │   │   └─ console.log("✅ Loaded X sales from Supabase and cached")
    │   └─ ELSE:
    │       └─ (No sales - new user, nothing to cache)
    └─ CATCH error:
        └─ console.error("❌ Failed to load sales from Supabase")
ELSE (offline):
    └─ console.log("📴 Offline - sales will load from IndexedDB only")
```

### Data Transformation (Supabase → App)

```javascript
// Supabase schema:
{
  id: "sale-123",
  user_id: "uuid",
  timestamp: "2025-11-19T10:30:00Z",
  total: 45.00,
  actual_amount: 45.00,
  discount: 0,
  tip_amount: 5.00,
  payment_method: "Cash",
  is_hookup: false,
  synced: true,
  sale_items: [
    { product_id: "shirt", product_name: "T-Shirt", quantity: 2, price: 20, size: "L" }
  ]
}

// Transformed to app format:
{
  id: "sale-123",
  timestamp: "2025-11-19T10:30:00Z",
  items: [
    { productId: "shirt", productName: "T-Shirt", quantity: 2, price: 20, size: "L" }
  ],
  total: 45.00,
  actualAmount: 45.00,
  discount: undefined,
  tipAmount: 5.00,
  paymentMethod: "Cash",
  synced: true, // ✅ Set to true for Supabase-loaded sales
  isHookup: false
}
```

### Result for New User

- ✅ No sales loaded (empty Supabase)
- ✅ IndexedDB sales store empty
- ✅ Ready for first sale

---

## 🔄 SCENARIO 2: APP INITIALIZATION (Returning User, Online)

### Flow

```
initializeApp() called
    ↓
navigator.onLine === true
    ↓
supabaseSales = loadSalesFromSupabase()
    ├─ Queries sales table with LEFT JOIN to sale_items
    ├─ Gets ALL user's sales (e.g., 150 sales)
    ├─ Transforms each sale with nested items array
    └─ Sets synced: true on all
    ↓
await saveSales(supabaseSales)
    ├─ Opens IndexedDB transaction
    ├─ FOR EACH sale in supabaseSales:
    │   └─ tx.store.put(sale) // UPSERT (updates if exists)
    └─ Commits transaction
    ↓
console.log("✅ Loaded 150 sales from Supabase and cached to IndexedDB")
```

### ⚠️ **CRITICAL DIFFERENCE FROM PRODUCTS:**

**Products:**

```javascript
// saveProducts() CLEARS store first
await tx.store.clear(); // Remove all
await Promise.all(products.map((p) => tx.store.put(p))); // Then add all
```

**Sales:**

```javascript
// saveSales() does NOT clear store first
for (const sale of sales) {
  await tx.store.put(sale); // Just upsert each one
}
```

### 🐛 **POTENTIAL ISSUE #17: Sales Not Cleaned Up**

**Problem:** `saveSales()` only adds/updates sales, never removes them  
**Impact:** If a sale is deleted in Supabase (or on another device), it stays in IndexedDB forever  
**Contrast:** Products are fully replaced on each load (via `clear()`)

**Example Scenario:**

```
Device A: User has 100 sales in IndexedDB
Device A: User deletes 10 sales in Supabase (via DB admin or another app)
Device A: App restarts, loads from Supabase (90 sales)
Device A: saveSales() puts 90 sales into IndexedDB
Device A: IndexedDB still has 100 sales (10 deleted ones remain!) ❌
```

**Why This Happens:**

- `saveSales()` uses `put()` which only creates or updates
- No `clear()` call before saving
- No logic to detect and remove orphaned sales

---

## 🔄 SCENARIO 3: APP INITIALIZATION (Offline)

### Flow

```
navigator.onLine === false
    ↓
console.log("📴 Offline - sales will load from IndexedDB only")
    ↓
(No attempt to load from Supabase)
(Sales remain in IndexedDB from last sync)
```

### Result

- ✅ User can view cached sales
- ✅ Can create new sales (saved to IndexedDB with synced: false)
- ✅ New sales queued for sync when back online

---

## 🛒 SCENARIO 4: USER COMPLETES A SALE (POS Interface)

### Flow (POSInterface → handleCompleteSale)

```
User adds items to cart, clicks "Complete Sale"
    ↓
processCompleteSale() called
    ↓
STEP 1: Update inventory for each item
    FOR EACH cartItem in cart:
        ├─ Calculate new inventory quantity
        └─ await onUpdateProduct(product with new inventory)
            └─ (This triggers product sync - see Product Flow)
    ↓
STEP 2: Call handleCompleteSale()
    ↓
const sale: Sale = {
  id: `sale-${Date.now()}`, // Timestamp-based ID
  timestamp: new Date().toISOString(),
  items: items.map(item => ({
    productId: item.product.id,
    productName: item.product.name,
    quantity: item.quantity,
    price: item.product.price, // Base USD price
    size: item.size
  })),
  total: 45.00,
  actualAmount: 45.00,
  discount: undefined,
  tipAmount: 5.00,
  paymentMethod: "Cash",
  synced: false, // ✅ Always false for new sales
  isHookup: false
}
    ↓
await saveSale(sale)
    ├─ Opens IndexedDB
    ├─ db.put("sales", sale)
    └─ Sale saved locally instantly
    ↓
TRY:
    ├─ await syncService.syncSale(sale)
    │   ├─ Validates sale (has ID, items, total > 0)
    │   ├─ Creates queue item:
    │   │   {
    │   │     dataType: "sale",
    │   │     operation: "create",
    │   │     data: sale,
    │   │     destinations: ["supabase", "sheets"],
    │   │     status: "pending",
    │   │     priority: 8, // HIGH PRIORITY (higher than products)
    │   │     attempts: 0,
    │   │     maxAttempts: 3
    │   │   }
    │   ├─ Adds to sync queue
    │   └─ IF online: processQueue() called immediately
    └─ console.log("✅ Sale queued for sync")
CATCH error:
    └─ console.error("Failed to queue sale")
        └─ (Sale still saved locally)
    ↓
updateSyncStatus() called (updates UI badge)
```

### Sync Processing (Automatic, Background)

```
SyncManager.processQueue() picks up sale
    ↓
Priority 8 (sales processed before products which are priority 5-6)
    ↓
Strategy: salesSyncStrategy
    ↓
DESTINATION 1: Supabase
    ├─ Get authenticated user
    ├─ Prepare main sale data:
    │   {
    │     id: sale.id,
    │     user_id: user.id,
    │     timestamp: sale.timestamp,
    │     total: sale.total,
    │     actual_amount: sale.actualAmount,
    │     discount: sale.discount || 0,
    │     tip_amount: sale.tipAmount || 0,
    │     payment_method: sale.paymentMethod,
    │     is_hookup: sale.isHookup || false,
    │     synced: true // ✅ Set to true in Supabase
    │   }
    ├─ await supabase.from("sales").upsert(saleData).select()
    ├─ IF success:
    │   ├─ Delete existing sale_items for this sale
    │   ├─ Insert new sale_items:
    │   │   [{
    │   │     sale_id: sale.id,
    │   │     product_id: item.productId,
    │   │     product_name: item.productName,
    │   │     quantity: item.quantity,
    │   │     price: item.price,
    │   │     size: item.size
    │   │   }, ...]
    │   ├─ console.log("✅ Sale synced to Supabase")
    │   ├─ await markSaleAsSynced(sale.id)
    │   │   ├─ Load sale from IndexedDB
    │   │   ├─ Set sale.synced = true
    │   │   └─ Save back to IndexedDB
    │   └─ Return { destination: "supabase", success: true }
    └─ ELSE:
        └─ Return { destination: "supabase", success: false }
    ↓
DESTINATION 2: Google Sheets (NO DEBOUNCING)
    ├─ salesSheetId = localStorage.getItem("salesSheetId")
    ├─ POST /api/sheets/sync-sales
    │   {
    │     sales: [sale], // Single sale
    │     salesSheetId: "..."
    │   }
    ├─ API appends sale to Sales sheet (does NOT clear/rewrite)
    ├─ IF success:
    │   └─ console.log("✅ Sale synced to Sheets")
    └─ Return { destination: "sheets", success: true }
    ↓
IF both destinations succeeded:
    ├─ Queue item status = "completed"
    ├─ Remove from queue
    └─ updateSyncStatus() shows "synced"
ELSE:
    ├─ Retry with exponential backoff
    └─ OR mark as failed after 3 attempts
```

### Data State Timeline

**T+0ms** (User clicks Complete Sale):

```javascript
IndexedDB: [{ id: "sale-123", synced: false, ... }]
Queue: [{ dataType: "sale", operation: "create", status: "pending", priority: 8 }]
UI: "1 pending sale"
```

**T+50ms** (Supabase sync completes):

```javascript
IndexedDB: [{ id: "sale-123", synced: true, ... }] // ✅ Updated by callback
Supabase sales: [{ id: "sale-123", user_id: "...", synced: true, ... }]
Supabase sale_items: [{ sale_id: "sale-123", product_id: "shirt", ... }]
Queue: [{ status: "processing" }] // Still syncing to Sheets
```

**T+600ms** (Sheets sync completes - NO debounce):

```javascript
Sheets: New row appended to Sales sheet
Queue: [{ status: "completed" }] // Then removed
UI: "0 pending sales" ✅
```

### ⚠️ **KEY DIFFERENCE FROM PRODUCTS:**

**Products:**

- ✅ Debounced Sheets sync (2-second wait)
- ✅ Multiple updates = 1 API call
- ✅ Entire product list synced

**Sales:**

- ❌ NO debouncing
- ❌ Each sale = separate API call
- ❌ Only single sale sent

**Why This Works:**

- Sales are append-only (rarely updated after creation)
- Sales sync happens less frequently than product inventory updates
- Sheets API appends rows (fast operation)

---

## 🔄 SCENARIO 5: MULTI-SALE SESSION (Busy Night)

### Example: 20 Sales in 1 Hour

```
Sale 1 created → Queue (priority 8) → Sync to Supabase → Sync to Sheets
Sale 2 created → Queue (priority 8) → Sync to Supabase → Sync to Sheets
Sale 3 created → Queue (priority 8) → Sync to Supabase → Sync to Sheets
...
Sale 20 created → Queue (priority 8) → Sync to Supabase → Sync to Sheets
```

### Sync Behavior

- **Queue Processing:** Sales processed in order (FIFO with priority)
- **Concurrent Syncs:** Max 3 concurrent (configurable)
- **Sheets API Calls:** 20 separate API calls (one per sale)
- **No Batching:** Each sale synced individually

### 🟡 **PERFORMANCE CONSIDERATION #18: No Batching for Sales**

**Current:** 20 sales = 20 Sheets API calls  
**Alternative:** Batch sales every 30 seconds or every 5 sales  
**Trade-off:**

- Current approach: Real-time data in Sheets (good for live dashboards)
- Batched approach: Fewer API calls (better for quota limits)

**Not necessarily a bug, but worth noting for scale**

---

## 📊 SCENARIO 6: CLOSE-OUT SESSION (End of Night)

### Flow (CloseOutWizard → createCloseOut)

```
User clicks "Close Out Session" in Settings
    ↓
loadSessionData() called
    ├─ getCurrentSessionStats() queries IndexedDB
    ├─ Aggregates ALL sales with synced: true
    ├─ Calculates:
    │   ├─ salesCount: number of sales
    │   ├─ totalRevenue: sum of all totals
    │   ├─ actualRevenue: sum of all actualAmounts
    │   ├─ discountsGiven: sum of all discounts
    │   ├─ tipsReceived: sum of all tipAmounts
    │   ├─ paymentBreakdown: group by paymentMethod
    │   ├─ productsSold: aggregate items by product
    │   ├─ expectedCash: cash payments total
    │   └─ saleIds: array of all sale IDs
    └─ Returns session data
    ↓
User fills in session details (name, location, date, notes, actual cash)
    ↓
createCloseOut() called
    ├─ Creates CloseOut object with aggregated data
    ├─ Saves to IndexedDB with syncedToSupabase: false
    ├─ Queues for sync (priority 10 - HIGHEST)
    └─ Returns closeOut
    ↓
Close-out synced to Supabase (close_outs table)
    ↓
markCloseOutAsSynced() sets syncedToSupabase: true
```

### ⚠️ **CRITICAL DEPENDENCY:** Close-Outs Require Synced Sales

**Logic in getCurrentSessionStats():**

```javascript
// Only includes sales with synced: true
const syncedSales = allSales.filter((sale) => sale.synced);
```

**Why:** Close-outs represent a "finalized" session snapshot. Only synced sales are considered "safe" to include.

**Implication:** If sales are stuck in queue (not synced), they won't be in close-out!

---

## 🗑️ SCENARIO 7: CLEANUP - Delete Synced Sales

### Flow (User action or automatic cleanup)

```
deleteSyncedSales() called
    ├─ Load ALL sales from IndexedDB
    ├─ Load ALL close-outs from IndexedDB
    ├─ Build set of closedOutSaleIds from all close-outs
    ├─ Filter sales to delete:
    │   └─ sale.synced === true AND sale.id in closedOutSaleIds
    ├─ Delete each matching sale from IndexedDB
    └─ console.log("🗑️ Deleted X closed-out sales, keeping Y synced sales")
```

### Logic Explained

**Why keep some synced sales?**

- Synced sales NOT in a close-out might be used for future close-outs
- Only delete sales that are:
  1. Synced to Supabase (safe to delete locally)
  2. Already included in a close-out (recorded in session summary)

**This prevents data loss**

---

## 🔄 SCENARIO 8: OFFLINE → ONLINE TRANSITION

### Flow

```
User offline, creates 5 sales
    ↓
Sales saved to IndexedDB with synced: false
Queue items created with status: "pending"
(Queue held while offline)
    ↓
Queue: [
  { dataType: "sale", operation: "create", status: "pending", ... },
  { dataType: "sale", operation: "create", status: "pending", ... },
  { dataType: "sale", operation: "create", status: "pending", ... },
  { dataType: "sale", operation: "create", status: "pending", ... },
  { dataType: "sale", operation: "create", status: "pending", ... }
]
    ↓
User goes back online
    ↓
window "online" event fires
    ├─ SyncManager.isOnline = true
    └─ processQueue() called automatically
    ↓
Sales processed in order (priority 8):
    ├─ Sale 1: Sync to Supabase → markSaleAsSynced() → Sync to Sheets
    ├─ Sale 2: Sync to Supabase → markSaleAsSynced() → Sync to Sheets
    ├─ Sale 3: Sync to Supabase → markSaleAsSynced() → Sync to Sheets
    ├─ Sale 4: Sync to Supabase → markSaleAsSynced() → Sync to Sheets
    └─ Sale 5: Sync to Supabase → markSaleAsSynced() → Sync to Sheets
    ↓
All sales synced, queue cleared
updateSyncStatus() shows "0 pending sales" ✅
```

---

## 🔄 SCENARIO 9: SYNC STATUS TRACKING

### updateSyncStatus() Logic

```javascript
const updateSyncStatus = async () => {
  const unsyncedSales = await getUnsyncedSales(); // Filter: !sale.synced
  const allSales = await getSales();

  const queueStats = syncService.getStats();

  console.log("🔍 Sync Status Check:", {
    unsyncedSalesInDB: unsyncedSales.length,
    totalSalesInDB: allSales.length,
    queueSize: queueStats.queueSize,
    isOnline: queueStats.isOnline,
    isProcessing: queueStats.isProcessing,
  });

  setSyncStatus((prev) => ({
    ...prev,
    pendingSales: unsyncedSales.length,
    totalSales: allSales.length,
  }));
};
```

### What UI Shows

- **"X pending sales"** = Count of sales with `synced: false` in IndexedDB
- **Updates after:**
  - Sale created
  - Sync completes (markSaleAsSynced callback)
  - App initialization

---

## 🐛 ISSUES FOUND IN SALES LOGIC

### 🔴 **ISSUE #17: Sales Not Cleaned Up on Load (MEDIUM)**

**Location:** `src/lib/db.ts` - `saveSales()`  
**Problem:** Unlike products, sales are not cleared before loading from Supabase  
**Impact:** Deleted sales (from Supabase or other device) remain in IndexedDB forever

**Current Code:**

```javascript
export async function saveSales(sales: Sale[]) {
  const db = await getDB();
  const tx = db.transaction("sales", "readwrite");
  for (const sale of sales) {
    await tx.store.put(sale); // Only upserts, never removes
  }
  await tx.done;
}
```

**Fix Option 1: Clear Before Save (Like Products)**

```javascript
export async function saveSales(sales: Sale[]) {
  const db = await getDB();
  const tx = db.transaction("sales", "readwrite");
  await tx.store.clear(); // ← Add this
  for (const sale of sales) {
    await tx.store.put(sale);
  }
  await tx.done;
}
```

**Fix Option 2: Smart Cleanup (Preserve Unsynced)**

```javascript
export async function saveSales(sales: Sale[]) {
  const db = await getDB();

  // Get current unsynced sales (preserve these)
  const currentSales = await db.getAll("sales");
  const unsyncedSales = currentSales.filter((s) => !s.synced);

  const tx = db.transaction("sales", "readwrite");
  await tx.store.clear(); // Clear all

  // Put back unsynced sales + new sales from Supabase
  for (const sale of [...unsyncedSales, ...sales]) {
    await tx.store.put(sale);
  }
  await tx.done;
}
```

**Recommendation:** Use Fix Option 2 to preserve pending sales

---

### 🟡 **ISSUE #18: No Batching for Sheets Sync (LOW)**

**Location:** `src/lib/sync/strategies.ts` - `salesSyncStrategy.syncToSheets()`  
**Problem:** Each sale syncs to Sheets individually (no debouncing like products)  
**Impact:** High volume = many API calls (quota limits, slower sync)

**Current:** 50 sales = 50 Sheets API calls  
**Alternative:** Batch every 5 sales or every 10 seconds

**Why This Might Be Intentional:**

- Sales are append-only (rarely updated)
- Real-time data visibility in Sheets
- Less frequent than product updates

**Recommendation:** Monitor API usage, add batching if needed for scale

---

### ✅ **WORKING CORRECTLY:**

1. **Sale Creation** - Instant local save, queued for sync
2. **High Priority** - Sales sync before products (priority 8 vs 5)
3. **Callback System** - `markSaleAsSynced()` updates IndexedDB after Supabase
4. **Offline Support** - Sales saved locally, synced when online
5. **Close-Out Logic** - Only includes synced sales (safe)
6. **Sale Items** - Properly stored in separate table with JOIN on load
7. **Validation** - Checks for ID, items, total > 0
8. **Retry Logic** - 3 attempts with exponential backoff

---

## 📊 COMPARISON: SALES vs PRODUCTS

| Feature              | Products                     | Sales                      |
| -------------------- | ---------------------------- | -------------------------- |
| **Load Strategy**    | Clear + Replace all          | Upsert only (⚠️ BUG #17)   |
| **Sync Priority**    | 5-6 (medium)                 | 8 (high) ✅                |
| **Sheets Sync**      | Debounced (2s), all products | Immediate, single sale     |
| **Sheets Operation** | Clear + Rewrite              | Append row                 |
| **Update Frequency** | High (inventory changes)     | Low (rarely updated)       |
| **Callback**         | markProductAsSynced() ✅     | markSaleAsSynced() ✅      |
| **Validation**       | ID, name, price >= 0         | ID, items, total > 0 ✅    |
| **Offline Create**   | Supported ✅                 | Supported ✅               |
| **Offline Update**   | Supported ✅                 | Rare (sales rarely edited) |
| **Cleanup**          | Full replacement on load ✅  | Manual (deleteSyncedSales) |

---

## 🎯 SALES DATA FLOW SUMMARY

### ✅ **STRENGTHS:**

1. **High Priority Queue** - Sales sync before products (correct priority)
2. **Dual Writes** - Supabase (main + items) + Sheets (append log)
3. **Callback System** - IndexedDB updated after successful sync
4. **Offline First** - Full create/view support offline
5. **Close-Out Integration** - Only uses synced sales (safe)
6. **Proper Validation** - Ensures data integrity

### ⚠️ **ISSUES:**

1. **ISSUE #17 (MEDIUM):** Sales not cleaned up on load - deleted sales persist in IndexedDB
2. **ISSUE #18 (LOW):** No batching for Sheets sync - potential quota issues at scale

### 🔧 **RECOMMENDATIONS:**

**Priority 1: Fix ISSUE #17**

- Implement smart cleanup in `saveSales()` to remove deleted sales
- Preserve unsynced local sales during cleanup
- Test with multi-device scenario

**Priority 2: Monitor ISSUE #18**

- Track Sheets API usage
- If quota issues arise, add batching (every 5-10 sales or 10-30 seconds)
- Balance real-time visibility vs API efficiency

**Priority 3: Consider Enhancements**

- Add sale edit/update functionality (currently only create)
- Implement soft delete (mark as deleted vs hard delete)
- Add conflict resolution for concurrent edits

---

## 🔍 DETAILED TRACING EXAMPLE: Complete Sale While Online

```
[T+0ms] User Action
  └─ POSInterface: User clicks "Complete Sale"
      └─ Cart: [2x T-Shirt (L), 1x Vinyl]

[T+5ms] Inventory Updates (Products)
  └─ Update T-Shirt inventory: L: 5 → 3
  └─ Update Vinyl inventory: default: 10 → 9
  └─ Both products queued for sync (priority 5-6)

[T+10ms] Sale Creation
  └─ handleCompleteSale() creates sale object
      └─ id: "sale-1732024800123"
      └─ items: [T-Shirt x2, Vinyl x1]
      └─ total: 65.00
      └─ synced: false

[T+15ms] IndexedDB Write
  └─ saveSale(sale)
      └─ db.put("sales", sale)
      └─ ✅ Sale in IndexedDB

[T+20ms] UI Update
  └─ setSyncStatus({ pendingSales: 1 })
      └─ ✅ User sees "1 pending sale" badge

[T+25ms] Queue Creation
  └─ syncService.syncSale(sale)
      └─ Validate: ✅ Has ID, items, total > 0
      └─ Queue item created:
          └─ dataType: "sale"
          └─ operation: "create"
          └─ priority: 8 (HIGH - processed first)
          └─ destinations: ["supabase", "sheets"]

[T+30ms] Queue Processing Starts
  └─ SyncManager picks sale (priority 8 > products priority 5)
      └─ Status: "processing"

[T+50ms] Supabase Sync
  └─ salesSyncStrategy.syncToSupabase()
      └─ Insert main sale record
      └─ Delete old sale_items (if any)
      └─ Insert 2 sale_items
      └─ ✅ Supabase updated

[T+60ms] Callback
  └─ markSaleAsSynced("sale-1732024800123")
      └─ Load sale from IndexedDB
      └─ Set sale.synced = true
      └─ Save back to IndexedDB
      └─ ✅ IndexedDB sale.synced = true

[T+65ms] UI Update
  └─ updateSyncStatus() called
      └─ getUnsyncedSales() returns 0
      └─ ✅ "0 pending sales" badge

[T+600ms] Sheets Sync (NO debounce)
  └─ salesSyncStrategy.syncToSheets()
      └─ POST /api/sheets/sync-sales
      └─ Append row to Sales sheet
      └─ ✅ Google Sheets updated

[T+650ms] Queue Complete
  └─ Queue item status: "completed"
      └─ Removed from queue
      └─ ✅ All syncs complete

[T+2000ms] Product Sheets Sync (debounced)
  └─ Products sync to Sheets after 2s debounce
      └─ All products synced in one API call
```

---

**End of Sales Analysis** - All sales data flows documented and issues identified.
