import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuthClient } from "@/lib/supabase/api-auth";
import { Product } from "@/types";

export async function POST(req: NextRequest) {
  try {
    // Authenticate with Google
    const { authClient, error } = await getGoogleAuthClient();
    if (error) return error;

    const { products, productsSheetId } = await req.json();

    if (!productsSheetId) {
      return NextResponse.json(
        { error: "Products sheet ID not provided" },
        { status: 400 }
      );
    }

    // Use the provided sheet ID
    const { google } = await import("googleapis");
    const sheets = google.sheets({ version: "v4", auth: authClient });

    // Clear existing data (except header)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: productsSheetId,
      range: "Products!A2:J",
    });

    // Prepare data - including inventory, showTextOnButton, and currencyPrices
    // Validate image URLs for Google Sheets cell limit (50,000 characters)
    const values = (products as Product[]).map((p) => {
      const imageUrl = p.imageUrl || "";

      // Check if image URL is too large for Google Sheets
      if (imageUrl.length > 50000) {
        console.error(
          `❌ Product "${p.name}" has an image that's too large: ${imageUrl.length} characters`
        );
        throw new Error(
          `Product "${p.name}" has an image that's too large (${Math.round(
            imageUrl.length / 1000
          )}KB). Please use a smaller image or external URL.`
        );
      }

      return [
        p.id,
        p.name,
        p.price,
        p.category,
        p.sizes?.join(", ") || "",
        imageUrl,
        p.description || "",
        p.inventory ? JSON.stringify(p.inventory) : "",
        p.showTextOnButton !== false ? "TRUE" : "FALSE", // Column I: Show text on button
        p.currencyPrices ? JSON.stringify(p.currencyPrices) : "", // Column J: Currency price overrides
      ];
    });

    if (values.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: productsSheetId,
        range: "Products!A2",
        valueInputOption: "RAW",
        requestBody: {
          values,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${products.length} products to Google Sheets`,
    });
  } catch (error) {
    console.error("Failed to sync products:", error);
    return NextResponse.json(
      {
        error: "Failed to sync products",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
