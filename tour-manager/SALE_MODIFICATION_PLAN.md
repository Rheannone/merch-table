# Sale Modification & Deletion Implementation Plan

## Overview
Add functionality for users to modify sales (swap items, change sizes) and delete sales from the Analytics tab. Sales in closed-out sessions are protected from modification.

---

## Decisions & Guardrails

### ✅ What We're Building
1. **Delete Sale** - Remove a sale entirely, restore inventory
2. **Swap Item** - Change an item in a sale (e.g., wrong size selected)
3. **Show Individual Sales** - New "Show Sales" toggle in Daily Revenue section

### 🚫 What We're NOT Doing
- Role-based restrictions (any authenticated user can modify/delete)
- Offline edge case handling (resurrection prevention)
- Google Sheets sync updates
- Sale ID collision fixes

### 🛡️ Critical Guardrails
1. **NEVER delete/modify a sale that belongs to a closed-out session**
2. **ALWAYS restore inventory when deleting a sale**
3. **ALWAYS adjust inventory when swapping items** (+1 old size, -1 new size)
4. **Recalculate sale totals when item prices differ** (keep discount amount fixed)
5. **Handle missing products gracefully** (product may have been deleted)

---

## Implementation Phases

### Phase 1: Core Infrastructure (db.ts, syncService.ts)
Add missing functions for sale deletion and updates.

**Files to modify:**
- `src/lib/db.ts` - Add `deleteSale(id)`, `updateSale(sale)` functions
- `src/lib/sync/syncService.ts` - Add `deleteSale(saleId)`, `updateSale(sale)` methods

**Code pattern (follow existing product delete/update):**
```typescript
// db.ts
export async function deleteSale(id: string) {
  const db = await getDB();
  await db.delete("sales", id);
}

// syncService.ts  
async deleteSale(saleId: string): Promise<string> {
  return await this.syncManager.enqueue("sale", "delete", { id: saleId }, { priority: 7 });
}
```

---

### Phase 2: Closeout Check Helper (closeouts.ts)
Add function to check if a sale belongs to a closed-out session.

**New function:**
```typescript
export async function isSaleInClosedSession(saleId: string): Promise<boolean>
```

**Logic:**
1. Get all closeouts from IndexedDB
2. Check if any closeout's `saleIds` array contains this sale
3. Return true if found, false otherwise

---

### Phase 3: Analytics Data Layer (analytics.ts)
Add new query to fetch individual sales by date (not aggregated).

**New function:**
```typescript
export async function getSalesByDate(
  organizationId: string,
  date: string
): Promise<Sale[]>
```

**Returns:** Array of full Sale objects with items, for a specific date.

---

### Phase 4: Sale Modification Logic (new file: src/lib/saleModification.ts)
Central module for sale modification business logic.

**Functions:**
```typescript
// Delete a sale with inventory restoration
export async function deleteSaleWithInventoryRestore(
  saleId: string,
  products: Product[],
  onUpdateProduct: (product: Product) => Promise<void>
): Promise<{ success: boolean; error?: string }>

// Swap an item in a sale (change size or product)
export async function swapSaleItem(
  sale: Sale,
  itemIndex: number,
  newProductId: string,
  newSize: string | undefined,
  products: Product[],
  onUpdateProduct: (product: Product) => Promise<void>
): Promise<{ success: boolean; updatedSale?: Sale; error?: string }>
```

**Inventory restoration logic:**
```typescript
for (const item of sale.items) {
  const product = products.find(p => p.id === item.productId);
  if (product?.inventory) {
    const sizeKey = item.size || "default";
    const currentQty = product.inventory[sizeKey] || 0;
    // Restore inventory
    await onUpdateProduct({
      ...product,
      inventory: { ...product.inventory, [sizeKey]: currentQty + item.quantity },
      synced: false
    });
  }
}
```

---

### Phase 5: UI Components

#### 5A: Analytics.tsx Updates
- Add "Show Sales" toggle button alongside "Show Products"
- State: `expandedSalesDates: Set<string>`, `dateSales: Record<string, Sale[]>`
- Fetch individual sales when toggled via new `getSalesByDate()`

#### 5B: SaleCard Component (new: src/components/SaleCard.tsx)
Display individual sale in the Daily Revenue expansion area.

**Props:**
```typescript
interface SaleCardProps {
  sale: Sale;
  onEdit: (sale: Sale) => void;
  onDelete: (sale: Sale) => void;
  isInClosedSession: boolean;
}
```

**Visual:**
- Timestamp, payment method, total
- List of items with sizes
- Edit/Delete buttons (disabled if closed session)

#### 5C: SaleDetailSheet Component (new: src/components/SaleDetailSheet.tsx)
Bottom sheet (mobile) / Modal (desktop) for viewing/editing a sale.

**Features:**
- View sale details
- "Swap Item" flow: tap item → size picker (if same product) or product search
- "Delete Sale" button with confirmation
- Disabled state for closed-out sales

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `src/lib/db.ts` | Modify | Add `deleteSale()`, `updateSale()` |
| `src/lib/sync/syncService.ts` | Modify | Add `deleteSale()`, `updateSale()` |
| `src/lib/closeouts.ts` | Modify | Add `isSaleInClosedSession()` |
| `src/lib/analytics.ts` | Modify | Add `getSalesByDate()` |
| `src/lib/saleModification.ts` | Create | Business logic for delete/swap |
| `src/components/Analytics.tsx` | Modify | Add "Show Sales" toggle and sale cards |
| `src/components/SaleCard.tsx` | Create | Individual sale display component |
| `src/components/SaleDetailSheet.tsx` | Create | Sale editing bottom sheet/modal |

---

## Implementation Order

1. **db.ts** - Add deleteSale, updateSale
2. **syncService.ts** - Add deleteSale, updateSale  
3. **closeouts.ts** - Add isSaleInClosedSession
4. **analytics.ts** - Add getSalesByDate
5. **saleModification.ts** - Create with core logic
6. **SaleCard.tsx** - Create component
7. **SaleDetailSheet.tsx** - Create component
8. **Analytics.tsx** - Wire everything together

---

## Testing Checklist

- [ ] Delete sale in current session → inventory restored
- [ ] Try to delete sale in closed session → blocked with message
- [ ] Swap item size → old size +1, new size -1
- [ ] Swap to different product → old product inventory +1, new product -1
- [ ] Delete sale with deleted product → no crash, graceful skip
- [ ] Sale total recalculates when swapping to different-priced item
- [ ] Mobile: bottom sheet works correctly
- [ ] Desktop: modal works correctly
- [ ] Sync completes successfully after modifications

---

## Edge Cases to Handle

1. **Product deleted after sale**: Skip inventory restoration for that item, log warning
2. **Size doesn't exist on product anymore**: Skip that size, log warning  
3. **Sale has multiple of same item**: Handle quantity correctly
4. **Price changed since sale**: Use NEW price for the swapped item, recalc total

---

## Total Recalculation Formula

When swapping an item:
```typescript
const oldItemTotal = oldItem.price * oldItem.quantity;
const newItemTotal = newProduct.price * oldItem.quantity; // keep same quantity
const priceDiff = newItemTotal - oldItemTotal;

updatedSale.total = sale.total + priceDiff;
updatedSale.actualAmount = sale.actualAmount + priceDiff; // discount stays fixed
```

If `actualAmount` would go negative (huge discount), clamp to 0.
