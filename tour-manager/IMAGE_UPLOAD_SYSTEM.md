# 🖼️ Image Upload System Documentation

**Last Updated:** November 5, 2025  
**Status:** ✅ Consolidated & Debugged

---

## Overview

The image upload system handles **product images** and **payment QR codes** with automatic compression and validation for Google Sheets storage.

### Key Features

- ✅ **Unified compression logic** in `src/lib/imageCompression.ts`
- ✅ **Automatic size validation** (50k character limit for Google Sheets)
- ✅ **Dynamic quality adjustment** (compresses until image fits)
- ✅ **Base64 encoding** for offline-first storage
- ✅ **Error handling** with specific feedback
- ✅ **No external APIs** - everything runs client-side

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    IMAGE UPLOAD FLOW                         │
└─────────────────────────────────────────────────────────────┘

1. User selects image file
   ↓
2. Validate file type & size (10MB max before compression)
   ↓
3. processImageForUpload() → src/lib/imageCompression.ts
   ├─ compressImage()
   │  ├─ Resize to max 800px width
   │  ├─ Try quality 0.8 (80%)
   │  ├─ Check estimated base64 size
   │  └─ If too large, reduce quality by 10% and retry
   ├─ fileToBase64()
   │  └─ Validate < 50,000 characters
   └─ Return { base64, originalSize, compressedSize }
   ↓
4. Update state with base64 URL
   ↓
5. Save to IndexedDB (products) or localStorage (settings)
   ↓
6. Sync to Google Sheets
   └─ Validation: Check imageUrl.length < 50,000 chars
