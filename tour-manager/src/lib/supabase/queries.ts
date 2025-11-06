import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";

type SupabaseProduct = Database["public"]["Tables"]["products"]["Row"];
type SupabaseSale = Database["public"]["Tables"]["sales"]["Row"];

// Simplified types for Supabase operations
export interface SimpleProduct {
  id?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  category?: string;
}

export interface SimpleSale {
  id?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  paymentMethod: string;
  timestamp?: string;
  location?: string;
}

/**
 * Helper functions for working with Supabase
 * Use these instead of writing raw Supabase queries everywhere
 */

// ============================================
// PRODUCTS
// ============================================

/**
 * Get all products for the current user
 */
export async function getProducts(): Promise<SimpleProduct[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching products:", error);
    throw new Error("Failed to fetch products");
  }

  return mapSupabaseProductsToLocal(data || []);
}

/**
 * Add a new product
 */
export async function addProduct(
  product: Omit<SimpleProduct, "id">
): Promise<SimpleProduct> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("products")
    .insert({
      user_id: user.id,
      name: product.name,
      price: product.price,
      quantity: product.quantity || 0,
      image_url: product.image || null,
      category: product.category || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding product:", error);
    throw new Error("Failed to add product");
  }

  return mapSupabaseProductToLocal(data);
}

/**
 * Update an existing product
 */
export async function updateProduct(
  id: string,
  updates: Partial<SimpleProduct>
): Promise<void> {
  const supabase = createClient();

  const updateData: Partial<
    Database["public"]["Tables"]["products"]["Update"]
  > = {};

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.price !== undefined) updateData.price = updates.price;
  if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
  if (updates.image !== undefined) updateData.image_url = updates.image;
  if (updates.category !== undefined) updateData.category = updates.category;

  const { error } = await supabase
    .from("products")
    .update(updateData)
    .eq("id", id);

  if (error) {
    console.error("Error updating product:", error);
    throw new Error("Failed to update product");
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    console.error("Error deleting product:", error);
    throw new Error("Failed to delete product");
  }
}

// ============================================
// SALES
// ============================================

/**
 * Get all sales for the current user
 */
export async function getSales(): Promise<SimpleSale[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .order("timestamp", { ascending: false });

  if (error) {
    console.error("Error fetching sales:", error);
    throw new Error("Failed to fetch sales");
  }

  return mapSupabaseSalesToLocal(data || []);
}

/**
 * Record a new sale
 */
export async function recordSale(
  sale: Omit<SimpleSale, "id">
): Promise<SimpleSale> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Find the product to get its ID (if it exists)
  const { data: products } = await supabase
    .from("products")
    .select("id")
    .eq("name", sale.productName)
    .limit(1);

  const { data, error } = await supabase
    .from("sales")
    .insert({
      user_id: user.id,
      product_id: products?.[0]?.id || null,
      product_name: sale.productName,
      quantity: sale.quantity,
      unit_price: sale.unitPrice,
      total: sale.total,
      payment_method: sale.paymentMethod,
      timestamp: sale.timestamp || new Date().toISOString(),
      location: sale.location || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error recording sale:", error);
    throw new Error("Failed to record sale");
  }

  return mapSupabaseSaleToLocal(data);
}

/**
 * Get sales for a specific date range
 */
export async function getSalesByDateRange(startDate: Date, endDate: Date) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase.rpc("get_sales_by_date_range", {
    user_uuid: user.id,
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
  });

  if (error) {
    console.error("Error fetching sales by date:", error);
    throw new Error("Failed to fetch sales");
  }

  return data;
}

/**
 * Get top selling products
 */
export async function getTopProducts(limit = 10) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase.rpc("get_top_products", {
    user_uuid: user.id,
    limit_count: limit,
  });

  if (error) {
    console.error("Error fetching top products:", error);
    throw new Error("Failed to fetch top products");
  }

  return data;
}

/**
 * Get low stock products
 */
export async function getLowStockProducts(threshold = 5) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase.rpc("get_low_stock_products", {
    user_uuid: user.id,
    threshold,
  });

  if (error) {
    console.error("Error fetching low stock products:", error);
    throw new Error("Failed to fetch low stock products");
  }

  return data;
}

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

/**
 * Subscribe to product changes
 */
export function subscribeToProducts(
  callback: (products: SimpleProduct[]) => void
) {
  const supabase = createClient();

  const channel = supabase
    .channel("products-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "products",
      },
      async () => {
        // Refetch products when changes occur
        const products = await getProducts();
        callback(products);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to sales changes
 */
export function subscribeToSales(callback: (sales: SimpleSale[]) => void) {
  const supabase = createClient();

  const channel = supabase
    .channel("sales-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "sales",
      },
      async () => {
        // Refetch sales when changes occur
        const sales = await getSales();
        callback(sales);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ============================================
// HELPERS: Map Supabase types to local types
// ============================================

function mapSupabaseProductToLocal(product: SupabaseProduct): SimpleProduct {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    quantity: product.quantity,
    image: product.image_url || undefined,
    category: product.category || undefined,
  };
}

function mapSupabaseProductsToLocal(
  products: SupabaseProduct[]
): SimpleProduct[] {
  return products.map(mapSupabaseProductToLocal);
}

function mapSupabaseSaleToLocal(sale: SupabaseSale): SimpleSale {
  return {
    id: sale.id,
    productName: sale.product_name,
    quantity: sale.quantity,
    unitPrice: sale.unit_price,
    total: sale.total,
    paymentMethod: sale.payment_method,
    timestamp: sale.timestamp,
    location: sale.location || undefined,
  };
}

function mapSupabaseSalesToLocal(sales: SupabaseSale[]): SimpleSale[] {
  return sales.map(mapSupabaseSaleToLocal);
}
