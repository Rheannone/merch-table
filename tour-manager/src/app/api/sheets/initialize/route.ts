import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { initializeUserSheets } from "@/lib/googleSheets";

export async function POST() {
  try {
    const supabase = await createClient();

    // Get the session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.log("❌ No session found");
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    // Extract provider token for Google Sheets API
    const provider_token = session.provider_token;
    if (!provider_token) {
      console.log("❌ No provider_token in session");
      return NextResponse.json(
        {
          error:
            "Missing Google API access token. Please sign out and sign in again.",
        },
        { status: 401 }
      );
    }

    console.log(
      "✅ Initializing sheets with provider token:",
      provider_token.substring(0, 20) + "..."
    );

    // Initialize sheets
    const sheetConfig = await initializeUserSheets(provider_token);

    return NextResponse.json({
      success: true,
      productsSheetId: sheetConfig.productsSheetId,
      salesSheetId: sheetConfig.salesSheetId,
      sheetName: "Road Dog - Sales & Inventory",
      message: "Google Sheets created successfully!",
    });
  } catch (error) {
    console.error("Failed to initialize sheets:", error);
    return NextResponse.json(
      {
        error: "Failed to create Google Sheets",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
