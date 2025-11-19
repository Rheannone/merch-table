# 🖼️ SUPABASE STORAGE MIGRATION GUIDE

**Current System:** Base64 data URLs embedded in IndexedDB & Supabase  
**Proposed System:** Supabase Storage with CDN URLs  
**Migration Complexity:** Medium  
**Performance Gain:** HIGH 🚀

---

## 📊 **CURRENT SYSTEM ANALYSIS**

### **How It Works Now**

```
User selects image file
└─> processImageForUpload() compresses to ~37KB
    └─> Converts to base64 data URL
        └─> Stored as TEXT in product.imageUrl field
            └─> Synced to IndexedDB (local)
                └─> Synced to Supabase products.image_url (TEXT column)
```

### **Current Limitations**

❌ **Database Bloat:** Base64 adds +33% size overhead  
❌ **Slow Queries:** Large TEXT fields slow down SELECT operations  
❌ **No CDN:** Images served from database, not optimized  
❌ **No Caching:** Browser can't cache base64 efficiently  
❌ **Size Limits:** Must compress to 37KB (Google Sheets legacy constraint)  
❌ **Poor Performance:** Large payloads on every product sync

### **Current Storage Breakdown**

| Component           | Storage Type | Size Limit  | Issues              |
| ------------------- | ------------ | ----------- | ------------------- |
| **File Upload**     | FormData     | 10MB        | ✅ Fine             |
| **Compression**     | Canvas API   | 800px width | ⚠️ Quality loss     |
| **Base64 Encoding** | String       | ~37KB       | ❌ Artificial limit |
| **IndexedDB**       | TEXT blob    | ~50KB       | ❌ Inefficient      |
| **Supabase**        | TEXT column  | ~50KB       | ❌ Database bloat   |

---

## 🚀 **SUPABASE STORAGE SYSTEM**

### **How Supabase Storage Works**

Supabase Storage is an S3-compatible object storage service with:

- **CDN-backed** URLs for fast global delivery
- **Image transformations** (resize, crop, optimize)
- **Access control** via Row Level Security (RLS)
- **Automatic optimization** for web delivery
- **Cheap storage** (~$0.021/GB/month)

### **Proposed Architecture**

```
User selects image file
└─> Compress to reasonable size (~500KB max, 1200px width)
    └─> Upload to Supabase Storage bucket: "product-images"
        └─> Generate public/signed URL
            └─> Store URL in product.imageUrl field (just the URL, not the image)
                └─> Sync URL to IndexedDB
                    └─> Sync URL to Supabase products table
                        └─> Browser loads image from CDN
```

### **Storage Comparison**

| Storage Type      | Current (Base64)        | Proposed (Supabase)        |
| ----------------- | ----------------------- | -------------------------- |
| **Image Size**    | ~37KB (compressed)      | ~200-500KB (high quality)  |
| **Database Size** | ~50KB per product       | ~100 bytes per product     |
| **Load Speed**    | Slow (parse base64)     | Fast (CDN cached)          |
| **Quality**       | Low (heavy compression) | High (minimal compression) |
| **Browser Cache** | No                      | Yes (standard HTTP cache)  |
| **CDN**           | No                      | Yes (global edge cache)    |

---

## 📁 **SUPABASE STORAGE SETUP**

### **1. Create Storage Bucket**

**Via Supabase Dashboard:**

1. Go to **Storage** in Supabase Dashboard
2. Click **New Bucket**
3. Name: `product-images`
4. **Public:** ✅ Yes (for public product images)
5. **File size limit:** 5MB
6. **Allowed MIME types:** `image/jpeg, image/png, image/webp, image/gif`

**Via SQL (Alternative):**

```sql
-- Create bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);
```

### **2. Set Up RLS Policies**

**Policy: Allow authenticated users to upload**

```sql
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

**Policy: Everyone can read (public images)**

```sql
CREATE POLICY "Public product images are viewable by everyone"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');
```

**Policy: Users can update their own images**

```sql
CREATE POLICY "Users can update their own product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

**Policy: Users can delete their own images**

```sql
CREATE POLICY "Users can delete their own product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## 💻 **CODE IMPLEMENTATION**

### **Step 1: Create Upload Helper**

**New File:** `src/lib/supabase/storage.ts`

```typescript
import { createClient } from "./client";

