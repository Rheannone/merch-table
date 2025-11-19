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
        { error: "Spreadsheet ID is required" },
        { status: 400 }
      );
    }

    const sheets = google.sheets({
      version: "v4",
      auth: authResult.authClient,
    });

    // Generate backup name with current date
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
    const backupName = `${today}-tour-manager-backup`;

    // Get the original spreadsheet to copy its data
    const originalSpreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId,
      includeGridData: true,
    });

    // Create a new spreadsheet with the backup name
    const newSpreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: backupName,
        },
        sheets: originalSpreadsheet.data.sheets,
      },
    });

    const backupId = newSpreadsheet.data.spreadsheetId!;

    return NextResponse.json({
      success: true,
      backupId: backupId,
      backupName: backupName,
      backupUrl: `https://docs.google.com/spreadsheets/d/${backupId}`,
    });
  } catch (error) {
    console.error("Error creating backup:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create backup";
    return NextResponse.json(
      {
        error: errorMessage,
        details: error,
      },
      { status: 500 }
    );
  }
}
