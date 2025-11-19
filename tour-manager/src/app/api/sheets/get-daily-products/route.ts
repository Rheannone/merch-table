import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuthClient } from "@/lib/supabase/api-auth";
import { google } from "googleapis";
import { SALES_COLUMNS, SALES_COL_LETTERS } from "@/lib/sheetSchema";

export async function POST(req: NextRequest) {
  try {
    const authResult = await getGoogleAuthClient();
    if ("error" in authResult) {
      return authResult.error;
    }

    const { spreadsheetId, date } = await req.json();

    if (!spreadsheetId || !date) {
      return NextResponse.json(
        { error: "Spreadsheet ID and date not provided" },
        { status: 400 }
      );
    }

    const sheets = google.sheets({
      version: "v4",
      auth: authResult.authClient,
    });

    // Fetch all sales data from Sales sheet
    // Use column constants instead of hardcoded ranges
    const salesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `Sales!${SALES_COL_LETTERS.DATE}2:${SALES_COL_LETTERS.PRODUCT_NAMES}`, // Get Date (B) through Product Names (I)
    });

    const salesData = salesResponse.data.values || [];

    // Filter sales for the specific date and aggregate product quantities
    const productCounts: { [productName: string]: number } = {};

    // Normalize the target date to compare (handle both "10/26/2025" and "2025-10-26" formats)
    const normalizeDate = (dateStr: string): string => {
      if (!dateStr) return "";

      // If format is "MM/DD/YYYY" or "M/D/YYYY", convert to "YYYY-MM-DD"
      if (dateStr.includes("/")) {
        const parts = dateStr.split("/");
        if (parts.length === 3) {
          const month = parts[0].padStart(2, "0");
          const day = parts[1].padStart(2, "0");
          const year = parts[2];
          return `${year}-${month}-${day}`;
        }
      }

      // Already in "YYYY-MM-DD" format
      return dateStr;
    };

    const normalizedTargetDate = normalizeDate(date);

    salesData.forEach((row) => {
      const saleDate = row[SALES_COLUMNS.DATE - 1]; // Column B (Date) - adjust for slice starting at B
      const itemsColumn = row[SALES_COLUMNS.ITEMS - 1]; // Column C (Items)

      // Normalize both dates for comparison
      const normalizedSaleDate = normalizeDate(saleDate);

      // Only process sales from the requested date
      if (normalizedSaleDate === normalizedTargetDate) {
        // Parse the Items column to extract quantities
        // Format: "Product (Size) x2, Product2 x1" or "Product x3"
        const itemParts =
          itemsColumn?.split(",").map((s: string) => s.trim()) || [];

        itemParts.forEach((itemStr: string) => {
          // Extract product name and quantity
          // Pattern: "Product Name (optional size) xQuantity"
          const match = itemStr.match(/^(.+?)\s*(?:\([^)]+\))?\s*x(\d+)$/);

          if (match) {
            const productName = match[1].trim();
            const quantity = parseInt(match[2], 10);

            if (productCounts[productName]) {
              productCounts[productName] += quantity;
            } else {
              productCounts[productName] = quantity;
            }
          }
        });
      }
    });

    // Convert to array and sort by quantity (descending)
    const productBreakdown = Object.entries(productCounts)
      .map(([productName, quantity]) => ({
        productName,
        quantity,
      }))
      .sort((a, b) => b.quantity - a.quantity);

    console.log(
      `✅ Found ${productBreakdown.length} products for date ${date} (normalized: ${normalizedTargetDate})`
    );

    return NextResponse.json({
      success: true,
      date,
      productBreakdown,
    });
  } catch (error) {
    console.error("Error fetching daily product breakdown:", error);
    return NextResponse.json(
      { error: "Failed to fetch daily product breakdown" },
      { status: 500 }
    );
  }
}