/**
 * Upload product image to Supabase Storage
 * @param file - The image file to upload
 * @param productId - Unique product ID (used in filename)
 * @returns Public URL of uploaded image
 */
export async function uploadProductImage(
  file: File,
  productId: string
): Promise<string> {
  const supabase = createClient();

  // Get authenticated user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("User must be authenticated to upload images");
  }

  // Generate unique filename
  const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const fileName = `${user.id}/${productId}-${Date.now()}.${fileExt}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from("product-images")
    .upload(fileName, file, {
      cacheControl: "3600", // Cache for 1 hour
      upsert: true, // Overwrite if exists (useful for updates)
    });

  if (error) {
    console.error("Upload error:", error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("product-images").getPublicUrl(data.path);

  return publicUrl;
}

/**
 * Delete product image from Supabase Storage
 * @param imageUrl - The full URL of the image to delete
 */
export async function deleteProductImage(imageUrl: string): Promise<void> {
  const supabase = createClient();

  // Extract path from URL
  // Example URL: https://[project].supabase.co/storage/v1/object/public/product-images/user-id/product-123.jpg
  const urlParts = imageUrl.split("/product-images/");
  if (urlParts.length < 2) {
    console.warn("Invalid image URL format, cannot delete:", imageUrl);
    return;
  }

  const filePath = urlParts[1];

  const { error } = await supabase.storage
    .from("product-images")
    .remove([filePath]);

  if (error) {
    console.error("Failed to delete image:", error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }

  console.log("✅ Deleted image:", filePath);
}

/**
 * Compress image for upload (lighter compression than base64 version)
 * @param file - Original image file
 * @param maxWidth - Max width in pixels (default: 1200)
 * @param quality - JPEG quality 0-1 (default: 0.85)
 * @returns Compressed File object
 */
export async function compressImageForStorage(
  file: File,
  maxWidth: number = 1200,
  quality: number = 0.85
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw with high quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to compress image"));
              return;
            }

            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
  });
}

/**
 * Generate Supabase CDN URL with transformations
 * @param imageUrl - Base public URL
 * @param options - Transformation options
 * @returns Transformed image URL
 */
export function getTransformedImageUrl(
  imageUrl: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: "origin" | "webp";
  } = {}
): string {
  // Supabase uses render API for transformations
  // Example: /storage/v1/render/image/public/product-images/file.jpg?width=400&quality=80

  const url = new URL(imageUrl);
  const pathParts = url.pathname.split("/object/public/");

  if (pathParts.length < 2) return imageUrl; // Not a Supabase storage URL

  const basePath =
    url.origin + "/storage/v1/render/image/public/" + pathParts[1];
  const params = new URLSearchParams();

  if (options.width) params.append("width", options.width.toString());
  if (options.height) params.append("height", options.height.toString());
  if (options.quality) params.append("quality", options.quality.toString());
  if (options.format) params.append("format", options.format);

  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}
```

---

### **Step 2: Update API Route**

**File:** `src/app/api/upload-image/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import {
  uploadProductImage,
  compressImageForStorage,
} from "@/lib/supabase/storage";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get("image") as File;
    const productId = formData.get("productId") as string;

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID required" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!image.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    if (image.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image must be less than 5MB" },
        { status: 400 }
      );
    }

    // Compress image for web delivery
    const compressedImage = await compressImageForStorage(image);

    // Upload to Supabase Storage
    const publicUrl = await uploadProductImage(compressedImage, productId);

    return NextResponse.json({
      success: true,
      url: publicUrl, // Now returns CDN URL instead of base64
    });
  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to upload image. Please try again.",
      },
      { status: 500 }
    );
  }
}
```

---

### **Step 3: Update ProductManager Component**

**File:** `src/components/ProductManager.tsx`

**Changes:**

