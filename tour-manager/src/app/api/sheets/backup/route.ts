import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { google } from "googleapis";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { spreadsheetId } = await req.json();

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "Spreadsheet ID is required" },
        { status: 400 }
      );
    }

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: session.accessToken,
    });

    const sheets = google.sheets({ version: "v4", auth: oauth2Client });

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
