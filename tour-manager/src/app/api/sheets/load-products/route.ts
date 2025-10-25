import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { google } from "googleapis";
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

    const { productsSheetId } = await req.json();

    if (!productsSheetId) {
      return NextResponse.json(
        { error: "Products sheet ID not provided" },
        { status: 400 }
      );
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });

    const sheets = google.sheets({ version: "v4", auth });

    // Read products from the sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: productsSheetId,
      range: "Products!A2:I", // Updated to include showTextOnButton column
    });

    const rows = response.data.values || [];

    // Convert rows to Product objects
    const products: Product[] = rows.map((row) => {
      let inventory: { [key: string]: number } | undefined;

      // Parse inventory JSON if it exists
      if (row[7]) {
        try {
          inventory = JSON.parse(row[7]);
        } catch (e) {
          console.warn("Failed to parse inventory for product:", row[1], e);
        }
      }

      return {
        id: row[0] || "",
        name: row[1] || "",
        price: Number.parseFloat(row[2]) || 0,
        category: row[3] || "Other",
        sizes: row[4]
          ? row[4]
              .split(",")
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 0)
          : undefined,
        imageUrl: row[5] || undefined,
        description: row[6] || undefined,
        inventory,
        showTextOnButton: row[8] !== "FALSE", // Column I: defaults to true
      };
    });

    return NextResponse.json({
      success: true,
      products,
    });
  } catch (error) {
    console.error("Failed to load products:", error);
    return NextResponse.json(
      {
        error: "Failed to load products from Google Sheets",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
