import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { Sale } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    const { sales, salesSheetId } = await req.json();

    if (!salesSheetId) {
      return NextResponse.json(
        { error: "Sales sheet ID not provided" },
        { status: 400 }
      );
    }

    const { google } = await import("googleapis");
    const authClient = new google.auth.OAuth2();
    authClient.setCredentials({ access_token: session.accessToken });

    const sheets = google.sheets({ version: "v4", auth: authClient });

    // Prepare data with new columns for analytics
    const values = (sales as Sale[]).map((sale) => {
      // Extract product names (comma-separated)
      const productNames = sale.items
        .map((item) => item.productName)
        .join(", ");

      // Extract sizes (comma-separated, filter out items without sizes)
      const sizes = sale.items
        .filter((item) => item.size)
        .map((item) => item.size)
        .join(", ");

      // Format date as YYYY-MM-DD in local timezone for Google Sheets
      const saleDate = new Date(sale.timestamp);
      const year = saleDate.getFullYear();
      const month = String(saleDate.getMonth() + 1).padStart(2, "0");
      const day = String(saleDate.getDate()).padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;

      return [
        sale.id,
        formattedDate, // Local date in YYYY-MM-DD format
        sale.items
          .map((item) => {
            const sizeInfo = item.size ? ` (${item.size})` : "";
            return `${item.productName}${sizeInfo} x${item.quantity}`;
          })
          .join(", "),
        sale.total.toFixed(2), // Total cart value
        sale.actualAmount.toFixed(2), // Actual money received
        sale.discount ? sale.discount.toFixed(2) : "0.00", // Discount/hookup amount
        sale.paymentMethod,
        sale.isHookup ? "Yes" : "No", // For backward compatibility
        productNames, // New: Individual product names
        sizes || "N/A", // New: Individual sizes
      ];
    });

    if (values.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: salesSheetId,
        range: "Sales!A2",
        valueInputOption: "USER_ENTERED", // Changed from RAW to properly interpret numbers
        requestBody: {
          values,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${sales.length} sales to Google Sheets`,
      salesSynced: sales.length,
    });
  } catch (error) {
    console.error("Failed to sync sales:", error);
    return NextResponse.json(
      {
        error: "Failed to sync sales",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
