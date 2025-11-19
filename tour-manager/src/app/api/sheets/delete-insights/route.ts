import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuthClient } from "@/lib/supabase/api-auth";
import { google } from "googleapis";

export async function POST(req: NextRequest) {
  try {
    const authResult = await getGoogleAuthClient();
    if ("error" in authResult) {
      return authResult.error;
    }

    const { spreadsheetId } = await req.json();

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "Spreadsheet ID not provided" },
        { status: 400 }
      );
    }

    const sheets = google.sheets({
      version: "v4",
      auth: authResult.authClient,
    });

    // Check if Insights sheet exists
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const insightsSheet = spreadsheet.data.sheets?.find(
      (sheet) => sheet.properties?.title === "Insights"
    );

    if (!insightsSheet) {
      return NextResponse.json({
        success: true,
        message: "Insights sheet doesn't exist, nothing to delete",
        alreadyDeleted: true,
      });
    }

    const sheetId = insightsSheet.properties?.sheetId;

    if (sheetId === undefined) {
      return NextResponse.json(
        { error: "Could not determine sheet ID" },
        { status: 400 }
      );
    }

    // Delete the Insights sheet
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteSheet: {
              sheetId: sheetId,
            },
          },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      message: "Insights sheet deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete insights sheet:", error);
    return NextResponse.json(
      {
        error: "Failed to delete insights sheet",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
