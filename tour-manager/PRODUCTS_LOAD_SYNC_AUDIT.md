# Products Load & Sync Architecture Audit

**Date:** November 19, 2025
**Scope:** Complete data flow analysis for Products across all user scenarios

---

## 🔍 SCENARIO 1: NEW USER (First Time Login)

### Initial App Load (`/src/app/(app)/app/page.tsx` - `initializeApp()`)

**Flow:**

1. **Check for Google Sheets IDs** (lines 310-387)

   - Check localStorage for `productsSheetId` and `salesSheetId`
   - If not found → Search Google Drive for existing "ROAD DOG" spreadsheet
   - If not found → Create new spreadsheet via `/api/sheets/initialize`
   - Store IDs in localStorage

2. **Load Products** (lines 389-460)

   ```
   IF online:
     ├─ Call loadProductsFromSupabase()
     ├─ IF products found in Supabase:
     │  ├─ loadedProducts = supabaseProducts
     │  ├─ saveProducts(loadedProducts) → Cache to IndexedDB
     │  └─ Set synced: true on all products
     ├─ ELSE IF no products in Supabase:
     │  └─ loadedProducts = getProducts() from IndexedDB
     └─ CATCH error:
        └─ Fall back to IndexedDB

   IF offline:
     └─ loadedProducts = getProducts() from IndexedDB

   IF loadedProducts.length === 0:
     ├─ saveProducts(DEFAULT_PRODUCTS) → IndexedDB
     ├─ loadedProducts = DEFAULT_PRODUCTS
     └─ Queue each default product for sync:
        └─ syncService.syncProduct(product)

   setProducts(loadedProducts) → Update UI state
   ```

**Result for New User:**

- ✅ DEFAULT_PRODUCTS loaded into state
- ✅ DEFAULT_PRODUCTS saved to IndexedDB
- ✅ Each default product queued for sync to Supabase & Sheets
- ❌ **BUG FOUND:** Default products have `synced: undefined`, should be `synced: false`

---

## 🔍 SCENARIO 2: USER ADDS A PRODUCT

### User Flow: ProductManager → handleAddProduct → IndexedDB → Sync Queue

**Code Path:**

1. **User creates product in ProductManager** (`/src/components/ProductManager.tsx`)

   - Product object created with user input
   - Product gets unique ID: `product-${Date.now()}-${Math.random()}`

2. **handleAddProduct called** (`/src/app/(app)/app/page.tsx` line 618)

   ```javascript
   const handleAddProduct = async (product: Product) => {
     await addProductToDB(product); // Step 1: Save to IndexedDB
     const updatedProducts = await getProducts(); // Step 2: Reload from IndexedDB
     setProducts(updatedProducts); // Step 3: Update UI state

     await syncService.syncProduct(product); // Step 4: Queue for sync
   };
   ```

3. **addProductToDB** (`/src/lib/db.ts` line 80)

   ```javascript
   export async function addProduct(product: Product) {
     const db = await getDB();
     await db.put("products", product); // Uses .put() - upsert operation
   }
   ```

4. **syncService.syncProduct** (`/src/lib/sync/syncService.ts`)

   - Queues product with operation: "create"
   - Priority: 5 (medium)
   - Sync manager processes queue automatically

5. **Product Sync Strategy** (`/src/lib/sync/strategies.ts`)

   **A. Sync to Supabase** (lines 230-275)

   ```javascript
   - Get authenticated user
   - Prepare product data for Supabase schema:
     {
       id: data.id,
       user_id: user.id,
       name: data.name,
       price: data.price,
       image_url: data.imageUrl,
       category: data.category,
       inventory: data.inventory || {},
       sku: null,
       cost: null,
       notes: data.description
     }
   - UPSERT to products table
   - ON SUCCESS:
     └─ markProductAsSynced(data.id) → Update IndexedDB synced flag
   ```

   **B. Sync to Google Sheets** (lines 305-340)

   ```javascript
   - Get ALL products from IndexedDB (not just the new one)
   - Send entire product list to /api/sheets/sync-products
   - Sheets API clears and rewrites entire Products sheet
   ```

**❌ CRITICAL BUGS FOUND:**

### BUG #13: New products don't have `synced: false` flag

**Location:** `ProductManager.tsx` or wherever products are created
**Issue:** When creating a new product, the `synced` field is not explicitly set to `false`
**Impact:** Product might show as synced even though it hasn't been synced yet
**Fix:** Ensure all newly created products have `synced: false`

### BUG #14: Products synced to Sheets even if Supabase sync fails

**Location:** `/src/lib/sync/strategies.ts` - productsSyncStrategy
**Issue:** The strategy syncs to BOTH Supabase and Sheets regardless of individual failures
**Impact:** Google Sheets might have products that aren't in Supabase (inconsistent state)
**Fix:** Only sync to Sheets if Supabase sync succeeds, OR handle partial failures properly

