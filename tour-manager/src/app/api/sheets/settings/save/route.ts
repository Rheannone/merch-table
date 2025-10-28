import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { PaymentSetting } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    const { spreadsheetId, paymentSettings, categories, theme } =
      await req.json();

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "Spreadsheet ID not provided" },
        { status: 400 }
      );
    }

    if (!paymentSettings || !Array.isArray(paymentSettings)) {
      return NextResponse.json(
        { error: "Invalid payment settings" },
        { status: 400 }
      );
    }

    const { google } = await import("googleapis");
    const authClient = new google.auth.OAuth2();
    authClient.setCredentials({ access_token: session.accessToken });

    const sheets = google.sheets({ version: "v4", auth: authClient });

    // Check if POS Settings sheet exists
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const settingsSheet = spreadsheet.data.sheets?.find(
      (sheet) => sheet.properties?.title === "POS Settings"
    );

    let settingsSheetId: number;

    if (!settingsSheet) {
      // Create the POS Settings sheet
      const addSheetResponse = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: "POS Settings",
                  gridProperties: {
                    frozenRowCount: 1,
                  },
                },
              },
            },
          ],
        },
      });

      settingsSheetId =
        addSheetResponse.data.replies?.[0]?.addSheet?.properties?.sheetId || 0;

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "POS Settings!A1:H1",
        valueInputOption: "RAW",
        requestBody: {
          values: [
            [
              "Payment Type",
              "Enabled",
              "Display Name",
              "Transaction Fee %",
              "QR Code URL",
              "", // Empty column F
              "Categories",
              "Theme", // Column H for theme
            ],
          ],
        },
      });

      // Format header row
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: settingsSheetId,
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
    } else {
      settingsSheetId = settingsSheet.properties?.sheetId || 0;

      // Clear existing data (keep headers)
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: "POS Settings!A2:E100",
      });

      // Clear categories
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: "POS Settings!G2:G100",
      });
    }

    // Prepare payment settings data rows
    const rows = (paymentSettings as PaymentSetting[]).map((setting) => [
      setting.paymentType,
      setting.enabled ? "Yes" : "No",
      setting.displayName,
      setting.transactionFee !== undefined
        ? setting.transactionFee.toString()
        : "",
      setting.qrCodeUrl || "",
    ]);

    // Write payment settings data
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "POS Settings!A2",
      valueInputOption: "RAW",
      requestBody: {
        values: rows,
      },
    });

    // Write categories if provided
    if (categories && Array.isArray(categories) && categories.length > 0) {
      const categoryRows = categories.map((cat) => [cat]);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "POS Settings!G2",
        valueInputOption: "RAW",
        requestBody: {
          values: categoryRows,
        },
      });
    }

    // Write theme if provided
    if (theme) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "POS Settings!H2",
        valueInputOption: "RAW",
        requestBody: {
          values: [[theme]],
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Settings saved successfully",
    });
  } catch (error) {
    console.error("Failed to save POS settings:", error);
    return NextResponse.json(
      {
        error: "Failed to save POS settings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
