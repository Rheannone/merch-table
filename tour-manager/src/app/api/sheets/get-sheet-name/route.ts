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
