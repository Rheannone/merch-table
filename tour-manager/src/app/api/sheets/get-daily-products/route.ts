import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    const { spreadsheetId, date } = await req.json();

    if (!spreadsheetId || !date) {
      return NextResponse.json(
        { error: "Spreadsheet ID and date not provided" },
        { status: 400 }
      );
    }

    const { google } = await import("googleapis");
    const authClient = new google.auth.OAuth2();
    authClient.setCredentials({ access_token: session.accessToken });

    const sheets = google.sheets({ version: "v4", auth: authClient });

    // Fetch all sales data from Sales sheet
    // Columns: A=ID, B=Date, C=Items, D=Total, E=Actual, F=Discount, G=Payment, H=Hookup, I=Product Names, J=Sizes
    const salesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sales!B2:I", // Get Date (B), Items (C), and Product Names (I)
    });

    const salesData = salesResponse.data.values || [];

    // Filter sales for the specific date and aggregate product quantities
    const productCounts: { [productName: string]: number } = {};

    salesData.forEach((row) => {
      const saleDate = row[0]; // Column B (Date)
      const itemsColumn = row[1]; // Column C (Items) - e.g., "T-Shirt (M) x2, Vinyl x1"

      // Only process sales from the requested date
      if (saleDate === date) {
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
