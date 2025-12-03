/**
 * Analytics Data Layer
 * Provides aggregated data queries for reporting and insights
 */

import { createClient } from "@/lib/supabase/client";

export interface QuickStats {
  totalRevenue: number;
  numberOfSales: number;
  averageSale: number;
  topProduct: string;
  topSize: string;
  inventoryValue: number;
}

export interface DailyRevenue {
  date: string;
  numberOfSales: number;
  revenue: number;
  tips: number;
  paymentBreakdown: { [method: string]: number };
}

export interface ProductPerformance {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
  category?: string;
}

export interface PaymentBreakdown {
  paymentMethod: string;
  total: number;
  count: number;
  percentage: number;
}

export interface SizeDistribution {
  size: string;
  quantity: number;
  percentage: number;
}

export interface ProductSoldDetail {
  productName: string;
  size: string;
  quantity: number;
  price: number;
  subtotal: number;
}

/**
 * Get quick stats overview
 */
export async function getQuickStats(
  organizationId: string,
  startDate?: string,
  endDate?: string
): Promise<QuickStats> {
  const supabase = createClient();

  // Build date filter
  let dateFilter = "";
  if (startDate && endDate) {
    dateFilter = `and(timestamp.gte.${startDate},timestamp.lte.${endDate})`;
  } else if (startDate) {
    dateFilter = `timestamp.gte.${startDate}`;
  } else if (endDate) {
    dateFilter = `timestamp.lte.${endDate}`;
  }

  // Get sales data
  const salesQuery = supabase
    .from("sales")
    .select("actual_amount, sale_items(product_id, quantity, size)")
    .eq("organization_id", organizationId);

  if (dateFilter) {
    salesQuery.or(dateFilter);
  }

  const { data: sales, error: salesError } = await salesQuery;

  if (salesError) {
    console.error("Error fetching sales for quick stats:", salesError);
    throw salesError;
  }

  // Calculate basic stats
  const totalRevenue =
    sales?.reduce((sum, sale) => sum + (sale.actual_amount || 0), 0) || 0;
  const numberOfSales = sales?.length || 0;
  const averageSale = numberOfSales > 0 ? totalRevenue / numberOfSales : 0;

  // Calculate top product
  const productCounts: { [key: string]: number } = {};
  sales?.forEach((sale) => {
    sale.sale_items?.forEach((item: any) => {
      if (item.product_id) {
        productCounts[item.product_id] =
          (productCounts[item.product_id] || 0) + item.quantity;
      }
    });
  });

  let topProductId = "";
  let maxCount = 0;
  Object.entries(productCounts).forEach(([productId, count]) => {
    if (count > maxCount) {
      maxCount = count;
      topProductId = productId;
    }
  });

  // Get top product name
  let topProduct = "N/A";
  if (topProductId) {
    const { data: productData } = await supabase
      .from("products")
      .select("name")
      .eq("id", topProductId)
      .single();
    topProduct = productData?.name || "N/A";
  }

  // Calculate top size
  const sizeCounts: { [key: string]: number } = {};
  sales?.forEach((sale) => {
    sale.sale_items?.forEach((item: any) => {
      const size = item.size || "default";
      sizeCounts[size] = (sizeCounts[size] || 0) + item.quantity;
    });
  });

  let topSize = "N/A";
  let maxSizeCount = 0;
  Object.entries(sizeCounts).forEach(([size, count]) => {
    if (count > maxSizeCount) {
      maxSizeCount = count;
      topSize = size === "default" ? "One Size" : size;
    }
  });

  // Get inventory value
  const { data: products } = await supabase
    .from("products")
    .select("price, inventory")
    .eq("organization_id", organizationId);

  const inventoryValue =
    products?.reduce((sum, product) => {
      if (!product.inventory) return sum;
      const totalQty = Object.values(
        product.inventory as { [key: string]: number }
      ).reduce((total, qty) => total + qty, 0);
      return sum + product.price * totalQty;
    }, 0) || 0;

  return {
    totalRevenue,
    numberOfSales,
    averageSale,
    topProduct,
    topSize,
    inventoryValue,
  };
}

/**
 * Get daily revenue breakdown
 */
