import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { PaymentSetting } from "@/types";

// Default payment settings
const DEFAULT_PAYMENT_SETTINGS: PaymentSetting[] = [
  { paymentType: "cash", enabled: true, displayName: "Cash" },
  { paymentType: "venmo", enabled: true, displayName: "Venmo" },
  {
    paymentType: "credit",
    enabled: false,
    displayName: "Credit",
    transactionFee: 0.03,
  },
  { paymentType: "other", enabled: true, displayName: "Other" },
  { paymentType: "custom1", enabled: false, displayName: "Custom 1" },
  { paymentType: "custom2", enabled: false, displayName: "Custom 2" },
  { paymentType: "custom3", enabled: false, displayName: "Custom 3" },
];

// Default categories
const DEFAULT_CATEGORIES = ["Apparel", "Merch", "Music"];

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

    // Check if POS Settings sheet exists
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const settingsSheet = spreadsheet.data.sheets?.find(
      (sheet) => sheet.properties?.title === "POS Settings"
    );

    if (!settingsSheet) {
      // Sheet doesn't exist, return default settings
      return NextResponse.json({
        success: true,
        paymentSettings: DEFAULT_PAYMENT_SETTINGS,
        categories: DEFAULT_CATEGORIES,
        isDefault: true,
      });
    }

    // Load settings from sheet
    const settingsData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "POS Settings!A2:E20", // Payment settings (skip header row)
    });

    const rows = settingsData.data.values || [];

    if (rows.length === 0) {
      // Sheet exists but empty, return defaults
      return NextResponse.json({
        success: true,
        paymentSettings: DEFAULT_PAYMENT_SETTINGS,
        categories: DEFAULT_CATEGORIES,
        isDefault: true,
      });
    }

    // Parse payment settings from sheet
    const paymentSettings: PaymentSetting[] = rows.map((row) => ({
      paymentType: row[0] as PaymentSetting["paymentType"],
      enabled: row[1] === "TRUE" || row[1] === "Yes",
      displayName: row[2] || "",
      transactionFee: row[3] ? Number.parseFloat(row[3]) : undefined,
      qrCodeUrl: row[4] || undefined,
    }));

    // Load categories from sheet (stored after payment settings)
    const categoriesData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "POS Settings!G2:G50", // Categories in column G
    });

    const categoryRows = categoriesData.data.values || [];
    const categories =
      categoryRows.length > 0
        ? categoryRows.map((row) => row[0]).filter((cat) => cat && cat.trim())
        : DEFAULT_CATEGORIES;

    // Load theme from sheet (stored in column H)
    let theme = "default"; // Default theme
    try {
      const themeData = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "POS Settings!H2", // Theme in column H, row 2
      });

      const themeValue = themeData.data.values?.[0]?.[0];
      if (themeValue && typeof themeValue === "string") {
        theme = themeValue;
      }
    } catch {
      console.log("No theme found in settings, using default");
    }

    // Load currency from sheet (stored in columns I and J)
    let currency = { displayCurrency: "USD", exchangeRate: 1.0 };
    try {
      const currencyData = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "POS Settings!I2:J2", // Currency in columns I-J, row 2
      });

      const currencyValues = currencyData.data.values?.[0];
      if (currencyValues && currencyValues.length >= 2) {
        currency = {
          displayCurrency: currencyValues[0] || "USD",
          exchangeRate: Number.parseFloat(currencyValues[1]) || 1.0,
        };
      }
    } catch {
      console.log("No currency found in settings, using default USD");
    }

    return NextResponse.json({
      success: true,
      paymentSettings,
      categories: categories.length > 0 ? categories : DEFAULT_CATEGORIES,
      theme,
      currency,
      isDefault: false,
    });
  } catch (error) {
    console.error("Failed to load POS settings:", error);
    return NextResponse.json(
      {
        error: "Failed to load POS settings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