---

## 🔍 SCENARIO 3: USER MODIFIES A PRODUCT

### User Flow: ProductManager → handleUpdateProduct → IndexedDB → Sync Queue

**Code Path:**

1. **handleUpdateProduct called** (`/src/app/(app)/app/page.tsx` line 632)

   ```javascript
   const handleUpdateProduct = async (product: Product) => {
     await addProductToDB(product); // Uses same function as add (put = upsert)
     const updatedProducts = await getProducts();
     setProducts(updatedProducts);

     await syncService.updateProduct(product); // Queue with "update" operation
   };
   ```

2. **syncService.updateProduct**

   - Queues product with operation: "update"
   - Priority: 6 (medium-high)

3. **Product Sync Strategy - Update Path**
   - Same as create path (UPSERT handles both)
   - Supabase: `.upsert()` updates existing row with matching ID
   - Sheets: Entire product list rewritten (so update is included)
   - ON SUCCESS: `markProductAsSynced(data.id)`

**✅ WORKING CORRECTLY** - Update uses same path as create, UPSERT handles it

---

## 🔍 SCENARIO 4: USER DELETES A PRODUCT

### User Flow: ProductManager → handleDeleteProduct → IndexedDB → Sync Queue

**Code Path:**

1. **handleDeleteProduct called** (`/src/app/(app)/app/page.tsx` line 646)

   ```javascript
   const handleDeleteProduct = async (id: string) => {
     if (confirm("Are you sure you want to delete this product?")) {
       await deleteProductFromDB(id); // Step 1: Delete from IndexedDB
       const updatedProducts = await getProducts(); // Step 2: Reload
       setProducts(updatedProducts); // Step 3: Update UI

       await syncService.deleteProduct(id); // Step 4: Queue deletion
     }
   };
   ```

2. **deleteProductFromDB** (`/src/lib/db.ts` line 88)

   ```javascript
   export async function deleteProduct(id: string) {
     const db = await getDB();
     await db.delete("products", id); // Remove from IndexedDB
   }
   ```

3. **syncService.deleteProduct**

   - Queues product with operation: "delete"
   - Needs product object, but we only have ID
   - ❌ **POTENTIAL BUG:** How does it get product data after deletion?

4. **Product Sync Strategy - Delete Path** (lines 276-289)
   ```javascript
   else if (operation === "delete") {
     await supabase.from("products").delete().eq("id", data.id);
     // No markProductAsSynced needed (product is gone)
     return success;
   }
   ```

**❌ CRITICAL BUG FOUND:**

### BUG #15: Deletion sync might fail - product already deleted from IndexedDB

**Location:** `/src/app/(app)/app/page.tsx` line 654
**Issue:**

```javascript
await deleteProductFromDB(id); // Product is GONE from IndexedDB
await syncService.deleteProduct(id); // But sync needs product object!
```

**Impact:** If sync queue tries to sync the deletion, it can't find the product data
**Fix:** Either:

1. Pass product object to deleteProduct() BEFORE deleting from IndexedDB
2. Change deleteProduct() to only need ID (which it does for Supabase)
3. For Sheets: After Supabase deletion, re-sync remaining products to Sheets

---

## 🔍 SCENARIO 5: USER MAKES A SALE (Inventory Update)

### User Flow: POSInterface → processCompleteSale → Update Inventory → Sync

**Code Path:**

1. **processCompleteSale** (`/src/components/POSInterface.tsx` lines 385-453)

   ```javascript
   // BEFORE creating sale, update inventory:
   for (const cartItem of cart) {
     const product = cartItem.product;
     if (product && product.inventory) {
       const sizeKey = cartItem.size || "default";
       const currentQty = product.inventory[sizeKey] || 0;
       const updatedInventory = {
         ...product.inventory,
         [sizeKey]: Math.max(0, currentQty - cartItem.quantity),
       };

       // THIS CALLS onUpdateProduct which is handleUpdateProduct!
       await onUpdateProduct({
         ...product,
         inventory: updatedInventory,
       });
     }
   }

   // THEN create the sale
   await onCompleteSale(cart, total, finalAmount, ...);
   ```

2. **onUpdateProduct → handleUpdateProduct**

   - Updates product in IndexedDB
   - Queues product for sync with "update" operation
   - Product syncs to Supabase with new inventory counts
   - Product syncs to Sheets with new inventory counts

3. **onCompleteSale → handleCompleteSale** (`/src/app/(app)/app/page.tsx` line 566)
   - Creates sale object
   - Saves to IndexedDB with `synced: false`
   - Queues sale for sync

**✅ WORKING CORRECTLY** - Inventory updates trigger product sync

