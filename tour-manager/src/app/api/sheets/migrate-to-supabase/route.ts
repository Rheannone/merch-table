import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuthClient } from "@/lib/supabase/api-auth";
import { google } from "googleapis";
import { Product, Sale } from "@/types";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const authResult = await getGoogleAuthClient();
    if ("error" in authResult) {
      return authResult.error;
    }

    const { spreadsheetId, organizationId } = await req.json();

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "Spreadsheet ID not provided" },
        { status: 400 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID not provided" },
        { status: 400 }
      );
    }

    const sheets = google.sheets({
      version: "v4",
      auth: authResult.authClient,
    });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    // Verify user has access to this organization
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: "You do not have access to this organization" },
        { status: 403 }
      );
    }

    // Only admins and owners can migrate data
    if (!["admin", "owner"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only admins and owners can migrate data" },
        { status: 403 }
      );
    }

    const migrationResults = {
      products: { migrated: 0, errors: 0 },
      sales: { migrated: 0, errors: 0 },
      settings: { migrated: false, error: null as string | null },
    };

    // ===== MIGRATE PRODUCTS =====
    try {
      const productsResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Products!A2:J",
      });

      const productRows = productsResponse.data.values || [];

      for (const row of productRows) {
        try {
          let inventory: { [key: string]: number } | undefined;
          let currencyPrices: { [currencyCode: string]: number } | undefined;

          if (row[7]) {
            try {
              inventory = JSON.parse(row[7]);
            } catch (e) {
              console.warn("Failed to parse inventory:", e);
            }
          }

          if (row[9]) {
            try {
              currencyPrices = JSON.parse(row[9]);
            } catch (e) {
              console.warn("Failed to parse currencyPrices:", e);
            }
          }

          const product: Product = {
            id: row[0],
            name: row[1] || "",
            price: parseFloat(row[2]) || 0,
            category: row[3] || "",
            description: row[4] || "",
            imageUrl: row[5] || "",
            trackInventory: row[6] === "TRUE",
            inventory: inventory,
            soldCount: parseInt(row[8]) || 0,
            currencyPrices: currencyPrices,
          };

          // Upsert to Supabase
          const { error } = await supabase.from("products").upsert(
            {
              id: product.id,
              organization_id: organizationId,
              name: product.name,
              price: product.price,
              category: product.category,
              description: product.description,
              image_url: product.imageUrl,
              track_inventory: row[6] === "TRUE",
              inventory: inventory,
              sold_count: parseInt(row[8]) || 0,
              currency_prices: currencyPrices,
            },
            { onConflict: "id" }
          );

          if (error) {
            console.error("Error migrating product:", error);
            migrationResults.products.errors++;
          } else {
            migrationResults.products.migrated++;
          }
        } catch (error) {
          console.error("Error processing product row:", error);
          migrationResults.products.errors++;
        }
      }
    } catch (error) {
      console.error("Error loading products from Sheets:", error);
    }

    // ===== MIGRATE SALES =====
    try {
      const salesResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Sales!A2:I",
      });

      const salesRows = salesResponse.data.values || [];

      for (const row of salesRows) {
        try {
          let items: Sale["items"] = [];

          if (row[5]) {
            try {
              items = JSON.parse(row[5]);
            } catch (e) {
              console.warn("Failed to parse sale items:", e);
            }
          }

          const sale: Sale = {
            id: row[0],
            timestamp: row[1]
              ? new Date(row[1]).toISOString()
              : new Date().toISOString(),
            total: parseFloat(row[2]) || 0,
            paymentMethod: row[3] || "cash",
            location: row[4] || "",
            items: items,
            currency: row[6] || "USD",
            exchangeRate: row[7] ? parseFloat(row[7]) : 1,
            usdTotal: row[8] ? parseFloat(row[8]) : parseFloat(row[2]) || 0,
          };

          // Upsert to Supabase
          const { error } = await supabase.from("sales").upsert(
            {
              id: sale.id,
              organization_id: organizationId,
              timestamp: sale.timestamp,
              total: sale.total,
              payment_method: sale.paymentMethod,
              location: row[4] || "",
              sale_items: items,
              currency: row[6] || "USD",
              exchange_rate: row[7] ? parseFloat(row[7]) : 1,
              usd_total: row[8] ? parseFloat(row[8]) : parseFloat(row[2]) || 0,
            },
            { onConflict: "id" }
          );

          if (error) {
            console.error("Error migrating sale:", error);
            migrationResults.sales.errors++;
          } else {
            migrationResults.sales.migrated++;
          }
        } catch (error) {
          console.error("Error processing sale row:", error);
          migrationResults.sales.errors++;
        }
      }
    } catch (error) {
      console.error("Error loading sales from Sheets:", error);
    }

    // ===== MIGRATE SETTINGS =====
    // Settings are now organization-wide, not user-wide
    try {
      const settingsResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: "Settings!A2:H2",
      });

      const settingsRow = settingsResponse.data.values?.[0];

      if (settingsRow) {
        let categories: string[] = [];
        let paymentMethods: Array<{ type: string; enabled: boolean }> = [];

        if (settingsRow[4]) {
          try {
            categories = JSON.parse(settingsRow[4]);
          } catch (e) {
            console.warn("Failed to parse categories:", e);
          }
        }

        if (settingsRow[6]) {
          try {
            paymentMethods = JSON.parse(settingsRow[6]);
          } catch (e) {
            console.warn("Failed to parse payment methods:", e);
          }
        }

        // Migrate to organization_settings table
        const { error } = await supabase.from("organization_settings").upsert(
          {
            organization_id: organizationId,
            categories: categories,
            payment_settings: paymentMethods,
            currency: {
              displayCurrency: settingsRow[1] || "USD",
              exchangeRate: 1,
            },
            default_location: settingsRow[2] || "",
          },
          { onConflict: "organization_id" }
        );

        if (error) {
          console.error("Error migrating settings:", error);
          migrationResults.settings.error = error.message;
        } else {
          migrationResults.settings.migrated = true;
        }
      }
    } catch (error) {
      console.error("Error loading settings from Sheets:", error);
      migrationResults.settings.error = String(error);
    }

    return NextResponse.json({
      success: true,
      message: "Migration completed",
      results: migrationResults,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      {
        error: "Failed to migrate data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