export async function getDailyRevenue(
  organizationId: string,
  startDate?: string,
  endDate?: string
): Promise<DailyRevenue[]> {
  const supabase = createClient();

  // Build date filter
  let dateFilter = "";
  if (startDate && endDate) {
    dateFilter = `and(timestamp.gte.${startDate},timestamp.lte.${endDate})`;
  } else if (startDate) {
    dateFilter = `timestamp.gte.${startDate}`;
  } else if (endDate) {
    dateFilter = `timestamp.lte.${endDate}`;
  }

  const salesQuery = supabase
    .from("sales")
    .select("timestamp, actual_amount, tip_amount, payment_method")
    .eq("organization_id", organizationId)
    .order("timestamp", { ascending: false });

  if (dateFilter) {
    salesQuery.or(dateFilter);
  }

  const { data: sales, error } = await salesQuery;

  if (error) {
    console.error("Error fetching daily revenue:", error);
    throw error;
  }

  // Group by date
  const dailyMap: {
    [date: string]: {
      sales: number;
      revenue: number;
      tips: number;
      payments: { [method: string]: number };
    };
  } = {};

  sales?.forEach((sale) => {
    const date = new Date(sale.timestamp).toISOString().split("T")[0];
    if (!dailyMap[date]) {
      dailyMap[date] = {
        sales: 0,
        revenue: 0,
        tips: 0,
        payments: {},
      };
    }

    dailyMap[date].sales += 1;
    dailyMap[date].revenue += sale.actual_amount || 0;
    dailyMap[date].tips += sale.tip_amount || 0;

    const method = sale.payment_method || "Other";
    dailyMap[date].payments[method] =
      (dailyMap[date].payments[method] || 0) + (sale.actual_amount || 0);
  });

  // Convert to array and format
  return Object.entries(dailyMap).map(([date, data]) => ({
    date,
    numberOfSales: data.sales,
    revenue: data.revenue,
    tips: data.tips,
    paymentBreakdown: data.payments,
  }));
}

/**
 * Get product performance rankings
 */
export async function getProductPerformance(
  organizationId: string,
  startDate?: string,
  endDate?: string
): Promise<ProductPerformance[]> {
  const supabase = createClient();

  // Build date filter for sales
  let dateFilter = "";
  if (startDate && endDate) {
    dateFilter = `and(timestamp.gte.${startDate},timestamp.lte.${endDate})`;
  } else if (startDate) {
    dateFilter = `timestamp.gte.${startDate}`;
  } else if (endDate) {
    dateFilter = `timestamp.lte.${endDate}`;
  }

  // Get sales with items
  const salesQuery = supabase
    .from("sales")
    .select("sale_items(product_id, quantity)")
    .eq("organization_id", organizationId);

  if (dateFilter) {
    salesQuery.or(dateFilter);
  }

  const { data: sales, error: salesError } = await salesQuery;

  if (salesError) {
    console.error("Error fetching sales for product performance:", salesError);
    throw salesError;
  }

  // Aggregate product quantities
  const productMap: { [productId: string]: number } = {};
  sales?.forEach((sale: any) => {
    sale.sale_items?.forEach((item: any) => {
      if (item.product_id) {
        productMap[item.product_id] =
          (productMap[item.product_id] || 0) + item.quantity;
      }
    });
  });

  // Get product details
  const productIds = Object.keys(productMap);
  if (productIds.length === 0) {
    return [];
  }

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, price, category")
    .in("id", productIds);

  if (productsError) {
    console.error("Error fetching products:", productsError);
    throw productsError;
  }

  // Combine and calculate revenue
  const performance: ProductPerformance[] =
    products?.map((product) => ({
      productId: product.id,
      productName: product.name,
      quantitySold: productMap[product.id] || 0,
      revenue: (productMap[product.id] || 0) * product.price,
      category: product.category,
    })) || [];

  // Sort by quantity sold (descending)
  return performance.sort((a, b) => b.quantitySold - a.quantitySold);
}

/**
 * Get payment method breakdown
 */
