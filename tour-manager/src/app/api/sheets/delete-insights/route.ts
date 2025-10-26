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
