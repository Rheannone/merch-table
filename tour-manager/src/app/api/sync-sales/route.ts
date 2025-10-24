import { NextRequest, NextResponse } from "next/server";
import { syncSalesToSheet } from "@/lib/sheets";
import { Sale } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { sales }: { sales: Sale[] } = await request.json();

    if (!sales || sales.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const result = await syncSalesToSheet(sales);

    return NextResponse.json(result);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to sync sales" },
      { status: 500 }
    );
  }
}
