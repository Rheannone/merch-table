"use server";

import { google } from "googleapis";
import { Product, Sale } from "@/types";

// Google Sheets setup
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

function getGoogleAuth() {
  try {
    const credentials = JSON.parse(
      process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS || "{}"
    );

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES,
    });

    return auth;
  } catch (error) {
    console.error("Failed to initialize Google Auth:", error);
    return null;
  }
}

async function getSheets() {
  const auth = getGoogleAuth();
  if (!auth) return null;

  return google.sheets({ version: "v4", auth });
}

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

// Products operations
export async function syncProductsToSheet(products: Product[]) {
  const sheets = await getSheets();
  if (!sheets || !SPREADSHEET_ID) {
    throw new Error("Google Sheets not configured");
  }

  // Prepare data
  const values = [
    ["ID", "Name", "Price", "Category", "Description"],
    ...products.map((p) => [
      p.id,
      p.name,
      p.price,
      p.category,
      p.description || "",
    ]),
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: "Products!A1",
    valueInputOption: "RAW",
    requestBody: { values },
  });

  return { success: true };
}

export async function getProductsFromSheet(): Promise<Product[]> {
  const sheets = await getSheets();
  if (!sheets || !SPREADSHEET_ID) {
    return [];
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Products!A2:E",
    });

    const rows = response.data.values || [];
    return rows.map((row) => ({
      id: row[0] || "",
      name: row[1] || "",
      price: parseFloat(row[2]) || 0,
      category: row[3] || "",
      description: row[4] || "",
    }));
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

// Sales operations
export async function syncSalesToSheet(sales: Sale[]) {
  const sheets = await getSheets();
  if (!sheets || !SPREADSHEET_ID) {
    throw new Error("Google Sheets not configured");
  }

  // Prepare data
  const values = sales.map((sale) => [
    sale.timestamp,
    sale.id,
    sale.items
      .map((item) => `${item.productName} (${item.quantity})`)
      .join(", "),
    sale.items.map((item) => item.quantity).reduce((a, b) => a + b, 0),
    sale.total,
    sale.paymentMethod,
  ]);

  // Append to sheet
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "Sales!A:F",
    valueInputOption: "RAW",
    requestBody: { values },
  });

  return { success: true, count: sales.length };
}

export async function initializeSheet() {
  const sheets = await getSheets();
  if (!sheets || !SPREADSHEET_ID) {
    throw new Error("Google Sheets not configured");
  }

  try {
    // Create Products sheet with headers
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: "Products!A1:E1",
      valueInputOption: "RAW",
      requestBody: {
        values: [["ID", "Name", "Price", "Category", "Description"]],
      },
    });

    // Create Sales sheet with headers
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sales!A1:F1",
      valueInputOption: "RAW",
      requestBody: {
        values: [
          [
            "Timestamp",
            "Transaction ID",
            "Items",
            "Total Qty",
            "Total Amount",
            "Payment Method",
          ],
        ],
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error initializing sheet:", error);
    throw error;
  }
}

export async function testConnection() {
  const sheets = await getSheets();
  if (!sheets || !SPREADSHEET_ID) {
    return { connected: false, message: "Missing configuration" };
  }

  try {
    await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    return { connected: true, message: "Connected successfully" };
  } catch (error) {
    return { connected: false, message: (error as Error).message };
  }
}
