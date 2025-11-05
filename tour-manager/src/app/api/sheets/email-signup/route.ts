import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { EmailSignup } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    const { spreadsheetId, email, name, phone, saleId } = await req.json();

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "Spreadsheet ID not provided" },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const { google } = await import("googleapis");
    const authClient = new google.auth.OAuth2();
    authClient.setCredentials({ access_token: session.accessToken });

    const sheets = google.sheets({ version: "v4", auth: authClient });

    // Check if Email List sheet exists
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const emailSheet = spreadsheet.data.sheets?.find(
      (sheet) => sheet.properties?.title === "Email List"
    );

    if (!emailSheet) {
      return NextResponse.json(
        {
          error: "Email List sheet not found. Please initialize sheets first.",
        },
        { status: 400 }
      );
    }

    // Create timestamp
    const timestamp = new Date().toISOString();

    // Determine source based on whether saleId is provided
    const source = saleId ? "post-checkout" : "manual-entry";

    // Prepare row data
    const rowData = [
      timestamp,
      email,
      name || "",
      phone || "",
      source,
      saleId || "",
      "Yes", // Synced (always yes since we're directly writing to sheet)
    ];

    // Append the email signup to the sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Email List!A:G",
      valueInputOption: "RAW",
      requestBody: {
        values: [rowData],
      },
    });

    return NextResponse.json({
      success: true,
      message: "Email saved successfully",
      timestamp,
    });
  } catch (error) {
    console.error("Failed to save email signup:", error);
    return NextResponse.json(
      {
        error: "Failed to save email signup",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
