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

    // Fetch Quick Stats (B5:B7)
    const quickStatsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Insights!B5:B7",
    });

    const quickStatsValues = quickStatsResponse.data.values || [];
    const quickStats = {
      totalRevenue: Number.parseFloat(quickStatsValues[0]?.[0] || "0"),
      numberOfSales: Number.parseInt(quickStatsValues[1]?.[0] || "0", 10),
      averageSale: Number.parseFloat(quickStatsValues[2]?.[0] || "0"),
    };

    // Fetch Daily Revenue Data (A12:E)
    const dailyRevenueResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Insights!A12:E",
    });

    const dailyRevenueValues = dailyRevenueResponse.data.values || [];
    const dailyRevenue = dailyRevenueValues
      .filter((row) => row[0]) // Filter out empty rows
      .map((row) => ({
        date: row[0] || "",
        numberOfSales: Number.parseInt(row[1] || "0", 10),
        actualRevenue: Number.parseFloat(row[2] || "0"),
        topItem: row[3] || "N/A",
        topSize: row[4] || "N/A",
      }));

    return NextResponse.json({
      success: true,
      quickStats,
      dailyRevenue,
    });
  } catch (error) {
    console.error("Error fetching insights data:", error);
    return NextResponse.json(
      { error: "Failed to fetch insights data" },
      { status: 500 }
    );
  }
}
