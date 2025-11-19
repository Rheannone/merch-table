import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getGoogleAuthClient } from "@/lib/supabase/api-auth";

/**
 * Find existing Road Dog spreadsheet in user's Google Drive
 */
export async function GET() {
  try {
    const authResult = await getGoogleAuthClient();
    if ("error" in authResult) {
      return authResult.error;
    }

    const drive = google.drive({ version: "v3", auth: authResult.authClient });

    // Search for spreadsheet with specific name
    const response = await drive.files.list({
      q: "name='Road Dog - Sales & Inventory' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      fields: "files(id, name)",
      orderBy: "createdTime desc",
      pageSize: 1,
    });

    if (response.data.files && response.data.files.length > 0) {
      const spreadsheetId = response.data.files[0].id;

      return NextResponse.json({
        found: true,
        spreadsheetId,
      });
    }

    return NextResponse.json({
      found: false,
    });
  } catch (error) {
    console.error("Error finding spreadsheet:", error);
    return NextResponse.json(
      { error: "Failed to search for spreadsheet" },
      { status: 500 }
    );
  }
}
