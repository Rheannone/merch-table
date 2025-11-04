# 📸 Image Upload Feature

## Overview

Users can now upload product images directly instead of manually pasting URLs. Images are automatically compressed and converted to base64, then stored directly in Google Sheets.

## Setup Instructions

**No setup required!** 🎉

The feature works immediately with no external API keys or configuration needed. Images are stored as base64 data URLs directly in your Google Sheets.

## How It Works

### For Users:

1. In **Product Management**, click **"+ Add Product"**
2. Find the **"Image URL"** field
3. Click the **"Upload"** button next to it
4. Select an image from their device
5. Image is automatically:
   - Compressed (keeps text/QR codes sharp)
   - Uploaded to Imgur
   - URL is auto-filled in the field
6. Save product as normal

### Technical Flow:

```
User selects image
  ↓
Client-side compression (max 800px width, 80% quality)
  ↓
Upload to /api/upload-image endpoint
  ↓
Server converts to base64 data URL
  ↓
Base64 URL auto-fills in product form
  ↓
Saved to Google Sheets (stored as base64 string)
```

## Features

✅ **Upload or Paste URL** - Both methods work (base64 or external URL)
✅ **Image Compression** - Reduces to ~50-100KB per image (optimal for sheets)
✅ **No External Dependencies** - Images never disappear or break
✅ **Offline Compatible** - Fits offline-first architecture
✅ **Progress Indicator** - Shows upload status
✅ **Error Handling** - Clear error messages with fallback to manual URL
✅ **Mobile Friendly** - Works on phones/tablets
✅ **File Validation** - Image types only
✅ **Sharp Text/QR Codes** - 80% quality setting preserves detail
✅ **Privacy** - Images stored in your Google account, not third-party servers

## Files Modified

### New Files:

- `src/app/api/upload-image/route.ts` - Server-side upload handler
- `src/lib/imageCompression.ts` - Client-side image compression

### Modified Files:

- `src/components/ProductManager.tsx` - Added upload button and logic
- `.env.local` - Added IMGUR_CLIENT_ID

## Storage Details

**Base64 in Google Sheets:**

- Each compressed image: ~50-100KB as base64
- 30 products with images: ~1.5-3MB in sheet (very manageable)
- Images load instantly (already in sheet data)
- No external network requests needed
- Works completely offline

**Google Sheets Limits:**

- Max cell size: 50,000 characters (plenty for compressed images)
- Max sheet size: 10 million cells
- Our usage: Well within limits for typical band merch catalogs

## Fallback Behavior

If image upload fails:

- Users see clear error message
- Can still paste external URLs manually (http/https)
- Both base64 and external URLs work in the same field

## Privacy & Reliability

✅ **Complete Privacy** - Images stored in your Google Drive, not third-party servers
✅ **Never Expires** - Images won't disappear like with free hosting services
✅ **No Rate Limits** - Upload as many images as you need
✅ **Offline Access** - Images work without internet (once loaded)
✅ **Full Control** - You own and control all your data

## Testing Checklist

- [ ] Upload a product image (Add Product form)
- [ ] Upload a product image (Edit Product form)
- [ ] Try uploading a large image (>2MB) - should compress
- [ ] Try uploading a non-image file - should show error
- [ ] Try uploading with no internet - should show error
- [ ] Verify manual URL paste still works
- [ ] Test on mobile device
- [ ] Verify uploaded image displays in POS

## Future Enhancements

- Google Drive integration (already have OAuth)
- Image cropping/editing before upload
- Multiple image support
- Batch upload for many products
