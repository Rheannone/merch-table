# Sync Architecture Bugs - Complete Analysis

**Date:** November 19, 2025  
**Analysis:** Complete data flow trace for Products, Sales, Settings, Close-outs

---

## CRITICAL BUGS FOUND

### **BUG #1-3: Products Missing Sync Tracking**
- **File:** `/src/types/index.ts`
- **Line:** Product interface (line 1)
- **Issue:** Product interface has NO `synced` flag
- **Impact:** Can't track if products synced to Supabase
- **Fix:** Add `synced?: boolean` to Product interface

### **BUG #4: pendingProductSync Never Cleared**
- **File:** `/src/app/(app)/app/page.tsx`
- **Line:** 607
- **Issue:** `setSyncStatus(...pendingProductSync: true)` set but never cleared
- **Impact:** UI always shows "products pending sync"
- **Fix:** Clear flag after successful sync OR remove flag entirely and use queue stats

### **BUG #5: saveProducts Doesn't Clear First**
- **File:** `/src/lib/db.ts`
- **Line:** 73-78
- **Issue:** `saveProducts()` does `put()` for each product but doesn't clear store first
- **Impact:** Deleted products from Supabase stay in IndexedDB
- **Fix:** Clear products store before putting new ones

### **BUG #6: Image Field Mismatch**
- **File:** `/src/lib/supabase/data.ts`
- **Line:** 38
- **Issue:** Maps to `image:` but Product interface has `imageUrl`
- **Impact:** Product images loaded from Supabase won't display
- **Fix:** Change `image: row.image_url` to `imageUrl: row.image_url`

### **BUG #7-9: Sales Synced But IndexedDB Never Updated**
- **File:** `/src/lib/sync/strategies.ts` AND sync completion
- **Line:** 58 (strategy), processItem in SyncManager
- **Issue:** Sale synced to Supabase with `synced: true`, but IndexedDB sale stays `synced: false`
- **Impact:** User sees "1 pending sale" forever even after successful sync
- **Fix:** Add callback after successful sync to update IndexedDB sale with `synced: true`

### **BUG #10: Sales Never Loaded from Supabase**
- **File:** `/src/app/(app)/app/page.tsx`
- **Line:** initializeApp() function
- **Issue:** Sales only loaded from IndexedDB, never from Supabase on app init
- **Impact:** If IndexedDB cleared, sales lost (unless in close-out)
- **Fix:** Load sales from Supabase on init (like products)

### **BUG #11: Settings Not Cached on Save**
- **File:** `/src/components/Settings.tsx`
- **Line:** ~451 (saveSettings function)
- **Issue:** Settings saved to Supabase but not cached to IndexedDB immediately
- **Impact:** If offline immediately after save, settings revert
- **Fix:** Call `saveSettings()` to IndexedDB after Supabase save succeeds

### **BUG #12: CloseOut syncedToSupabase Never Updated**
- **File:** Close-out sync completion
- **Issue:** Same as sales - synced to Supabase but IndexedDB not updated
- **Impact:** Unsynced close-outs tracked incorrectly
- **Fix:** Update IndexedDB after successful sync with `syncedToSupabase: true`

---

## ROOT CAUSE ANALYSIS

**The fundamental architectural problem:**

The sync queue successfully syncs data to Supabase, but there's **NO CALLBACK** to update the local IndexedDB after sync completes. The queue marks items as "completed" in its internal queue, but the actual data in IndexedDB is never updated to reflect the sync status.

**Current Flow:**
1. User creates data → Save to IndexedDB with `synced: false`
2. Queue data for sync
3. Sync succeeds → Supabase updated with `synced: true`
4. ❌ IndexedDB never updated
5. UI checks IndexedDB → still shows as unsynced

**Required Solution:**
- Add sync completion callback system
- When sync succeeds, update IndexedDB entity with synced flag
- Update UI sync status to reflect actual queue state, not IndexedDB state

---

## DETAILED DATA FLOWS

### PRODUCTS Flow
1. **Create:** `handleAddProduct()` → `addProductToDB()` → IndexedDB
2. **Queue:** `syncService.syncProduct()` → priority 5
3. **Sync:** `productsSyncStrategy.syncToSupabase()` → upsert to Supabase
4. **Complete:** Queue item marked "completed" ❌ **IndexedDB never updated**
5. **Load:** Supabase → saveProducts() **overwrites** IndexedDB (doesn't clear first)

### SALES Flow
1. **Create:** `handleCompleteSale()` → `saveSale()` → IndexedDB with `synced: false`
2. **Queue:** `syncService.syncSale()` → priority 8
3. **Sync:** `salesSyncStrategy.syncToSupabase()` → Supabase gets `synced: true`
4. **Complete:** Queue item marked "completed" ❌ **IndexedDB never updated**
5. **Status:** `updateSyncStatus()` → checks IndexedDB `synced: false` → always shows pending
6. **Load:** ❌ **Sales never loaded from Supabase**

### SETTINGS Flow
1. **Save:** `saveSettingsToSupabase()` → Direct save to Supabase
2. **Queue:** `syncService.syncSettings()` → Also queue (redundant?)
3. **Cache:** ❌ **Not cached to IndexedDB on save**
4. **Load:** `loadSettingsFromSupabase()` → Cache to IndexedDB ✅

### CLOSE-OUTS Flow
1. **Create:** `createCloseOut()` → `saveCloseOut()` → IndexedDB with `syncedToSupabase: false`
2. **Queue:** `syncService.syncCloseOut()` → priority 10 (highest)
3. **Sync:** `closeOutsSyncStrategy.syncToSupabase()` → upsert to Supabase
4. **Complete:** Queue item marked "completed" ❌ **IndexedDB never updated**

---

## FIX PLAN

### Phase 1: Add Sync Completion Callbacks
1. Add `onSyncComplete` callback to SyncManager
2. Update IndexedDB entities after successful sync
3. Remove redundant `pendingProductSync` flag

### Phase 2: Fix Data Loading
1. Fix `image` vs `imageUrl` mismatch
2. Clear products store before saving from Supabase
3. Load sales from Supabase on init
4. Cache settings to IndexedDB on save

### Phase 3: Add Missing Fields
1. Add `synced` flag to Product interface
2. Update product sync to set synced flag

### Phase 4: Update Sync Status Logic
1. Change `updateSyncStatus()` to use queue stats instead of IndexedDB flags
2. Remove dependency on `synced` flags for UI display

---

## TESTING CHECKLIST

After fixes:
- [ ] Create product → Verify syncs to Supabase
- [ ] Reload app → Verify product loads from Supabase
- [ ] Delete product in Supabase → Reload → Verify removed from IndexedDB
- [ ] Create sale → Verify sync status clears after sync completes
- [ ] Go offline → Create sale → Go online → Verify syncs
- [ ] Update settings → Verify cached to IndexedDB immediately
- [ ] Create close-out → Verify syncs and flag updates
- [ ] Clear IndexedDB → Reload → Verify all data loads from Supabase

