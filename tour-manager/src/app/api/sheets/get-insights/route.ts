import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import {
  SALES_COL_LETTERS,
  INSIGHTS_FIXED_COLUMNS,
  DEFAULT_PAYMENT_METHODS,
  normalizePaymentMethod,
  getColumnLetter,
} from "@/lib/sheetSchema";

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
      range: `Sales!${SALES_COL_LETTERS.PAYMENT_METHOD}2:${SALES_COL_LETTERS.PAYMENT_METHOD}`, // Payment Method column
    });

    const salesPaymentData = salesDataResponse.data.values || [];
    const paymentMethods = Array.from(
      new Set(
        salesPaymentData
          .filter((row) => row[0]) // Filter out empty values
          .map((row) => normalizePaymentMethod(row[0].trim())) // Normalize to Title Case
      )
    ).sort();

    // Use default payment methods if no sales exist yet
    const paymentMethodsList =
      paymentMethods.length > 0 ? paymentMethods : [...DEFAULT_PAYMENT_METHODS];

    // Check if Insights sheet schema matches current payment methods
    // Read the header row to see what payment method columns exist
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Insights!A11:Z11", // Row 11 has the headers
    });

    const headerRow = headerResponse.data.values?.[0] || [];

    // Extract payment method column headers (they end with " Revenue")
    // Expected order: Date, Number of Sales, Actual Revenue, Tips, [Payment Method Revenue...], Top Item, Top Size
    const existingPaymentHeaders = headerRow
      .slice(4) // Skip Date, Number of Sales, Actual Revenue, Tips (first 4 columns)
      .filter((header) => header && header.endsWith(" Revenue"))
      .map((header) => header.replace(" Revenue", ""));

    // Check if payment methods match
    const paymentMethodsChanged =
      existingPaymentHeaders.length !== paymentMethodsList.length ||
      !existingPaymentHeaders.every(
        (method, index) => method === paymentMethodsList[index]
      );

    // Calculate the column positions dynamically
    // New order: Date (A), Sales (B), Revenue (C), Tips (D), Payment Methods (E+), Top Item, Top Size
    const tipsColumnIndex = INSIGHTS_FIXED_COLUMNS.TIPS; // Fixed column D
    const paymentStartColumnIndex = INSIGHTS_FIXED_COLUMNS.TIPS + 1; // Payment methods start at column E (after Tips)
    const topItemColumnIndex =
      paymentStartColumnIndex + paymentMethodsList.length; // After all payment methods
    const topSizeColumnIndex = topItemColumnIndex + 1;
    const topItemColumn = getColumnLetter(topItemColumnIndex);
    const topSizeColumn = getColumnLetter(topSizeColumnIndex);

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

    // Fetch Daily Revenue Data with Tips + dynamic payment columns
    // Range includes: A (Date), B (Sales), C (Revenue), D (Tips), E+ (Payment Methods)
    const lastPaymentColumnIndex =
      paymentStartColumnIndex + paymentMethodsList.length - 1;
    const lastPaymentColumn = getColumnLetter(lastPaymentColumnIndex);

    const dailyRevenueResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `Insights!A12:${lastPaymentColumn}`,
    });

    const dailyRevenueValues = dailyRevenueResponse.data.values || [];
    const dailyRevenue = dailyRevenueValues
      .filter((row) => row[0]) // Filter out empty rows
      .map((row) => {
        const payments: { [key: string]: number } = {};
        paymentMethodsList.forEach((method, index) => {
          payments[method] = Number.parseFloat(
            row[paymentStartColumnIndex + index] || "0"
          );
        });

        return {
          date: row[0] || "",
          numberOfSales: Number.parseInt(row[1] || "0", 10),
          actualRevenue: Number.parseFloat(row[2] || "0"),
          tips: Number.parseFloat(row[tipsColumnIndex] || "0"), // Tips is always column D (index 3)
          payments,
        };
      });

    return NextResponse.json({
      success: true,
      quickStats,
      dailyRevenue,
      paymentMethods: paymentMethodsList,
      schemaOutdated: paymentMethodsChanged, // Flag if payment methods don't match
      expectedPaymentMethods: paymentMethodsList, // What we expect
      currentPaymentMethods: existingPaymentHeaders, // What's currently in the sheet
    });
  } catch (error) {
    console.error("Error fetching insights data:", error);

    // Check if error is related to column mismatch
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const isColumnError =
      errorMessage.includes("column") || errorMessage.includes("range");

    return NextResponse.json(
      {
        error: "Failed to fetch insights data",
        details: errorMessage,
        suggestion: isColumnError
          ? "Your Insights sheet may need to be refreshed. Try clicking the 'Refresh Insights Schema' button."
          : undefined,
      },
      { status: 500 }
    );
  }
}
