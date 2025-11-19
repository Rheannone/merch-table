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

    // Check if Email List sheet already exists
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const emailSheet = spreadsheet.data.sheets?.find(
      (sheet) => sheet.properties?.title === "Email List"
    );

    if (emailSheet) {
      return NextResponse.json({
        success: true,
        message: "Email List sheet already exists",
        alreadyExists: true,
      });
    }

    // Create Email List sheet
    const addSheetResponse = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: "Email List",
                gridProperties: {
                  frozenRowCount: 1,
                },
              },
            },
          },
        ],
      },
    });

    const newSheetId =
      addSheetResponse.data.replies?.[0]?.addSheet?.properties?.sheetId || 0;

    // Add headers
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Email List!A1:G1",
      valueInputOption: "RAW",
      requestBody: {
        values: [
          [
            "Timestamp",
            "Email",
            "Name",
            "Phone",
            "Source",
            "Sale ID",
            "Synced",
          ],
        ],
      },
    });

    // Format header row (bold)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: newSheetId,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  textFormat: {
                    bold: true,
                  },
                },
              },
              fields: "userEnteredFormat.textFormat.bold",
            },
          },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      message: "Email List sheet created successfully",
    });
  } catch (error) {
    console.error("Failed to add Email List sheet:", error);
    return NextResponse.json(
      {
        error: "Failed to add Email List sheet",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
