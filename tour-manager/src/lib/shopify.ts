/**
 * Shopify CSV Import
 *
 * One-way product import from Shopify CSV exports to your POS.
 * Supports standard Shopify product export format.
 *
 * How to export from Shopify:
 * 1. Go to Products in Shopify admin
 * 2. Click "Export" button
 * 3. Select "All products" or specific products
 * 4. Choose "CSV for Excel, Numbers, or other spreadsheet programs"
 * 5. Import the downloaded CSV file here
 */

import type { Product } from "@/types";

export interface ShopifyImportResult {
  success: boolean;
  products?: Product[];
  error?: string;
  count?: number;
}

export interface ShopifyExportResult {
  success: boolean;
  csvBlob?: Blob;
  exportedCount?: number;
  skippedCount?: number;
  error?: string;
}

/**
 * Parse CSV text into rows
 */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentCell += '"';
        i++; // Skip next quote
      } else {
        // Toggle quotes
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // End of cell
      currentRow.push(currentCell);
      currentCell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      // End of row
      if (char === "\r" && nextChar === "\n") {
        i++; // Skip \n in \r\n
      }
      if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = "";
      }
    } else {
      currentCell += char;
    }
  }

  // Add last cell/row if any
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Convert CSV rows to objects using header row
 */
function csvToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return [];

  const headers = rows[0];
  const objects: Record<string, string>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj: Record<string, string> = {};

    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j] || "";
    }

    objects.push(obj);
  }

  return objects;
}

/**
 * Group CSV rows by product handle (Shopify exports one row per variant)
 */
function groupByProduct(
  rows: Record<string, string>[]
): Map<string, Record<string, string>[]> {
  const grouped = new Map<string, Record<string, string>[]>();

  for (const row of rows) {
    const handle = row["Handle"];
    if (!handle) continue;

    if (!grouped.has(handle)) {
      grouped.set(handle, []);
    }
    grouped.get(handle)!.push(row);
  }

  return grouped;
}

/**
 * Map grouped Shopify CSV rows to a Product
 */
function mapShopifyCSVToProduct(
  handle: string,
  rows: Record<string, string>[]
): Product | null {
  if (rows.length === 0) return null;

  // Use first row for product-level data
  const firstRow = rows[0];

  // Check if product is published/active
  const status = firstRow["Status"] || "";
  if (status.toLowerCase() !== "active") {
    return null; // Skip draft/archived products
  }

  const title = firstRow["Title"];
  if (!title) return null;

  // Get product type/category
  const category =
    firstRow["Type"] || firstRow["Product Category"] || "Uncategorized";

  // Get description (strip HTML)
  const bodyHTML = firstRow["Body (HTML)"] || "";
  const description = bodyHTML
    ? bodyHTML
        .replace(/<[^>]*>/g, "")
        .trim()
        .substring(0, 200)
    : undefined;

  // Get first image
  const imageUrl = firstRow["Image Src"] || "";

  // Process variants
  const variants = rows.filter((row) => row["Variant Price"]); // Only rows with price

  if (variants.length === 0) return null;

  // Get base price from first variant
  const basePrice = parseFloat(variants[0]["Variant Price"] || "0");

  // Determine if product has variants (sizes)
  const option1Name = firstRow["Option1 Name"];
  const hasVariants = option1Name && option1Name !== "Title";

  let sizes: string[] | undefined;
  const inventory: { [key: string]: number } = {};

  if (hasVariants) {
    // Extract sizes from Option1 Value
    sizes = variants
      .map((v) => v["Option1 Value"])
      .filter((val) => val && val !== "Default Title");

    // Map inventory
    variants.forEach((variant) => {
      const sizeName = variant["Option1 Value"];
      const qty = parseInt(variant["Variant Inventory Qty"] || "0", 10);
      if (sizeName && sizeName !== "Default Title") {
        inventory[sizeName] = qty;
      }
    });
  } else {
    // Single variant product
    const qty = parseInt(variants[0]["Variant Inventory Qty"] || "0", 10);
    inventory["default"] = qty;
  }

  return {
    id: `shopify-${handle}`,
    name: title,
    price: basePrice,
    category: category,
    description: description,
    imageUrl: imageUrl,
    sizes: sizes,
    inventory: inventory,
    showTextOnButton: true,
  };
}

/**
 * Import products from Shopify CSV file
 *
 * @param file - CSV file from Shopify export
 */
