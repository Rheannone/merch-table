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

    // Validate file size (10MB limit before compression)
    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image must be less than 10MB" },
        { status: 400 }
      );
    }

    console.log(
      `📸 Processing image upload for product ${productId}: ${image.name} (${(
        image.size / 1024
      ).toFixed(0)}KB)`
    );

    // Compress image for web delivery (high quality)
    const compressedImage = await compressImageForStorage(image);

    // Upload to Supabase Storage
    const publicUrl = await uploadProductImage(compressedImage, productId);

    console.log(`✅ Image upload complete: ${publicUrl}`);

    return NextResponse.json({
      success: true,
      url: publicUrl, // CDN URL instead of base64
      originalSize: `${(image.size / 1024).toFixed(0)}KB`,
      compressedSize: `${(compressedImage.size / 1024).toFixed(0)}KB`,
    });
  } catch (error) {
    console.error("❌ Image upload error:", error);
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
