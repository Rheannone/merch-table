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
      ["📊 MERCH TABLE INSIGHTS", "", "", "", "", `Generated: ${currentDate}`],
      [],
      // Total Sales Summary
      ["💰 TOTAL SALES SUMMARY"],
      ["Metric", "Value"],
      ["Total Revenue (Actual)", "=SUM(Sales!E:E)"], // Sum of Actual Amount column
      ["Total Cart Value", "=SUM(Sales!D:D)"], // Sum of Total column
      ["Total Discounts Given", "=SUM(Sales!F:F)"], // Sum of Discount column
      ["Total Number of Sales", "=COUNTA(Sales!A:A)-1"], // Count of sales minus header
      ["Average Sale Amount", "=AVERAGE(Sales!E:E)"], // Average actual amount
      ["Discount Rate", "=IF(D6>0,D7/D6,0)"], // Total discounts / Total cart value
      [],
      // Sales by Payment Method
      ["💳 SALES BY PAYMENT METHOD"],
      ["Payment Method", "Count", "Total Revenue"],
      [
        "Cash",
        '=COUNTIF(Sales!G:G,"cash")',
        '=SUMIF(Sales!G:G,"cash",Sales!E:E)',
      ],
      [
        "Card",
        '=COUNTIF(Sales!G:G,"card")',
        '=SUMIF(Sales!G:G,"card",Sales!E:E)',
      ],
      [
        "Venmo",
        '=COUNTIF(Sales!G:G,"venmo")',
        '=SUMIF(Sales!G:G,"venmo",Sales!E:E)',
      ],
      [
        "Other",
        '=COUNTIF(Sales!G:G,"other")',
        '=SUMIF(Sales!G:G,"other",Sales!E:E)',
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
      // This formula will automatically group sales by date
      [
        "=QUERY(Sales!B2:F,\"SELECT B, COUNT(B), SUM(E), SUM(F) WHERE B IS NOT NULL GROUP BY B ORDER BY B DESC LABEL B 'Date', COUNT(B) 'Sales', SUM(E) 'Revenue', SUM(F) 'Discounts'\",1)",
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
      // Top Sales Day
      ["🏆 TOP PERFORMERS"],
      ["Metric", "Value"],
      [
        "Highest Revenue Day",
        "=INDEX(Insights!A30:A,MATCH(MAX(Insights!C30:C),Insights!C30:C,0))",
      ],
      [
        "Most Sales in One Day",
        "=INDEX(Insights!A30:A,MATCH(MAX(Insights!B30:B),Insights!B30:B,0))",
      ],
      [
        "Biggest Discount Day",
        "=INDEX(Insights!A30:A,MATCH(MAX(Insights!D30:D),Insights!D30:D,0))",
      ],
      [],
      // Size Analysis (if applicable)
      ["👕 SIZE ANALYSIS"],
      [
        "Note: Sizes are embedded in the Items column. Review Sales sheet for detailed size breakdown.",
      ],
      [],
      // Hookup/Discount Analysis
      ["✨ HOOKUP/DISCOUNT ANALYSIS"],
      ["Metric", "Value"],
      ["Total Hookups Given", '=COUNTIF(Sales!H:H,"Yes")'],
      ["Hookup Rate", "=D55/(D8-1)"], // Hookups / Total Sales
      ["Average Discount per Hookup", "=D7/D55"], // Total discounts / Hookups
      [],
      // Revenue Trends
      ["📈 REVENUE INSIGHTS"],
      ["Metric", "Value"],
      ["Average Daily Revenue", "=AVERAGE(Insights!C30:C)"],
      ["Highest Single Sale", "=MAX(Sales!E:E)"],
      ["Lowest Single Sale", "=MIN(Sales!E:E)"],
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
