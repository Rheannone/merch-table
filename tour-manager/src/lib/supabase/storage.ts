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

  // Generate unique filename with timestamp
  const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const timestamp = Date.now();
  const fileName = `${user.id}/${productId}-${timestamp}.${fileExt}`;

  console.log(`📤 Uploading image to: product-images/${fileName}`);

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from("product-images")
    .upload(fileName, file, {
      cacheControl: "3600", // Cache for 1 hour
      upsert: true, // Overwrite if exists (useful for updates)
    });

  if (error) {
    console.error("❌ Storage upload error:", error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("product-images").getPublicUrl(data.path);

  console.log(`✅ Image uploaded successfully: ${publicUrl}`);
  return publicUrl;
}

/**
 * Delete product image from Supabase Storage
 * @param imageUrl - The full URL of the image to delete
 */
export async function deleteProductImage(imageUrl: string): Promise<void> {
  // Only delete Supabase Storage images (not base64 or external URLs)
  if (!imageUrl.includes("supabase.co/storage")) {
    console.log("⏭️  Skipping deletion (not a Supabase Storage URL)");
    return;
  }

  const supabase = createClient();

  // Extract path from URL
  // Example URL: https://[project].supabase.co/storage/v1/object/public/product-images/user-id/product-123.jpg
  const urlParts = imageUrl.split("/product-images/");
  if (urlParts.length < 2) {
    console.warn("⚠️  Invalid image URL format, cannot delete:", imageUrl);
    return;
  }

  const filePath = urlParts[1];

  console.log(`🗑️  Deleting image: ${filePath}`);

  const { error } = await supabase.storage
    .from("product-images")
    .remove([filePath]);

  if (error) {
    console.error("❌ Failed to delete image:", error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }

  console.log("✅ Image deleted successfully");
}

/**
 * Compress image for upload to Supabase Storage
 * Higher quality than base64 version since we don't have size constraints
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

        // Convert to blob with high quality
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

            console.log(
              `🖼️  Image compressed: ${(file.size / 1024).toFixed(0)}KB → ${(
                compressedFile.size / 1024
              ).toFixed(0)}KB`
            );

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
 * Note: Supabase uses render API for image transformations
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
  // Only transform Supabase Storage URLs
  if (!imageUrl.includes("supabase.co/storage")) {
    return imageUrl;
  }

  const url = new URL(imageUrl);
  const pathParts = url.pathname.split("/object/public/");

  if (pathParts.length < 2) return imageUrl;

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

/**
 * Check if a URL is a Supabase Storage URL
 */
export function isSupabaseStorageUrl(url: string): boolean {
  return url.includes("supabase.co/storage");
}

/**
 * Check if a URL is a base64 data URL
 */
export function isBase64Image(url: string): boolean {
  return url.startsWith("data:image/");
}