export async function getPaymentBreakdown(
  organizationId: string,
  startDate?: string,
  endDate?: string
): Promise<PaymentBreakdown[]> {
  const supabase = createClient();

  // Build date filter
  let dateFilter = "";
  if (startDate && endDate) {
    dateFilter = `and(timestamp.gte.${startDate},timestamp.lte.${endDate})`;
  } else if (startDate) {
    dateFilter = `timestamp.gte.${startDate}`;
  } else if (endDate) {
    dateFilter = `timestamp.lte.${endDate}`;
  }

  const salesQuery = supabase
    .from("sales")
    .select("payment_method, actual_amount")
    .eq("organization_id", organizationId);

  if (dateFilter) {
    salesQuery.or(dateFilter);
  }

  const { data: sales, error } = await salesQuery;

  if (error) {
    console.error("Error fetching payment breakdown:", error);
    throw error;
  }

  // Group by payment method
  const paymentMap: { [method: string]: { total: number; count: number } } = {};
  let grandTotal = 0;

  sales?.forEach((sale) => {
    const method = sale.payment_method || "Other";
    if (!paymentMap[method]) {
      paymentMap[method] = { total: 0, count: 0 };
    }
    paymentMap[method].total += sale.actual_amount || 0;
    paymentMap[method].count += 1;
    grandTotal += sale.actual_amount || 0;
  });

  // Convert to array with percentages
  return Object.entries(paymentMap)
    .map(([method, data]) => ({
      paymentMethod: method,
      total: data.total,
      count: data.count,
      percentage: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Get size distribution
 */
export async function getSizeDistribution(
  organizationId: string,
  startDate?: string,
  endDate?: string
): Promise<SizeDistribution[]> {
  const supabase = createClient();

  // Build date filter
  let dateFilter = "";
  if (startDate && endDate) {
    dateFilter = `and(timestamp.gte.${startDate},timestamp.lte.${endDate})`;
  } else if (startDate) {
    dateFilter = `timestamp.gte.${startDate}`;
  } else if (endDate) {
    dateFilter = `timestamp.lte.${endDate}`;
  }

  const salesQuery = supabase
    .from("sales")
    .select("sale_items(size, quantity)")
    .eq("organization_id", organizationId);

  if (dateFilter) {
    salesQuery.or(dateFilter);
  }

  const { data: sales, error } = await salesQuery;

  if (error) {
    console.error("Error fetching size distribution:", error);
    throw error;
  }

  // Group by size
  const sizeMap: { [size: string]: number } = {};
  let totalQty = 0;

  sales?.forEach((sale: any) => {
    sale.sale_items?.forEach((item: any) => {
      const size = item.size || "default";
      const qty = item.quantity || 0;
      sizeMap[size] = (sizeMap[size] || 0) + qty;
      totalQty += qty;
    });
  });

  // Convert to array with percentages
  return Object.entries(sizeMap)
    .map(([size, quantity]) => ({
      size: size === "default" ? "One Size" : size,
      quantity,
      percentage: totalQty > 0 ? (quantity / totalQty) * 100 : 0,
    }))
    .sort((a, b) => b.quantity - a.quantity);
}

/**
 * Get products sold on a specific date
 */
export async function getProductsByDate(
  organizationId: string,
  date: string
): Promise<ProductSoldDetail[]> {
  const supabase = createClient();

  // Get sales for this date
  const startOfDay = `${date}T00:00:00`;
  const endOfDay = `${date}T23:59:59`;

  const { data: sales, error: salesError } = await supabase
    .from("sales")
    .select("sale_items(product_id, quantity, size)")
    .eq("organization_id", organizationId)
    .gte("timestamp", startOfDay)
    .lte("timestamp", endOfDay);

  if (salesError) {
    console.error("Error fetching products by date:", salesError);
    throw salesError;
  }

  // Aggregate products
  const productMap: {
    [key: string]: { productId: string; size: string; quantity: number };
  } = {};

  sales?.forEach((sale: any) => {
    sale.sale_items?.forEach((item: any) => {
      const key = `${item.product_id}-${item.size || "default"}`;
      if (!productMap[key]) {
        productMap[key] = {
          productId: item.product_id,
          size: item.size || "default",
          quantity: 0,
        };
      }
      productMap[key].quantity += item.quantity;
    });
  });

  // Get product details
  const productIds = [
    ...new Set(Object.values(productMap).map((p) => p.productId)),
  ];
  if (productIds.length === 0) {
    return [];
  }

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, price")
    .in("id", productIds);

  if (productsError) {
    console.error("Error fetching products:", productsError);
    throw productsError;
  }

  // Create lookup map
  const productLookup: { [id: string]: { name: string; price: number } } = {};
  products?.forEach((p) => {
    productLookup[p.id] = { name: p.name, price: p.price };
  });

  // Build final result
  return Object.values(productMap)
    .map((item) => {
      const product = productLookup[item.productId];
      return {
        productName: product?.name || "Unknown",
        size: item.size === "default" ? "One Size" : item.size,
        quantity: item.quantity,
        price: product?.price || 0,
        subtotal: item.quantity * (product?.price || 0),
      };
    })
    .sort((a, b) => b.quantity - a.quantity);
}
