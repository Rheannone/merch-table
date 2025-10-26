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
                  columnCount: 10,
                  rowCount: 100,
                },
              },
            },
          },
        ],
      },
    });

    const insightsSheetId =
      addSheetResponse.data.replies?.[0]?.addSheet?.properties?.sheetId;

    // Set up the Insights sheet with sections and formulas
    // This will create a dashboard-style layout with different sections

    const currentDate = new Date().toLocaleDateString();

    // Build the data for the Insights sheet
    const insightsData = [
      // Header row
      [
        "📊 MERCH TABLE INSIGHTS",
        "",
        "",
        "",
        "",
        "",
        "",
        `Generated: ${currentDate}`,
      ],
      [],
      // Total Sales Summary
      ["💰 TOTAL SALES SUMMARY"],
      ["Metric", "Value"],
      ["Total Revenue (Actual)", "=SUM(Sales!E2:E)"], // Sum of Actual Amount column (skip header)
      ["Total Cart Value", "=SUM(Sales!D2:D)"], // Sum of Total column (skip header)
      ["Total Discounts Given", "=SUM(Sales!F2:F)"], // Sum of Discount column (skip header)
      ["Total Number of Sales", "=COUNTA(Sales!A2:A)"], // Count of sales (skip header)
      [
        "Average Sale Amount",
        "=IF(COUNTA(Sales!E2:E)>0,AVERAGE(Sales!E2:E),0)",
      ], // Average actual amount with safety
      ["Discount Rate", "=IF(B6>0,B7/B6,0)"], // Total discounts / Total cart value (using row references)
      [],
      // Sales by Payment Method
      ["💳 SALES BY PAYMENT METHOD"],
      ["Payment Method", "Count", "Total Revenue"],
      [
        "Cash",
        '=COUNTIF(Sales!G2:G,"cash")',
        '=SUMIF(Sales!G2:G,"cash",Sales!E2:E)',
      ],
      [
        "Card",
        '=COUNTIF(Sales!G2:G,"card")',
        '=SUMIF(Sales!G2:G,"card",Sales!E2:E)',
      ],
      [
        "Venmo",
        '=COUNTIF(Sales!G2:G,"venmo")',
        '=SUMIF(Sales!G2:G,"venmo",Sales!E2:E)',
      ],
      [
        "Other",
        '=COUNTIF(Sales!G2:G,"other")',
        '=SUMIF(Sales!G2:G,"other",Sales!E2:E)',
      ],
      [],
      // Top 10 Items Sold
      ["🔥 TOP ITEMS SOLD"],
      ["Note: Extract product names from the Items column to analyze"],
      ["Product", "Times Sold (approx)"],
      // We'll use a simple approach - user can manually analyze or we can improve this later
      ["See Sales sheet for detailed item breakdown"],
      [],
      // Daily Sales Breakdown (using QUERY for automatic grouping)
      ["📅 SALES BY DATE"],
      ["Date", "Number of Sales", "Total Revenue", "Total Discounts"],
      // This formula will automatically group sales by date - Fixed to include all columns B through H
      [
        "=QUERY(Sales!B2:H,\"SELECT B, COUNT(B), SUM(E), SUM(F) WHERE B IS NOT NULL GROUP BY B ORDER BY B DESC LABEL B 'Date', COUNT(B) 'Sales', SUM(E) 'Revenue', SUM(F) 'Discounts'\",1)",
      ],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      // Top Sales Day - Fixed with safety checks
      ["🏆 TOP PERFORMERS"],
      ["Metric", "Value"],
      [
        "Highest Revenue Day",
        '=IF(COUNTA(A30:A39)>0,INDEX(A30:A39,MATCH(MAX(C30:C39),C30:C39,0)),"N/A")',
      ],
      [
        "Most Sales in One Day",
        '=IF(COUNTA(A30:A39)>0,INDEX(A30:A39,MATCH(MAX(B30:B39),B30:B39,0)),"N/A")',
      ],
      [
        "Biggest Discount Day",
        '=IF(COUNTA(A30:A39)>0,INDEX(A30:A39,MATCH(MAX(D30:D39),D30:D39,0)),"N/A")',
      ],
      [],
      // Size Analysis (if applicable)
      ["👕 SIZE ANALYSIS"],
      [
        "Note: Sizes are embedded in the Items column. Review Sales sheet for detailed size breakdown.",
      ],
      [],
      // Hookup/Discount Analysis - Fixed with safety checks
      ["✨ HOOKUP/DISCOUNT ANALYSIS"],
      ["Metric", "Value"],
      ["Total Hookups Given", '=COUNTIF(Sales!H2:H,"Yes")'],
      ["Hookup Rate", "=IF(B8>0,B55/B8,0)"], // Hookups / Total Sales with safety check
      ["Average Discount per Hookup", "=IF(B55>0,B7/B55,0)"], // Total discounts / Hookups with safety check
      [],
      // Revenue Trends - Fixed with safety checks
      ["📈 REVENUE INSIGHTS"],
      ["Metric", "Value"],
      ["Average Daily Revenue", "=IF(COUNTA(C30:C39)>0,AVERAGE(C30:C39),0)"],
      ["Highest Single Sale", "=IF(COUNTA(Sales!E2:E)>0,MAX(Sales!E2:E),0)"],
      ["Lowest Single Sale", "=IF(COUNTA(Sales!E2:E)>0,MIN(Sales!E2:E),0)"],
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

    // Format the Insights sheet for better readability
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          // Bold the header row
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
          // Bold all section headers (rows with emojis)
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
                startRowIndex: 11,
                endRowIndex: 12,
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
                startRowIndex: 18,
                endRowIndex: 19,
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
                startRowIndex: 27,
                endRowIndex: 28,
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
                startRowIndex: 43,
                endRowIndex: 44,
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
                startRowIndex: 48,
                endRowIndex: 49,
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
                startRowIndex: 53,
                endRowIndex: 54,
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
                startRowIndex: 59,
                endRowIndex: 60,
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
          // Resize columns for better visibility
          {
            updateDimensionProperties: {
              range: {
                sheetId: insightsSheetId,
                dimension: "COLUMNS",
                startIndex: 0,
                endIndex: 1,
              },
              properties: {
                pixelSize: 250,
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
                endIndex: 4,
              },
              properties: {
                pixelSize: 150,
              },
              fields: "pixelSize",
            },
          },
          // Format currency columns
          {
            repeatCell: {
              range: {
                sheetId: insightsSheetId,
                startRowIndex: 4,
                endRowIndex: 10,
                startColumnIndex: 1,
                endColumnIndex: 2,
              },
              cell: {
                userEnteredFormat: {
                  numberFormat: {
                    type: "CURRENCY",
                    pattern: "$#,##0.00",
                  },
                },
              },
              fields: "userEnteredFormat.numberFormat",
            },
          },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Insights sheet created successfully! It will automatically update as you make sales.",
      sheetId: insightsSheetId,
    });
  } catch (error) {
    console.error("Failed to create insights sheet:", error);
    return NextResponse.json(
      {
        error: "Failed to create insights sheet",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
