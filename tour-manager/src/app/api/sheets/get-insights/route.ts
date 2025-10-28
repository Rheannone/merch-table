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

    const { spreadsheetId } = await req.json();

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "Spreadsheet ID not provided" },
        { status: 400 }
      );
    }

    const { google } = await import("googleapis");
    const authClient = new google.auth.OAuth2();
    authClient.setCredentials({ access_token: session.accessToken });

    const sheets = google.sheets({ version: "v4", auth: authClient });

    // Check if Insights sheet exists
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const existingSheet = spreadsheet.data.sheets?.find(
      (sheet) => sheet.properties?.title === "Insights"
    );

    if (!existingSheet) {
      return NextResponse.json(
        { error: "Insights sheet not found" },
        { status: 404 }
      );
    }

    // Fetch Quick Stats (B5:B7) and overall top item/size
    const quickStatsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Insights!B5:B7",
    });

    const quickStatsValues = quickStatsResponse.data.values || [];

    // Detect payment methods from Sales sheet
    const salesDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sales!G2:G", // Payment Method column
    });

    const salesPaymentData = salesDataResponse.data.values || [];
    const paymentMethods = Array.from(
      new Set(
        salesPaymentData
          .filter((row) => row[0]) // Filter out empty values
          .map((row) => row[0].trim())
      )
    ).sort();

    // Use default payment methods if no sales exist yet
    const defaultPaymentMethods = ["Cash", "Venmo", "Card", "Other"];
    const paymentMethodsList =
      paymentMethods.length > 0 ? paymentMethods : defaultPaymentMethods;

    // Calculate the column positions dynamically
    const topItemColumnIndex = 3 + paymentMethodsList.length; // After Date, Sales, Revenue, and all payment columns
    const topSizeColumnIndex = topItemColumnIndex + 1;
    const topItemColumn = String.fromCharCode(65 + topItemColumnIndex);
    const topSizeColumn = String.fromCharCode(65 + topSizeColumnIndex);

    // Get overall top item and size from first data row (row 12)
    const topItemsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `Insights!${topItemColumn}12:${topSizeColumn}12`,
    });

    const topItemsValues = topItemsResponse.data.values || [];

    const quickStats = {
      totalRevenue: Number.parseFloat(quickStatsValues[0]?.[0] || "0"),
      numberOfSales: Number.parseInt(quickStatsValues[1]?.[0] || "0", 10),
      averageSale: Number.parseFloat(quickStatsValues[2]?.[0] || "0"),
      topItem: topItemsValues[0]?.[0] || "N/A",
      topSize: topItemsValues[0]?.[1] || "N/A",
    };

    // Fetch Daily Revenue Data with dynamic payment columns
    const paymentEndColumnIndex = 3 + paymentMethodsList.length;
    const paymentEndColumn = String.fromCharCode(
      65 + paymentEndColumnIndex - 1
    ); // -1 because we want the last payment column

    const dailyRevenueResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `Insights!A12:${paymentEndColumn}`,
    });

    const dailyRevenueValues = dailyRevenueResponse.data.values || [];
    const dailyRevenue = dailyRevenueValues
      .filter((row) => row[0]) // Filter out empty rows
      .map((row) => {
        const payments: { [key: string]: number } = {};
        paymentMethodsList.forEach((method, index) => {
          payments[method] = Number.parseFloat(row[3 + index] || "0");
        });

        return {
          date: row[0] || "",
          numberOfSales: Number.parseInt(row[1] || "0", 10),
          actualRevenue: Number.parseFloat(row[2] || "0"),
          payments,
        };
      });

    return NextResponse.json({
      success: true,
      quickStats,
      dailyRevenue,
      paymentMethods: paymentMethodsList,
    });
  } catch (error) {
    console.error("Error fetching insights data:", error);
    return NextResponse.json(
      { error: "Failed to fetch insights data" },
      { status: 500 }
    );
  }
}
