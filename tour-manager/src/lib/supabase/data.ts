/**
 * Supabase Data Loaders
 *
 * Functions to load data from Supabase (primary source of truth)
 * IndexedDB is used as a local cache and offline fallback
 */

import { createClient } from "./client";
import { Product, Sale, CloseOut, UserSettings } from "@/types";

/**
 * Load user's products from Supabase
 */
export async function loadProductsFromSupabase(): Promise<Product[]> {
  try {
    const supabase = createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Not authenticated:", userError);
      return [];
    }

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading products from Supabase:", error);
      return [];
    }

    // Transform Supabase schema to app format
    const products: Product[] = (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      price: Number(row.price),
      image: row.image_url || undefined,
      category: row.category || undefined,
      inventory: row.inventory || {},
      sku: row.sku || undefined,
      cost: row.cost ? Number(row.cost) : undefined,
      notes: row.notes || undefined,
    }));

    console.log(`✅ Loaded ${products.length} products from Supabase`);
    return products;
  } catch (error) {
    console.error("Failed to load products from Supabase:", error);
    return [];
  }
}

/**
 * Load user's sales from Supabase
 */
export async function loadSalesFromSupabase(): Promise<Sale[]> {
  try {
    const supabase = createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Not authenticated:", userError);
      return [];
    }

    // Load sales with their items
    const { data, error } = await supabase
      .from("sales")
      .select(
        `
        *,
        sale_items (
          product_id,
          product_name,
          quantity,
          price,
          size
        )
      `
      )
      .eq("user_id", userData.user.id)
      .order("timestamp", { ascending: false });

    if (error) {
      console.error("Error loading sales from Supabase:", error);
      return [];
    }

    // Transform Supabase schema to app format
    const sales: Sale[] = (data || []).map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      items: (row.sale_items || []).map((item: any) => ({
        productId: item.product_id,
        productName: item.product_name,
        quantity: item.quantity,
        price: Number(item.price),
        size: item.size || undefined,
      })),
      total: Number(row.total),
      actualAmount: Number(row.actual_amount),
      discount: row.discount ? Number(row.discount) : undefined,
      tipAmount: row.tip_amount ? Number(row.tip_amount) : undefined,
      paymentMethod: row.payment_method,
      synced: row.synced || false,
      isHookup: row.is_hookup || false,
    }));

    console.log(`✅ Loaded ${sales.length} sales from Supabase`);
    return sales;
  } catch (error) {
    console.error("Failed to load sales from Supabase:", error);
    return [];
  }
}

/**
 * Load user's close-outs from Supabase
 */
export async function loadCloseOutsFromSupabase(): Promise<CloseOut[]> {
  try {
    const supabase = createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Not authenticated:", userError);
      return [];
    }

    const { data, error } = await supabase
      .from("close_outs")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("timestamp", { ascending: false });

    if (error) {
      console.error("Error loading close-outs from Supabase:", error);
      return [];
    }

    // Transform Supabase schema to app format
    const closeOuts: CloseOut[] = (data || []).map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      createdAt: row.created_at,
      sessionName: row.session_name || undefined,
      location: row.location || undefined,
      eventDate: row.event_date || undefined,
      notes: row.notes || undefined,
      salesCount: row.sales_count,
      totalRevenue: Number(row.total_revenue),
      actualRevenue: Number(row.actual_revenue),
      discountsGiven: Number(row.discounts_given),
      tipsReceived: Number(row.tips_received),
      paymentBreakdown: row.payment_breakdown || {},
      productsSold: row.products_sold || [],
      expectedCash: row.expected_cash ? Number(row.expected_cash) : undefined,
      actualCash: row.actual_cash ? Number(row.actual_cash) : undefined,
      cashDifference: row.cash_difference
        ? Number(row.cash_difference)
        : undefined,
      saleIds: row.sale_ids || [],
      syncedToSupabase: row.synced_to_supabase || true,
    }));

    console.log(`✅ Loaded ${closeOuts.length} close-outs from Supabase`);
    return closeOuts;
  } catch (error) {
    console.error("Failed to load close-outs from Supabase:", error);
    return [];
  }
}

/**
 * Load user settings from Supabase and cache to IndexedDB
 */
export async function loadSettingsFromSupabase(): Promise<UserSettings | null> {
  try {
    const supabase = createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Not authenticated:", userError);
      return null;
    }

    const { data, error } = await supabase
      .from("user_settings")
      .select("settings")
      .eq("user_id", userData.user.id)
      .single();

    if (error) {
      // If no settings exist yet, that's okay
      if (error.code === "PGRST116") {
        console.log("No settings found in Supabase (first time user)");
        return null;
      }
      console.error("Error loading settings from Supabase:", error);
      return null;
    }

    const settings = data?.settings || null;

    // Cache settings to IndexedDB for offline use
    if (settings) {
      const { saveSettings } = await import("@/lib/db");
      await saveSettings(userData.user.id, settings);
      console.log("✅ Loaded settings from Supabase and cached to IndexedDB");
    }

    return settings;
  } catch (error) {
    console.error("Failed to load settings from Supabase:", error);
    return null;
  }
}

/**
 * Save user settings to Supabase
 */
export async function saveSettingsToSupabase(
  settings: UserSettings
): Promise<boolean> {
  try {
    const supabase = createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Not authenticated:", userError);
      return false;
    }

    const { error } = await supabase.from("user_settings").upsert({
      user_id: userData.user.id,
      settings,
    });

    if (error) {
      console.error("Error saving settings to Supabase:", error);
      return false;
    }

    console.log("✅ Settings saved to Supabase");
    return true;
  } catch (error) {
    console.error("Failed to save settings to Supabase:", error);
    return false;
  }
}
