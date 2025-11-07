import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { google } from "googleapis";

/**
 * Find existing Merch Table spreadsheet in user's Google Drive
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });

    const drive = google.drive({ version: "v3", auth });

    // Search for spreadsheet with specific name
    const response = await drive.files.list({
      q: "name='Merch Table - Sales & Inventory' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      fields: "files(id, name, modifiedTime)",
      orderBy: "modifiedTime desc", // Find most recently modified (actively used) sheet
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