```

---

## Core Functions

### `src/lib/imageCompression.ts`

#### `compressImage(file: File): Promise<File>`

Compresses image with dynamic quality adjustment.

**Algorithm:**

1. Resize to max 800px width (maintains aspect ratio)
2. Start with 80% JPEG quality
3. Estimate base64 size (fileSize \* 1.33)
4. If > 37KB, reduce quality by 10% and retry
5. Minimum quality: 30%

**Why 37KB target?**

- Google Sheets limit: 50,000 characters
- Base64 prefix adds ~100 chars: `data:image/jpeg;base64,`
- Buffer for safety: 37,000 chars ≈ 27KB file size

#### `fileToBase64(file: File): Promise<string>`

Converts file to base64 and validates size.

**Validation:**

- Checks final base64 string length
- Throws error if > 50,000 characters
- Includes size in error message for debugging

#### `processImageForUpload(file: File): Promise<{ base64, originalSize, compressedSize }>`

**The main entry point** - combines compression + validation.

**Returns:**

- `base64`: Ready-to-use data URL
- `originalSize`: Human-readable original size
- `compressedSize`: Human-readable compressed size

---

## Implementation

### Product Images (`src/components/ProductManager.tsx`)

```typescript
const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith("image/")) {
    /* error */
  }

  // Validate size (10MB max before compression)
  if (file.size > 10 * 1024 * 1024) {
    /* error */
  }

  try {
    // Use unified utility
    const { base64, originalSize, compressedSize } =
      await processImageForUpload(file);

    // Update product with base64 URL
    setNewProduct({ ...newProduct, imageUrl: base64 });

    // Show success with compression stats
    setToast({
      message: `Image uploaded! (${originalSize} → ${compressedSize})`,
      type: "success",
    });
  } catch (error) {
    // Shows specific error (e.g., "Image too large")
    setToast({ message: error.message, type: "error" });
  }
};
```

### QR Code Images (`src/components/Settings.tsx`)

```typescript
const handleQRCodeUpload = async (
  e: React.ChangeEvent<HTMLInputElement>,
  index: number
) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Same validation as products
  if (!file.type.startsWith("image/")) {
    /* error */
  }
  if (file.size > 5 * 1024 * 1024) {
    /* error */
  }

  try {
    // Use same unified utility
    const { base64, originalSize, compressedSize } =
      await processImageForUpload(file);

    // Update payment setting
    updatePaymentSetting(index, "qrCodeUrl", base64);

    setToast({
      message: `QR code uploaded (${originalSize} → ${compressedSize})!`,
      type: "success",
    });
  } catch (error) {
    setToast({ message: error.message, type: "error" });
  }
};
```

---

## Google Sheets Sync Validation

### `src/app/api/sheets/sync-products/route.ts`

```typescript
const values = (products as Product[]).map((p) => {
  const imageUrl = p.imageUrl || "";

  // Validate before syncing
  if (imageUrl.length > 50000) {
    throw new Error(
      `Product "${p.name}" has an image that's too large ` +
      `(${Math.round(imageUrl.length / 1000)}KB). ` +
      `Please use a smaller image or external URL.`
    );
  }

  return [p.id, p.name, p.price, p.category, p.sizes, imageUrl, ...];
});
```

**Why validate here?**

- Catches any images that slipped through client validation
- Prevents Google Sheets API errors
- Provides specific product name in error
- Allows graceful recovery

---

## Size Limits

| Limit Type                    | Value                             | Reason                     |
| ----------------------------- | --------------------------------- | -------------------------- |
| **Pre-compression file size** | 10MB (products)<br>5MB (QR codes) | Reasonable upload size     |
| **Target compressed file**    | ~27KB                             | Ensures base64 < 37KB      |
| **Base64 string length**      | 50,000 chars                      | Google Sheets cell limit   |
| **Compression quality range** | 30% - 80%                         | Balance quality vs. size   |
| **Image width**               | 800px max                         | Sufficient for POS display |

---

## Error Messages

### User-Friendly Errors

| Scenario                           | Message                                                         |
| ---------------------------------- | --------------------------------------------------------------- |
| Wrong file type                    | "Please select an image file"                                   |
| File too large (pre-compression)   | "Image must be less than 10MB"                                  |
| Still too large (post-compression) | "Image is too large (52KB). Maximum is 50KB after compression." |
| Compression failed                 | "Failed to compress image"                                      |
| Network error during sync          | "Failed to sync products"                                       |
| Specific product too large         | "Product 'Band T-Shirt' has an image that's too large (55KB)"   |

### Debug Logging

```typescript
console.log(`✅ Product image compressed: 2.1 MB → 24 KB (32145 chars)`);
console.log(`✅ QR code compressed for venmo: 400 KB → 18 KB (24576 chars)`);
console.error(
  `❌ Product "Hat" has an image that's too large: 52341 characters`
);
```

---

## Testing Checklist

### Product Images

- [ ] Upload small image (< 1MB) - should compress to ~10-20KB
- [ ] Upload large image (5-10MB) - should compress to ~20-30KB
- [ ] Upload huge image (> 10MB) - should show error before upload
- [ ] Upload non-image file - should show "Please select an image file"
- [ ] Products sync to Google Sheets without errors
- [ ] Images display correctly in POS interface
- [ ] Images persist after page refresh
- [ ] Offline mode: images display from IndexedDB

### QR Code Images

- [ ] Upload QR code PNG - should compress and display preview
- [ ] Upload QR code JPG - should compress and display preview
- [ ] Upload very simple QR (small) - should compress to ~5-10KB
- [ ] Upload complex QR (large) - should compress to ~15-25KB
- [ ] QR codes sync to Google Sheets without errors
- [ ] QR codes display in payment modal during checkout
- [ ] Can switch between upload and URL input
- [ ] Remove QR code works correctly

### Sync Validation

- [ ] Products with valid images sync successfully
- [ ] Products with oversized images show specific error
- [ ] Error message includes product name
- [ ] Sync bar shows "pending" status when image uploads
- [ ] Sync bar clears after successful sync
- [ ] Can retry sync after fixing oversized image

---

## Common Issues & Solutions

### Issue: "Failed to sync products" after image upload

**Cause:** Image base64 exceeds 50,000 character limit

**Solution:**

1. Check console for specific product name
2. Re-upload image (will compress more aggressively)
3. Or use external URL instead of base64

### Issue: Images look blurry/pixelated

**Cause:** Over-compression (quality < 40%)

**Solution:**

1. Start with smaller original image (< 2MB ideal)
2. Crop image to focus on product only
3. Use PNG for text/graphics, JPG for photos

### Issue: Upload button stuck on "Uploading..."

**Cause:** Compression taking too long or error not caught

**Solution:**

1. Check browser console for errors
2. Try smaller image
3. Refresh page if stuck

---

## Future Improvements

- [ ] **Progressive compression feedback** - Show quality % during compression
- [ ] **Image preview before upload** - Let user see compressed version
- [ ] **Batch compression** - Upload multiple products at once
- [ ] **External URL caching** - Download and compress external URLs
- [ ] **Image dimensions display** - Show "800x600" in preview
- [ ] **Smart crop detection** - Auto-crop whitespace
- [ ] **WebP format support** - Better compression for modern browsers

---

## File Locations

```
src/
├── lib/
│   └── imageCompression.ts          # ⭐ Core compression logic
├── components/
│   ├── ProductManager.tsx           # Product image uploads
│   └── Settings.tsx                 # QR code image uploads
└── app/
    └── api/
        └── sheets/
            └── sync-products/
                └── route.ts         # Sync validation
```

---

## Summary

✅ **Consolidated** - All image logic in one place  
✅ **Validated** - Size checks at upload AND sync  
✅ **Debugged** - Clear error messages with specifics  
✅ **Optimized** - Dynamic quality adjustment  
✅ **Reliable** - Works offline, syncs when online

**No more buggy experiences!** 🎉