```typescript
// OLD: Import base64 compression
import { processImageForUpload } from "@/lib/imageCompression";

// NEW: Import Supabase storage helpers
import {
  uploadProductImage,
  compressImageForStorage,
  deleteProductImage,
} from "@/lib/supabase/storage";

// ...

// OLD: handleImageUpload
const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    setIsUploading(true);
    setUploadProgress("Compressing image...");

    const { base64, originalSize, compressedSize } =
      await processImageForUpload(file);

    setNewProduct({ ...newProduct, imageUrl: base64 });

    setToast({
      message: `Image uploaded! (${originalSize} → ${compressedSize})`,
      type: "success",
    });
  } catch (error) {
    // ...error handling
  }
};

// NEW: handleImageUpload with Supabase Storage
const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Validate file size (5MB limit)
  if (file.size > 5 * 1024 * 1024) {
    setToast({
      message: "Image must be less than 5MB",
      type: "error",
    });
    return;
  }

  try {
    setIsUploading(true);
    setUploadProgress("Compressing image...");

    // Generate temporary product ID if creating new product
    const productId = newProduct.id || nanoid();

    // Compress image (lighter compression than base64)
    const compressedFile = await compressImageForStorage(file);

    setUploadProgress("Uploading to cloud...");

    // Upload to Supabase Storage
    const publicUrl = await uploadProductImage(compressedFile, productId);

    // Update product with CDN URL
    setNewProduct({
      ...newProduct,
      id: productId, // Ensure ID is set
      imageUrl: publicUrl,
    });

    const originalSize = (file.size / 1024).toFixed(0) + "KB";
    const uploadedSize = (compressedFile.size / 1024).toFixed(0) + "KB";

    setToast({
      message: `Image uploaded! (${originalSize} → ${uploadedSize})`,
      type: "success",
    });

    console.log(`✅ Image uploaded to Supabase Storage: ${publicUrl}`);
  } catch (error) {
    console.error("Upload error:", error);
    setToast({
      message:
        error instanceof Error
          ? error.message
          : "Failed to upload image. Please try again.",
      type: "error",
    });
  } finally {
    setIsUploading(false);
    setUploadProgress("");
    e.target.value = "";
  }
};

// NEW: Add image deletion when product is deleted
const handleDeleteProduct = async (id: string, imageUrl?: string) => {
  if (!confirm("Delete this product?")) return;

  try {
    // Delete image from Supabase Storage if it exists
    if (imageUrl && imageUrl.includes("supabase.co/storage")) {
      await deleteProductImage(imageUrl);
      console.log("✅ Product image deleted from storage");
    }

    // Delete product from database
    await onDeleteProduct(id);

    setToast({
      message: "Product deleted successfully",
      type: "success",
    });
  } catch (error) {
    console.error("Delete error:", error);
    setToast({
      message: "Failed to delete product",
      type: "error",
    });
  }
};
```

---

### **Step 4: Optimize Image Display**

**Use transformed URLs for thumbnails:**

```typescript
// In product grid/list view
import { getTransformedImageUrl } from "@/lib/supabase/storage";

{
  product.imageUrl && (
    <img
      src={getTransformedImageUrl(product.imageUrl, {
        width: 200, // Thumbnail size
        quality: 75,
        format: "webp",
      })}
      alt={product.name}
      loading="lazy"
      className="w-full h-full object-cover"
    />
  );
}

// In product detail view (larger)
{
  product.imageUrl && (
    <img
      src={getTransformedImageUrl(product.imageUrl, {
        width: 800, // Full size
        quality: 85,
        format: "webp",
      })}
      alt={product.name}
      className="w-full h-full object-contain"
    />
  );
}
```

---

## 📦 **MIGRATION STRATEGY**

### **Option 1: Hard Cutover (Recommended for Small Catalogs)**

**Best for:** <50 products, fresh start acceptable

1. Enable Supabase Storage upload (new code)
2. Keep base64 URLs working (backward compatibility)
3. Add notice: "Re-upload product images for better quality"
4. Users gradually re-upload images
5. Old base64 URLs still work, new uploads use Supabase

**Pros:** Simple, no migration script needed  
**Cons:** Users must manually re-upload

---

### **Option 2: Automatic Migration (Recommended for Large Catalogs)**

**Best for:** 50+ products, seamless transition

**Migration Script:** `scripts/migrate-images-to-storage.ts`

