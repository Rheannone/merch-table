# Sync Architecture Audit

## Current State Analysis

### 🔴 CRITICAL ISSUES

#### 1. **Dual Sync Systems Running in Parallel**

- **Old System**: Direct API calls to `/api/sheets/*` endpoints
- **New System**: `syncService` with queue-based sync via `SyncManager`
- **Problem**: Both systems are active, causing confusion and duplicate sync attempts

#### 2. **Sales Sync is Broken**

**Current Flow:**

```
Sale Created → saveSale(IndexedDB) → syncService.syncSale() → Queue for Supabase
                                                             ↓
                                      BUT THEN handleCompleteSale also calls...
                                                             ↓
                     Old syncSales() → /api/sheets/sync-sales → Google Sheets
```

**Issues:**

- Sale goes to Supabase via new sync service ✅
- Sale SHOULD go to Sheets via new sync service ❌
- Instead, old `syncSales()` function manually calls `/api/sheets/sync-sales` ❌
- This bypasses the queue system entirely

#### 3. **Products Have NO Sync**

**Current Flow:**

```
Product Added → addProductToDB(IndexedDB) → Nothing!
```

**Issues:**

- Products are saved to IndexedDB only
- `syncService.syncProduct()` is never called
- Products don't sync to Supabase
- Products don't sync to Sheets
- The code even has a TODO comment: "// TODO: Replace with new sync service"

#### 4. **Settings Don't Sync to Supabase**

**Current Flow:**

```
Settings Changed → Direct call to /api/sheets/settings/save → Google Sheets only
```

**Issues:**

