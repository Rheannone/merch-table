# Data Flow Architecture

**Tour Manager / Road Dog POS System**

This document describes the complete data flow patterns for all entities in the system.

---

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                           │
│  (React Components - POSInterface, ProductManager, Settings)    │
└───────────────────┬─────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌──────────────┐        ┌──────────────┐
│  Business    │        │   Sync       │
│  Logic       │───────▶│   Manager    │
│  (lib/*.ts)  │        │  (Queue)     │
└──────┬───────┘        └──────┬───────┘
       │                       │
       ▼                       ▼
┌──────────────┐        ┌──────────────┐
│  IndexedDB   │        │  Supabase    │
│  (Local)     │◀───────│  (Cloud)     │
└──────────────┘        └──────┬───────┘
                               │
                               ▼
                        ┌──────────────┐
                        │ Google       │
                        │ Sheets       │
                        │ (Backup)     │
                        └──────────────┘
```

### Storage Layers

1. **IndexedDB** - Local browser storage, offline-first cache
2. **Supabase** - Cloud PostgreSQL database, source of truth
3. **Google Sheets** - Optional backup/export destination

---

## 📊 Entity Comparison Matrix

| Entity            | IndexedDB | Supabase   | Sheets    | Sync Pattern | Priority |
| ----------------- | --------- | ---------- | --------- | ------------ | -------- |
| **Products**      | ✅ Cache  | ✅ Primary | ✅ Backup | Queue-based  | 5-6      |
| **Sales**         | ✅ Cache  | ✅ Primary | ✅ Backup | Queue-based  | 8        |
| **Close-outs**    | ✅ Cache  | ✅ Primary | ❌        | Queue-based  | 10       |
| **Settings**      | ✅ Cache  | ✅ Primary | ❌        | Direct save  | 9        |
| **Email Signups** | ❌        | ❌         | ✅ Only   | Direct save  | N/A      |

---

## 🔄 Complete Data Flows

### 1. PRODUCTS

#### Load Flow

```
App Init (Online)
  ↓
loadProductsFromSupabase()
  ├─ Query products table filtered by user_id
  ├─ Transform snake_case → camelCase
  └─ Mark as synced: true
  ↓
saveProducts() → IndexedDB cache
  ↓
setProducts() → React state
  ↓
UI displays products
```

```
App Init (Offline)
  ↓
getProducts() → IndexedDB only
  ↓
setProducts() → React state
  ↓
UI displays cached products
```

#### Create Flow

```
User adds product
  ↓
Create Product object {synced: false}
  ↓
addProduct() → Save to IndexedDB
  ↓
syncService.syncProduct() → Queue for sync
  ↓
SyncManager.addToQueue()
  ├─ Validate product
  ├─ Set priority: 6
  └─ Add to internal queue
  ↓
processQueue() (when online)
  ├─ productsSyncStrategy.syncToSupabase()
  │   ├─ Get authenticated user
  │   ├─ Upsert to products table
  │   └─ markProductAsSynced() → Update IndexedDB
  └─ productsSyncStrategy.syncToSheets()
      ├─ Debounce (2s delay, batches multiple changes)
      ├─ Fetch ALL products from IndexedDB
      ├─ Call /api/sheets/sync-products
      └─ Clear & rewrite Products sheet
```

#### Update Flow

```
User edits product
  ↓
Update product object {synced: false}
  ↓
saveProducts() → Update IndexedDB
  ↓
syncService.syncProduct() → Queue for re-sync
  ↓
Same as create flow above
```

---

### 2. SALES

#### Load Flow

```
App Init (Online)
  ↓
loadSalesFromSupabase()
  ├─ Query sales + sale_items (join)
  ├─ Transform to app format
  └─ Mark as synced: true
  ↓
saveSales() → IndexedDB
  ├─ Get current unsynced sales
  ├─ Clear IndexedDB
  ├─ Put unsynced + new sales back
  └─ (Preserves local changes during cleanup)
  ↓
Used by CloseOutSection, Analytics
```

```
App Init (Offline)
  ↓
getSales() → IndexedDB only
  ↓
Used by CloseOutSection, Analytics
```

#### Create Flow

```
User completes sale
  ↓
Create Sale object {synced: false}
  ├─ Generate unique ID
  ├─ Calculate totals, discounts, tips
  └─ Link to products via items array
  ↓
saveSale() → Save to IndexedDB
  ↓
Update product inventory
  ├─ Decrement quantities
  ├─ Mark products as unsynced
  └─ Queue products for re-sync
  ↓
syncService.syncSale() → Queue sale for sync
  ↓
SyncManager.addToQueue()
  ├─ Validate sale
  ├─ Set priority: 8
  └─ Add to queue
  ↓
processQueue() (when online)
  ├─ salesSyncStrategy.syncToSupabase()
  │   ├─ Insert sale record
  │   ├─ Delete old sale_items (for updates)
  │   ├─ Insert sale_items
  │   └─ markSaleAsSynced() → Update IndexedDB
  └─ salesSyncStrategy.syncToSheets()
      ├─ Call /api/sheets/sync-sales
      └─ Append row to Sales sheet
  ↓
Show email signup modal (if enabled)
```

---

### 3. CLOSE-OUTS ✅ (FIXED)

#### Load Flow

```
App Init (Online)
  ↓
loadCloseOutsFromSupabase()
  ├─ Query close_outs table
  ├─ Transform to app format
  └─ Mark as syncedToSupabase: true
  ↓
FOR EACH closeOut:
  saveCloseOut() → Save to IndexedDB
  ↓
CloseOutSection.loadData()
  ├─ getCloseOuts() → Read from IndexedDB
  └─ Display in UI
```

```
App Init (Offline)
  ↓
CloseOutSection.loadData()
  ├─ getCloseOuts() → IndexedDB only
  └─ Display cached close-outs
```

#### Create Flow

```
User clicks "Close Out Session"
  ↓
CloseOutWizard.loadSessionData()
  ├─ getCurrentSessionSales()
  │   ├─ Get all sales from IndexedDB
  │   ├─ Filter sales after last close-out
  │   └─ Return current session sales
  ├─ calculateSessionStats()
  │   ├─ Aggregate revenue, discounts, tips
  │   ├─ Group by payment method
  │   └─ Calculate product performance
  └─ Display summary to user
  ↓
User fills metadata (name, location, notes, cash count)
  ↓
createCloseOut()
  ├─ Create CloseOut object
  │   ├─ Link to sale IDs
  │   ├─ Embed aggregated stats
  │   └─ syncedToSupabase: false
  ├─ saveCloseOut() → Save to IndexedDB
  └─ syncService.syncCloseOut() → Queue for sync
  ↓
SyncManager.addToQueue()
  ├─ Validate close-out
  ├─ Set priority: 10 (HIGHEST)
  └─ Add to queue
  ↓
processQueue() (when online)
  ├─ closeOutsSyncStrategy.syncToSupabase()
  │   ├─ Get authenticated user
  │   ├─ Transform to Supabase schema
  │   ├─ Upsert to close_outs table
  │   └─ markCloseOutAsSynced() → Update IndexedDB
  └─ (No Sheets sync for close-outs)
```

#### Update Flow ✅ (FIXED)

```
User edits close-out
  ↓
CloseOutWizard with editingCloseOut prop
  ├─ Pre-fill form with existing data
  └─ User modifies metadata
  ↓
handleSubmit()
  ├─ Create updatedCloseOut object
  │   ├─ Merge changes
  │   ├─ Update updatedAt timestamp
  │   └─ syncedToSupabase: false ← Mark as unsynced
  ├─ updateCloseOut() → Update IndexedDB
  └─ syncService.syncCloseOut() → Re-queue for sync
  ↓
processQueue() (same as create flow)
  └─ Re-syncs to Supabase with latest data
```

#### Auto-Sync on Network Return ✅ (FIXED)

```
Network goes offline → online
  ↓
handleOnline() event listener
  ├─ syncService.forceSync() (processes queue)
  └─ syncUnsyncedCloseOuts()
      ├─ getCloseOuts() from IndexedDB
      ├─ Filter: syncedToSupabase === false
      └─ FOR EACH unsynced:
          syncService.syncCloseOut()
```

---

### 4. SETTINGS

#### Load Flow

```
App Init (Online)
  ↓
loadSettingsFromSupabase()
  ├─ Query user_settings table (JSONB)
  ├─ Extract settings object
  └─ saveSettings() → Cache to IndexedDB
  ↓
Apply to UI state
  ├─ Payment methods
  ├─ Categories
  ├─ Theme
  └─ Email signup settings
```

```
App Init (Offline)
  ↓
getSettings() → IndexedDB only
  ↓
Apply cached settings to UI
```

#### Save Flow (Direct Sync)

```
User changes settings
  ↓
Settings.handleSave()
  ↓
IF (navigator.onLine):
  ├─ saveSettingsToSupabase() → Direct upsert
  │   ├─ No queue, no retry
  │   └─ Returns boolean success
  ├─ saveSettings() → Cache to IndexedDB
  └─ Show "Settings saved successfully!"
ELSE (offline):
  ├─ saveSettings() → Cache to IndexedDB only
  └─ Show "Settings cached. Will sync when online."
```

#### Auto-Sync on Network Return

```
Network returns
  ↓
handleOnline()
  ├─ getSettings() from IndexedDB
  └─ IF settings exist:
      ├─ saveSettingsToSupabase()
      └─ Log success/failure
```

---

### 5. EMAIL SIGNUPS (Sheets Only)

#### Create Flow

```
User completes sale
  ↓
IF (emailSignupSettings.enabled):
  Show EmailSignupModal
  ↓
User enters email (+ optional name/phone)
  ↓
handleSubmit()
  ├─ Create signup object
  │   ├─ timestamp
  │   ├─ email, name, phone
  │   ├─ source: "post-checkout"
  │   └─ saleId reference
  └─ IF (navigator.onLine):
      ├─ POST /api/sheets/email-signup
      │   ├─ Append to "Email List" sheet
      │   └─ No IndexedDB, no Supabase
      └─ Show success message
    ELSE:
      └─ Show error (no offline support)
```

**⚠️ Email Signups Limitations:**

- ❌ No local storage (IndexedDB)
- ❌ No offline queue
- ❌ No retry on failure
- ❌ Lost if Sheets API fails

---

## 🔄 Sync Manager Architecture

### Queue Processing

```
SyncManager
  ├─ Internal priority queue (sorted by priority)
  ├─ Processes ONE item at a time (sequential)
  ├─ Retries with exponential backoff
  └─ Calls strategy methods for each entity
```

### Sync Priorities (1-10, higher = more urgent)

```
10 - Close-outs (highest)
 9 - Settings
 8 - Sales
 6 - Products (inventory updates)
 5 - Products (general changes)
```

### Retry Strategy

```
Attempt 1: Immediate
Attempt 2: +2s delay
Attempt 3: +5s delay
Attempt 4: +10s delay
Attempt 5: +30s delay (final)
```

### Authentication Handling

```
All sync operations:
  ↓
getAuthenticatedUser()
  ├─ Get current user from Supabase
  ├─ IF token expired:
  │   ├─ Refresh token automatically
  │   └─ Retry operation
  └─ IF refresh fails:
      └─ Return error, item stays in queue
```

---

## 📡 Network State Transitions

### Going Offline

```
Navigator.onLine → false
  ├─ SyncManager pauses processing
  ├─ Queued items remain in queue
  └─ New operations continue to queue
  ↓
All saves continue to IndexedDB
UI shows offline indicator
```

### Coming Online

```
Navigator.onLine → true
  ├─ handleOnline() event fires
  ├─ syncService.forceSync() → Process queue
  ├─ Settings auto-sync (if changed offline)
  └─ Close-outs auto-sync (if created offline)
  ↓
UI updates with sync status
Queued items process sequentially
```

---

## 🗄️ Database Schema Patterns

### IndexedDB Object Stores

```typescript
interface MerchPOSDB extends DBSchema {
  products: {
    key: string; // Product ID
    value: Product;
  };

  sales: {
    key: string; // Sale ID
    value: Sale;
  };

  closeouts: {
    key: string; // CloseOut ID
    value: CloseOut;
    indexes: {
      timestamp: string; // For sorting by date
    };
  };

  settings: {
    key: string; // User ID
    value: UserSettings & { userId: string };
  };
}
```

### Supabase Tables

```sql
-- Products
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  category TEXT,
  inventory JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales (with foreign key to sale_items)
CREATE TABLE sales (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  total NUMERIC NOT NULL,
  actual_amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  synced BOOLEAN DEFAULT TRUE
);

CREATE TABLE sale_items (
  id SERIAL PRIMARY KEY,
  sale_id TEXT REFERENCES sales NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price NUMERIC NOT NULL
);

-- Close-outs
CREATE TABLE close_outs (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  session_name TEXT,
  location TEXT,
  sales_count INTEGER NOT NULL,
  total_revenue NUMERIC NOT NULL,
  payment_breakdown JSONB,
  products_sold JSONB,
  sale_ids TEXT[] NOT NULL
);

-- Settings (JSONB for flexibility)
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users,
  settings JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔐 Security (RLS Policies)

All tables have Row Level Security (RLS) enabled:

```sql
-- Example: Products table
CREATE POLICY "Users can view own products"
  ON products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own products"
  ON products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  USING (auth.uid() = user_id);
```

**Every entity MUST:**

- ✅ Include `user_id` column
- ✅ Filter by `user_id` in all queries
- ✅ Have RLS policies preventing cross-user access

---

## 🎯 Best Practices

### ✅ DO

1. **Always load from Supabase on app init (when online)**
2. **Always queue for sync after local save**
3. **Always mark edited items as unsynced**
4. **Always auto-sync on network return**
5. **Always handle auth token refresh**
6. **Always use IndexedDB, never localStorage**
7. **Always filter by user_id in Supabase queries**

### ❌ DON'T

1. **Don't query Supabase directly from UI components**
2. **Don't assume sync succeeded - check callbacks**
3. **Don't delete local data until confirmed synced**
4. **Don't use blocking operations in sync queue**
5. **Don't forget offline scenarios in testing**
6. **Don't skip RLS policies - security first**

---

## 🧪 Testing Scenarios

### Multi-Device Flow

```
Device A:
  1. Create entity → Syncs to Supabase ✅

Device B:
  2. Open app → Loads from Supabase ✅
  3. See entity from Device A ✅

Device A:
  4. Edit entity → Re-syncs to Supabase ✅

Device B:
  5. Refresh → Loads updated version ✅
```

### Offline/Online Flow

```
Online:
  1. Create entity → Saves local + queues ✅
  2. Network drops → Queue pauses ⏸️

Offline:
  3. Edit entity → Saves local ✅
  4. Create another → Saves local ✅
  5. Items pile up in queue 📦

Online:
  6. Network returns → handleOnline() fires ✅
  7. Queue processes all items ✅
  8. All changes sync to Supabase ✅
```

---

## 📚 File Reference

| Component        | File                          | Purpose            |
| ---------------- | ----------------------------- | ------------------ |
| Types            | `src/types/index.ts`          | Entity interfaces  |
| IndexedDB        | `src/lib/db.ts`               | Local storage CRUD |
| Supabase Loaders | `src/lib/supabase/data.ts`    | Cloud queries      |
| Sync Strategies  | `src/lib/sync/strategies.ts`  | Entity sync logic  |
| Sync Manager     | `src/lib/sync/SyncManager.ts` | Queue processor    |
| App Init         | `src/app/(app)/app/page.tsx`  | Load on startup    |
| Business Logic   | `src/lib/closeouts.ts`, etc.  | Domain helpers     |

---

## 🔍 Debugging Tips

### Check Sync Queue

```javascript
// Browser console
syncService.getStats();
// Returns: { queueSize, isOnline, isProcessing, errors }
```

### Check IndexedDB

```javascript
// Browser DevTools → Application → IndexedDB → road-dog-db
// Inspect: products, sales, closeouts, settings
```

### Check Supabase

```javascript
// Supabase Dashboard → Table Editor
// Filter by user_id to see your data
```

### Common Issues

| Symptom                     | Likely Cause                      | Fix                                |
| --------------------------- | --------------------------------- | ---------------------------------- |
| "Data missing on Device B"  | Not loading from Supabase on init | Add load call in initializeApp()   |
| "Edits not syncing"         | Not re-queuing after update       | Set synced: false, call sync again |
| "Queue stuck"               | Auth token expired                | Check getAuthenticatedUser()       |
| "Items never marked synced" | Missing callback                  | Add markAsSynced() in strategy     |

---

**Last Updated:** November 19, 2025  
**Version:** 1.0 (Post close-outs audit and fixes)
