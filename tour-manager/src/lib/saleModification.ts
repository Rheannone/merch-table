/**
 * Sale Modification Business Logic
 *
 * Handles deletion and modification of sales with proper inventory management.
 * Sales in closed-out sessions cannot be modified.
 */

import { Sale, Product } from "@/types";
import { deleteSale, updateSale, getSaleById } from "./db";
import syncService from "./sync/syncService";
import { isSaleInClosedSession } from "./closeouts";

export interface SaleModificationResult {
  success: boolean;
  error?: string;
  updatedSale?: Sale;
}

/**
 * Delete a sale with inventory restoration
 *
 * Steps:
 * 1. Check if sale is in a closed session (blocked)
 * 2. Restore inventory for each item in the sale
 * 3. Delete from IndexedDB
 * 4. Queue deletion for sync to Supabase
 */
export async function deleteSaleWithInventoryRestore(
  saleId: string,
  products: Product[],
  onUpdateProduct: (product: Product) => Promise<void>
): Promise<SaleModificationResult> {
  try {
    // Check if sale is in a closed session
    const isInClosedSession = await isSaleInClosedSession(saleId);
    if (isInClosedSession) {
      return {
        success: false,
        error: "Cannot delete a sale from a closed-out session",
      };
    }

    // Get the sale to restore inventory
    const sale = await getSaleById(saleId);
    if (!sale) {
      return {
        success: false,
        error: "Sale not found",
      };
    }

    // Restore inventory for each item
    for (const item of sale.items) {
      const product = products.find((p) => p.id === item.productId);

      if (!product) {
        // Product was deleted, skip inventory restoration
        console.warn(
          `⚠️ Product ${item.productId} not found, skipping inventory restore for ${item.productName}`
        );
        continue;
      }

      if (product.inventory) {
        const sizeKey = item.size || "default";
        const currentQty = product.inventory[sizeKey] || 0;

        const updatedProduct: Product = {
          ...product,
          inventory: {
            ...product.inventory,
            [sizeKey]: currentQty + item.quantity,
          },
          synced: false,
        };

        await onUpdateProduct(updatedProduct);
        console.log(
          `📦 Restored ${item.quantity}x ${item.productName} (${sizeKey}): ${currentQty} → ${currentQty + item.quantity}`
        );
      }
    }

    // Delete from IndexedDB
    await deleteSale(saleId);

    // Queue deletion for sync
    try {
      await syncService.deleteSale(saleId);
      console.log(`✅ Sale ${saleId} queued for deletion sync`);
    } catch (syncError) {
      console.error("Failed to queue sale deletion for sync:", syncError);
      // Don't fail the operation - the sale is already deleted locally
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting sale:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Swap an item in a sale (change size or product)
 *
 * Steps:
 * 1. Check if sale is in a closed session (blocked)
 * 2. Adjust inventory: +1 old item, -1 new item
 * 3. Recalculate sale total if prices differ
 * 4. Update sale in IndexedDB
 * 5. Queue update for sync to Supabase
 */
export async function swapSaleItem(
  sale: Sale,
  itemIndex: number,
  newProductId: string,
  newSize: string | undefined,
  products: Product[],
  onUpdateProduct: (product: Product) => Promise<void>
): Promise<SaleModificationResult> {
  try {
    // Check if sale is in a closed session
    const isInClosedSession = await isSaleInClosedSession(sale.id);
    if (isInClosedSession) {
      return {
        success: false,
        error: "Cannot modify a sale from a closed-out session",
      };
    }

    // Validate item index
    if (itemIndex < 0 || itemIndex >= sale.items.length) {
      return {
        success: false,
        error: "Invalid item index",
      };
    }

    const oldItem = sale.items[itemIndex];
    const newProduct = products.find((p) => p.id === newProductId);

    if (!newProduct) {
      return {
        success: false,
        error: "New product not found",
      };
    }

    // Check if anything actually changed
    const isSameProduct = oldItem.productId === newProductId;
    const isSameSize = (oldItem.size || "default") === (newSize || "default");
    if (isSameProduct && isSameSize) {
      return {
        success: true,
        updatedSale: sale,
      };
    }

    // Restore inventory for old item
    const oldProduct = products.find((p) => p.id === oldItem.productId);
    if (oldProduct?.inventory) {
      const oldSizeKey = oldItem.size || "default";
      const oldCurrentQty = oldProduct.inventory[oldSizeKey] || 0;

      await onUpdateProduct({
        ...oldProduct,
        inventory: {
          ...oldProduct.inventory,
          [oldSizeKey]: oldCurrentQty + oldItem.quantity,
        },
        synced: false,
      });
      console.log(
        `📦 Restored ${oldItem.quantity}x ${oldItem.productName} (${oldSizeKey})`
      );
    }

    // Deduct inventory for new item
    if (newProduct.inventory) {
      const newSizeKey = newSize || "default";
      const newCurrentQty = newProduct.inventory[newSizeKey] || 0;

      if (newCurrentQty < oldItem.quantity) {
        // Not enough inventory - restore old item and fail
        if (oldProduct?.inventory) {
          const oldSizeKey = oldItem.size || "default";
          const oldCurrentQty = oldProduct.inventory[oldSizeKey] || 0;
          await onUpdateProduct({
            ...oldProduct,
            inventory: {
              ...oldProduct.inventory,
              [oldSizeKey]: oldCurrentQty - oldItem.quantity,
            },
            synced: false,
          });
        }
        return {
          success: false,
          error: `Not enough inventory for ${newProduct.name} (${newSize || "default"})`,
        };
      }

      await onUpdateProduct({
        ...newProduct,
        inventory: {
          ...newProduct.inventory,
          [newSizeKey]: newCurrentQty - oldItem.quantity,
        },
        synced: false,
      });
      console.log(
        `📦 Deducted ${oldItem.quantity}x ${newProduct.name} (${newSizeKey})`
      );
    }

    // Calculate price difference and update sale totals
    const oldItemTotal = oldItem.price * oldItem.quantity;
    const newItemTotal = newProduct.price * oldItem.quantity;
    const priceDiff = newItemTotal - oldItemTotal;

    // Update the item in the sale
    const updatedItems = [...sale.items];
    updatedItems[itemIndex] = {
      productId: newProductId,
      productName: newProduct.name,
      quantity: oldItem.quantity, // Keep same quantity
      price: newProduct.price, // Use new product price
      size: newSize,
    };

    // Calculate new totals (keep discount as fixed amount)
    const newTotal = sale.total + priceDiff;
    const newActualAmount = Math.max(0, sale.actualAmount + priceDiff);

    const updatedSale: Sale = {
      ...sale,
      items: updatedItems,
      total: newTotal,
      actualAmount: newActualAmount,
      synced: false,
    };

    // Update in IndexedDB
    await updateSale(updatedSale);

    // Queue update for sync
    try {
      await syncService.updateSale(updatedSale);
      console.log(`✅ Sale ${sale.id} queued for update sync`);
    } catch (syncError) {
      console.error("Failed to queue sale update for sync:", syncError);
      // Don't fail the operation - the sale is already updated locally
    }

    return {
      success: true,
      updatedSale,
    };
  } catch (error) {
    console.error("Error swapping sale item:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if a sale can be modified (not in a closed session)
 */
export async function canModifySale(saleId: string): Promise<boolean> {
  return !(await isSaleInClosedSession(saleId));
}
