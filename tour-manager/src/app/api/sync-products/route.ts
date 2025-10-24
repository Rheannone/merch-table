import { NextRequest, NextResponse } from "next/server";
import { syncProductsToSheet } from "@/lib/sheets";
import { Product } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { products }: { products: Product[] } = await request.json();

    if (!products || products.length === 0) {
      return NextResponse.json(
        { error: "No products provided" },
        { status: 400 }
      );
    }

    const result = await syncProductsToSheet(products);

    return NextResponse.json(result);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to sync products" },
      { status: 500 }
    );
  }
}