```typescript
import { createClient } from "@/lib/supabase/client";
import { uploadProductImage } from "@/lib/supabase/storage";

async function migrateBase64ImagesToStorage() {
  const supabase = createClient();

  // Get all products with base64 images
  const { data: products, error } = await supabase
    .from("products")
    .select("id, image_url, user_id")
    .like("image_url", "data:image/%");

  if (error || !products) {
    console.error("Failed to fetch products:", error);
    return;
  }

  console.log(`Found ${products.length} products with base64 images`);

  for (const product of products) {
    try {
      console.log(`Migrating product ${product.id}...`);

      // Convert base64 to File
      const base64Data = product.image_url;
      const blob = await (await fetch(base64Data)).blob();
      const file = new File([blob], `${product.id}.jpg`, {
        type: "image/jpeg",
      });

      // Upload to Supabase Storage
      const publicUrl = await uploadProductImage(file, product.id);

      // Update product record
      await supabase
        .from("products")
        .update({ image_url: publicUrl })
        .eq("id", product.id);

      console.log(`✅ Migrated ${product.id}: ${publicUrl}`);
    } catch (error) {
      console.error(`❌ Failed to migrate ${product.id}:`, error);
    }
  }

  console.log("Migration complete!");
}

// Run migration
migrateBase64ImagesToStorage();
```

**Run migration:**

```bash
npx tsx scripts/migrate-images-to-storage.ts
```

---

### **Option 3: Hybrid Approach (Maximum Compatibility)**

**Support both base64 AND Supabase Storage:**

```typescript
// Helper to detect image type
function isBase64Image(url: string): boolean {
  return url.startsWith("data:image/");
}

function isSupabaseStorageUrl(url: string): boolean {
  return url.includes("supabase.co/storage");
}

// Render with appropriate handling
{
  product.imageUrl && (
    <img
      src={
        isSupabaseStorageUrl(product.imageUrl)
          ? getTransformedImageUrl(product.imageUrl, { width: 200 })
          : product.imageUrl // Keep base64 as-is for legacy
      }
      alt={product.name}
      loading="lazy"
    />
  );
}
```

---

## 🎯 **BENEFITS SUMMARY**

| Metric               | Base64 (Current)        | Supabase Storage           |
| -------------------- | ----------------------- | -------------------------- |
| **Image Quality**    | Low (heavy compression) | High (minimal compression) |
| **Database Size**    | 50KB per image          | 100 bytes per image        |
| **Load Speed**       | 2-3s (parse base64)     | <500ms (CDN cache)         |
| **Bandwidth**        | High (in every query)   | Low (CDN edge delivery)    |
| **Browser Cache**    | ❌ No                   | ✅ Yes                     |
| **CDN**              | ❌ No                   | ✅ Yes (global)            |
| **Transformations**  | ❌ No                   | ✅ Yes (resize, format)    |
| **Cost**             | Database storage        | $0.021/GB/month            |
| **Image Size Limit** | 37KB                    | 5MB                        |
| **Quality Loss**     | High (80% compression)  | Low (15% compression)      |

---

## 💰 **COST COMPARISON**

### **Current (Base64 in Database)**

- 100 products × 50KB = 5MB database storage
- Database queries include image data = slow
- **Cost:** Included in database plan, but hurts performance

### **Supabase Storage**

- 100 products × 300KB = 30MB storage
- **Storage Cost:** $0.021/GB × 0.03GB = **$0.0006/month**
- **CDN Bandwidth:** Free for first 200GB/month
- **Total:** ~$0.00 for small catalogs

**Winner:** Supabase Storage (cheaper + faster)

---

## ✅ **RECOMMENDED APPROACH**

For your use case, I recommend:

### **Phase 1: Enable Supabase Storage (Now)**

1. Create `product-images` bucket in Supabase
2. Set up RLS policies
3. Create `src/lib/supabase/storage.ts` helper
4. Update upload flow to use Supabase Storage
5. Keep base64 support for backward compatibility

### **Phase 2: Migration (Optional)**

- If <50 products → Let users re-upload naturally
- If 50+ products → Run migration script

### **Phase 3: Optimize (Later)**

- Add image transformations (thumbnails, WebP)
- Implement lazy loading
- Add placeholder images during load

---

## 🚨 **IMPORTANT NOTES**

1. **Backup First:** Export all products before migration
2. **RLS Policies:** Ensure users can only delete their own images
3. **Cleanup:** Consider adding cleanup job for orphaned images
4. **Validation:** Check image URLs after migration
5. **Rollback Plan:** Keep base64 support during transition

---

**Want me to implement this? I can:**

1. Create the Supabase Storage helper functions
2. Update the upload flow in ProductManager
3. Add image deletion on product delete
4. Create the migration script
5. Update all image displays to use transformations

Just say the word! 🚀
