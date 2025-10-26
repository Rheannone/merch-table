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

    return NextResponse.json({
      exists: !!insightsSheet,
      sheetId: insightsSheet?.properties?.sheetId,
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
