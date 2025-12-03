# 🛍️ Shopify CSV Import Guide

## Overview

Import products from your existing Shopify store using Shopify's built-in CSV export feature. This is a **simple, one-way import** that copies product data without requiring API access or modifying your Shopify store.

## Why CSV Import?

✅ **No API credentials needed** - Just export and upload  
✅ **No custom app setup** - Use Shopify's built-in export  
✅ **Super simple** - 3 clicks in Shopify, then upload  
✅ **Works for everyone** - No technical setup required

## What Gets Imported

✅ **Product Information:**

- Product names
- Descriptions (first 200 characters, HTML stripped)
- Base prices
- Product categories (from Shopify product type)

✅ **Variants & Inventory:**

- Variants mapped to sizes (S, M, L, XL, etc.)
- Current inventory levels per variant
- SKU information

✅ **Images:**

- First product image URL
- Automatically displayed in your POS

## How to Import

### Step 1: Export from Shopify

1. Log into your **Shopify admin**
2. Go to **Products**
3. Click the **"Export"** button (top right corner)
4. Select:
   - **Products:** "All products" (or select specific products)
   - **Export as:** "Plain CSV file"
5. Click **"Export products"**
6. Download the CSV file to your computer

### Step 2: Import to ROAD DOG

1. Open your ROAD DOG app
2. Go to **Settings** tab
3. Scroll to **"Import from Shopify"** section
4. Click **"Choose File"** and select your downloaded CSV
5. The import starts automatically
6. Wait for success message

That's it! Your products are now in the POS.

## Data Mapping

### Shopify CSV → ROAD DOG Product

```
Title → name
Body (HTML) → description (cleaned, truncated to 200 chars)
Variant Price → price (base price from first variant)
Type → category
Image Src → imageUrl
Option1 Value → sizes[] (if product has variants)
Variant Inventory Qty → inventory{} (quantity per size)
Status → Only "active" products imported
```

### Example

**Shopify CSV Row:**

```csv
Handle,Title,Type,Variant Price,Variant Inventory Qty,Option1 Value,Image Src,Status
band-tshirt,Band T-Shirt,Apparel,25.00,10,Small,https://...,active
band-tshirt,Band T-Shirt,Apparel,25.00,15,Medium,https://...,active
band-tshirt,Band T-Shirt,Apparel,25.00,8,Large,https://...,active
```

**Imported as:**

```json
{
  "id": "shopify-band-tshirt",
  "name": "Band T-Shirt",
  "price": 25.0,
  "category": "Apparel",
  "sizes": ["Small", "Medium", "Large"],
  "inventory": {
    "Small": 10,
    "Medium": 15,
    "Large": 8
  },
  "imageUrl": "https://..."
}
```

## Important Notes

### ✅ What This Does

- Copies product data from Shopify CSV to your POS
- Products are synced to your database (Supabase)
- All standard POS features work with imported products
- Fast and simple - no API setup required

### ❌ What This Doesn't Do

- **Does NOT modify your Shopify store**
- **Does NOT sync inventory changes back to Shopify**
- **Does NOT create a two-way connection**
- **Does NOT sync future Shopify updates automatically**
- **Re-importing creates duplicates** (new product IDs)

## Shopify CSV Format

The CSV must be a standard Shopify product export. Required columns:

- `Handle` - Unique product identifier
- `Title` - Product name
- `Status` - Must be "active" (drafts/archived are skipped)
- `Variant Price` - Price for each variant
- Other columns are optional but recommended

If you see "Missing required columns" error, make sure you exported using Shopify's **"Plain CSV file"** format (not Excel or Google Sheets format).

## Limitations

- **No Product Limit** - Import as many as your CSV contains
- **Product Statuses:** Only imports "active" products (drafts/archived skipped)
- **Variants:** If products have different prices per variant, only the first variant's price is used
- **Images:** Only the first product image URL is imported
- **One-Time Import:** Re-importing the same CSV will create duplicate products

## Troubleshooting

### "File is empty"

- Make sure you downloaded the complete CSV file
- Try exporting again from Shopify

### "This doesn't look like a Shopify product export"

- Verify you used Shopify's **"Plain CSV file"** export option
- Don't modify the CSV in Excel (it can change formatting)
- Required columns: `Handle`, `Title`

### "No active products found in CSV"

- Check that products have "active" status in Shopify
- Products in "draft" or "archived" status are skipped
- Make sure the CSV isn't empty

### Products imported but missing data

- **No sizes:** Product only has one variant (normal for single-variant products)
- **No image:** Product doesn't have an image in Shopify
- **Category = "Uncategorized":** Product doesn't have a Type set in Shopify

### Import creates duplicate products

- This is expected - re-importing the same CSV creates new products
- Each import generates new product IDs (e.g., `shopify-handle-1`, `shopify-handle-2`)
- Delete old products manually if you need to re-import

## Tips

1. **Test with small batches first** - Export just a few products to test
2. **Clean up before export** - Set product types/categories in Shopify first
3. **Check image URLs** - Make sure products have images before exporting
4. **One-time setup** - Use this for initial catalog import, then manage products in ROAD DOG

## Need Two-Way Sync?

This CSV import is designed for **one-time setup**. If you need ongoing synchronization:

- **Option 1:** Manually re-import CSV when products change
- **Option 2:** Manage inventory in ROAD DOG after initial import
- **Option 3:** Keep Shopify as your source of truth for online sales, ROAD DOG for in-person

Most touring bands use this once to bootstrap their POS, then manage products directly in ROAD DOG.

---

**Happy importing! 🎸**