**⚠️ PERFORMANCE CONCERN:**

### ISSUE #16: Multiple inventory updates = Multiple full product syncs to Sheets

**Location:** Sheets sync strategy
**Issue:** If user sells 5 different products, we sync the ENTIRE product list to Sheets 5 times
**Impact:** Unnecessary API calls, slow performance with large product catalogs
**Suggestion:** Debounce or batch product updates to Sheets (only sync once per minute or after all cart items processed)

---

## 📊 SUMMARY OF DATA FLOWS

### ✅ WORKING CORRECTLY:

1. **New user initialization** - Loads defaults and queues for sync
2. **Add product** - Saves to IndexedDB → Queues for Supabase & Sheets
3. **Update product** - Uses UPSERT, works same as add
4. **Update inventory on sale** - Triggers product sync automatically
5. **Mark as synced callback** - Updates IndexedDB after successful Supabase sync

### ❌ BUGS FOUND:

| Bug #   | Severity | Description                                                  | Location             |
| ------- | -------- | ------------------------------------------------------------ | -------------------- |
| **#13** | MEDIUM   | Default products and new products don't have `synced: false` | Product creation     |
| **#14** | HIGH     | Products sync to Sheets even if Supabase fails               | Sync strategy        |
| **#15** | CRITICAL | Product deletion sync fails - product data missing           | Delete handler       |
| **#16** | MEDIUM   | Multiple sales cause multiple full Sheets syncs              | Sheets sync strategy |

---

## 🔧 RECOMMENDED FIXES

### Fix #13: Set synced flag on product creation

```javascript
// In ProductManager or wherever products are created:
const newProduct: Product = {
  ...productData,
  synced: false, // ← ADD THIS
};
```

### Fix #14: Only sync to Sheets if Supabase succeeds

```javascript
// In productsSyncStrategy:
async sync(operation, data) {
  // Try Supabase first
  const supabaseResult = await this.syncToSupabase(operation, data);

  if (!supabaseResult.success) {
    return supabaseResult;  // Don't try Sheets if Supabase failed
  }

  // Only sync to Sheets if Supabase succeeded
  const sheetsResult = await this.syncToSheets(operation, data);
  return sheetsResult;
}
```

### Fix #15: Pass product to deleteProduct BEFORE deletion

```javascript
// In handleDeleteProduct:
const handleDeleteProduct = async (id: string) => {
  if (confirm("Are you sure?")) {
    const products = await getProducts();
    const productToDelete = products.find((p) => p.id === id);

    if (!productToDelete) return;

    // Queue deletion FIRST (while product data still exists)
    await syncService.deleteProduct(productToDelete);

    // Then delete from IndexedDB
    await deleteProductFromDB(id);
    const updatedProducts = await getProducts();
    setProducts(updatedProducts);
  }
};
```

### Fix #16: Debounce Sheets product sync

```javascript
// Add debouncing to Sheets sync:
let sheetsProductSyncTimeout: NodeJS.Timeout | null = null;

async syncToSheets(operation, data) {
  // Clear existing timeout
  if (sheetsProductSyncTimeout) {
    clearTimeout(sheetsProductSyncTimeout);
  }

  // Debounce: only sync after 2 seconds of no more product updates
  return new Promise((resolve) => {
    sheetsProductSyncTimeout = setTimeout(async () => {
      // Actually sync to Sheets here
      const result = await actualSheetSync();
      resolve(result);
    }, 2000);
  });
}
```

---

## 📋 TESTING CHECKLIST

### New User Flow:

- [ ] New user sees DEFAULT_PRODUCTS
- [ ] Default products saved to IndexedDB with synced: false
- [ ] Default products sync to Supabase
- [ ] Default products sync to Google Sheets
- [ ] After sync, products marked synced: true in IndexedDB

### Add Product Flow:

- [ ] New product saved to IndexedDB with synced: false
- [ ] New product appears in UI immediately
- [ ] Product syncs to Supabase
- [ ] Product syncs to Google Sheets
- [ ] After sync, product marked synced: true

### Update Product Flow:

- [ ] Updated product saved to IndexedDB
- [ ] Updated product syncs to Supabase (UPSERT)
- [ ] Updated product syncs to Sheets (full list rewrite)
- [ ] UI reflects changes immediately

### Delete Product Flow:

- [ ] Product removed from UI immediately
- [ ] Product removed from IndexedDB
- [ ] Deletion syncs to Supabase
- [ ] Sheets updated without deleted product
- [ ] No errors in sync queue

### Sale with Inventory Flow:

- [ ] Inventory decrements locally
- [ ] Product with new inventory syncs to Supabase
- [ ] Product with new inventory syncs to Sheets
- [ ] Sale itself syncs separately
- [ ] Multiple product sales don't cause excessive Sheets API calls
