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

    // First, check the current Sales sheet structure
    const currentData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Sales!A1:Z1", // Get first row to check headers
    });

    const currentHeaders = currentData.data.values?.[0] || [];
    const currentColumnCount = currentHeaders.length;

    console.log("Current Sales sheet headers:", currentHeaders);
    console.log("Current column count:", currentColumnCount);

    // Check if already migrated (has 8 columns)
    if (currentColumnCount >= 8) {
      return NextResponse.json({
        success: true,
        message: "Sales sheet already has the new format (8 columns)",
        alreadyMigrated: true,
        headers: currentHeaders,
      });
    }

    // Check if this is the old 6-column format
    if (currentColumnCount === 6) {
      // Old format: ID, Timestamp, Items, Total, Payment Method, Hookup
      // New format: ID, Timestamp, Items, Total, Actual Amount, Discount, Payment Method, Hookup

      // Get all existing sales data
      const salesData = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Sales!A:F", // Get all 6 columns
      });

      const rows = salesData.data.values || [];

      if (rows.length === 0) {
        return NextResponse.json({
          success: false,
          message: "No data found in Sales sheet",
        });
      }

      // Transform the data to the new 8-column format
      const migratedRows = rows.map((row, index) => {
        if (index === 0) {
          // Update header row
          return [
            "ID",
            "Timestamp",
            "Items",
            "Total",
            "Actual Amount",
            "Discount",
            "Payment Method",
            "Hookup",
          ];
        }

        // For data rows, insert new columns
        const [id, timestamp, items, total, paymentMethod, hookup] = row;

        // Calculate: Actual Amount = Total (no discount for old sales)
        // Discount = 0 (old sales didn't track discounts)
        return [
          id,
          timestamp,
          items,
          total,
          total || "0", // Actual Amount = Total for old sales
          "0", // Discount = 0 for old sales
          paymentMethod,
          hookup,
        ];
      });

      // Clear the old data and write the new format
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: "Sales!A:Z",
      });

      // Write the migrated data
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: "Sales!A1",
        valueInputOption: "RAW",
        requestBody: {
          values: migratedRows,
        },
      });

      // Format the header row (bold)
      const salesSheet = await sheets.spreadsheets.get({
        spreadsheetId,
      });

      const salesSheetId =
        salesSheet.data.sheets?.find((s) => s.properties?.title === "Sales")
          ?.properties?.sheetId || 0;

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: salesSheetId,
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
        message: `Successfully migrated ${rows.length - 1} sales to new format`,
        migratedRows: rows.length - 1,
        oldFormat: currentHeaders,
        newFormat: [
          "ID",
          "Timestamp",
          "Items",
          "Total",
          "Actual Amount",
          "Discount",
          "Payment Method",
          "Hookup",
        ],
      });
    }

    // Unknown format
    return NextResponse.json({
      success: false,
      message: `Unexpected Sales sheet format (${currentColumnCount} columns). Expected 6 or 8 columns.`,
      currentHeaders,
    });
  } catch (error) {
    console.error("Migration failed:", error);
    return NextResponse.json(
      {
        error: "Failed to migrate Sales sheet",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
