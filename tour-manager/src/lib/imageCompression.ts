// Google Sheets cell limit is 50,000 characters
// Base64 adds ~33% overhead, so we target ~37KB compressed file size
const GOOGLE_SHEETS_CHAR_LIMIT = 50000;
const TARGET_BASE64_SIZE = 37000; // Leave buffer for data URL prefix

/**
 * Compress an image file for base64 storage in Google Sheets
 * - Resizes to max 800px width (sufficient for POS display)
 * - Compresses with dynamic quality to stay under Google Sheets limits
 * - Optimized for Google Sheets storage
 */
export async function compressImage(file: File): Promise<File> {
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

        // Calculate new dimensions (max 800px width for base64 storage)
        let width = img.width;
        let height = img.height;
        const maxWidth = 800;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw image with high quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Try compression with decreasing quality until it fits
        let quality = 0.8; // Start at 80%
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Failed to compress image"));
                return;
              }

              // Check if size is acceptable
              // Base64 encoding adds ~33% overhead
              const estimatedBase64Size = blob.size * 1.33;
              
              if (estimatedBase64Size > TARGET_BASE64_SIZE && quality > 0.3) {
                // Too large, try lower quality
                quality -= 0.1;
                tryCompress();
                return;
              }

              // Create new File from blob
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

        tryCompress();
      };
      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };
    };
    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
  });
}

/**
 * Convert file to base64 and validate size for Google Sheets
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      
      // Validate size
      if (base64String.length > GOOGLE_SHEETS_CHAR_LIMIT) {
        reject(new Error(`Image is too large (${formatFileSize(base64String.length)}). Maximum is 50KB after compression.`));
        return;
      }
      
      resolve(base64String);
    };
    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Full image upload process: compress, convert to base64, validate
 */
export async function processImageForUpload(file: File): Promise<{
  base64: string;
  originalSize: string;
  compressedSize: string;
}> {
  // Compress image
  const compressedFile = await compressImage(file);
  const originalSize = formatFileSize(file.size);
  const compressedSize = formatFileSize(compressedFile.size);
  
  // Convert to base64 and validate
  const base64 = await fileToBase64(compressedFile);
  
  return {
    base64,
    originalSize,
    compressedSize,
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`;
}
