import { google } from "googleapis";
import { Product, Sale } from "@/types";

/**
 * Sync products to the user's Google Sheet
 */
export async function syncProductsToUserSheet(
  accessToken: string,
  products: Product[]
): Promise<void> {
  const productsSheetId = localStorage.getItem("productsSheetId");
  if (!productsSheetId) {
    throw new Error("Products sheet not initialized");
  }

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const sheets = google.sheets({ version: "v4", auth });

  // Clear existing data (except header)
  await sheets.spreadsheets.values.clear({
    spreadsheetId: productsSheetId,
    range: "Products!A2:D",
  });

  // Prepare data
  const values = products.map((p) => [p.id, p.name, p.price, p.category]);

  if (values.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: productsSheetId,
      range: "Products!A2",
      valueInputOption: "RAW",
      requestBody: {
        values,
      },
    });
  }
}

/**
 * Sync sales to the user's Google Sheet
 */
export async function syncSalesToUserSheet(
  accessToken: string,
  sales: Sale[]
): Promise<void> {
  const salesSheetId = localStorage.getItem("salesSheetId");
  if (!salesSheetId) {
    throw new Error("Sales sheet not initialized");
  }

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const sheets = google.sheets({ version: "v4", auth });

  // Prepare data
  const values = sales.map((sale) => [
    sale.id,
    new Date(sale.timestamp).toLocaleString(),
    sale.items
      .map((item) => `${item.productName} x${item.quantity}`)
      .join(", "),
    sale.total.toFixed(2),
    sale.paymentMethod,
    sale.synced ? "Yes" : "No",
  ]);

  if (values.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: salesSheetId,
      range: "Sales!A2",
      valueInputOption: "RAW",
      requestBody: {
        values,
      },
    });
  }
}

/**
 * Load products from the user's Google Sheet
 */
export async function loadProductsFromUserSheet(
  accessToken: string
): Promise<Product[]> {
  const productsSheetId = localStorage.getItem("productsSheetId");
  if (!productsSheetId) {
    throw new Error("Products sheet not initialized");
  }

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: productsSheetId,
    range: "Products!A2:D",
  });

  const rows = response.data.values || [];

  return rows.map((row) => ({
    id: row[0],
    name: row[1],
    price: Number.parseFloat(row[2]),
    category: row[3],
  }));
}
