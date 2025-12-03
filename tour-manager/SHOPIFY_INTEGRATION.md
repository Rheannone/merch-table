# 🛍️ Shopify Inventory Sync Guide

## Overview

Sync inventory between your Shopify store and ROAD DOG using Shopify's inventory export/import feature. This allows you to:

1. **Import products and quantities** from Shopify to ROAD DOG before an event
2. **Export updated quantities** back to Shopify after making sales

**No API setup required** - just CSV files!

## Why Inventory CSV?

✅ **No API credentials needed** - Just export and upload  
✅ **No custom app setup** - Use Shopify's built-in features  
✅ **Includes inventory quantities** - Unlike product exports  
✅ **Safe updates** - Shopify validates changes before applying  
✅ **Works for everyone** - No technical setup required

## What Gets Imported

✅ **From Inventory CSV:**

- Product names (titles)
- Variants mapped to sizes (S, M, L, XL, etc.)
- ✅ **Current inventory quantities per variant**
- Handles (product identifiers)

⚠️ **Not included in Inventory CSV:**

- Prices (will default to $0 - set manually after import)
- Descriptions
- Images
- Categories

💡 **Pro tip:** If you need prices, descriptions, and images, you can:

1. Import from inventory CSV first (gets quantities)
2. Manually update prices/categories in ROAD DOG, OR
3. Export a product CSV separately and merge the data

✅ **From Product CSV (alternative):**

- Product names, descriptions, categories
- Prices
- Images
- Variants
- ❌ **NO inventory quantities** (you'll need to set these manually)

## How to Import from Shopify

### Step 1: Export Inventory from Shopify

1. Log into your **Shopify admin**
2. Go to **Products → Inventory**
3. Click the **"Export"** button (top right corner)
4. Select:
   - **Export from:** "All locations" (or your specific location)
   - **Inventory states shown:** "All states" (recommended for safety)
   - **Export:** "All variants" (or select specific products)
   - **Export as:** "CSV for Excel, Numbers, or other spreadsheet programs"
5. Click **"Export inventory"**
6. Download the CSV file to your computer

### Step 2: Import to ROAD DOG

1. Open your ROAD DOG app
2. Go to **Settings** tab
3. Scroll to **"Shopify Sync"** section
4. Click **"Choose File"** and select your downloaded inventory CSV
5. The import starts automatically
6. Wait for success message

That's it! Your products with inventory quantities are now in the POS.

## Data Mapping

### Shopify Inventory CSV → ROAD DOG Product

```
Handle → id (prefixed with "shopify-")
Title → name
Option1 Value → sizes[] (if product has variants)
On hand (current) OR On hand (new) → inventory{} (quantity per size)
Price → 0 (not in inventory CSV - set manually)
Category → "Uncategorized" (not in inventory CSV - set manually)
```

### ROAD DOG Product → Shopify Inventory CSV

```
id (remove "shopify-" prefix) → Handle
name → Title
sizes[] → Option1 Value (or "Default Title" for non-variants)
inventory{} → On hand (current) AND On hand (new)
```

### Example Import (Inventory CSV)

**Shopify Inventory CSV Row:**

```csv
Handle,Title,Option1 Name,Option1 Value,SKU,HS Code,COO,Location,Bin name,Incoming,Unavailable,Committed,Available,On hand (current),On hand (new)
band-tshirt,Band T-Shirt,Size,Small,,,,,,,,,10,10,10
band-tshirt,Band T-Shirt,Size,Medium,,,,,,,,,15,15,15
band-tshirt,Band T-Shirt,Size,Large,,,,,,,,,8,8,8
```

**Imported as:**

```json
{
  "id": "shopify-band-tshirt",
  "name": "Band T-Shirt",
  "price": 0,
  "category": "Uncategorized",
  "sizes": ["Small", "Medium", "Large"],
  "inventory": {
    "Small": 10,
    "Medium": 15,
    "Large": 8
  }
}
```

### Example Export (Back to Shopify)

After selling 3 Small, 5 Medium, and 2 Large:

```csv
Handle,Title,Option1 Name,Option1 Value,...,On hand (current),On hand (new)
band-tshirt,Band T-Shirt,Size,Small,...,7,7
band-tshirt,Band T-Shirt,Size,Medium,...,10,10
band-tshirt,Band T-Shirt,Size,Large,...,6,6
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

This CSV import is designed for **one-time setup**. However, you can also export inventory updates back to Shopify after events.

### Exporting Back to Shopify

After making sales at an event, you can update Shopify inventory:

1. Go to **Settings** → **Shopify Sync** in ROAD DOG
2. Click **"Download Shopify Inventory CSV"**
3. In Shopify admin, go to **Products → Inventory** → **Import**
4. Upload the CSV file
5. Click **"Upload file"**
6. Review the preview and click **"Start import"**

**⚠️ Important:** The export leaves "On hand (current)" blank to bypass Shopify's safety validation. This ensures the update applies, but means:

- ROAD DOG's quantities will **overwrite** Shopify's quantities completely
- If you made sales in Shopify after importing to ROAD DOG, those will be lost
- **Use ROAD DOG as your single source of truth** during events

The export CSV contains only inventory columns (Handle, Title, Option Name/Value, Location, On hand (new)) to safely update quantities without affecting prices, descriptions, or other product data.

### Other Options

- **Option 1:** Manually re-import CSV when products change
- **Option 2:** Manage inventory in ROAD DOG after initial import
- **Option 3:** Keep Shopify as your source of truth for online sales, ROAD DOG for in-person

Most touring bands use this once to bootstrap their POS, then manage products directly in ROAD DOG.

---

**Happy importing! 🎸**
