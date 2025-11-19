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

    // Get spreadsheet metadata to retrieve the title
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: "properties.title",
    });

    const sheetName = spreadsheet.data.properties?.title || "Your Sheet";

    return NextResponse.json({
      success: true,
      name: sheetName,
    });
  } catch (error) {
    console.error("Error fetching sheet name:", error);
    return NextResponse.json(
      { error: "Failed to fetch sheet name" },
      { status: 500 }
    );
  }
}
