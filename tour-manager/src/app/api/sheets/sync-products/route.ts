import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { Product } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    const { products, productsSheetId } = await req.json();

    if (!productsSheetId) {
      return NextResponse.json(
        { error: "Products sheet ID not provided" },
        { status: 400 }
      );
    }

    // Use the provided sheet ID
    const { google } = await import("googleapis");
    const authClient = new google.auth.OAuth2();
    authClient.setCredentials({ access_token: session.accessToken });

    const sheets = google.sheets({ version: "v4", auth: authClient });

    // Clear existing data (except header)
    await sheets.spreadsheets.values.clear({
      spreadsheetId: productsSheetId,
      range: "Products!A2:D",
    });

    // Prepare data
    const values = (products as Product[]).map((p) => [
      p.id,
      p.name,
      p.price,
      p.category,
    ]);

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
