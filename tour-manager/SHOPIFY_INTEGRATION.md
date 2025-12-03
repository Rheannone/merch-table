# 🛍️ Shopify Integration Guide

## Overview

Import products from your existing Shopify store directly into your POS system. This is a **one-way import** that copies product data without modifying your Shopify store.

## What Gets Imported

✅ **Product Information:**

- Product names
- Descriptions (first 200 characters)
- Base prices (USD)
- Product categories (from Shopify product type)

✅ **Variants & Inventory:**

- Variants mapped to sizes (S, M, L, XL, etc.)
- Current inventory levels per variant
- SKU information

✅ **Images:**

- First product image
- Automatically imported and stored

## How to Set Up

### Step 1: Create a Custom Shopify App

1. Go to your Shopify admin
2. Navigate to **Settings** → **Apps and sales channels**
3. Click **"Develop apps"**
4. Click **"Allow custom app development"** (if prompted)
5. Click **"Create an app"**
6. Give it a name (e.g., "POS Import")

### Step 2: Configure API Access

1. Go to **Configuration** tab
2. Click **"Configure"** under "Admin API integration"
3. Under **"Admin API access scopes"**, enable:
   - `read_products`
   - `read_product_listings`
   - `read_inventory`
4. Click **"Save"**

### Step 3: Install the App & Get Access Token

1. Go to **"API credentials"** tab
2. Click **"Install app"**
3. Copy the **"Admin API access token"** (starts with `shpat_`)
4. ⚠️ **Save this token securely** - you won't be able to see it again!

### Step 4: Import to Your POS

1. Open your POS app
2. Go to **Settings** → **Import from Shopify**
3. Enter your **Store URL** (e.g., `yourstore.myshopify.com`)
4. Paste your **Access Token**
5. Click **"Test Connection"** to verify
6. Click **"Import Products"** to start the import

## Data Mapping

### Shopify → POS

```
title → name
variants[0].price → price (base USD price)
product_type → category
body_html → description (cleaned, truncated to 200 chars)
images[0].src → imageUrl
variants → sizes[] (if multiple variants)
variants[].title → inventory keys
variants[].inventory_quantity → inventory values
```

### Example

**Shopify Product:**

```json
{
  "title": "Band T-Shirt",
  "product_type": "Apparel",
  "variants": [
    { "title": "Small", "price": "25.00", "inventory_quantity": 10 },
    { "title": "Medium", "price": "25.00", "inventory_quantity": 15 },
    { "title": "Large", "price": "25.00", "inventory_quantity": 8 }
  ],
  "images": [{ "src": "https://..." }]
}
```

**Imported as:**

```json
{
  "id": "shopify-123456",
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

- Copies product data from Shopify to your POS
- Products are synced to Supabase (your database)
- All standard POS features work with imported products

### ❌ What This Doesn't Do

- **Does NOT modify your Shopify store**
- **Does NOT sync inventory changes back to Shopify**
- **Does NOT create a two-way connection**
- **Does NOT sync future Shopify updates automatically**

## Limitations

- **Maximum Products:** 250 per import (Shopify API limit)
- **Product Statuses:** Only imports "active" products
- **Variants:** If products have different prices per variant, only the first variant's price is used
- **Images:** Only the first product image is imported
- **One-Time Import:** Re-importing will create duplicate products (with new IDs)

## Security

- ✅ Access tokens are **never stored** in the app
- ✅ Tokens are only used during the import process
- ✅ All API calls use HTTPS
- ⚠️ Keep your access token secure - treat it like a password!

## Troubleshooting

### "Invalid access token"

- Make sure you copied the complete token (starts with `shpat_`)
- Verify the app is installed in your Shopify admin
- Check that the required scopes are enabled

### "Store not found"

- Use the format: `yourstore.myshopify.com`
- Don't include `https://` or trailing slashes
- Make sure the store name is correct

### "No products found"

- Check that you have "active" products in Shopify
- Products must be published to at least one sales channel
- Verify products aren't in "draft" status

### Import is slow

- Shopify API has rate limits (2 requests/second)
- Large catalogs may take a few minutes
- Don't close the Settings page during import

## Need Two-Way Sync?

This is a one-way import to get you started quickly. If you need ongoing synchronization between Shopify and your POS:

- **Option 1:** Manually re-import when products change
- **Option 2:** Consider Shopify POS integration (more complex, requires webhooks)
- **Option 3:** Use your POS as the source of truth and manually update Shopify

## Support

For issues or questions:

1. Check the console for detailed error messages
2. Verify your Shopify app permissions
3. Test with a small product catalog first

---

**Happy importing! 🎸**