export async function importProductsFromShopifyCSV(
  file: File
): Promise<ShopifyImportResult> {
  try {
    // Read file
    const text = await file.text();

    if (!text || text.trim().length === 0) {
      return {
        success: false,
        error: "File is empty",
      };
    }

    // Parse CSV
    const rows = parseCSV(text);

    if (rows.length < 2) {
      return {
        success: false,
        error: "CSV file must have at least a header row and one data row",
      };
    }

    // Convert to objects
    const objects = csvToObjects(rows);

    // Validate it's a Shopify CSV (check for required columns)
    const firstObj = objects[0];
    if (!firstObj["Handle"] || !firstObj["Title"]) {
      return {
        success: false,
        error:
          "This doesn't look like a Shopify product export. Missing required columns (Handle, Title).",
      };
    }

    // Group by product
    const grouped = groupByProduct(objects);

    // Map to products
    const products: Product[] = [];
    for (const [handle, productRows] of grouped) {
      const product = mapShopifyCSVToProduct(handle, productRows);
      if (product) {
        products.push(product);
      }
    }

    if (products.length === 0) {
      return {
        success: false,
        error:
          "No active products found in CSV. Make sure products have 'Active' status.",
      };
    }

    console.log(
      `✅ Successfully imported ${products.length} products from Shopify CSV`
    );

    return {
      success: true,
      products: products,
      count: products.length,
    };
  } catch (error) {
    console.error("Error importing Shopify CSV:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to parse CSV file. Make sure it's a valid Shopify export.",
    };
  }
}

/**
 * Export inventory to Shopify-compatible CSV format
 * 
 * Generates an inventory CSV that can be imported back to Shopify
 * to update inventory quantities after an event.
 * 
 * @param products - Products to export (only those with shopify- prefix will be included)
 */
export function exportInventoryToShopifyCSV(
  products: Product[]
): ShopifyExportResult {
  try {
    // Filter to only Shopify products
    const shopifyProducts = products.filter((p) =>
      p.id.startsWith("shopify-")
    );

    if (shopifyProducts.length === 0) {
      return {
        success: false,
        error:
          "No Shopify products found to export. Import products from Shopify first.",
      };
    }

    // Build CSV header (Shopify inventory format)
    const headers = [
      "Handle",
      "Title",
      "Option 1 Name",
      "Option 1 Value",
      "Option 2 Name",
      "Option 2 Value",
      "Option 3 Name",
      "Option 3 Value",
      "SKU",
      "HS Code",
      "COO",
      "Location",
      "Bin name",
      "Incoming (not editable)",
      "Unavailable (not editable)",
      "Committed (not editable)",
      "Available (not editable)",
      "On hand (current)",
      "On hand (new)",
    ];

    const rows: string[][] = [headers];

    // Generate rows for each product/variant
    for (const product of shopifyProducts) {
      // Extract handle from ID (remove "shopify-" prefix)
      const handle = product.id.replace("shopify-", "");

      if (product.sizes && product.sizes.length > 0) {
        // Product with variants
        for (const size of product.sizes) {
          const currentQty = product.inventory?.[size] || 0;

          rows.push([
            handle,
            product.name,
            "Size", // Could be stored in metadata, but "Size" is common
            size,
            "", // Option 2 Name
            "", // Option 2 Value
            "", // Option 3 Name
            "", // Option 3 Value
            "", // SKU
            "", // HS Code
            "", // COO
            "", // Location (blank = default)
            "", // Bin name
            "0", // Incoming
            "0", // Unavailable
            "0", // Committed
            currentQty.toString(), // Available
            currentQty.toString(), // On hand (current)
            currentQty.toString(), // On hand (new)
          ]);
        }
      } else {
        // Product without variants
        const currentQty = product.inventory?.["default"] || 0;

        rows.push([
          handle,
          product.name,
          "Title",
          "Default Title",
          "", "", "", "",
          "",
          "", "",
          "",
          "",
          "0", "0", "0",
          currentQty.toString(),
          currentQty.toString(),
          currentQty.toString(),
        ]);
      }
    }

    // Convert to CSV string
    const csvContent = rows
      .map((row) =>
        row.map((cell) => {
          // Escape cells that contain commas, quotes, or newlines
          if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(",")
      )
      .join("\n");

    // Create blob
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    console.log(
      `✅ Successfully exported ${shopifyProducts.length} products to Shopify inventory CSV`
    );

    return {
      success: true,
      csvBlob: blob,
      exportedCount: shopifyProducts.length,
      skippedCount: products.length - shopifyProducts.length,
    };
  } catch (error) {
    console.error("Error exporting to Shopify CSV:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate CSV file.",
    };
  }
}

