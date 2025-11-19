import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuthClient } from "@/lib/supabase/api-auth";
import { google } from "googleapis";
import {
  SALES_COL_LETTERS,
  INSIGHTS_FIXED_COLUMNS,
  INSIGHTS_COL_LETTERS,
  DEFAULT_PAYMENT_METHODS,
  normalizePaymentMethod,
  getColumnLetter,
} from "@/lib/sheetSchema";

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

    // Check if Insights sheet already exists
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const existingSheet = spreadsheet.data.sheets?.find(
      (sheet) => sheet.properties?.title === "Insights"
    );

    if (existingSheet) {
      return NextResponse.json({
        success: true,
        message: "Insights sheet already exists",
        alreadyExists: true,
      });
    }

    // Create the Insights sheet
    const addSheetResponse = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: "Insights",
                gridProperties: {
                  frozenRowCount: 1,
                },
              },
            },
          },
        ],
      },
    });

    const insightsSheetId =
      addSheetResponse.data.replies?.[0]?.addSheet?.properties?.sheetId;

    if (!insightsSheetId) {
      throw new Error("Failed to create Insights sheet");
    }

    // Get unique payment methods from Sales sheet
    const salesDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `Sales!${SALES_COL_LETTERS.PAYMENT_METHOD}2:${SALES_COL_LETTERS.PAYMENT_METHOD}`, // Payment Method column
    });

    const paymentMethods = Array.from(
      new Set(
        (salesDataResponse.data.values || [])
          .flat()
          .filter((method) => method && method.trim())
          .map((method) => normalizePaymentMethod(method)) // Normalize to Title Case
      )
    ).sort();

    // If no sales yet, use default payment methods
    const paymentMethodsList =
      paymentMethods.length > 0 ? paymentMethods : [...DEFAULT_PAYMENT_METHODS];

    // Build dynamic header row with Tips BEFORE payment methods (fixed position)
    // This ensures Tips is always in column D regardless of payment method count
    const paymentHeaders = paymentMethodsList.map((pm) => `${pm} Revenue`);
    const headerRow = [
      "Date",
      "Number of Sales",
      "Actual Revenue",
      "Tips", // Fixed column D
      ...paymentHeaders, // Dynamic columns starting at E
      "Top Item",
      "Top Size",
    ];

    // DYNAMIC Insights sheet - payment methods based on actual sales data
    const insightsData = [
      // Header row
      ["📊 INSIGHTS"],
      [],
      // Simple summary
      ["💰 QUICK STATS"],
      ["Metric", "Value"],
      ["Total Actual Revenue", "=SUM(Sales!E2:E)"],
      ["Number of Sales", "=COUNTA(Sales!A2:A)"],
      ["Average Sale", "=IF(B6>0,B5/B6,0)"],
      [],
      [],
      // Daily breakdown - this is the main feature
      ["📅 ACTUAL REVENUE BY DATE WITH PAYMENT BREAKDOWN"],
      headerRow,
      // Row 12: This row will contain the QUERY formula in column A only
      // The QUERY will automatically populate Date, Number of Sales, and Actual Revenue
      [],
      [],
    ];

    // Write the data to the Insights sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Insights!A1",
      valueInputOption: "USER_ENTERED", // Important: USER_ENTERED interprets formulas
      requestBody: {
        values: insightsData,
      },
    });

    // Add QUERY formula in A12 to populate the daily revenue data
    // This QUERY will output WITHOUT headers (0) since we already have headers in row 11
    // It will automatically fill columns A, B, C starting from row 12
    // Use A2:J to skip the header row in Sales sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Insights!A12",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            '=QUERY(Sales!A2:J,"SELECT B, COUNT(B), SUM(E) WHERE B IS NOT NULL GROUP BY B ORDER BY B DESC",0)',
          ],
        ],
      },
    });

    // Add Tips formula in FIXED column D (always same position)
    const tipsColumn = INSIGHTS_COL_LETTERS.TIPS;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Insights!${tipsColumn}12`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            // Sum of all tips for this date
            `=IF(A12="","",SUMIFS(Sales!$${SALES_COL_LETTERS.TIPS}:$${SALES_COL_LETTERS.TIPS},Sales!$${SALES_COL_LETTERS.DATE}:$${SALES_COL_LETTERS.DATE},A12))`,
          ],
        ],
      },
    });

    // Add formulas for payment method breakdowns dynamically
    // These use SUMIFS to sum actual revenue by date AND payment method
    // Payment methods start at column E (after Tips in column D)
    const paymentFormulas = paymentMethodsList.map((paymentMethod) => {
      return `=IF(A12="","",SUMIFS(Sales!$${SALES_COL_LETTERS.ACTUAL_AMOUNT}:$${SALES_COL_LETTERS.ACTUAL_AMOUNT},Sales!$${SALES_COL_LETTERS.DATE}:$${SALES_COL_LETTERS.DATE},A12,Sales!$${SALES_COL_LETTERS.PAYMENT_METHOD}:$${SALES_COL_LETTERS.PAYMENT_METHOD},"${paymentMethod}"))`;
    });

    // Calculate the range for payment formulas (starts at column E, after Tips)
    const paymentStartColumnIndex = INSIGHTS_FIXED_COLUMNS.TIPS + 1; // Column E (Tips is D=3, so payments start at E=4)
    const paymentStartColumn = getColumnLetter(paymentStartColumnIndex);
    const lastPaymentColumnIndex =
      paymentStartColumnIndex + paymentMethodsList.length - 1;
    const paymentLastColumn = getColumnLetter(lastPaymentColumnIndex);
    const paymentRange = `Insights!${paymentStartColumn}12:${paymentLastColumn}12`;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: paymentRange,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [paymentFormulas],
      },
    });

    // Add formulas for Top Item and Top Size (after all payment columns)
    const topItemColumnIndex = lastPaymentColumnIndex + 1; // Next column after last payment
    const topSizeColumnIndex = lastPaymentColumnIndex + 2; // Column after Top Item
    const topItemStartColumn = getColumnLetter(topItemColumnIndex);
    const topSizeColumn = getColumnLetter(topSizeColumnIndex);
    const topItemRange = `Insights!${topItemStartColumn}12:${topSizeColumn}12`;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: topItemRange,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            // Top Item - Show first item sold on this date
            `=IF(A12="","",IFERROR(INDEX(Sales!$${SALES_COL_LETTERS.PRODUCT_NAMES}:$${SALES_COL_LETTERS.PRODUCT_NAMES},MATCH(A12,Sales!$${SALES_COL_LETTERS.DATE}:$${SALES_COL_LETTERS.DATE},0)),""))`,
            // Top Size - Show first size sold on this date
            `=IF(A12="","",IFERROR(INDEX(Sales!$${SALES_COL_LETTERS.SIZES}:$${SALES_COL_LETTERS.SIZES},MATCH(A12,Sales!$${SALES_COL_LETTERS.DATE}:$${SALES_COL_LETTERS.DATE},0)),""))`,
          ],
        ],
      },
    });

    // Auto-copy the formulas down using copyPaste (copies Tips + all payment columns + Top Item/Size down to rows 13-50)
    const copyStartColumnIndex = INSIGHTS_FIXED_COLUMNS.TIPS; // Column D (Tips)
    const copyEndColumnIndex = topSizeColumnIndex + 1; // Include all columns through Top Size (exclusive)

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            copyPaste: {
              source: {
                sheetId: insightsSheetId,
                startRowIndex: 11, // Row 12 (0-indexed)
                endRowIndex: 12,
                startColumnIndex: copyStartColumnIndex, // Column D (Tips)
                endColumnIndex: copyEndColumnIndex, // Through Top Size (exclusive)
              },
              destination: {
                sheetId: insightsSheetId,
                startRowIndex: 12, // Row 13
                endRowIndex: 50, // Copy down to row 50
                startColumnIndex: copyStartColumnIndex,
                endColumnIndex: copyEndColumnIndex,
              },
              pasteType: "PASTE_NORMAL",
            },
          },
        ],
      },
    });

    // Format the Insights sheet for better readability
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          // Format header row (bold + dark background)
          {
            repeatCell: {
              range: {
                sheetId: insightsSheetId,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: {
                    red: 0.2,
                    green: 0.2,
                    blue: 0.2,
                  },
                  textFormat: {
                    foregroundColor: {
                      red: 1,
                      green: 1,
                      blue: 1,
                    },
                    bold: true,
                    fontSize: 14,
                  },
                },
              },
              fields: "userEnteredFormat(backgroundColor,textFormat)",
            },
          },
          // Format section headers (bold)
          {
            repeatCell: {
              range: {
                sheetId: insightsSheetId,
                startRowIndex: 2,
                endRowIndex: 3,
              },
              cell: {
                userEnteredFormat: {
                  textFormat: {
                    bold: true,
                    fontSize: 12,
                  },
                },
              },
              fields: "userEnteredFormat.textFormat",
            },
          },
          {
            repeatCell: {
              range: {
                sheetId: insightsSheetId,
                startRowIndex: 10,
                endRowIndex: 11,
              },
              cell: {
                userEnteredFormat: {
                  textFormat: {
                    bold: true,
                    fontSize: 12,
                  },
                },
              },
              fields: "userEnteredFormat.textFormat",
            },
          },
          // Format table headers
          {
            repeatCell: {
              range: {
                sheetId: insightsSheetId,
                startRowIndex: 3,
                endRowIndex: 4,
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
          {
            repeatCell: {
              range: {
                sheetId: insightsSheetId,
                startRowIndex: 11,
                endRowIndex: 12,
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
          // Set column widths
          {
            updateDimensionProperties: {
              range: {
                sheetId: insightsSheetId,
                dimension: "COLUMNS",
                startIndex: 0,
                endIndex: 1,
              },
              properties: {
                pixelSize: 200,
              },
              fields: "pixelSize",
            },
          },
          {
            updateDimensionProperties: {
              range: {
                sheetId: insightsSheetId,
                dimension: "COLUMNS",
                startIndex: 1,
                endIndex: 2,
              },
              properties: {
                pixelSize: 150,
              },
              fields: "pixelSize",
            },
          },
          {
            updateDimensionProperties: {
              range: {
                sheetId: insightsSheetId,
                dimension: "COLUMNS",
                startIndex: 2,
                endIndex: 3,
              },
              properties: {
                pixelSize: 150,
              },
              fields: "pixelSize",
            },
          },
          // Tips column (D): 120px
          {
            updateDimensionProperties: {
              range: {
                sheetId: insightsSheetId,
                dimension: "COLUMNS",
                startIndex: 3, // Column D
                endIndex: 4, // Just column D
              },
              properties: {
                pixelSize: 120,
              },
              fields: "pixelSize",
            },
          },
          // Payment method columns (E onwards): 120px each, dynamically sized based on payment method count
          {
            updateDimensionProperties: {
              range: {
                sheetId: insightsSheetId,
                dimension: "COLUMNS",
                startIndex: 4, // Column E (first payment method)
                endIndex: 4 + paymentMethodsList.length, // Through all payment methods
              },
              properties: {
                pixelSize: 120,
              },
              fields: "pixelSize",
            },
          },
          // Top Item and Top Size columns: 150px each (after all payment methods)
          {
            updateDimensionProperties: {
              range: {
                sheetId: insightsSheetId,
                dimension: "COLUMNS",
                startIndex: 4 + paymentMethodsList.length, // After last payment method
                endIndex: 4 + paymentMethodsList.length + 2, // Top Item + Top Size
              },
              properties: {
                pixelSize: 150,
              },
              fields: "pixelSize",
            },
          },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      message: "Insights sheet created successfully!",
    });
  } catch (error) {
    console.error("Failed to create insights:", error);
    return NextResponse.json(
      {
        error: "Failed to create Insights sheet",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