- Settings go straight to Google Sheets
- No IndexedDB fallback if offline
- No Supabase sync (settings aren't in Supabase schema yet)

#### 5. **Load Order is Backwards**

**Current Flow:**

```
App Init → Try Google Sheets first → Fall back to IndexedDB → Fall back to defaults
```

**Should Be:**

```
App Init → Try Supabase first → Fall back to IndexedDB if offline → Sync to Sheets in background
```

#### 6. **Close-outs Were Missing Sync** (JUST FIXED)

- Close-outs were saving to IndexedDB only
- Fixed by adding `syncService.syncCloseOut()` call

---

## Desired Architecture

### **The Golden Rule**

```
Write: IndexedDB → Supabase → Google Sheets (sales/products/emails only)
Read:  Supabase → IndexedDB fallback if offline
```

### **Priority 1: User Actions (Write)**

```
User Action
    ↓
1. Save to IndexedDB immediately (offline support)
    ↓
2. Queue for sync via syncService
    ↓
3. SyncManager processes queue:
    ├─ Send to Supabase (all data types)
    └─ Send to Sheets (sales, products, email signups only)
```

### **Priority 2: Data Loading (Read)**

```
App Load / Refresh
    ↓
1. Check if online
    ├─ Yes → Fetch from Supabase
    │        ├─ Success → Save to IndexedDB cache
    │        └─ Failure → Fall back to IndexedDB
    └─ No  → Load from IndexedDB
              Show offline banner
```

---

## Required Changes

### **Phase 1: Remove Dual Sync Systems**

#### A. Sales

- ❌ **Remove**: `syncSales()` function in `app/page.tsx`
- ❌ **Remove**: Manual `/api/sheets/sync-sales` calls
- ✅ **Keep**: `syncService.syncSale()` in `handleCompleteSale`
- ✅ **Verify**: `salesSyncStrategy` syncs to both Supabase AND Sheets

#### B. Products

- ❌ **Remove**: All `/api/sheets/sync-products` direct calls
- ✅ **Add**: `syncService.syncProduct()` after `addProductToDB()`
- ✅ **Add**: `syncService.updateProduct()` after product edits
- ✅ **Add**: `syncService.deleteProduct()` after product deletion
- ✅ **Verify**: `productsSyncStrategy` syncs to both Supabase AND Sheets

#### C. Settings

- 🤔 **Decision Needed**: Should settings go to Supabase?
  - If yes: Add `settings` table to Supabase schema
  - If no: Keep current Sheets-only approach (but add IndexedDB cache)

---

### **Phase 2: Fix Load Order**

#### A. Products

**Current** (app/page.tsx lines 400-500):

```typescript
// Try Google Sheets first
if (storedProductsSheetId) {
  const response = await fetch("/api/sheets/load-products", ...);
  // ...
}
// Fall back to IndexedDB
if (loadedProducts.length === 0) {
  loadedProducts = await getProducts();
}
```

**Should Be**:

```typescript
// Check online status
if (navigator.onLine) {
  try {
    // Try Supabase first
    const products = await loadProductsFromSupabase();
    if (products.length > 0) {
      await saveProducts(products); // Cache in IndexedDB
      loadedProducts = products;
    }
  } catch (error) {
    // Fall back to IndexedDB
    loadedProducts = await getProducts();
  }
} else {
  // Offline - load from IndexedDB
  loadedProducts = await getProducts();
}
```

#### B. Sales

- Similar pattern: Supabase first → IndexedDB fallback
- Google Sheets should only be a backup export, not primary data source

#### C. Close-outs

- Load from Supabase → IndexedDB fallback
- Currently only loads from IndexedDB

---

### **Phase 3: Add Missing Supabase Loaders**

Create new functions in a new file: `src/lib/supabase/data.ts`

```typescript
export async function loadProductsFromSupabase(): Promise<Product[]>;
export async function loadSalesFromSupabase(): Promise<Sale[]>;
export async function loadCloseOutsFromSupabase(): Promise<CloseOut[]>;
```

---

### **Phase 4: Offline Detection**

**Current**:

- Has `<OfflineIndicator />` component
- Checks `navigator.onLine`

**Missing**:

- Sync queue should pause when offline
- Should retry when back online
- Need visual indicator when queued items waiting

**Add**:

```typescript
// In SyncManager
private isOnline = navigator.onLine;

constructor() {
  window.addEventListener('online', () => {
    this.isOnline = true;
    this.processQueue(); // Resume processing
  });

  window.addEventListener('offline', () => {
    this.isOnline = false;
  });
}
```

---

## Data Flow Summary

### **Sales** (Working mostly, needs cleanup)

```
✅ Create → IndexedDB
✅ Create → syncService.syncSale() → Queue
✅ Queue → Supabase (via salesSyncStrategy)
✅ Queue → Sheets (via salesSyncStrategy)
❌ DUPLICATE: Old syncSales() also tries to sync to Sheets
```

### **Products** (Broken)

```
✅ Create → IndexedDB
❌ No syncService call
❌ Not syncing to Supabase
❌ Not syncing to Sheets
```

### **Close-outs** (Just Fixed)

```
✅ Create → IndexedDB
✅ Create → syncService.syncCloseOut() → Queue
✅ Queue → Supabase (via closeOutsSyncStrategy)
❌ Doesn't sync to Sheets (by design - not needed)
```

### **Settings** (No sync service)

```
❌ Direct to /api/sheets/settings/save
❌ No IndexedDB cache
❌ No Supabase sync
❌ No offline support
```

### **Email Signups** (Unknown)

```
? Need to audit email signup flow
```

---

## Questions for You

1. **Settings**: Should settings be in Supabase? Or keep them Sheets-only?

   - Pros of Supabase: Offline support, faster loading, consistent architecture
   - Cons: Need to add schema, migration

2. **Google Sheets Role**: Should Sheets be:

   - A. Primary backup export only (recommended)
   - B. Equal sync destination with Supabase

3. **Old Data**: Do you want to:

   - A. Migrate existing Sheets data to Supabase on first load
   - B. Keep Sheets as-is and start fresh with Supabase
   - C. Build a manual "Import from Sheets" button

4. **Priority**: What's most urgent?
   - A. Fix products sync (broken)
   - B. Clean up sales dual-sync (messy)
   - C. Fix load order (backwards)
   - D. All of the above in that order

---

## Recommended Action Plan

### **Immediate (Do Now)**

1. ✅ Close-outs sync - DONE
2. 🔴 **Fix products sync** - Add `syncService.syncProduct()` calls
3. 🔴 **Remove duplicate sales sync** - Delete old `syncSales()` function

### **Short Term (This Week)**

4. Fix load order - Supabase first, not Sheets
5. Add Supabase data loaders
6. Test full offline → online flow

### **Medium Term (Next Week)**

7. Decide on settings architecture
8. Add data migration from Sheets to Supabase
9. Add visual sync queue indicator
10. Comprehensive sync testing

---

## Files That Need Changes

### High Priority

- ✅ `src/lib/closeouts.ts` - DONE, now syncs
- 🔴 `src/app/(app)/app/page.tsx` - Remove old sync, add product sync calls
- 🔴 `src/components/ProductManager.tsx` - Add sync calls on CRUD
- 🔴 `src/lib/sync/SyncManager.ts` - Add offline detection

### Medium Priority

- `src/lib/supabase/data.ts` - CREATE NEW - Supabase data loaders
- `src/app/(app)/app/page.tsx` - Change load order in initializeApp()
- `src/components/Settings.tsx` - Add IndexedDB cache

### Low Priority

- Email signup flow audit
- Migration utilities
- Comprehensive testing suite
