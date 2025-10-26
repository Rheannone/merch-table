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

    const insightsSheet = spreadsheet.data.sheets?.find(
      (sheet) => sheet.properties?.title === "Insights"
    );

    if (!insightsSheet) {
      return NextResponse.json({
        exists: false,
        message: "Insights sheet not found",
      });
    }

    // Get data from the insights sheet to check if it's populated
    const insightsData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Insights!A12:E20", // Check the QUERY results area
    });

    const dataRows = insightsData.data.values || [];
    console.log("Insights data rows:", dataRows);

    // Also get some sample sales data to debug
    const salesData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sales!A1:J20", // Get headers and more rows
    });

    const salesRows = salesData.data.values || [];
    console.log("Sales sheet sample data:", salesRows);

    // Test the QUERY directly
    const queryTest = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Insights!A12:C20", // Get QUERY results
    });

    const queryResults = queryTest.data.values || [];
    console.log("QUERY results:", queryResults);

    return NextResponse.json({
      exists: true,
      sheetId: insightsSheet.properties?.sheetId,
      insightsData: dataRows,
      salesSample: salesRows,
      queryResults: queryResults,
      message: `Insights sheet exists. Found ${dataRows.length} rows of insights data.`,
      debug: {
        salesRowCount: salesRows.length,
        queryRowCount: queryResults.length,
      },
    });
  } catch (error) {
    console.error("Failed to check insights sheet:", error);
    return NextResponse.json(
      {
        error: "Failed to check insights sheet",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
