import { google } from "googleapis";

export interface SheetConfig {
  productsSheetId: string;
  salesSheetId: string;
}

/**
 * Creates a new Google Spreadsheet with the given title
 */
export async function createSpreadsheet(
  accessToken: string,
  title: string
): Promise<string> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title,
      },
    },
  });

  return response.data.spreadsheetId!;
}

/**
 * Sets up the Products sheet with proper headers
 */
export async function setupProductsSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<void> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const sheets = google.sheets({ version: "v4", auth });

  // Add headers
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Sheet1!A1:D1",
    valueInputOption: "RAW",
    requestBody: {
      values: [["ID", "Name", "Price", "Category"]],
    },
  });

  // Rename the sheet
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId: 0,
              title: "Products",
            },
            fields: "title",
          },
        },
      ],
    },
  });

  // Format headers (bold)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId: 0,
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
}

/**
 * Sets up the Sales sheet with proper headers
 */
export async function setupSalesSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<void> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const sheets = google.sheets({ version: "v4", auth });

  // Add headers
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Sheet1!A1:F1",
    valueInputOption: "RAW",
    requestBody: {
      values: [
        ["Sale ID", "Date", "Items", "Total", "Payment Method", "Synced"],
      ],
    },
  });

  // Rename the sheet
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId: 0,
              title: "Sales",
            },
            fields: "title",
          },
        },
      ],
    },
  });

  // Format headers (bold)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId: 0,
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
}

/**
 * Initialize Google Sheets for a new user
 * Creates ONE spreadsheet with two sheets (Products and Sales)
 */
export async function initializeUserSheets(
  accessToken: string
): Promise<SheetConfig> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const sheets = google.sheets({ version: "v4", auth });

  // Create a single spreadsheet with two sheets
  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: "Merch Table - Sales & Inventory",
      },
      sheets: [
        {
          properties: {
            title: "Products",
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
        {
          properties: {
            title: "Sales",
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    },
  });

  const spreadsheetId = response.data.spreadsheetId!;

  // Set up Products sheet headers
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Products!A1:D1",
    valueInputOption: "RAW",
    requestBody: {
      values: [["ID", "Name", "Price", "Category"]],
    },
  });

  // Set up Sales sheet headers
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Sales!A1:F1",
    valueInputOption: "RAW",
    requestBody: {
      values: [
        ["ID", "Timestamp", "Items", "Total", "Payment Method", "Synced"],
      ],
    },
  });

  // Format both sheet headers (bold)
  const productSheetId = response.data.sheets?.[0]?.properties?.sheetId ?? 0;
  const salesSheetId = response.data.sheets?.[1]?.properties?.sheetId ?? 1;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId: productSheetId,
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

  return {
    productsSheetId: spreadsheetId,
    salesSheetId: spreadsheetId,
  };
}
