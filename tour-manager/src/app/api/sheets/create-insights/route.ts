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

    const currentDate = new Date().toLocaleDateString();

    // SIMPLIFIED Insights sheet - just daily revenue tracking
    const insightsData = [
      // Header row
      ["📊 DAILY REVENUE TRACKER", "", "", `Generated: ${currentDate}`],
      [],
      // Simple summary
      ["💰 QUICK STATS"],
      ["Metric", "Value"],
      ["Total Actual Revenue", "=SUM(Sales!E:E)"],
      ["Number of Sales", "=COUNTA(Sales!A:A)-1"],
      ["Average Sale", "=IF(B6>0,B5/B6,0)"],
      [],
      [],
      // Daily breakdown - this is the main feature
      ["📅 ACTUAL REVENUE BY DATE"],
      ["Date", "Number of Sales", "Actual Revenue"],
      // QUERY to group by date and sum actual revenue
      [
        "=QUERY(Sales!A:H,\"SELECT B, COUNT(B), SUM(E) WHERE B IS NOT NULL GROUP BY B ORDER BY B DESC LABEL B 'Date', COUNT(B) '# Sales', SUM(E) 'Revenue'\",1)",
      ],
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
