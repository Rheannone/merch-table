import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { PaymentSetting } from "@/types";
import {
  DEFAULT_PAYMENT_SETTINGS,
  DEFAULT_CATEGORIES,
} from "@/lib/defaultSettings";

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

    // Load ALL settings in ONE batch request to avoid quota issues
    // This reduces 6+ API calls down to 1
    let batchData;
    try {
      batchData = await sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges: [
          "POS Settings!A2:E20", // Payment settings
          "POS Settings!F2", // Show Tip Jar
          "POS Settings!G2:G50", // Categories
          "POS Settings!H2", // Theme
          "POS Settings!I2:J2", // Currency & Exchange Rate
          "POS Settings!K2:O2", // Email signup settings
        ],
      });
    } catch {
      // POS Settings sheet doesn't exist yet
      console.log("POS Settings sheet not found, returning defaults");
      return NextResponse.json({
        success: true,
        paymentSettings: DEFAULT_PAYMENT_SETTINGS,
        categories: DEFAULT_CATEGORIES,
        showTipJar: true,
        theme: "default",
        currency: { displayCurrency: "USD", exchangeRate: 1.0 },
        emailSignup: {
          enabled: false,
          promptMessage: "Want to join our email list?",
          collectName: true,
          collectPhone: true,
          autoDismissSeconds: 15,
        },
        isDefault: true,
      });
    }

    const ranges = batchData.data.valueRanges || [];

    // Parse payment settings (Range 0: A2:E20)
    const paymentRows = ranges[0]?.values || [];
    const paymentSettings: PaymentSetting[] =
      paymentRows.length > 0
        ? paymentRows.map((row) => ({
            paymentType: row[0] as PaymentSetting["paymentType"],
            enabled: row[1] === "TRUE" || row[1] === "Yes",
            displayName: row[2] || "",
            transactionFee: row[3] ? Number.parseFloat(row[3]) : undefined,
            qrCodeUrl: row[4] || undefined,
          }))
        : DEFAULT_PAYMENT_SETTINGS;

    // Parse showTipJar (Range 1: F2)
    const showTipJarValue = ranges[1]?.values?.[0]?.[0];
    const showTipJar = showTipJarValue === "No" ? false : true; // Default to true

    // Parse categories (Range 2: G2:G50)
    const categoryRows = ranges[2]?.values || [];
    const categories =
      categoryRows.length > 0
        ? categoryRows.map((row) => row[0]).filter((cat) => cat && cat.trim())
        : DEFAULT_CATEGORIES;

    // Parse theme (Range 3: H2)
    const themeValue = ranges[3]?.values?.[0]?.[0];
    const theme =
      themeValue && typeof themeValue === "string" ? themeValue : "default";

    // Parse currency (Range 4: I2:J2)
    const currencyValues = ranges[4]?.values?.[0];
    const currency =
      currencyValues && currencyValues.length >= 2
        ? {
            displayCurrency: currencyValues[0] || "USD",
            exchangeRate: Number.parseFloat(currencyValues[1]) || 1.0,
          }
        : { displayCurrency: "USD", exchangeRate: 1.0 };

    // Parse email signup settings (Range 5: K2:O2)
    const emailValues = ranges[5]?.values?.[0];
    const emailSignup =
      emailValues && emailValues.length > 0
        ? {
            enabled: emailValues[0] === "TRUE" || emailValues[0] === "Yes",
            promptMessage: emailValues[1] || "Want to join our email list?",
            collectName: emailValues[2] === "TRUE" || emailValues[2] === "Yes",
            collectPhone: emailValues[3] === "TRUE" || emailValues[3] === "Yes",
            autoDismissSeconds: Number.parseInt(emailValues[4]) || 15,
          }
        : {
            enabled: false,
            promptMessage: "Want to join our email list?",
            collectName: true,
            collectPhone: true,
            autoDismissSeconds: 15,
          };

    return NextResponse.json({
      success: true,
      paymentSettings,
      categories: categories.length > 0 ? categories : DEFAULT_CATEGORIES,
      showTipJar,
      theme,
      currency,
      emailSignup,
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
