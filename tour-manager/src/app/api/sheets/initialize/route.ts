import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { initializeUserSheets } from "@/lib/googleSheets";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.accessToken) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    // Initialize sheets
    const sheetConfig = await initializeUserSheets(session.accessToken);

    return NextResponse.json({
      success: true,
      productsSheetId: sheetConfig.productsSheetId,
      salesSheetId: sheetConfig.salesSheetId,
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
