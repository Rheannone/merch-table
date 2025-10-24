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

    // Prepare data
    const values = (sales as Sale[]).map((sale) => [
      sale.id,
      new Date(sale.timestamp).toLocaleString(),
      sale.items
        .map((item) => {
          const sizeInfo = item.size ? ` (${item.size})` : "";
          return `${item.productName}${sizeInfo} x${item.quantity}`;
        })
        .join(", "),
      sale.total.toFixed(2),
      sale.paymentMethod,
      sale.isHookup ? "Hookup" : "",
    ]);

    if (values.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: salesSheetId,
        range: "Sales!A2",
        valueInputOption: "RAW",
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
