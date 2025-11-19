import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Validate file size (10MB limit)
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

    // Get authenticated user from server-side client
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "User must be authenticated to upload images" },
        { status: 401 }
      );
    }

    // Generate unique filename with timestamp
    const fileExt = image.name.split(".").pop()?.toLowerCase() || "jpg";
    const timestamp = Date.now();
    const fileName = `${user.id}/${productId}-${timestamp}.${fileExt}`;

    console.log(`📤 Uploading image to: product-images/${fileName}`);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("product-images")
      .upload(fileName, image, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error("❌ Storage upload error:", error);
      return NextResponse.json(
        { error: `Failed to upload image: ${error.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("product-images").getPublicUrl(data.path);

    console.log(`✅ Image upload complete: ${publicUrl}`);

    return NextResponse.json({
      success: true,
      url: publicUrl, // CDN URL instead of base64
      size: `${(image.size / 1024).toFixed(0)}KB`,
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
