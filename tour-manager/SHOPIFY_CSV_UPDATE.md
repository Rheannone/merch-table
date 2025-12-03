# Shopify Integration Update: API → CSV Import

## What Changed

Simplified the Shopify integration from **API-based import** to **CSV file upload** for a much simpler user experience.

## Why the Change?

**Before (API approach):**

- ❌ Required creating custom Shopify app
- ❌ Needed to configure API scopes
- ❌ Had to manage access tokens
- ❌ 8-step setup process
- ❌ Limited to 250 products

**After (CSV approach):**

- ✅ Just use Shopify's "Export" button
- ✅ Upload CSV file - done!
- ✅ 2-step process (export, upload)
- ✅ No product limit
- ✅ No technical setup needed

## How It Works Now

### User Flow:

1. **In Shopify:**

   - Products → Export → Plain CSV file → Download

2. **In ROAD DOG:**
   - Settings → Import from Shopify → Upload CSV
   - Done! Products imported automatically

### Technical Implementation:

**File:** `/src/lib/shopify.ts`

- Removed API-based functions
- Added CSV parser (`parseCSV`, `csvToObjects`)
- Added product grouping logic (Shopify exports one row per variant)
- Maps CSV rows to Product schema

**File:** `/src/components/Settings.tsx`

- Removed: Store URL input, Access Token input, Test Connection button
- Added: File input with `.csv` accept
- Handler: `handleShopifyCSVImport` processes file on select
- Automatic import on file selection

**File:** `/SHOPIFY_INTEGRATION.md`

- Completely rewritten for CSV workflow
- Step-by-step Shopify export instructions
- CSV format documentation
- Simpler troubleshooting

## CSV Parsing Details

### Key Features:

1. **Proper CSV parsing** - Handles quoted fields, escaped quotes, multi-line cells
2. **Product grouping** - Combines variant rows into single products
3. **Data extraction**:
   - Title, price, category, description, image
   - Variants → sizes array
   - Inventory per variant
4. **Validation**:
   - Checks for required columns (Handle, Title)
   - Only imports "active" products
   - Skips empty/invalid rows

### Example CSV Processing:

```csv
Handle,Title,Type,Variant Price,Variant Inventory Qty,Option1 Value,Image Src,Status
tshirt,Band T-Shirt,Apparel,25.00,10,Small,https://...,active
tshirt,Band T-Shirt,Apparel,25.00,15,Medium,https://...,active
```

**Becomes:**

```javascript
{
  id: "shopify-tshirt",
  name: "Band T-Shirt",
  price: 25.0,
  category: "Apparel",
  sizes: ["Small", "Medium"],
  inventory: { Small: 10, Medium: 15 },
  imageUrl: "https://..."
}
```

## Benefits

1. **User Experience**: 90% simpler - just export and upload
2. **No Rate Limits**: Works with any size catalog
3. **No Credentials**: No API tokens to manage/secure
4. **Universal**: Works for all Shopify stores (even those without API access)
5. **Offline Friendly**: Can export CSV, upload later

## Backwards Compatibility

⚠️ **Breaking Change**: Old API-based approach removed

Users who were using the API method will see the new CSV upload interface. The documentation has been updated to guide them.

## Testing Checklist

- [ ] Export CSV from Shopify with multiple variants
- [ ] Upload to ROAD DOG and verify products appear
- [ ] Check that sizes map correctly
- [ ] Verify inventory quantities match
- [ ] Test with products that have no variants (single SKU)
- [ ] Test error handling (wrong file type, invalid CSV, etc.)

## Files Modified

- ✏️ `/src/lib/shopify.ts` - Complete rewrite for CSV parsing
- ✏️ `/src/components/Settings.tsx` - UI changed to file upload
- ✏️ `/SHOPIFY_INTEGRATION.md` - Documentation rewritten
- 📝 `/SHOPIFY_CSV_UPDATE.md` - This file (changelog)

---

**Result:** Much simpler Shopify integration that's accessible to all users! 🎉
